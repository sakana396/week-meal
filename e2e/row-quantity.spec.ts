import { expect, test } from "@playwright/test";
import { initialAppState } from "../src/core/basket";
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
  await expect(input).toHaveAttribute("aria-describedby", /weight-error-/);
  const errorId = await input.getAttribute("aria-describedby");
  await expect(row.getByRole("alert")).toHaveAttribute("id", errorId ?? "");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const saved = JSON.parse(
          localStorage.getItem("weekmeal:state") ?? "{}",
        );
        return saved.shoppings?.[0]?.items?.find(
          (item: { displayName: string }) => item.displayName === "にんじん",
        )?.quantity;
      }),
    )
    .toEqual({ kind: "weight", grams: 2000, unit: "kg" });
  await page.reload();
  await expect(
    itemRow(page, "にんじん").getByRole("textbox", { name: "にんじんの重さ" }),
  ).toHaveValue("2");
});

test("TC-FR-QTY-08-01 個数行の目安重量と重さ行での非表示", async ({ page }) => {
  await page.goto("#/register");
  await page.getByRole("searchbox", { name: "食材名" }).fill("ひよこまめ");
  await registerFood(page, "ひよこまめ");
  await page.goto("#/");
  const row = itemRow(page, "ひよこまめ");
  await expect(row).toContainText("1 パック ≒ 120 g");
  await row
    .getByRole("button", { name: "ひよこまめを g に切り替える" })
    .click();
  await expect(row).not.toContainText("1 パック ≒ 120 g");
});

test("TC-NFR-03-05 画面外の行へ焦点を移して操作できる", async ({ page }) => {
  const state = {
    ...initialAppState,
    shoppings: [
      {
        id: "many-rows",
        date: "2026-11-03",
        origin: "normal" as const,
        items: Array.from({ length: 100 }, (_, index) => ({
          id: `row-${index}`,
          foodId: "06061",
          displayName: `試料${index}`,
          quantity: { kind: "count" as const, count: 1 },
        })),
      },
    ],
  };
  await page.goto("#/");
  await page.evaluate(
    (saved) =>
      localStorage.setItem(
        "weekmeal:state",
        JSON.stringify({ version: 4, ...saved }),
      ),
    state,
  );
  await page.reload();
  const lastRow = itemRow(page, "試料99");
  const unitButton = lastRow.getByRole("button", {
    name: "試料99を g に切り替える",
  });
  await expect(lastRow).toContainText("1 単位 ≒ 100 g（概算）");
  await unitButton.focus();
  await expect(unitButton).toBeFocused();
  await expect(unitButton).toBeInViewport();
  await page.keyboard.press("Tab");
  await expect(
    lastRow.getByRole("button", { name: "試料99を kg に切り替える" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(unitButton).toBeFocused();
  const buttonSize = await unitButton.boundingBox();
  expect(buttonSize?.width).toBeGreaterThanOrEqual(44);
  expect(buttonSize?.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("Enter");
  const input = lastRow.getByRole("textbox", { name: "試料99の重さ" });
  await expect(input).toBeFocused();
  await expect(input).toBeVisible();
  await expect(input).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

for (const [grams, count, direction] of [
  [200, 2, "増やす"],
  [99900, 999, "減らす"],
] as const) {
  test(`TC-FR-QTY-07-06 個へ戻した後に${count}個の操作ボタンへ焦点を移す`, async ({
    page,
  }) => {
    await page.goto("#/");
    await page.evaluate(
      ({ grams, initialAppState }) =>
        localStorage.setItem(
          "weekmeal:state",
          JSON.stringify({
            version: 4,
            ...initialAppState,
            shoppings: [
              {
                id: "focus",
                date: "2026-11-04",
                origin: "normal",
                items: [
                  {
                    id: "focus-item",
                    foodId: "06212",
                    displayName: "焦点試料",
                    quantity: { kind: "weight", grams, unit: "g" },
                  },
                ],
              },
            ],
          }),
        ),
      { grams, initialAppState },
    );
    await page.reload();
    const row = itemRow(page, "焦点試料");
    await row
      .getByRole("button", { name: "焦点試料を 個 に切り替える" })
      .click();
    await expect(
      row.getByRole("group", { name: "焦点試料の個数", exact: true }),
    ).toContainText(`${count} つ`);
    await expect(
      row.getByRole("button", { name: `焦点試料を 0.5 ${direction}` }),
    ).toBeFocused();
    if (count === 999)
      await expect(
        row.getByRole("button", { name: "焦点試料を 0.5 増やす" }),
      ).toBeDisabled();
  });
}
