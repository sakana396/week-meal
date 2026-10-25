import { expect, test, type Locator, type Page } from "@playwright/test";
import { initialAppState } from "../src/core/basket";
import { nutrientDefinitions } from "../src/data/nutrients";
import type { FoodItem } from "../src/types";
import type { ManualFood } from "../src/core/manualFoods";
import { itemRow, openTab } from "./helpers";

const summary = "成分を入力・似た食品から下書き（任意）";
// 固定試料の出典: src/data/foods.json（日本食品標準成分表（八訂）増補2023年）。
// Node で食品 JSON を読み込まず、下書きの全成分を固定した期待値と照合する。
const source: FoodItem = {
  id: "01088",
  name: "こめ ［水稲めし］ 精白米 うるち米",
  category: "穀類",
  refusePct: 0.0,
  nutrientsPer100g: {
    energyKcal: 156.0,
    proteinG: 2.5,
    fatG: 0.3,
    carbohydrateG: 37.1,
    fiberG: 1.5,
    saltEquivalentG: 0.0,
    sodiumMg: 1.0,
    potassiumMg: 29.0,
    calciumMg: 3.0,
    magnesiumMg: 7.0,
    phosphorusMg: 34.0,
    ironMg: 0.1,
    zincMg: 0.6,
    copperMg: 0.1,
    manganeseMg: 0.35,
    iodineUg: 0.0,
    seleniumUg: 1.0,
    chromiumUg: 0.0,
    molybdenumUg: 30.0,
    retinolUg: 0.0,
    alphaCaroteneUg: 0.0,
    betaCaroteneUg: 0.0,
    betaCryptoxanthinUg: 0.0,
    betaCaroteneEquivalentUg: 0.0,
    vitaminAUg: 0.0,
    vitaminDUg: 0.0,
    alphaTocopherolMg: 0,
    betaTocopherolMg: 0,
    gammaTocopherolMg: 0.0,
    deltaTocopherolMg: 0.0,
    vitaminKUg: 0.0,
    vitaminB1Mg: 0.02,
    vitaminB2Mg: 0.01,
    niacinMg: 0.2,
    niacinEquivalentMg: 0.8,
    vitaminB6Mg: 0.02,
    vitaminB12Ug: 0.0,
    folateUg: 3.0,
    pantothenicAcidMg: 0.25,
    biotinUg: 0.5,
    vitaminCMg: 0.0,
  },
};
const other: FoodItem = {
  id: "06212",
  name: "（にんじん類） にんじん 根 皮つき 生",
  category: "野菜類",
  refusePct: 3.0,
  nutrientsPer100g: {
    energyKcal: 35.0,
    proteinG: 0.7,
    fatG: 0.2,
    carbohydrateG: 9.3,
    fiberG: 2.8,
    saltEquivalentG: 0.1,
    sodiumMg: 28.0,
    potassiumMg: 300.0,
    calciumMg: 28.0,
    magnesiumMg: 10.0,
    phosphorusMg: 26.0,
    ironMg: 0.2,
    zincMg: 0.2,
    copperMg: 0.05,
    manganeseMg: 0.12,
    iodineUg: null,
    seleniumUg: null,
    chromiumUg: null,
    molybdenumUg: null,
    retinolUg: 0.0,
    alphaCaroteneUg: 3300.0,
    betaCaroteneUg: 6900.0,
    betaCryptoxanthinUg: 0.0,
    betaCaroteneEquivalentUg: 8600.0,
    vitaminAUg: 720.0,
    vitaminDUg: 0.0,
    alphaTocopherolMg: 0.4,
    betaTocopherolMg: 0,
    gammaTocopherolMg: 0.0,
    deltaTocopherolMg: 0.0,
    vitaminKUg: 17.0,
    vitaminB1Mg: 0.07,
    vitaminB2Mg: 0.06,
    niacinMg: 0.8,
    niacinEquivalentMg: 1.0,
    vitaminB6Mg: 0.1,
    vitaminB12Ug: 0.0,
    folateUg: 21.0,
    pantothenicAcidMg: 0.37,
    biotinUg: null,
    vitaminCMg: 6.0,
  },
};
const formOf = (page: Page) =>
  page.locator("form").filter({
    has: page.getByRole("heading", { name: "手入力で追加", exact: true }),
  });
const nameOf = (form: Locator) =>
  form.getByRole("textbox", { name: "食材名", exact: true });
const nutrientInput = (form: Locator, label: string) =>
  form.getByRole("spinbutton", { name: new RegExp(`^${label}（`) });

/** 利用者が番号を検索して明示的に選ぶ（DES-UI-44）。 */
async function chooseDraft(form: Locator, id: string) {
  await form.getByRole("searchbox", { name: "似た食品を探す" }).fill(id);
  await form
    .getByLabel("下書き元の食品一覧")
    .getByRole("button")
    .filter({ hasText: `食品番号 ${id}` })
    .click();
}

for (const mode of ["簡易", "詳細"]) {
  test(`TC-FR-ING-08-12 ${mode}で検索語は明示操作時だけ名前に引き継ぎ棚と成分を保つ`, async ({
    page,
  }) => {
    await page.goto("/#/register");
    await page
      .getByRole("group", { name: "入力モード選択" })
      .getByRole("button", { name: mode, exact: true })
      .click();
    const form = formOf(page);
    await expect(page.locator("form")).toHaveCount(1);
    await expect(form).toHaveCount(1);
    await nameOf(form).fill("編集中の名前");
    await form.getByLabel("棚", { exact: true }).selectOption("肉");
    await form.getByText(summary, { exact: true }).click();
    await nutrientInput(form, "エネルギー").fill("123");
    const query = page.getByRole("searchbox", { name: "食材名", exact: true });
    await query.fill("  見つからない自家製料理  ");
    await expect(nameOf(form)).toHaveValue("編集中の名前");
    await page
      .getByRole("button", { name: "この名前で手入力", exact: true })
      .click();
    await expect(nameOf(form)).toBeFocused();
    await expect(nameOf(form)).toHaveValue("見つからない自家製料理");
    await expect(form.getByLabel("棚", { exact: true })).toHaveValue("肉");
    await expect(nutrientInput(form, "エネルギー")).toHaveValue("123");
    await query.fill("別の未登録料理");
    await expect(nameOf(form)).toHaveValue("見つからない自家製料理");
    await query.fill("にんじん");
    await expect(
      page.getByRole("button", { name: "この名前で手入力", exact: true }),
    ).toHaveCount(0);
    // 通常食品がなくても、覚えた食品が見つかれば引き継ぎボタンは出さない。
    await query.fill("");
    await form.getByRole("button", { name: "登録する", exact: true }).click();
    await query.fill("見つからない自家製料理");
    await expect(
      page.getByRole("region", { name: "覚えた食材" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "この名前で手入力", exact: true }),
    ).toHaveCount(0);
  });
}

test("TC-FR-ING-08-13 成分は初期に閉じ開閉で保持しクリアと登録成功で初期化する", async ({
  page,
}) => {
  await page.goto("/#/register");
  const form = formOf(page);
  const details = form.locator("details");
  await expect(details).not.toHaveAttribute("open");
  await expect(
    form.getByText("エネルギーを入れない食材は、栄養の判定には数えません。"),
  ).toBeVisible();
  // summary のキーボード操作でも開閉できる。
  await form.locator("summary").focus();
  await page.keyboard.press("Enter");
  await nutrientInput(form, "エネルギー").fill("12");
  await form.locator("summary").focus();
  await page.keyboard.press("Space");
  await expect(details).not.toHaveAttribute("open");
  await page.keyboard.press("Enter");
  await expect(nutrientInput(form, "エネルギー")).toHaveValue("12");
  await form.getByRole("button", { name: "入力をクリア" }).click();
  await expect(details).not.toHaveAttribute("open");
  await form.getByText(summary, { exact: true }).click();
  await expect(nutrientInput(form, "エネルギー")).toHaveValue("");
  await form.getByText(summary, { exact: true }).click();
  await nameOf(form).fill("成分なし料理");
  await form.getByRole("button", { name: "登録する", exact: true }).click();
  await expect(nameOf(form)).toHaveValue("");
  await expect(details).not.toHaveAttribute("open");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("weekmeal:state")!),
  );
  expect(Object.values(stored.manualFoods[0].nutrientsPer100g)).toEqual(
    nutrientDefinitions.map(() => null),
  );
});

test("TC-FR-ING-16-01 主食も下書きに選べ全成分を直して保存し原典を変えない", async ({
  page,
}) => {
  await page.goto("/#/register");
  const form = formOf(page);
  await nameOf(form).fill("自分の料理");
  await form.getByLabel("棚", { exact: true }).selectOption("その他");
  await form.getByText(summary, { exact: true }).click();
  await expect(form.getByRole("spinbutton")).toHaveCount(
    nutrientDefinitions.length,
  );
  await chooseDraft(form, source.id);
  for (const { key, label } of nutrientDefinitions) {
    await expect(nutrientInput(form, label)).toHaveValue(
      source.nutrientsPer100g[key]?.toString() ?? "",
    );
  }
  await expect(nameOf(form)).toHaveValue("自分の料理");
  await expect(form.getByLabel("棚", { exact: true })).toHaveValue("その他");
  await nutrientInput(form, "ビタミンC").fill("77.5");
  await nutrientInput(form, "ナトリウム").fill("");
  await form.getByRole("button", { name: "登録する", exact: true }).click();
  await expect(form.locator("details")).not.toHaveAttribute("open");
  await expect(form.getByText(/下書き元:/)).toHaveCount(0);
  const remembered = page.getByRole("region", { name: "覚えた食材" });
  await expect(remembered).toContainText(
    `下書き元: ${source.name}（食品番号 ${source.id}）。登録値は手入力`,
  );
  const food = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("weekmeal:state")!)
        .manualFoods[0] as ManualFood,
  );
  expect(food.id).toMatch(/^manual-/);
  expect(food).toMatchObject({
    name: "自分の料理",
    category: "手入力 / その他",
    refusePct: null,
    sourceFoodId: source.id,
    nutrientsPer100g: {
      ...source.nutrientsPer100g,
      vitaminCMg: 77.5,
      sodiumMg: null,
    },
  });
  await page.reload();
  await expect(remembered).toContainText(`食品番号 ${source.id}`);
  await expect(remembered).toContainText("登録値は手入力");
  await openTab(page, "ホーム");
  await expect(itemRow(page, "自分の料理")).toHaveCount(1);
  // 登録後も、画面で同じ原典を選び直すと編集前の全成分が得られる。
  await openTab(page, "登録");
  await form.getByText(summary, { exact: true }).click();
  await chooseDraft(form, source.id);
  for (const { key, label } of nutrientDefinitions) {
    await expect(nutrientInput(form, label)).toHaveValue(
      source.nutrientsPer100g[key]?.toString() ?? "",
    );
  }
});

test("TC-FR-ING-16-02 下書きを再選択すると全成分と来歴を置換し閉じても保持しクリアで消す", async ({
  page,
}) => {
  await page.goto("/#/register");
  const form = formOf(page);
  await nameOf(form).fill("置換する料理");
  await form.getByText(summary, { exact: true }).click();
  await chooseDraft(form, source.id);
  await nutrientInput(form, "ビタミンC").fill("999");
  await chooseDraft(form, other.id);
  for (const { key, label } of nutrientDefinitions) {
    await expect(nutrientInput(form, label)).toHaveValue(
      other.nutrientsPer100g[key]?.toString() ?? "",
    );
  }
  await form.getByText(summary, { exact: true }).click();
  await expect(form.getByText(/下書き元:/)).toContainText(
    `食品番号 ${other.id}`,
  );
  await form.getByText(summary, { exact: true }).click();
  await expect(nutrientInput(form, "ビタミンC")).toHaveValue(
    other.nutrientsPer100g.vitaminCMg?.toString() ?? "",
  );
  await form.getByRole("button", { name: "入力をクリア" }).click();
  await expect(form.getByText(/下書き元:/)).toHaveCount(0);
  await form.getByText(summary, { exact: true }).click();
  await expect(
    form.getByRole("searchbox", { name: "似た食品を探す" }),
  ).toHaveValue("");
  for (const { label } of nutrientDefinitions)
    await expect(nutrientInput(form, label)).toHaveValue("");
  await nameOf(form).fill("来歴なし料理");
  await form.getByRole("button", { name: "登録する", exact: true }).click();
  const food = await page.evaluate(
    () => JSON.parse(localStorage.getItem("weekmeal:state")!).manualFoods[0],
  );
  expect(food).not.toHaveProperty("sourceFoodId");
});

for (const sourceFoodId of ["99999", 123, null, ""]) {
  test(`TC-FR-ING-16-03 下書き元 ${JSON.stringify(sourceFoodId)} の読み込みで成分と登録行を保持する`, async ({
    page,
  }) => {
    const food = {
      ...source,
      id: "manual-legacy",
      name: "来歴付き料理",
      category: "手入力 / 野菜",
      refusePct: null,
      sourceFoodId,
    };
    const item = {
      id: "legacy-row",
      foodId: food.id,
      displayName: food.name,
      count: 1,
      usedUp: false,
    };
    await page.addInitScript(
      ({ food, item, profile }) => {
        if (sessionStorage.getItem("seeded")) return;
        localStorage.setItem(
          "weekmeal:state",
          JSON.stringify({
            version: 2,
            manualFoods: [food],
            items: [item],
            profile,
          }),
        );
        sessionStorage.setItem("seeded", "1");
      },
      { food, item, profile: initialAppState.profile },
    );
    await page.goto("/#/register");
    const remembered = page.getByRole("region", { name: "覚えた食材" });
    if (sourceFoodId === "99999")
      await expect(remembered).toContainText(
        "下書き元: 食品番号 99999（現在の食品データにはありません）",
      );
    else await expect(remembered.getByText(/下書き元:/)).toHaveCount(0);
    await page.reload();
    await openTab(page, "ホーム");
    await expect(itemRow(page, food.name)).toHaveCount(1);
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("weekmeal:state")!),
    );
    expect(stored.items).toEqual([item]);
    expect(stored.manualFoods[0].nutrientsPer100g).toEqual(
      source.nutrientsPer100g,
    );
    if (sourceFoodId === "99999")
      expect(stored.manualFoods[0].sourceFoodId).toBe(sourceFoodId);
    else expect(stored.manualFoods[0]).not.toHaveProperty("sourceFoodId");
  });
}
