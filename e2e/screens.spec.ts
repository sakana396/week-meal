import { expect, test, type Page } from "@playwright/test";
import { itemRow, openTab, registerFoods } from "./helpers";

test("TC-FR-UI-05-08 2 品目では、栄養詳細はまだ判定できない旨と登録への入口を出す", async ({
  page,
}) => {
  await registerFoods(page, ["キャベツ", "にんじん"]);
  await openTab(page, "詳細");
  await expect(
    page.getByRole("heading", { name: "まだ判定できません" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "食材を登録" })).toBeVisible();
});

test("TC-FR-UI-05-07 栄養詳細に、判定する 14 種とそのほか 16 種の充足率を出す", async ({
  page,
}) => {
  await registerFoods(page, ["キャベツ", "にんじん", "豚肉", "鶏卵"]);
  await openTab(page, "詳細");
  await expect(
    page.getByRole("region", { name: "判定する栄養素" }).locator(".detail-row"),
  ).toHaveCount(14);
  await expect(
    page
      .getByRole("region", { name: "そのほかのビタミン・ミネラル" })
      .locator(".detail-row"),
  ).toHaveCount(16);
  await expect(page.getByRole("region", { name: "PFC 比率" })).toContainText(
    "たんぱく質",
  );
  await expect(
    page.getByText("買った食材の傾向です", { exact: false }).first(),
  ).toBeVisible();
});

test("TC-FR-STP-05-01 初めて開いたときの設定は、ご飯・中盛り・未選択・30〜49 歳", async ({
  page,
}) => {
  await page.goto("/#/settings");
  for (const [group, value] of [
    ["主食", "ご飯"],
    ["盛り", "中盛り"],
    ["性別", "未選択"],
    ["年齢", "30〜49 歳"],
  ]) {
    await expect(
      page
        .getByRole("group", { name: group })
        .getByRole("button", { name: value }),
    ).toHaveAttribute("aria-pressed", "true");
  }
});

test("TC-FR-STP-01-02 主食と属性の設定を栄養詳細とホームの判定に反映し保存する", async ({
  page,
}) => {
  await registerFoods(page, ["キャベツ", "にんじん", "豚肉"]);
  // 固定試料（06061・06212・11115、各 1 単位）は、ご飯では炭水化物が適正、パン・大盛りでは不足。
  await openTab(page, "ホーム");
  const carbohydrate = page
    .getByRole("region", { name: "栄養バランスの判定" })
    .getByRole("listitem")
    .filter({ hasText: "炭水化物" });
  await openTab(page, "詳細");
  await expect(
    page
      .getByRole("region", { name: "判定する栄養素" })
      .locator(".detail-row")
      .filter({ has: page.getByText("炭水化物", { exact: true }) }),
  ).toHaveAttribute("data-status", "ok");
  await openTab(page, "ホーム");
  await expect(carbohydrate).toHaveCount(0);
  const iron = page
    .getByRole("region", { name: "判定する栄養素" })
    .locator(".detail-row")
    .filter({ has: page.getByText("鉄", { exact: true }) });
  await openTab(page, "設定");
  await page
    .getByRole("group", { name: "主食" })
    .getByRole("button", { name: "パン" })
    .click();
  await page
    .getByRole("group", { name: "盛り" })
    .getByRole("button", { name: "大盛り" })
    .click();
  await openTab(page, "ホーム");
  await expect(carbohydrate).toHaveText("不足炭水化物");
  await expect(carbohydrate).toHaveAttribute("data-status", "low");
  await openTab(page, "詳細");
  const before = await iron.locator("small").innerText();
  await openTab(page, "設定");
  await page
    .getByRole("group", { name: "性別" })
    .getByRole("button", { name: "女性" })
    .click();
  await openTab(page, "詳細");
  const afterSex = await iron.locator("small").innerText();
  expect(afterSex).not.toBe(before);
  await openTab(page, "設定");
  await page
    .getByRole("group", { name: "年齢" })
    .getByRole("button", { name: "65〜74 歳" })
    .click();
  for (const [group, value] of [
    ["主食", "パン"],
    ["盛り", "大盛り"],
    ["性別", "女性"],
    ["年齢", "65〜74 歳"],
  ]) {
    await expect(
      page
        .getByRole("group", { name: group })
        .getByRole("button", { name: value }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await openTab(page, "詳細");
  expect(await iron.locator("small").innerText()).not.toBe(afterSex);
  await openTab(page, "設定");
  await page.reload();
  for (const [group, value] of [
    ["主食", "パン"],
    ["盛り", "大盛り"],
    ["性別", "女性"],
    ["年齢", "65〜74 歳"],
  ]) {
    await expect(
      page
        .getByRole("group", { name: group })
        .getByRole("button", { name: value }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await openTab(page, "ホーム");
  await expect(
    page.getByText("主食はパン・大盛りとして計算しています"),
  ).toBeVisible();
  await expect(carbohydrate).toHaveText("不足炭水化物");
});

test("TC-FR-STP-01-03 主食なしでは盛りを選べず、主食を戻すと前の盛りに戻る", async ({
  page,
}) => {
  await registerFoods(page, ["キャベツ", "にんじん", "豚肉"]);
  await openTab(page, "設定");
  const portion = page.getByRole("group", { name: "盛り" });
  await portion.getByRole("button", { name: "大盛り" }).click();
  await page
    .getByRole("group", { name: "主食" })
    .getByRole("button", { name: "なし" })
    .click();
  for (const value of ["小盛り", "中盛り", "大盛り"]) {
    await expect(portion.getByRole("button", { name: value })).toBeDisabled();
  }
  await expect(
    page.getByText(/主食なしのときは盛りを使いません/),
  ).toBeVisible();
  await openTab(page, "ホーム");
  await expect(
    page.getByText("主食なしとして計算しています", { exact: false }),
  ).toBeVisible();
  await openTab(page, "設定");
  await page
    .getByRole("group", { name: "主食" })
    .getByRole("button", { name: "ご飯" })
    .click();
  await expect(portion.getByRole("button", { name: "大盛り" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("TC-FR-UI-08-01 食品一覧で食品を選ぶと、100g あたりの成分の欄に移る", async ({
  page,
}) => {
  await page.goto("/#/settings");
  await page.getByRole("button", { name: "食品一覧を見る" }).click();
  await page.getByLabel("食品検索").fill("鶏卵 全卵 生");
  await page
    .getByLabel("食品一覧", { exact: true })
    .getByRole("button")
    .first()
    .click();
  const heading = page
    .getByRole("region", { name: "食品の成分" })
    .getByRole("heading", { level: 3 });
  await expect(heading).toContainText("鶏卵");
  await expect(heading).toBeFocused();
});

async function expectNoHorizontalScroll(page: Page) {
  await expect(page.locator(".screen-stack")).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectTapTargets(page: Page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("button, input, select")]
      .filter(
        (element) =>
          element instanceof HTMLElement && element.offsetParent !== null,
      )
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          text: element.textContent?.trim() ?? "",
          width: rect.width,
          height: rect.height,
        };
      })
      .filter((rect) => rect.width < 44 || rect.height < 44),
  );
  expect(small).toEqual([]);
}

async function expectNoClippedButtons(page: Page) {
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll("button")]
      .filter(
        (button) =>
          button.offsetParent !== null &&
          button.scrollHeight > button.clientHeight,
      )
      .map((button) => button.textContent?.trim() ?? ""),
  );
  expect(clipped).toEqual([]);
}

test("TC-IF-03-01 どの画面も横にはみ出さず、ボタンは 44px 以上（IF-03, IF-05、DES-E2E-05）", async ({
  page,
}) => {
  await registerFoods(page, ["キャベツ", "にんじん", "豚肉", "鶏卵"]);
  for (const hash of [
    "#/",
    "#/register",
    "#/balance",
    "#/settings",
    "#/foods",
  ]) {
    await page.goto(`/${hash}`);
    await expectNoHorizontalScroll(page);
    await expectTapTargets(page);
    await expectNoClippedButtons(page);
  }
  await page.goto("/#/register");
  await page
    .getByRole("group", { name: "入力モード選択" })
    .getByRole("button", { name: "詳細", exact: true })
    .click();
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
  await expectNoClippedButtons(page);
  await page.getByRole("button", { name: "登録する" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "登録する" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
  await page.goto("/#/foods");
  await page
    .getByLabel("食品一覧", { exact: true })
    .getByRole("button")
    .first()
    .click();
  await expect(page.getByRole("region", { name: "食品の成分" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
  await expectNoClippedButtons(page);
});

test("TC-IF-02-01 モバイルのタップで登録から設定まで操作できる", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile);
  await page.goto("/#/");
  await page
    .getByRole("navigation", { name: "主要画面" })
    .getByRole("button", { name: "登録" })
    .tap();
  await page
    .getByLabel("食材名一覧")
    .getByRole("button", { name: /^キャベツ/ })
    .first()
    .tap();
  await page
    .getByRole("navigation", { name: "主要画面" })
    .getByRole("button", { name: "ホーム" })
    .tap();
  const cabbage = itemRow(page, "キャベツ");
  await expect(cabbage).toHaveCount(1);
  await expect(cabbage.getByText("キャベツ", { exact: true })).toBeVisible();
  await expect(
    cabbage.getByRole("group", { name: "キャベツの個数" }),
  ).toHaveText("−1 玉＋");
  await page
    .getByRole("navigation", { name: "主要画面" })
    .getByRole("button", { name: "設定" })
    .tap();
  await page
    .getByRole("group", { name: "主食" })
    .getByRole("button", { name: "パン" })
    .tap();
  await expect(
    page
      .getByRole("group", { name: "主食" })
      .getByRole("button", { name: "パン" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("TC-IF-02-02 Tab と Enter だけで食材を登録できる", async ({ page }) => {
  await page.goto("/#/");
  await page.keyboard.press("Tab");
  await expect(
    page
      .getByRole("navigation", { name: "主要画面" })
      .getByRole("button", { name: "ホーム" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page
      .getByRole("navigation", { name: "主要画面" })
      .getByRole("button", { name: "登録" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/register$/);
  for (let index = 0; index < 40; index += 1) {
    if (
      await page
        .getByLabel("食材名一覧")
        .getByRole("button")
        .first()
        .evaluate((button) => button === document.activeElement)
    )
      break;
    await page.keyboard.press("Tab");
  }
  await expect(
    page.getByLabel("食材名一覧").getByRole("button").first(),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("status").filter({ hasText: "を登録しました" }),
  ).toBeVisible();
});
