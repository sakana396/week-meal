import { expect, type Page } from "@playwright/test";

/** 画面下のタブ（スマートフォン幅）またはサイドバー（PC 幅）で画面を移る */
export async function openTab(
  page: Page,
  label: "ホーム" | "登録" | "詳細" | "設定",
) {
  await page
    .getByRole("navigation", { name: "主要画面" })
    .getByRole("button", { name: label, exact: true })
    .click();
}

/** 食材登録画面で、簡易モードの食材名を押して登録する */
export async function registerFood(page: Page, name: string) {
  await page
    .getByRole("group", { name: "食材名一覧" })
    .or(page.getByLabel("食材名一覧"))
    .getByRole("button", { name: new RegExp(`^${name}`) })
    .first()
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: `${name}を登録しました` }),
  ).toBeVisible();
}

/** 登録画面を開いて、食材をまとめて登録する */
export async function registerFoods(page: Page, names: string[]) {
  await page.goto("/#/register");
  for (const name of names) {
    await registerFood(page, name);
  }
}

/** ホームの登録した食材の 1 行 */
export function itemRow(page: Page, name: string) {
  return page
    .locator(".item-row")
    .filter({ has: page.getByText(name, { exact: true }) });
}
