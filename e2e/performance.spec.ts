import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import os from "node:os";
import { initialAppState, type AppState } from "../src/core/basket";
import { nutrientDefinitions } from "../src/data/nutrients";
import type { NutrientsPer100g } from "../src/types";
import { itemRow } from "./helpers";

type Measurement = {
  revision: number;
  elapsedMs: number;
  paintedAt: number;
  balanceChanged: boolean;
};
declare global {
  interface Window {
    weekmealMeasurement: Promise<Measurement>;
    weekmealCandidateMeasurement: Promise<{
      start: number;
      duration: number;
      detail: { revision: number; count: number };
      reflectedAt: number;
    }>;
  }
}

/** 同じ食品番号・個数の保存試料。覚えた食品は未登録の負荷として加える（DES-PER-01）。 */
function fixture(size: number): AppState {
  const foods = [
    ["06061", "キャベツ"],
    ["06212", "にんじん"],
    ["11115", "豚肉"],
  ];
  return {
    ...initialAppState,
    shoppings: [
      {
        id: "s",
        date: "2026-10-31",
        origin: "normal",
        items: Array.from({ length: size }, (_, i) => ({
          id: `perf-${i}`,
          foodId: foods[i % 3][0],
          displayName: i < 3 ? foods[i][1] : `負荷試料${i}`,
          quantity: { kind: "count" as const, count: 10 },
        })),
      },
    ],
    manualFoods: Array.from({ length: size }, (_, i) => ({
      refusePct: null,
      nutrientsPer100g: Object.fromEntries(
        nutrientDefinitions.map(({ key }) => [key, null]),
      ) as NutrientsPer100g,
      id: `manual-perf-${i}`,
      name: `覚えた試料${i}`,
      category: "手入力 / 野菜",
    })),
  };
}

/** click の capture から commit 後の2回目の描画までをブラウザ内で測る（DES-PER-01）。 */
async function arm(page: Page, trackCandidates = false) {
  await page.evaluate((trackCandidates) => {
    if (document.visibilityState !== "visible") throw new Error("非表示のタブ");
    const main = document.querySelector("main")!;
    const before = Number(main.getAttribute("data-analysis-revision"));
    const balance = () =>
      document.querySelector('[aria-label="栄養バランスの判定"]');
    const text = balance()?.textContent;
    if (trackCandidates) {
      window.weekmealCandidateMeasurement = new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
          observer.disconnect();
          reject(new Error("候補 revision が更新されない"));
        }, 5000);
        const observer = new MutationObserver(() => {
          const panel = document.querySelector("[data-candidates-revision]");
          if (
            Number(panel?.getAttribute("data-candidates-revision")) !==
            before + 1
          )
            return;
          const entry = performance.getEntriesByName(
            "weekmeal:candidate-calculation",
          )[0] as PerformanceMeasure;
          clearTimeout(timer);
          observer.disconnect();
          resolve({
            start: entry.startTime,
            duration: entry.duration,
            detail: entry.detail,
            reflectedAt: performance.now(),
          });
        });
        observer.observe(main, {
          attributes: true,
          childList: true,
          subtree: true,
        });
      });
    }
    window.weekmealMeasurement = new Promise((resolve, reject) => {
      document.addEventListener(
        "click",
        () => {
          const start = performance.now();
          const timeout = window.setTimeout(() => {
            observer.disconnect();
            reject(new Error("判定 revision が更新されない"));
          }, 5000);
          const observer = new MutationObserver(() => {
            const revision = Number(
              main.getAttribute("data-analysis-revision"),
            );
            if (revision === before) return;
            observer.disconnect();
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                clearTimeout(timeout);
                const paintedAt = performance.now();
                resolve({
                  revision,
                  paintedAt,
                  elapsedMs: paintedAt - start,
                  balanceChanged: balance()?.textContent !== text,
                });
              }),
            );
          });
          observer.observe(main, {
            attributes: true,
            childList: true,
            subtree: true,
            characterData: true,
          });
        },
        { capture: true, once: true },
      );
    });
  }, trackCandidates);
}

for (const size of [3, 30, 100]) {
  for (const rate of [1, 4]) {
    test(`TC-NFR-03-01${size === 100 && rate === 4 ? " TC-NFR-03-03" : ""} ${size}行 CPU${rate}倍の判定と候補を計測`, async ({
      page,
      browser,
    }, testInfo) => {
      test.setTimeout(240_000);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate });
      await page.goto("#/");
      const samples: object[] = [];
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const report = {
        commit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        workingTreeDirty:
          execFileSync("git", ["status", "--porcelain"], {
            encoding: "utf8",
          }).trim().length > 0,
        githubSha: process.env.GITHUB_SHA ?? null,
        githubHeadRef: process.env.GITHUB_HEAD_REF ?? null,
        environment: {
          os: `${os.platform()} ${os.release()}`,
          cpu: os.cpus()[0]?.model,
          cores: os.cpus().length,
          browser: browser.version(),
          viewport: { width: 360, height: 740 },
          rate,
          size,
          rememberedFoods: size,
          ci: !!process.env.CI,
        },
        interpretation:
          "登録画面では判定計算を反映した commit 後の2回目の描画。ホームは判定DOMを監視。CPU4倍は実機相当の合意条件ではない。時間超過は診断記録。",
        samples,
      };
      try {
        for (const operation of [
          "register",
          "candidate",
          "increment",
          "remove",
        ] as const) {
          const values: number[] = [];
          const calculationValues: number[] = [];
          const reflectionValues: number[] = [];
          for (let repeat = 0; repeat < 5; repeat++) {
            await page.evaluate(
              (state) =>
                localStorage.setItem(
                  "weekmeal:state",
                  JSON.stringify({ version: 4, ...state }),
                ),
              fixture(size),
            );
            await page.goto("#/");
            await page.reload();
            await page.mouse.move(0, 0);
            const panel = page.locator("[data-candidates-revision]");
            await expect(panel).toHaveAttribute(
              "data-candidates-revision",
              "0",
            );
            const initialization = await page.evaluate(() =>
              performance
                .getEntriesByName("weekmeal:candidate-initialization")
                .map((entry) => entry.toJSON()),
            );
            const openingStart = await page.evaluate(() => performance.now());
            if (operation === "register") {
              await page
                .getByRole("navigation")
                .getByRole("button", { name: "登録", exact: true })
                .click();
              await expect(page.getByLabel("食材名一覧")).toBeVisible();
            }
            const registerOpeningMs =
              operation === "register"
                ? await page.evaluate(
                    (start) => performance.now() - start,
                    openingStart,
                  )
                : null;
            const button =
              operation === "register"
                ? page
                    .getByLabel("食材名一覧")
                    .getByRole("button", { name: /^キャベツ/ })
                    .first()
                : operation === "candidate"
                  ? panel.getByRole("button").first()
                  : itemRow(page, "キャベツ").getByRole("button", {
                      name:
                        operation === "increment"
                          ? "キャベツを 0.5 増やす"
                          : "キャベツを削除",
                      exact: true,
                    });
            // Playwright のスクロール・待機は計測開始より前。捕捉対象の次の click だけを測る。
            await button.scrollIntoViewIfNeeded();
            if (operation === "candidate") {
              // 候補登録はキーボード由来のclickで測り、意図的なポインター待ちを含めない。
              await button.focus();
              await page.mouse.move(0, 0);
            }
            // 3行から削除すると判定対象が2行になり、候補欄自体が消える。
            const trackCandidates =
              operation !== "register" &&
              !(size === 3 && operation === "remove");
            await arm(page, trackCandidates);
            if (operation === "candidate") await button.press("Enter");
            else await button.click();
            await page.mouse.move(0, 0);
            const measurement = await page.evaluate(
              () => window.weekmealMeasurement,
            );
            expect(measurement.revision).toBe(1);
            expect(Number.isFinite(measurement.elapsedMs)).toBe(true);
            expect(measurement.elapsedMs).toBeGreaterThan(0);
            // 一律の個数増加でも判定の文言が変わらない試料を別途下で検査する。
            let candidate = null;
            if (trackCandidates) {
              await expect(panel).toHaveAttribute(
                "data-candidates-revision",
                "1",
              );
              candidate = await page.evaluate(
                () => window.weekmealCandidateMeasurement,
              );
              expect(candidate.detail.revision).toBe(measurement.revision);
              expect(candidate.detail.count).toBeGreaterThan(0);
              expect(candidate.start).toBeGreaterThanOrEqual(
                measurement.paintedAt,
              );
            }
            if (candidate) {
              calculationValues.push(candidate.duration);
              reflectionValues.push(
                candidate.reflectedAt - measurement.paintedAt,
              );
            }
            expect(errors).toEqual([]);
            values.push(measurement.elapsedMs);
            const sample = {
              operation,
              inputMethod:
                operation === "candidate"
                  ? "keyboard click (Enter)"
                  : "pointer click",
              repeat,
              ...measurement,
              registerOpeningMs,
              initialization,
              candidate,
              clickToCandidateMs: candidate
                ? measurement.elapsedMs +
                  candidate.reflectedAt -
                  measurement.paintedAt
                : null,
              candidateReflectionMs: candidate
                ? candidate.reflectedAt - measurement.paintedAt
                : null,
              candidateNotApplicable: !trackCandidates
                ? operation === "register"
                  ? "登録画面では候補を計算しない"
                  : "2行となり候補を表示しない"
                : null,
              judgmentBudgetMs: 100,
              overJudgmentBudgetMs: Math.max(0, measurement.elapsedMs - 100),
              candidateCalculationOverBudgetMs: candidate
                ? Math.max(0, candidate.duration - 50)
                : null,
              candidateReflectionOverBudgetMs: candidate
                ? Math.max(
                    0,
                    candidate.reflectedAt - measurement.paintedAt - 100,
                  )
                : null,
            };
            samples.push(sample);
            console.log(
              `[performance:sample] ${JSON.stringify({
                rows: size,
                cpuRate: rate,
                operation,
                repeat: repeat + 1,
                elapsedMs: sample.elapsedMs,
                candidateCalculationMs: candidate?.duration ?? null,
                candidateReflectionMs: sample.candidateReflectionMs,
                clickToCandidateMs: sample.clickToCandidateMs,
                candidateNotApplicable: sample.candidateNotApplicable,
                overJudgmentBudgetMs: sample.overJudgmentBudgetMs,
                candidateCalculationOverBudgetMs:
                  sample.candidateCalculationOverBudgetMs,
                candidateReflectionOverBudgetMs:
                  sample.candidateReflectionOverBudgetMs,
              })}`,
            );
          }
          const summary = {
            operation,
            maximumMs: Math.max(...values),
            maximumCandidateCalculationMs: calculationValues.length
              ? Math.max(...calculationValues)
              : null,
            maximumCandidateReflectionMs: reflectionValues.length
              ? Math.max(...reflectionValues)
              : null,
            values,
          };
          samples.push(summary);
          console.log(
            `[performance:summary] ${JSON.stringify({ rows: size, cpuRate: rate, ...summary })}`,
          );
        }
      } finally {
        const path = testInfo.outputPath("performance.json");
        writeFileSync(path, JSON.stringify(report, null, 2), "utf8");
        await testInfo.attach("performance.json", {
          path,
          contentType: "application/json",
        });
        await cdp.detach();
      }
    });
  }
}

test("TC-NFR-03-02 判定文言が変わらない個数変更もrevisionで完了する", async ({
  page,
}, testInfo) => {
  const state = fixture(3);
  // 同じ食品3行・主食なしでは、個数を変えても栄養の割合と判定文言は変わらない。
  state.profile = { ...state.profile, staple: "none" };
  state.shoppings[0].items = state.shoppings[0].items.map((item) => ({
    ...item,
    foodId: "06061",
  }));
  await page.goto("#/");
  await page.evaluate(
    (state) =>
      localStorage.setItem(
        "weekmeal:state",
        JSON.stringify({ version: 4, ...state }),
      ),
    state,
  );
  await page.reload();
  await arm(page);
  await itemRow(page, "キャベツ")
    .getByRole("button", { name: "キャベツを 0.5 増やす" })
    .click();
  const result = await page.evaluate(() => window.weekmealMeasurement);
  expect(result.revision).toBe(1);
  expect(result.balanceChanged).toBe(false);
  console.log(
    `[performance:unchanged-judgment] ${JSON.stringify({ rows: 3, cpuRate: 1, operation: "increment", ...result })}`,
  );
  const path = testInfo.outputPath("unchanged-judgment.json");
  writeFileSync(path, JSON.stringify(result, null, 2), "utf8");
  await testInfo.attach("unchanged-judgment.json", {
    path,
    contentType: "application/json",
  });
});

/** 対象の買い物の行数と、対象外の履歴件数を独立させた試料（DES-PER-03）。 */
function shoppingFixture(size: number, historyCount: number): AppState {
  const base = fixture(size);
  const targetItems = base.shoppings[0].items;
  return {
    ...base,
    shoppings: [
      {
        id: "previous",
        date: "2026-10-30",
        origin: "normal",
        items: targetItems.map((item) => ({
          ...item,
          id: `previous-${item.id}`,
        })),
      },
      {
        id: "latest",
        date: "2026-10-31",
        origin: "normal",
        items: targetItems.map((item) => ({
          ...item,
          id: `latest-${item.id}`,
        })),
      },
      ...Array.from({ length: historyCount }, (_, i) => ({
        id: `history-${i}`,
        date: new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10),
        origin: "normal" as const,
        items: targetItems.slice(0, 3).map((item) => ({
          ...item,
          id: `history-${i}-${item.id}`,
        })),
      })),
    ],
  };
}

const shoppingOperations = [
  "registerLatest",
  "incrementLatest",
  "decrementLatest",
  "removeLatest",
  "registerPrevious",
  "incrementPrevious",
  "decrementPrevious",
  "removePrevious",
  "changeLatestDate",
] as const;

/** 買い物単位の判定反映と保存結果を測る（DES-PER-03）。 */
for (const size of [3, 30, 100]) {
  for (const historyCount of [0, 100]) {
    for (const rate of [1, 4]) {
      test(`TC-NFR-03-04 TC-NFR-03-05 ${size}行 別履歴${historyCount}件 CPU${rate}倍`, async ({
        page,
        browser,
      }, testInfo) => {
        test.setTimeout(600_000);
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate });
        const samples: object[] = [];
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const report = {
          startedAt: new Date().toISOString(),
          finishedAt: "",
          commit: execFileSync("git", ["rev-parse", "HEAD"], {
            encoding: "utf8",
          }).trim(),
          workingTreeDirty:
            execFileSync("git", ["status", "--porcelain"], {
              encoding: "utf8",
            }).trim().length > 0,
          githubSha: process.env.GITHUB_SHA ?? null,
          githubHeadRef: process.env.GITHUB_HEAD_REF ?? null,
          environment: {
            os: `${os.platform()} ${os.release()}`,
            cpu: os.cpus()[0]?.model,
            cores: os.cpus().length,
            browser: browser.version(),
            viewport: { width: 360, height: 740 },
            rate,
            size,
            historyCount,
            repetitions: 5,
            ci: !!process.env.CI,
          },
          interpretation:
            "対象の買い物は最新・前の買い物とも指定行数。未登録の覚えた食品は指定行数と同数。別履歴は各3行、日付は2026-01-01から1日ずつずらす。クリック受信から判定 commit 後の2回目の描画まで。時間超過は記録のみ。候補はホームだけ別時計。",
          samples,
        };
        try {
          for (const operation of shoppingOperations) {
            const values: number[] = [];
            const calculationValues: number[] = [];
            const reflectionValues: number[] = [];
            for (let repeat = 0; repeat < 5; repeat++) {
              await page.goto("#/");
              await page.evaluate(
                (state) =>
                  localStorage.setItem(
                    "weekmeal:state",
                    JSON.stringify({ version: 4, ...state }),
                  ),
                shoppingFixture(size, historyCount),
              );
              await page.reload();
              await page.mouse.move(0, 0);
              const previous = operation.endsWith("Previous");
              const register = operation.startsWith("register");
              const changeDate = operation === "changeLatestDate";
              const targetId = previous ? "previous" : "latest";
              if (previous) {
                await page.goto("#/history/previous");
                await expect(page.getByLabel("買い物詳細画面")).toBeVisible();
              }
              const panel = page.locator("[data-candidates-revision]");
              if (!previous) {
                await expect(panel).toHaveAttribute(
                  "data-candidates-revision",
                  "0",
                );
              }
              const initialization = previous
                ? []
                : await page.evaluate(() =>
                    performance
                      .getEntriesByName("weekmeal:candidate-initialization")
                      .map((entry) => entry.toJSON()),
                  );
              if (register) {
                if (previous) {
                  await page
                    .getByRole("button", { name: "この買い物に食材を登録" })
                    .click();
                } else {
                  await page
                    .getByRole("navigation")
                    .getByRole("button", { name: "登録", exact: true })
                    .click();
                }
                await expect(page.getByLabel("食材名一覧")).toBeVisible();
              }
              if (changeDate) {
                await page.getByLabel("買い物の日付").fill("2026-10-29");
              }
              const button = register
                ? page
                    .getByLabel("食材名一覧")
                    .getByRole("button", { name: /^鶏卵/ })
                    .first()
                : changeDate
                  ? page.getByRole("button", { name: "日付を保存" })
                  : itemRow(page, "キャベツ").getByRole("button", {
                      name: operation.startsWith("increment")
                        ? "キャベツを 0.5 増やす"
                        : operation.startsWith("decrement")
                          ? "キャベツを 0.5 減らす"
                          : "キャベツを削除",
                    });
              await button.scrollIntoViewIfNeeded();
              const trackCandidates =
                !previous &&
                !register &&
                !changeDate &&
                !(size === 3 && operation === "removeLatest");
              if (changeDate)
                await page.evaluate(() => {
                  performance.clearMeasures();
                  (
                    window as Window & { weekmealPerformanceDetail?: boolean }
                  ).weekmealPerformanceDetail = true;
                });
              const storedBefore = await page.evaluate(() =>
                localStorage.getItem("weekmeal:state"),
              );
              await arm(page, trackCandidates);
              await button.click();
              await page.mouse.move(0, 0);
              const measurement = await page.evaluate(
                () => window.weekmealMeasurement,
              );
              expect(measurement.revision).toBe(1);
              expect(Number.isFinite(measurement.elapsedMs)).toBe(true);
              expect(measurement.elapsedMs).toBeGreaterThan(0);
              let candidate = null;
              if (trackCandidates) {
                await expect(panel).toHaveAttribute(
                  "data-candidates-revision",
                  "1",
                );
                candidate = await page.evaluate(
                  () => window.weekmealCandidateMeasurement,
                );
                expect(candidate.detail.revision).toBe(1);
                expect(candidate.detail.count).toBeGreaterThan(0);
                expect(candidate.start).toBeGreaterThanOrEqual(
                  measurement.paintedAt,
                );
                calculationValues.push(candidate.duration);
                reflectionValues.push(
                  candidate.reflectedAt - measurement.paintedAt,
                );
              }
              await expect
                .poll(() =>
                  page.evaluate(() => localStorage.getItem("weekmeal:state")),
                )
                .not.toBe(storedBefore);
              const dateChangeDetail = changeDate
                ? await page.evaluate(() => {
                    (
                      window as Window & { weekmealPerformanceDetail?: boolean }
                    ).weekmealPerformanceDetail = false;
                    return performance
                      .getEntriesByType("measure")
                      .filter((entry) =>
                        entry.name.startsWith("weekmeal:date-change:"),
                      )
                      .map((entry) => ({
                        phase: entry.name.slice("weekmeal:date-change:".length),
                        startTime: entry.startTime,
                        duration: entry.duration,
                      }));
                  })
                : null;
              const stored = (await page.evaluate(() =>
                JSON.parse(localStorage.getItem("weekmeal:state") ?? "null"),
              )) as AppState;
              const target = stored.shoppings.find(
                (shopping) => shopping.id === targetId,
              );
              expect(target).toBeDefined();
              expect(target?.items.length).toBe(
                size + (register ? 1 : operation.startsWith("remove") ? -1 : 0),
              );
              if (register) {
                expect(
                  target?.items.some((item) => item.foodId === "12004"),
                ).toBe(true);
              } else if (operation.startsWith("increment")) {
                expect(
                  (target?.items[0].quantity as { count: number }).count,
                ).toBe(10.5);
              } else if (operation.startsWith("decrement")) {
                expect(
                  (target?.items[0].quantity as { count: number }).count,
                ).toBe(9.5);
              } else if (operation.startsWith("remove")) {
                expect(
                  target?.items.some(
                    (item) => item.id === `${targetId}-perf-0`,
                  ),
                ).toBe(false);
              }
              if (changeDate) {
                expect(target?.date).toBe("2026-10-29");
                await page.goto("#/");
                await expect(page.getByLabel("買い物の日付")).toHaveValue(
                  "2026-10-30",
                );
                await expect(panel).toHaveAttribute(
                  "data-candidates-revision",
                  "1",
                );
              } else if (previous) {
                expect(
                  stored.shoppings.find((shopping) => shopping.id === "latest")
                    ?.items,
                ).toHaveLength(size);
                await page.goto("#/");
                await expect(page.getByLabel("買い物の日付")).toHaveValue(
                  "2026-10-31",
                );
                await expect(panel).toHaveAttribute(
                  "data-candidates-revision",
                  "1",
                );
              }
              expect(errors).toEqual([]);
              values.push(measurement.elapsedMs);
              const sample = {
                operation,
                repeat: repeat + 1,
                ...measurement,
                dateChangeDetail,
                initialization,
                candidate,
                candidateCalculationMs: candidate?.duration ?? null,
                candidateReflectionMs: candidate
                  ? candidate.reflectedAt - measurement.paintedAt
                  : null,
                candidateNotApplicable: !trackCandidates
                  ? previous
                    ? "前の買い物の詳細では候補を表示しない"
                    : register
                      ? "登録画面では候補を計算しない"
                      : changeDate
                        ? "日付変更では最新が切り替わり候補を作り直す"
                        : "2行となり候補を表示しない"
                  : null,
                judgmentBudgetMs: 100,
                overJudgmentBudgetMs: Math.max(0, measurement.elapsedMs - 100),
                candidateCalculationOverBudgetMs: candidate
                  ? Math.max(0, candidate.duration - 50)
                  : null,
                candidateReflectionOverBudgetMs: candidate
                  ? Math.max(
                      0,
                      candidate.reflectedAt - measurement.paintedAt - 100,
                    )
                  : null,
              };
              samples.push(sample);
              console.log(
                `[performance:sample] ${JSON.stringify({ rows: size, historyCount, cpuRate: rate, ...sample })}`,
              );
            }
            const summary = {
              operation,
              maximumMs: Math.max(...values),
              maximumCandidateCalculationMs: calculationValues.length
                ? Math.max(...calculationValues)
                : null,
              maximumCandidateReflectionMs: reflectionValues.length
                ? Math.max(...reflectionValues)
                : null,
              values,
            };
            samples.push(summary);
            console.log(
              `[performance:summary] ${JSON.stringify({ rows: size, historyCount, cpuRate: rate, ...summary })}`,
            );
          }
        } finally {
          report.finishedAt = new Date().toISOString();
          const path = testInfo.outputPath("performance-it04.json");
          writeFileSync(path, JSON.stringify(report, null, 2), "utf8");
          await testInfo.attach("performance-it04.json", {
            path,
            contentType: "application/json",
          });
          const summaryPath = testInfo.outputPath(
            "performance-it05-summary.json",
          );
          writeFileSync(
            summaryPath,
            JSON.stringify(
              {
                startedAt: report.startedAt,
                finishedAt: report.finishedAt,
                commit: report.commit,
                workingTreeDirty: report.workingTreeDirty,
                githubSha: report.githubSha,
                githubHeadRef: report.githubHeadRef,
                environment: report.environment,
                operations: samples.filter(
                  (
                    sample,
                  ): sample is { operation: string; maximumMs: number } =>
                    "maximumMs" in sample,
                ),
              },
              null,
              2,
            ),
            "utf8",
          );
          await testInfo.attach("performance-it05-summary.json", {
            path: summaryPath,
            contentType: "application/json",
          });
          await cdp.detach();
        }
      });
    }
  }
}
