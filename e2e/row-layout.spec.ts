import { expect, test, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { initialAppState, type BasketEntry } from "../src/core/basket";
import { unitWeightFor } from "../src/core/quantity";

/** 名前の長さ・目安の定義・量を分ける保存試料（DES-PER-07、DES-IT06 6.1）。 */
const heightItems: BasketEntry[] = [
  ["にんじん", "ミックスベジタブル"],
  ["試料", "目安重量の定義がない長い食材名の測定用試料"],
].flatMap((names) =>
  names.flatMap((displayName) =>
    (["count", "g", "kg"] as const).map((unit) => ({
      id: `height-${displayName}-${unit}`,
      // 名前による定義の有無を変え、食品番号は固定する人工の試料。
      foodId: "06212",
      displayName,
      quantity:
        unit === "count"
          ? { kind: "count" as const, count: 1 }
          : { kind: "weight" as const, grams: 200, unit },
    })),
  ),
);

/** 保存完了後に読み込み、一覧を準備する（DES-IT06 6.1、6.2）。 */
async function loadRows(page: Page, items: BasketEntry[]) {
  await page.goto("#/");
  await page.evaluate(
    (state) =>
      localStorage.setItem(
        "weekmeal:state",
        JSON.stringify({
          version: 4,
          ...state,
        }),
      ),
    {
      ...initialAppState,
      shoppings: [
        { id: "layout", date: "2026-11-04", origin: "normal", items },
      ],
    },
  );
  await page.reload();
  await expect(page.locator(".item-row")).toHaveCount(items.length);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

test("TC-NFR-03-06 行の実寸と幅ごとの中央値を記録する", async ({
  page,
  browser,
}, testInfo) => {
  await loadRows(page, heightItems);
  const measurements = [];
  for (const item of heightItems) {
    const row = page.locator(`[data-entry-id="${item.id}"]`);
    await row.scrollIntoViewIfNeeded();
    await expect(row).toBeInViewport();
    // auto の仮寸法ではなく、表示後のレイアウトを測る。
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const size = await row.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        height: element.getBoundingClientRect().height,
        intrinsicSize: style.containIntrinsicSize,
        contentVisibility: style.contentVisibility,
        paddingBlock:
          parseFloat(style.paddingTop) + parseFloat(style.paddingBottom),
        borderBlock:
          parseFloat(style.borderTopWidth) +
          parseFloat(style.borderBottomWidth),
      };
    });
    expect(size.height).toBeGreaterThan(0);
    measurements.push({
      item,
      hasWeightDefinition: !!unitWeightFor(item.foodId, item.displayName),
      ...size,
    });
  }
  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  };
  const report = {
    measuredAt: new Date().toISOString(),
    browser: browser.version(),
    viewport: page.viewportSize(),
    measurements,
    medianBorderBoxHeight: median(measurements.map(({ height }) => height)),
    // contain-intrinsic-size は内容領域。比較用に余白と枠を引いた値も残す。
    medianContentBoxHeight: median(
      measurements.map(
        ({ height, paddingBlock, borderBlock }) =>
          height - paddingBlock - borderBlock,
      ),
    ),
  };
  const path = testInfo.outputPath("row-heights-it06.json");
  writeFileSync(path, JSON.stringify(report, null, 2), "utf8");
  await testInfo.attach("row-heights-it06.json", {
    path,
    contentType: "application/json",
  });
});

test("TC-NFR-06-05 画面外の行のテキストとアクセシビリティを比較する", async ({
  page,
  browser,
}, testInfo) => {
  const targetName = "画面外の検索確認用にんじん";
  await loadRows(
    page,
    Array.from({ length: 100 }, (_, index) => ({
      id: `offscreen-${index}`,
      foodId: "06212",
      displayName: index === 99 ? targetName : `負荷試料${index}`,
      quantity: { kind: "count", count: 1 },
    })),
  );
  await page.evaluate(() => scrollTo(0, 0));
  const row = page.locator('[data-entry-id="offscreen-99"]');
  const button = row.getByRole("button", {
    name: `${targetName}を 0.5 増やす`,
    exact: true,
  });
  const observations: object[] = [];
  const report = {
    browser: browser.version(),
    viewport: page.viewportSize(),
    targetName,
    observations,
  };
  try {
    await expect(row).not.toBeInViewport();
    await page.waitForFunction(() => {
      const row = document.querySelector('[data-entry-id="offscreen-99"]');
      return (
        row?.firstElementChild &&
        !row.firstElementChild.checkVisibility({ contentVisibilityAuto: true })
      );
    });
    for (const phase of ["画面外", "スクロール後"] as const) {
      if (phase === "スクロール後") {
        await row.scrollIntoViewIfNeeded();
        await expect(row).toBeInViewport();
      }
      // ariaSnapshot やロケーターの評価より先に、描画状態とテキストを採る。
      const text = await row.evaluate((element) => ({
        skipped: !element.firstElementChild?.checkVisibility({
          contentVisibilityAuto: true,
        }),
        innerText: (element as HTMLElement).innerText,
        textContent: element.textContent,
      }));
      const snapshot = await row.ariaSnapshot();
      const roleCount = await button.count();
      observations.push({ phase, ...text, ariaSnapshot: snapshot, roleCount });
      expect(text.textContent).toContain(targetName);
      expect(snapshot).toContain(targetName);
      expect(snapshot).toContain(`${targetName}を 0.5 増やす`);
      expect(roleCount).toBe(1);
      if (phase === "スクロール後")
        expect(text.innerText).toContain(targetName);
    }
    await button.focus();
    await expect(button).toBeFocused();
    await button.press("Enter");
    await expect(
      row.getByRole("group", { name: `${targetName}の個数`, exact: true }),
    ).toContainText("1.5");
  } finally {
    const path = testInfo.outputPath("offscreen-text-it06.json");
    writeFileSync(path, JSON.stringify(report, null, 2), "utf8");
    await testInfo.attach("offscreen-text-it06.json", {
      path,
      contentType: "application/json",
    });
  }
});
