import { expect, test, type Page } from "@playwright/test";
import { itemRow, openTab } from "./helpers";
import { initialAppState } from "../src/core/basket";
import { nutrientDefinitions } from "../src/data/nutrients";
import type { FoodItem } from "../src/types";

/** 版 1・2 の固定試料（DES-MAN-01、DES-STO-08）。 */
function manual(
  id: string,
  name = "自家製スープ",
  category = "手入力 / 野菜",
): FoodItem {
  return {
    id,
    name,
    category,
    refusePct: null,
    nutrientsPer100g: Object.fromEntries(
      nutrientDefinitions.map(({ key }) => [
        key,
        key === "energyKcal" ? 30 : null,
      ]),
    ) as FoodItem["nutrientsPer100g"],
  };
}

async function seed(page: Page, foods: FoodItem[], version = 2) {
  await page.addInitScript(
    ({ foods, version, profile }) => {
      if (sessionStorage.getItem("seeded")) return;
      localStorage.setItem(
        "weekmeal:state",
        JSON.stringify({
          version,
          items: [],
          manualFoods: foods,
          profile,
        }),
      );
      sessionStorage.setItem("seeded", "1");
    },
    { foods, version, profile: initialAppState.profile },
  );
}

test("TC-FR-ING-15-01 手入力を削除して再読み込みしても同じ食品を再登録できる", async ({
  page,
}) => {
  await page.goto("/#/register");
  const form = page.locator("form");
  await form
    .getByRole("textbox", { name: "食材名", exact: true })
    .fill("自家製スープ");
  await form.getByRole("button", { name: "登録する", exact: true }).click();
  const original = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("weekmeal:state")!).manualFoods[0]
        .id as string,
  );
  await openTab(page, "ホーム");
  await itemRow(page, "自家製スープ")
    .getByRole("button", { name: "自家製スープを削除", exact: true })
    .click();
  await page.reload();
  await expect(itemRow(page, "自家製スープ")).toHaveCount(0);
  await openTab(page, "登録");
  await page
    .getByRole("region", { name: "覚えた食材", exact: true })
    .getByRole("button")
    .click();
  await expect(page.getByRole("status")).toContainText(
    "自家製スープを登録しました",
  );
  await expect(page).toHaveURL(/register/);
  await openTab(page, "ホーム");
  await expect(itemRow(page, "自家製スープ")).toContainText("1");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("weekmeal:state")!),
  );
  expect(stored.shoppings[0].items[0].foodId).toBe(original);
  expect(stored.manualFoods).toHaveLength(1);
});

test("TC-FR-ING-15-03 同名食品を棚・番号で区別し両モードの通常一覧の後に表示する", async ({
  page,
}) => {
  await seed(page, [
    manual("manual-new", "にんじん"),
    manual("manual-meat", "にんじん", "手入力 / 肉"),
    manual("manual-old", "にんじん"),
  ]);
  await page.goto("/#/register");
  const remembered = page.getByRole("region", {
    name: "覚えた食材",
    exact: true,
  });
  for (const mode of ["簡易", "詳細"]) {
    await page
      .getByRole("group", { name: "入力モード選択", exact: true })
      .getByRole("button", { name: mode, exact: true })
      .click();
    const normal = page.getByLabel(
      mode === "簡易" ? "食材名一覧" : "文科省食品データ一覧",
      { exact: true },
    );
    await expect(normal).toBeVisible();
    // 未検索でも検索時でも通常一覧→覚えた区画→フォームの順（DOM 順）を確認する。
    expect(
      await normal.evaluate(
        (element) =>
          !!(
            element.compareDocumentPosition(
              document.querySelector('[aria-label="覚えた食材"]')!,
            ) & Node.DOCUMENT_POSITION_FOLLOWING
          ),
      ),
    ).toBe(true);
    expect(
      await remembered.evaluate(
        (element) =>
          !!(
            element.compareDocumentPosition(document.querySelector("form")!) &
            Node.DOCUMENT_POSITION_FOLLOWING
          ),
      ),
    ).toBe(true);
    await expect(remembered.getByRole("button")).toHaveCount(3);
    await expect(remembered.getByRole("button").nth(0)).toHaveText(
      "にんじん（2）手入力 / 野菜",
    );
    await expect(remembered.getByRole("button").nth(2)).toHaveText(
      "にんじん（1）手入力 / 野菜",
    );
    await page.getByRole("searchbox", { name: "食材名" }).fill("に んじん");
    await expect(remembered.getByRole("button")).toHaveCount(3);
    await expect(normal).toBeVisible();
    expect(
      await normal.evaluate(
        (element) =>
          !!(
            element.compareDocumentPosition(
              document.querySelector('[aria-label="覚えた食材"]')!,
            ) & Node.DOCUMENT_POSITION_FOLLOWING
          ),
      ),
    ).toBe(true);
    await page
      .getByRole("group", { name: "スーパーの棚を選択" })
      .getByRole("button", { name: "肉", exact: true })
      .click();
    await expect(remembered.getByRole("button")).toHaveCount(1);
    await remembered.getByRole("button").click();
    await page.getByRole("searchbox").fill("");
    await page
      .getByRole("group", { name: "スーパーの棚を選択" })
      .getByRole("button", { name: "すべて", exact: true })
      .click();
  }
  await openTab(page, "ホーム");
  await expect(itemRow(page, "にんじん")).toHaveCount(1);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("weekmeal:state")!).shoppings[0]
          .items[0].foodId,
    ),
  ).toBe("manual-meat");
});

test("TC-FR-ING-15-04 覚えた食品はホームから 2 タップで登録でき 80 件の制限に含めない", async ({
  page,
}) => {
  await seed(
    page,
    Array.from({ length: 81 }, (_, i) => manual(`manual-${i}`, `保存食品${i}`)),
  );
  await page.goto("/#/");
  await openTab(page, "登録"); // 1 タップ目
  const remembered = page.getByRole("region", {
    name: "覚えた食材",
    exact: true,
  });
  await expect(remembered.getByRole("button")).toHaveCount(81);
  await remembered.getByRole("button", { name: /保存食品80/ }).click(); // 2 タップ目
  await expect(page.getByRole("status")).toContainText(
    "保存食品80を登録しました",
  );
});

test("TC-FR-ING-15-06 旧分類はその他に表示し成分と来歴を保持する", async ({
  page,
}) => {
  await seed(page, [
    {
      ...manual("manual-legacy", "旧食品", "形式不明"),
      sourceFoodId: "99999",
    } as FoodItem,
  ]);
  await page.goto("/#/register");
  await page
    .getByRole("group", { name: "スーパーの棚を選択" })
    .getByRole("button", { name: "その他", exact: true })
    .click();
  const button = page
    .getByRole("region", { name: "覚えた食材", exact: true })
    .getByRole("button");
  await expect(button).toHaveText(
    "旧食品手入力 / その他下書き元: 食品番号 99999（現在の食品データにはありません）。登録値は手入力",
  );
  await button.click();
  const food = await page.evaluate(
    () => JSON.parse(localStorage.getItem("weekmeal:state")!).manualFoods[0],
  );
  expect(food.category).toBe("形式不明");
  expect(food.sourceFoodId).toBe("99999");
  expect(food.nutrientsPer100g.energyKcal).toBe(30);
});

test("TC-NFR-13-12 版 1 を版 3 に移行し買い物・台帳・設定を保存する", async ({
  page,
}) => {
  const profile = {
    ...initialAppState.profile,
    staple: "bread",
    portion: "large",
    sex: "female",
  };
  const foods = [manual("manual-unused"), manual("manual-used", "登録食品")];
  const items = [
    {
      id: "used",
      foodId: "manual-used",
      displayName: "登録食品",
      count: 2.5,
      usedUp: true,
    },
    {
      id: "normal",
      foodId: "06212",
      displayName: "にんじん",
      count: 1.5,
      usedUp: false,
    },
  ];
  await page.addInitScript(
    ({ profile, foods, items }) => {
      if (sessionStorage.getItem("seeded")) return;
      localStorage.setItem(
        "weekmeal:state",
        JSON.stringify({
          version: 1,
          profile,
          manualFoods: foods,
          items,
          pendingRemoval: { id: "temporary" },
        }),
      );
      sessionStorage.setItem("seeded", "1");
    },
    { profile, foods, items },
  );
  await page.goto("/#/");
  await page.reload();
  await expect(itemRow(page, "登録食品")).toHaveCount(0);
  await expect(itemRow(page, "にんじん")).toBeVisible();
  const migrated = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("weekmeal:state")!),
  );
  expect(migrated.version).toBe(3);
  expect(
    migrated.shoppings.map((shopping: { origin: string; items: unknown[] }) => [
      shopping.origin,
      shopping.items.length,
    ]),
  ).toEqual([
    ["usedUpMigration", 1],
    ["normal", 1],
  ]);
  expect(migrated.manualFoods).toEqual(foods);
  expect(migrated.profile).toEqual(profile);
  await openTab(page, "登録");
  await expect(
    page
      .getByRole("region", { name: "覚えた食材", exact: true })
      .getByRole("button"),
  ).toHaveCount(2);
});

test("TC-FR-ING-15-07 同名・同棚の食品を追加しても既存の番号を保ち新しい順に表示する", async ({
  page,
}) => {
  await seed(page, [manual("manual-new"), manual("manual-old")]);
  await page.goto("/#/register");
  const remembered = page.getByRole("region", {
    name: "覚えた食材",
    exact: true,
  });
  const labels = (numbers: number[]) =>
    numbers.map((number) => `自家製スープ（${number}）手入力 / 野菜`);
  await expect(remembered.getByRole("button")).toHaveText(labels([2, 1]));
  const form = page.locator("form");
  await form
    .getByRole("textbox", { name: "食材名", exact: true })
    .fill("自家製スープ");
  await form.getByRole("button", { name: "登録する", exact: true }).click();
  await expect(remembered.getByRole("button")).toHaveText(labels([3, 2, 1]));
  await page.reload();
  for (const mode of ["簡易", "詳細"]) {
    await page
      .getByRole("group", { name: "入力モード選択", exact: true })
      .getByRole("button", { name: mode, exact: true })
      .click();
    await page.getByRole("searchbox", { name: "食材名" }).fill("自家製");
    await page
      .getByRole("group", { name: "スーパーの棚を選択" })
      .getByRole("button", { name: "野菜", exact: true })
      .click();
    await expect(remembered.getByRole("button")).toHaveText(labels([3, 2, 1]));
    await remembered.getByRole("button").nth(2).click();
  }
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("weekmeal:state")!),
  );
  expect(stored.manualFoods.map((food: FoodItem) => food.id).slice(1)).toEqual([
    "manual-new",
    "manual-old",
  ]);
  expect(
    stored.shoppings[0].items.find(
      (item: { foodId: string }) => item.foodId === "manual-old",
    ).count,
  ).toBe(2);
});

for (const name of ["", "   "]) {
  test(`TC-FR-ING-15-08 名前が空の旧食品 ${JSON.stringify(name)} は名前なしと表示し再登録を無効にして保持する`, async ({
    page,
  }) => {
    const food = manual("manual-unnamed", name);
    await seed(page, [food], 1);
    await page.goto("/#/register");
    for (const mode of ["簡易", "詳細"]) {
      await page
        .getByRole("group", { name: "入力モード選択", exact: true })
        .getByRole("button", { name: mode, exact: true })
        .click();
      const button = page
        .getByRole("region", { name: "覚えた食材", exact: true })
        .getByRole("button");
      await expect(button).toHaveText("（名前なし）手入力 / 野菜");
      await expect(button).toBeDisabled();
    }
    await page.reload();
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("weekmeal:state")!),
    );
    expect(stored.manualFoods).toEqual([food]);
    expect(stored.shoppings).toEqual([]);
    await expect(page.locator('[data-alert="true"]')).toHaveCount(0);
  });
}

test("TC-FR-ING-15-09 覚えた食品がないと区画を隠し登録後に表示し検索や棚が一致しなければ隠す", async ({
  page,
}) => {
  await page.goto("/#/register");
  const remembered = page.getByRole("region", {
    name: "覚えた食材",
    exact: true,
  });
  await expect(remembered).toHaveCount(0);
  const form = page.locator("form");
  await form
    .getByRole("textbox", { name: "食材名", exact: true })
    .fill("自家製スープ");
  await form.getByRole("button", { name: "登録する", exact: true }).click();
  await expect(remembered).toBeVisible();
  await page.getByRole("searchbox", { name: "食材名" }).fill("該当しない名前");
  await expect(remembered).toHaveCount(0);
  await page.getByRole("searchbox").fill("");
  await expect(remembered).toBeVisible();
  await page
    .getByRole("group", { name: "スーパーの棚を選択" })
    .getByRole("button", { name: "肉", exact: true })
    .click();
  await expect(remembered).toHaveCount(0);
  await page
    .getByRole("group", { name: "スーパーの棚を選択" })
    .getByRole("button", { name: "すべて", exact: true })
    .click();
  await expect(remembered).toBeVisible();
});
