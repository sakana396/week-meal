import { expect, test } from "@playwright/test";
import { itemRow, registerFood } from "./helpers";

test("TC-FR-ING-17-02 初回登録は今日の買い物を作る", async ({ page }) => {
  await page.goto("#/register");
  await registerFood(page, "にんじん");
  await expect(page).toHaveURL(/#\/register\?shopping=shopping-/);
  await page
    .getByRole("navigation", { name: "主要画面" })
    .getByRole("button", { name: "ホーム" })
    .click();
  await expect(itemRow(page, "にんじん")).toHaveCount(1);
  const today = await page.evaluate(() =>
    new Date().toLocaleDateString("sv-SE"),
  );
  await expect(page.getByLabel("買い物の日付")).toHaveValue(today);
});

test("TC-FR-ING-17-03 新しい買い物は空で、未来日付の買い物を最新のままにする", async ({
  page,
}) => {
  await page.goto("#/");
  await page.getByRole("button", { name: "新しい買い物" }).click();
  await expect(page).toHaveURL(/#\/history\/shopping-/);
  await expect(page.getByText("登録した食材がありません")).toBeVisible();
  await page.getByLabel("買い物の日付").fill("2099-01-01");
  await page.getByRole("button", { name: "日付を保存" }).click();
  await page.getByRole("button", { name: "ホームへ戻る" }).click();
  await page.getByRole("button", { name: "新しい買い物" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "この買い物は最新ではありません" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ホームへ戻る" }).click();
  await expect(page.getByLabel("買い物の日付")).toHaveValue("2099-01-01");
});

test("TC-FR-ING-18-02 日付変更でホームの対象が入れ替わる", async ({ page }) => {
  await page.goto("#/");
  await page.getByRole("button", { name: "新しい買い物" }).click();
  await page.getByRole("button", { name: "この買い物に食材を登録" }).click();
  await registerFood(page, "にんじん");
  await page
    .getByRole("navigation", { name: "主要画面" })
    .getByRole("button", { name: "ホーム" })
    .click();
  await page.getByRole("button", { name: "新しい買い物" }).click();
  await page.getByLabel("買い物の日付").fill("2000-01-01");
  await page.getByRole("button", { name: "日付を保存" }).click();
  await page.getByRole("button", { name: "ホームへ戻る" }).click();
  await expect(itemRow(page, "にんじん")).toHaveCount(1);
});

test("TC-FR-NUT-07-01 ホームと買い物詳細はそれぞれの食材だけで判定する", async ({
  page,
}) => {
  await page.goto("#/register");
  await registerFood(page, "にんじん");
  await registerFood(page, "キャベツ");
  await registerFood(page, "豚肉");
  const firstId = new URL(page.url()).hash.split("shopping=")[1];
  await page
    .getByRole("navigation", { name: "主要画面" })
    .getByRole("button", { name: "ホーム" })
    .click();
  await page.getByRole("button", { name: "新しい買い物" }).click();
  await expect(itemRow(page, "にんじん")).toHaveCount(0);
  await expect(page.getByText("登録した食材がありません")).toBeVisible();
  await expect(page.getByText("判定にはあと少し食材が必要です")).toBeVisible();
  await page.goto(`#/balance?shopping=${firstId}`);
  await expect(
    page.getByRole("heading", { name: "まだ判定できません" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "判定する栄養素（14 種）" }),
  ).toBeVisible();
  await page.goto(`#/history/${firstId}`);
  await expect(page.getByText("にんじん", { exact: false })).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "栄養バランスの判定" })
      .getByRole("heading", {
        name: /偏りがあります|目立った偏りはありません/,
      }),
  ).toBeVisible();
  await page.goto(`#/register?shopping=${firstId}`);
  await registerFood(page, "鶏卵");
  await page
    .getByRole("navigation", { name: "主要画面" })
    .getByRole("button", { name: "ホーム" })
    .click();
  await expect(itemRow(page, "鶏卵")).toHaveCount(0);
  await page.goto("#/register?shopping=missing-id");
  await expect(page).toHaveURL(/#\/history$/);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "指定した買い物が見つかりません" }),
  ).toBeVisible();
});

test("TC-FR-ING-17-04 初回登録後に戻るとホームへ出られる", async ({ page }) => {
  await page.goto("#/");
  await page.getByRole("button", { name: "食材を登録" }).click();
  await expect(page).toHaveURL(/#\/register$/);
  await registerFood(page, "にんじん");
  await expect(page).toHaveURL(/#\/register\?shopping=shopping-/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/$/);
  await expect(itemRow(page, "にんじん")).toHaveCount(1);
});

test("TC-FR-UI-02-05 不明 ID の通知は履歴を離れると消える", async ({
  page,
}) => {
  await page.goto("#/");
  await page.goto("#/register?shopping=missing");
  await expect(page).toHaveURL(/#\/history$/);
  await expect(page.getByText("指定した買い物が見つかりません")).toBeVisible();
  await page.getByRole("button", { name: "ホームへ戻る" }).click();
  await expect(page.getByText("指定した買い物が見つかりません")).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/#\/history$/);
  await expect(page.getByText("指定した買い物が見つかりません")).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/#\/$/);
});

test("TC-FR-ING-17-05 新しい買い物の通知は詳細を離れると消える", async ({
  page,
}) => {
  await page.goto("#/");
  await page.getByRole("button", { name: "新しい買い物" }).click();
  await expect(
    page.getByText("ホームの対象が新しい買い物に変わりました"),
  ).toBeVisible();
  await page.getByRole("button", { name: "ホームへ戻る" }).click();
  await expect(
    page.getByText("ホームの対象が新しい買い物に変わりました"),
  ).toHaveCount(0);
  await page.goBack();
  await expect(
    page.getByText("ホームの対象が新しい買い物に変わりました"),
  ).toHaveCount(0);
});
