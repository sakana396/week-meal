import { expect, test } from "@playwright/test";
import { itemRow, openTab, registerFood, registerFoods } from "./helpers";

test("TC-FR-ING-01-06 食材名を押すと登録され、登録画面に留まってお知らせが出る", async ({
  page,
}) => {
  await page.goto("/#/register");
  await registerFood(page, "にんじん");
  await expect(page).toHaveURL(/#\/register$/);
  await registerFood(page, "にんじん");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "にんじんを登録しました（2 本）" }),
  ).toBeVisible();
});

test("TC-FR-ING-07-01 詳細モードで食品を選ぶと、食材名で登録される", async ({
  page,
}) => {
  await page.goto("/#/register");
  await page
    .getByRole("group", { name: "入力モード選択" })
    .getByRole("button", { name: "詳細", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "食材名" })
    .fill("にんじん 根 皮つき ゆで");
  await page
    .getByLabel("文科省食品データ一覧")
    .getByRole("button")
    .first()
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "にんじんを登録しました" }),
  ).toBeVisible();
});

test("TC-FR-ING-09-06 登録画面に米・パン・麺と調味料の棚と食品が出ない", async ({
  page,
}) => {
  await page.goto("/#/register");
  const shelves = page.getByRole("group", { name: "スーパーの棚を選択" });
  await expect(
    shelves.getByRole("button", { name: "野菜", exact: true }),
  ).toBeVisible();
  await expect(
    shelves.getByRole("button", { name: "米・パン・麺", exact: true }),
  ).toHaveCount(0);
  await expect(
    shelves.getByRole("button", { name: "調味料", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("searchbox", { name: "食材名" })
    .fill("こいくちしょうゆ");
  await expect(page.getByText("該当する食材がありません")).toBeVisible();
});

test("TC-FR-UI-01-02 主食を除いて 2 品目では判定せず、品目数を出す", async ({
  page,
}) => {
  await registerFoods(page, ["キャベツ", "にんじん"]);
  await openTab(page, "ホーム");
  await expect(page.getByText("判定にはあと少し食材が必要です")).toBeVisible();
  await expect(page.getByText(/いま\s*2\s*品目/)).toBeVisible();
});

test("TC-FR-UI-01-01 3 品目以上で判定し、買った食材の傾向である旨を出す", async ({
  page,
}) => {
  await registerFoods(page, ["キャベツ", "にんじん", "豚肉", "鶏卵"]);
  await openTab(page, "ホーム");
  const panel = page.getByRole("region", { name: "栄養バランスの判定" });
  await expect(
    panel.getByRole("heading", {
      name: /偏りがあります|目立った偏りはありません/,
    }),
  ).toBeVisible();
  await expect(panel.getByText("買った食材の傾向です")).toBeVisible();
  // 不足・過剰は色だけでなく文字でも示す（NFR-07）
  for (const badge of await panel.locator(".balance-status").all()) {
    await expect(badge).toHaveText(/不足|過剰/);
  }
});

test("TC-NFR-02-01 ホームから食材 1 件の登録が 3 タップ以内で終わる（H-05）", async ({
  page,
}) => {
  await page.goto("/#/");
  let taps = 0;
  await openTab(page, "登録");
  taps += 1;
  await registerFood(page, "キャベツ");
  taps += 1;
  expect(taps).toBeLessThanOrEqual(3);
});

test("TC-FR-ING-10-07 個数を 0.5 ずつ増減でき、0.5 では減らせず、削除できる", async ({
  page,
}) => {
  await registerFoods(page, ["にんじん", "キャベツ"]);
  await openTab(page, "ホーム");
  const row = itemRow(page, "にんじん");
  await expect(row.getByText("1 本")).toBeVisible();
  await row.getByRole("button", { name: "にんじんを 0.5 増やす" }).click();
  await expect(row.getByText("1.5 本")).toBeVisible();
  await row.getByRole("button", { name: "にんじんを 0.5 減らす" }).click();
  await row.getByRole("button", { name: "にんじんを 0.5 減らす" }).click();
  await expect(row.getByText("0.5 本")).toBeVisible();
  await expect(
    row.getByRole("button", { name: "にんじんを 0.5 減らす" }),
  ).toBeDisabled();
  await row.getByRole("button", { name: "にんじんを削除" }).click();
  await expect(itemRow(page, "にんじん")).toHaveCount(0);
  await expect(itemRow(page, "キャベツ")).toHaveCount(1);
});

test("TC-FR-ING-11-02 使い切ったにすると下にまとまり、戻せる", async ({
  page,
}) => {
  await registerFoods(page, ["にんじん", "キャベツ"]);
  await openTab(page, "ホーム");
  await itemRow(page, "キャベツ")
    .getByRole("button", { name: "キャベツを使い切った" })
    .click();
  const rows = page.locator(".item-row");
  await expect(rows.last()).toContainText("キャベツ");
  await expect(rows.last()).toHaveAttribute("data-used-up", "true");
  await itemRow(page, "キャベツ")
    .getByRole("button", { name: "キャベツを使い切った から戻す" })
    .click();
  await expect(itemRow(page, "キャベツ")).toHaveAttribute(
    "data-used-up",
    "false",
  );
});

test("TC-FR-SYS-01-10 登録した食材と設定は、再読み込みしても残る", async ({
  page,
}) => {
  await registerFoods(page, ["にんじん"]);
  await openTab(page, "設定");
  await page
    .getByRole("group", { name: "主食" })
    .getByRole("button", { name: "パン" })
    .click();
  await page.reload();
  await expect(
    page
      .getByRole("group", { name: "主食" })
      .getByRole("button", { name: "パン" }),
  ).toHaveAttribute("aria-pressed", "true");
  await openTab(page, "ホーム");
  await expect(itemRow(page, "にんじん")).toHaveCount(1);
});

test("TC-NFR-12-32 読めない保存データは退避し、初期状態で始めた旨を出す", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("weekmeal:state", "{壊れた");
      sessionStorage.setItem("seeded", "1");
    }
  });
  await page.goto("/#/");
  await expect(
    page.getByText("保存データを読めなかったので、初期状態で始めました"),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("weekmeal:state:backup")),
  ).toBe("{壊れた");
});
