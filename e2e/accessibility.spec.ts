import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { itemRow, openTab, registerFoods } from "./helpers";
import { initialAppState } from "../src/core/basket";

test.setTimeout(120_000);

const summaryName = "成分を入力・似た食品から下書き（任意）";
const panel = (page: Page) =>
  page.getByRole("region", { name: "不足を補う候補" });

/** 重大な違反を必須条件にし、全違反と判定保留を添付する（DES-E2E-07）。 */
async function inspect(page: Page, info: TestInfo, state: string) {
  const result = await new AxeBuilder({ page }).analyze();
  await info.attach(`axe-${state}.json`, {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });
  expect(
    result.violations.filter(
      ({ impact }) => impact === "critical" || impact === "serious",
    ),
  ).toEqual([]);
}

/** summary を含む新操作にも横幅・44px の条件を適用する（DES-E2E-05, 08）。 */
async function geometry(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);
  const small = await page
    .locator("button, input, select, summary, a[href]")
    .evaluateAll((elements) =>
      elements
        .filter(
          (element) =>
            element instanceof HTMLElement &&
            element.getClientRects().length > 0 &&
            getComputedStyle(element).visibility !== "hidden",
        )
        .map((element) => ({
          name:
            element.getAttribute("aria-label") ?? element.textContent?.trim(),
          width: element.getBoundingClientRect().width,
          height: element.getBoundingClientRect().height,
        }))
        .filter(({ width, height }) => width < 44 || height < 44),
    );
  expect(small).toEqual([]);
}

/** 現在位置からTabで到達できることを確認してEnter/Spaceで操作する（DES-E2E-08）。 */
async function keyboardActivate(page: Page, target: Locator, key = "Enter") {
  for (let i = 0; i < 300; i++) {
    if (await target.evaluate((element) => element === document.activeElement))
      break;
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused();
  await page.keyboard.press(key);
}

async function draft(page: Page) {
  const form = page.locator("form").filter({
    has: page.getByRole("heading", { name: "手入力で追加", exact: true }),
  });
  await form.getByLabel("食材名", { exact: true }).fill("検査用にんじん");
  await form.getByLabel("棚", { exact: true }).selectOption("野菜");
  await keyboardActivate(
    page,
    page.locator("summary").filter({ hasText: summaryName }),
  );
  await expect(page.getByLabel("似た食品を探す")).toBeVisible();
  await page.getByLabel("似た食品を探す").fill("06212");
  await keyboardActivate(
    page,
    page.getByRole("group", { name: "下書き元の食品一覧" }).getByRole("button"),
  );
  await expect(page.getByText(/下書き元:.*食品番号 06212/)).toBeVisible();
}

test("TC-NFR-06-01 全画面と候補・削除通知・下書き・食品詳細のaxeを検査する", async ({
  page,
}, info) => {
  await registerFoods(page, ["キャベツ", "にんじん", "豚肉", "鶏卵"]);
  await openTab(page, "ホーム");
  await expect(panel(page).getByRole("button").first()).toBeEnabled();
  await inspect(page, info, "home-candidates");
  await itemRow(page, "鶏卵")
    .getByRole("button", { name: "鶏卵を削除", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "元に戻す", exact: true }),
  ).toBeVisible();
  await geometry(page);
  await inspect(page, info, "home-removal");
  await openTab(page, "登録");
  await inspect(page, info, "register-collapsed");
  await draft(page);
  await geometry(page);
  await inspect(page, info, "register-draft");
  await keyboardActivate(
    page,
    page.getByRole("button", { name: "登録する", exact: true }),
  );
  await expect(
    page.getByRole("region", { name: "覚えた食材" }).getByRole("button"),
  ).toHaveCount(1);
  await geometry(page);
  await inspect(page, info, "register-remembered");
  await openTab(page, "詳細");
  await inspect(page, info, "balance");
  await geometry(page);
  await openTab(page, "設定");
  await inspect(page, info, "settings");
  await geometry(page);
  await page.goto("/#/foods");
  await inspect(page, info, "foods");
  await page
    .getByLabel("食品一覧", { exact: true })
    .getByRole("button")
    .first()
    .click();
  await expect(page.getByRole("region", { name: "食品の成分" })).toBeVisible();
  await inspect(page, info, "food-detail");
  await geometry(page);
});

test("TC-NFR-06-02 候補・取り消し・折りたたみ・下書き・再登録をキーボードで操作する", async ({
  page,
}) => {
  // TC-FR-BAL-06-08 と同じ各10単位。候補登録後も不足と候補欄を残し、フォーカスを検査する。
  await page.goto("/#/");
  await page.evaluate(
    (state) => {
      localStorage.setItem(
        "weekmeal:state",
        JSON.stringify({ version: 2, ...state }),
      );
    },
    {
      ...initialAppState,
      items: [
        ["06061", "キャベツ"],
        ["06212", "にんじん"],
        ["11115", "豚肉"],
        ["12004", "鶏卵"],
      ].map(([foodId, displayName], index) => ({
        id: `keyboard-${index}`,
        foodId,
        displayName,
        count: 10,
        usedUp: false,
      })),
    },
  );
  await page.reload();
  await page.mouse.move(0, 0);
  const chosen = panel(page).getByRole("button").first();
  await expect(chosen).toBeEnabled();
  await geometry(page);
  await keyboardActivate(page, chosen);
  const heading = page.getByRole("heading", { name: "不足を補う候補" });
  await expect(heading).toBeFocused();
  await keyboardActivate(
    page,
    itemRow(page, "鶏卵").getByRole("button", {
      name: "鶏卵を削除",
      exact: true,
    }),
  );
  const undo = page.getByRole("button", { name: "元に戻す", exact: true });
  await expect(undo).toBeFocused();
  await expect(undo).toHaveAccessibleDescription("鶏卵を削除しました");
  await geometry(page);
  await keyboardActivate(page, undo, "Space");
  await expect(
    itemRow(page, "鶏卵").getByRole("button", { name: "鶏卵を 0.5 減らす" }),
  ).toBeFocused();
  await keyboardActivate(
    page,
    itemRow(page, "鶏卵").getByRole("button", {
      name: "鶏卵を削除",
      exact: true,
    }),
  );
  const navigation = page.getByRole("navigation", { name: "主要画面" });
  await keyboardActivate(
    page,
    navigation.getByRole("button", { name: "設定", exact: true }),
  );
  await keyboardActivate(
    page,
    navigation.getByRole("button", { name: "ホーム", exact: true }),
  );
  // 画面移動ではナビゲーションのフォーカスを保ち、古い取り消しに移さない。
  await expect(
    navigation.getByRole("button", { name: "ホーム", exact: true }),
  ).toBeFocused();
  await keyboardActivate(
    page,
    navigation.getByRole("button", { name: "登録", exact: true }),
  );
  await draft(page);
  const summary = page.locator("summary").filter({ hasText: summaryName });
  await keyboardActivate(page, summary, "Space");
  await expect(page.getByLabel("似た食品を探す")).toBeHidden();
  await keyboardActivate(page, summary);
  await expect(page.getByLabel("似た食品を探す")).toHaveValue("06212");
  await geometry(page);
  await keyboardActivate(
    page,
    page.getByRole("button", { name: "登録する", exact: true }),
  );
  const remembered = page
    .getByRole("region", { name: "覚えた食材" })
    .getByRole("button")
    .first();
  await expect(remembered).toBeVisible();
  await geometry(page);
  await keyboardActivate(page, remembered, "Space");
  await keyboardActivate(
    page,
    navigation.getByRole("button", { name: "ホーム", exact: true }),
  );
  await expect(
    itemRow(page, "検査用にんじん").getByRole("group"),
  ).toContainText("2");
});

test("TC-NFR-06-02 候補の固定中に個数を変更しても見出しへフォーカスを奪い直さない", async ({
  page,
}) => {
  await registerFoods(page, ["キャベツ", "にんじん", "豚肉", "鶏卵"]);
  await openTab(page, "ホーム");
  const candidate = panel(page).getByRole("button").first();
  await expect(candidate).toBeEnabled();
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await candidate.click();
  await expect(
    page.getByRole("heading", { name: "不足を補う候補" }),
  ).toBeFocused();
  const increment = itemRow(page, "キャベツ").getByRole("button", {
    name: "キャベツを 0.5 増やす",
  });
  await keyboardActivate(page, increment);
  await expect(increment).toBeFocused();
  await page.mouse.move(0, 0);
  await page.clock.runFor(100);
  await expect(increment).toBeFocused();
});
