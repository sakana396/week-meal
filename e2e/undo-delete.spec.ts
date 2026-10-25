import { expect, test, type Page } from "@playwright/test";
import { nutrientDefinitions } from "../src/data/nutrients";
import { initialAppState, type BasketEntry } from "../src/core/basket";
import type { ManualFood } from "../src/core/manualFoods";
import { itemRow, openTab, registerFood } from "./helpers";

const items: BasketEntry[] = ["先頭", "中間", "末尾"].map((displayName, i) => ({
  id: `row-${i}`,
  foodId: "06212",
  displayName,
  count: 1.5,
  usedUp: false,
}));

async function seed(
  page: Page,
  entries = items,
  manualFoods: ManualFood[] = [],
) {
  await page.addInitScript(
    ({ entries, manualFoods, profile }) => {
      if (sessionStorage.getItem("undo-seeded")) return;
      localStorage.setItem(
        "weekmeal:state",
        JSON.stringify({
          version: 2,
          items: entries,
          manualFoods,
          profile,
        }),
      );
      sessionStorage.setItem("undo-seeded", "1");
    },
    { entries, manualFoods, profile: initialAppState.profile },
  );
  await page.goto("/#/");
}
const undo = (page: Page) =>
  page.getByRole("button", { name: "元に戻す", exact: true });
const names = (page: Page) => page.locator(".item-row .item-name strong");
const stored = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("weekmeal:state")!));

test("TC-FR-ING-14-01 中間行を1回で復元し通知とキーボードのフォーカスを移す", async ({
  page,
}) => {
  await seed(page);
  await itemRow(page, "中間")
    .getByRole("button", { name: "中間を削除", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("status").filter({ hasText: "中間を削除しました" }),
  ).toBeVisible();
  await expect(undo(page)).toBeFocused();
  await expect(names(page)).toHaveText(["先頭", "末尾"]);
  await page.keyboard.press("Space");
  await expect(names(page)).toHaveText(["先頭", "中間", "末尾"]);
  await expect(
    itemRow(page, "中間").getByRole("button", { name: "中間を 0.5 減らす" }),
  ).toBeFocused();
  await expect(itemRow(page, "中間").getByRole("group")).toContainText("1.5");
  await expect(undo(page)).toHaveCount(0);
  await expect.poll(async () => (await stored(page)).items).toEqual(items);
});

test("TC-FR-ING-14-02 使い切った手入力行を元の区画・順序に戻し成分と来歴を保つ", async ({
  page,
}) => {
  const manualFood: ManualFood = {
    id: "manual-food",
    name: "中間",
    category: "手入力 / 野菜",
    refusePct: null,
    nutrientsPer100g: Object.fromEntries(
      nutrientDefinitions.map(({ key }) => [
        key,
        key === "energyKcal" ? 30 : key === "proteinG" ? 2 : null,
      ]),
    ) as ManualFood["nutrientsPer100g"],
    sourceFoodId: "06212",
  };
  const entries = [
    { ...items[0], usedUp: true },
    { ...items[1], foodId: manualFood.id, usedUp: true },
    items[2],
  ];
  await seed(page, entries, [manualFood]);
  await expect(names(page)).toHaveText(["末尾", "先頭", "中間"]);
  await itemRow(page, "中間")
    .getByRole("button", { name: "中間を削除", exact: true })
    .click();
  await undo(page).click();
  await expect(names(page)).toHaveText(["末尾", "先頭", "中間"]);
  await expect(itemRow(page, "中間")).toHaveAttribute("data-used-up", "true");
  await expect(
    itemRow(page, "中間").getByRole("button", {
      name: "中間を使い切った から戻す",
      exact: true,
    }),
  ).toBeFocused();
  await expect.poll(async () => (await stored(page)).items).toEqual(entries);
  expect((await stored(page)).manualFoods).toEqual([manualFood]);
});

test("TC-FR-ING-14-03 連続削除は直前だけ戻し画面移動と設定変更では保持する", async ({
  page,
}) => {
  await seed(page);
  for (const name of ["中間", "末尾"]) {
    await itemRow(page, name)
      .getByRole("button", { name: `${name}を削除`, exact: true })
      .click();
  }
  await openTab(page, "設定");
  await page.getByRole("button", { name: "大盛り", exact: true }).click();
  await openTab(page, "ホーム");
  await expect(
    page.getByRole("status").filter({ hasText: "末尾を削除しました" }),
  ).toBeVisible();
  await undo(page).click();
  await expect(names(page)).toHaveText(["先頭", "末尾"]);
  expect((await stored(page)).profile.portion).toBe("large");
  await expect(undo(page)).toHaveCount(0);
});

test("TC-FR-ING-14-03 有効な個数変更や登録で取り消し対象を破棄する", async ({
  page,
}) => {
  await seed(page);
  await itemRow(page, "中間")
    .getByRole("button", { name: "中間を削除", exact: true })
    .click();
  await itemRow(page, "先頭")
    .getByRole("button", { name: "先頭を 0.5 増やす" })
    .click();
  await expect(undo(page)).toHaveCount(0);
  await itemRow(page, "末尾")
    .getByRole("button", { name: "末尾を削除", exact: true })
    .click();
  await openTab(page, "登録");
  await registerFood(page, "にんじん");
  await openTab(page, "ホーム");
  await expect(undo(page)).toHaveCount(0);
});

test("TC-FR-ING-14-05 削除は保存し取り消し情報は保存せず再読み込みで消える", async ({
  page,
}) => {
  await seed(page);
  await itemRow(page, "中間")
    .getByRole("button", { name: "中間を削除", exact: true })
    .click();
  await expect(undo(page)).toBeVisible();
  await expect
    .poll(async () => (await stored(page)).items)
    .toEqual([items[0], items[2]]);
  expect(Object.keys(await stored(page)).sort()).toEqual([
    "items",
    "manualFoods",
    "profile",
    "version",
  ]);
  await page.reload();
  await expect(names(page)).toHaveText(["先頭", "末尾"]);
  await expect(undo(page)).toHaveCount(0);
});
