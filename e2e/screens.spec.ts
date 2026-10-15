import { expect, test, type Page } from "@playwright/test";
import { openTab, registerFoods } from "./helpers";

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

test("TC-FR-STP-01-02 設定を変えると、判定の主食の注記に反映される", async ({
  page,
}) => {
  await registerFoods(page, ["キャベツ", "にんじん", "豚肉"]);
  await openTab(page, "設定");
  await page
    .getByRole("group", { name: "主食" })
    .getByRole("button", { name: "パン" })
    .click();
  await page
    .getByRole("group", { name: "盛り" })
    .getByRole("button", { name: "大盛り" })
    .click();
  await page
    .getByRole("group", { name: "性別" })
    .getByRole("button", { name: "女性" })
    .click();
  await page
    .getByRole("group", { name: "年齢" })
    .getByRole("button", { name: "65〜74 歳" })
    .click();
  await openTab(page, "ホーム");
  await expect(
    page.getByText("主食はパン・大盛りとして計算しています"),
  ).toBeVisible();
});

test("TC-FR-STP-01-03 主食なしでは盛りを選べず、主食を戻すと前の盛りに戻る", async ({
  page,
}) => {
  await page.goto("/#/settings");
  const portion = page.getByRole("group", { name: "盛り" });
  await portion.getByRole("button", { name: "大盛り" }).click();
  await page
    .getByRole("group", { name: "主食" })
    .getByRole("button", { name: "なし" })
    .click();
  await expect(portion.getByRole("button", { name: "小盛り" })).toBeDisabled();
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
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectTapTargets(page: Page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("button")]
      .filter((button) => button.offsetParent !== null)
      .map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          text: button.textContent?.trim() ?? "",
          width: rect.width,
          height: rect.height,
        };
      })
      .filter((rect) => rect.width < 44 || rect.height < 44),
  );
  expect(small).toEqual([]);
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
  }
});
