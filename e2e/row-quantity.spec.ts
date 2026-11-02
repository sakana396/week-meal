import { expect, test } from "@playwright/test";
import { itemRow, registerFood, registerFoods } from "./helpers";

test("TC-FR-QTY-07-04 行で重さを編集し、単位変更と再読み込み後も値を保つ", async ({
  page,
}) => {
  await registerFoods(page, ["にんじん", "鶏卵", "豚肉"]);
  await page.goto("#/");
  const before = await page.getByLabel("栄養バランスの判定").innerText();
  const row = itemRow(page, "にんじん");
  await row.getByRole("button", { name: "にんじんを g に切り替える" }).click();
  const input = row.getByRole("textbox", { name: "にんじんの重さ" });
  await expect(input).toBeFocused();
  await input.fill("2000");
  await input.press("Enter");
  await expect
    .poll(() => page.getByLabel("栄養バランスの判定").innerText())
    .not.toBe(before);
  await row.getByRole("button", { name: "にんじんを kg に切り替える" }).click();
  await expect(input).toHaveValue("2");
  await row.getByRole("button", { name: "にんじんを g に切り替える" }).click();
  await input.fill("2250");
  await input.press("Enter");
  await row.getByRole("button", { name: "にんじんを kg に切り替える" }).click();
  await expect(input).toHaveValue("2.25");
  await input.fill("2");
  await input.press("Enter");
  await input.fill("0.0001");
  await input.press("Enter");
  await expect(row.getByRole("alert")).toContainText("小数第 3 位");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("weekmeal:state") ?? "{}"),
  );
  expect(
    saved.shoppings[0].items.find(
      (item: { displayName: string }) => item.displayName === "にんじん",
    ).quantity,
  ).toEqual({ kind: "weight", grams: 2000, unit: "kg" });
  await page.reload();
  await expect(
    itemRow(page, "にんじん").getByRole("textbox", { name: "にんじんの重さ" }),
  ).toHaveValue("2");
});

test("TC-FR-QTY-08-01 個数行の目安重量と重さ行での非表示", async ({ page }) => {
  await page.goto("#/register");
  await registerFood(page, "ひよこまめ");
  await page.goto("#/");
  const row = itemRow(page, "ひよこまめ");
  await expect(row).toContainText("1 パック ≒ 120 g");
  await row
    .getByRole("button", { name: "ひよこまめを g に切り替える" })
    .click();
  await expect(row).not.toContainText("1 パック ≒ 120 g");
});
