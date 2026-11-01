import { expect, test, type Page } from "@playwright/test";
import { initialAppState } from "../src/core/basket";
import { itemRow, registerFood } from "./helpers";

/** 並び・編集・削除を検証する固定の買い物を保存する（DES-E2E-10）。 */
async function seed(page: Page) {
  await page.goto("#/");
  await page.evaluate(
    (state) => {
      localStorage.setItem(
        "weekmeal:state",
        JSON.stringify({ version: 3, ...state }),
      );
    },
    {
      ...initialAppState,
      shoppings: [
        {
          id: "old",
          date: "2026-10-01",
          origin: "normal",
          items: [
            {
              id: "carrot",
              foodId: "06212",
              displayName: "にんじん",
              count: 1,
            },
            {
              id: "cabbage",
              foodId: "06061",
              displayName: "キャベツ",
              count: 1,
            },
            { id: "pork", foodId: "11115", displayName: "豚肉", count: 1 },
          ],
        },
        { id: "same", date: "2026-10-01", origin: "normal", items: [] },
        {
          id: "new",
          date: "2026-10-02",
          origin: "normal",
          items: [
            { id: "egg", foodId: "12004", displayName: "鶏卵", count: 1 },
          ],
        },
      ],
    },
  );
  await page.reload();
}

async function openOld(page: Page) {
  await page.goto("#/history/old");
  await expect(page.getByLabel("買い物詳細画面")).toBeVisible();
}

test("TC-FR-ING-19-01 履歴は日付と作成順で並び、前の買い物の判定を表示する", async ({
  page,
}) => {
  await seed(page);
  await page.goto("#/history");
  await expect(
    page.getByRole("heading", { name: "買い物の履歴" }),
  ).toBeVisible();
  await expect(page.locator(".history-button")).toHaveCount(3);
  await expect(page.locator(".history-button").first()).toContainText(
    "2026-10-02",
  );
  await expect(page.locator(".history-button").first()).toContainText("最新");
  await expect(page.locator(".history-button").nth(1)).toContainText("0 件");
  await expect(page.locator(".history-button").nth(2)).toContainText("3 件");
  await page.locator(".history-button").nth(2).click();
  await expect(page).toHaveURL(/#\/history\/old$/);
  await expect(itemRow(page, "にんじん")).toHaveCount(1);
  await expect(
    page.getByRole("region", { name: "栄養バランスの判定" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "履歴へ戻る" }).click();
  await expect(
    page.getByRole("heading", { name: "買い物の履歴" }),
  ).toBeVisible();
});

test("TC-FR-ING-19-02 前の買い物の登録・増減・削除はほかの買い物を変えない", async ({
  page,
}) => {
  await seed(page);
  await openOld(page);
  await itemRow(page, "にんじん")
    .getByRole("button", { name: "にんじんを 0.5 増やす" })
    .click();
  await expect(itemRow(page, "にんじん").getByRole("group")).toContainText(
    "1.5",
  );
  await itemRow(page, "にんじん")
    .getByRole("button", { name: "にんじんを 0.5 減らす" })
    .click();
  await expect(itemRow(page, "にんじん").getByRole("group")).toContainText("1");
  await itemRow(page, "キャベツ")
    .getByRole("button", { name: "キャベツを削除" })
    .click();
  await page.getByRole("button", { name: "この買い物に食材を登録" }).click();
  await expect(page.getByLabel("食材名一覧")).toBeVisible();
  await expect(page).toHaveURL(/#\/register\?shopping=old$/);
  await registerFood(page, "鶏卵");
  await page.goto("#/history/old");
  await expect(page.getByLabel("買い物詳細画面")).toBeVisible();
  await expect(itemRow(page, "鶏卵")).toHaveCount(1);
  await page.reload();
  await expect(itemRow(page, "にんじん").getByRole("group")).toContainText("1");
  await expect(itemRow(page, "キャベツ")).toHaveCount(0);
  await page.goto("#/");
  await expect(page.getByLabel("ホーム画面")).toBeVisible();
  await expect(itemRow(page, "にんじん")).toHaveCount(0);
  await expect(itemRow(page, "鶏卵")).toHaveCount(1);
});

test("TC-FR-ING-14-06 行削除は操作した詳細で取り消し、画面を離れると消える", async ({
  page,
}) => {
  await seed(page);
  await openOld(page);
  await itemRow(page, "にんじん")
    .getByRole("button", { name: "にんじんを削除" })
    .click();
  const undo = page.getByRole("button", { name: "元に戻す" });
  await expect(undo).toBeFocused();
  await expect(undo).toHaveAccessibleDescription("にんじんを削除しました");
  await undo.click();
  await expect(itemRow(page, "にんじん")).toHaveCount(1);
  await itemRow(page, "にんじん")
    .getByRole("button", { name: "にんじんを削除" })
    .click();
  await page.goto("#/history/new");
  await expect(page.getByLabel("買い物詳細画面")).toBeVisible();
  await page.getByLabel("買い物の日付").fill("2026-10-03");
  await page.getByRole("button", { name: "日付を保存" }).click();
  await expect(page.getByRole("button", { name: "元に戻す" })).toHaveCount(0);
  await page.goto("#/history/old");
  await expect(page.getByLabel("買い物詳細画面")).toBeVisible();
  await expect(page.getByRole("button", { name: "元に戻す" })).toHaveCount(0);
});

test("TC-FR-ING-19-03・04 登録先と栄養詳細の ID を保ち、未知 ID は履歴へ戻す", async ({
  page,
}) => {
  await seed(page);
  await openOld(page);
  await page.getByRole("button", { name: "栄養素ごとの充足率を見る" }).click();
  await expect(page).toHaveURL(/#\/balance\?shopping=old$/);
  await expect(page.getByLabel("栄養詳細画面")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "判定する栄養素（14 種）" }),
  ).toBeVisible();
  await page.goto("#/history/old");
  await expect(page.getByLabel("買い物詳細画面")).toBeVisible();
  await page.getByRole("button", { name: "この買い物に食材を登録" }).click();
  await expect(page.getByLabel("食材名一覧")).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/#\/register\?shopping=old$/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/history\/old$/);
  await page.goto("#/balance?shopping=missing");
  await expect(page).toHaveURL(/#\/history$/);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "指定した買い物が見つかりません" }),
  ).toBeVisible();
});

test("TC-FR-ING-20-01・02 買い物削除の確認と最新・最後の買い物の切り替え", async ({
  page,
}) => {
  await seed(page);
  await openOld(page);
  await page.getByRole("button", { name: "この買い物を削除" }).click();
  const dialog = page.getByRole("dialog", { name: "買い物を削除しますか？" });
  await expect(dialog).toContainText("2026-10-01 の買い物（3 件）");
  await expect(
    dialog.getByRole("button", { name: "キャンセル" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "この買い物を削除" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "この買い物を削除" }).click();
  await dialog.getByRole("button", { name: "キャンセル" }).click();
  await expect(itemRow(page, "にんじん")).toHaveCount(1);
  await page.getByRole("button", { name: "この買い物を削除" }).click();
  await dialog.getByRole("button", { name: "削除する" }).click();
  await expect(page).toHaveURL(/#\/history$/);
  await expect(
    page.getByRole("heading", { name: "買い物の履歴" }),
  ).toBeFocused();
  await expect(
    page.getByRole("status").filter({ hasText: "買い物を削除しました" }),
  ).toBeVisible();
  await page.goto("#/history/old");
  await expect(page).toHaveURL(/#\/history$/);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "指定した買い物が見つかりません" }),
  ).toBeVisible();
  await page.goto("#/history/new");
  await expect(page.getByLabel("買い物詳細画面")).toBeVisible();
  await page.getByRole("button", { name: "この買い物を削除" }).click();
  await dialog.getByRole("button", { name: "削除する" }).click();
  await page.goto("#/");
  await expect(page.getByLabel("ホーム画面")).toBeVisible();
  await expect(page.getByLabel("買い物の日付")).toHaveValue("2026-10-01");
  await page.goto("#/history/same");
  await expect(page.getByLabel("買い物詳細画面")).toBeVisible();
  await page.getByRole("button", { name: "この買い物を削除" }).click();
  await dialog.getByRole("button", { name: "削除する" }).click();
  await page.goto("#/");
  await expect(page.getByLabel("ホーム画面")).toBeVisible();
  await expect(page.getByText("登録した食材がありません")).toBeVisible();
});
