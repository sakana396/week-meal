import { expect, it } from "vitest";
import { registrableShelves } from "./catalog";
import { manualDraftFrom, manualFoodShelf } from "./manualFoods";
import { nutrientDefinitions } from "../data/nutrients";
import type { FoodItem } from "../types";

it.each(registrableShelves)(
  "TC-FR-ING-15-05 棚 %s を完全一致で解釈し食品を変更しない",
  (shelf) => {
    const food = Object.freeze({ category: `手入力 / ${shelf}` }) as FoodItem;
    expect(manualFoodShelf(food)).toBe(shelf);
    expect(food.category).toBe(`手入力 / ${shelf}`);
  },
);

it.each([
  "",
  "野菜類",
  "手入力 / 未対応",
  "手入力/野菜",
  "手入力 / 野菜 ",
  "手入力 / 米・パン・麺",
  "手入力 / ",
])("TC-FR-ING-15-06 不明な分類 %s は null", (category) =>
  expect(manualFoodShelf({ category } as FoodItem)).toBeNull(),
);

it.each([0, 12.5, null])(
  "TC-FR-ING-16-01 全成分の写しと来歴を返し原典を変更しない（%s）",
  (value) => {
    const nutrients = Object.freeze(
      Object.fromEntries(nutrientDefinitions.map(({ key }) => [key, value])),
    ) as FoodItem["nutrientsPer100g"];
    const food = Object.freeze({
      id: "01001",
      name: "原典",
      category: "穀類",
      refusePct: 20,
      nutrientsPer100g: nutrients,
    });
    const draft = manualDraftFrom(food);
    expect(draft).toEqual({
      nutrientsPer100g: nutrients,
      sourceFoodId: "01001",
    });
    expect(draft.nutrientsPer100g).not.toBe(nutrients);
    draft.nutrientsPer100g.energyKcal = 999;
    expect(food.nutrientsPer100g.energyKcal).toBe(value);
  },
);

it("TC-FR-ING-16-02 別食品の下書きは前の下書きと独立して全成分を置き換える", () => {
  const food = {
    id: "first",
    nutrientsPer100g: Object.fromEntries(
      nutrientDefinitions.map(({ key }) => [key, 1]),
    ),
  } as FoodItem;
  const first = manualDraftFrom(food);
  const second = manualDraftFrom({
    ...food,
    id: "second",
    nutrientsPer100g: { ...food.nutrientsPer100g, energyKcal: null },
  });
  expect(second.sourceFoodId).toBe("second");
  expect(second.nutrientsPer100g).toEqual({
    ...first.nutrientsPer100g,
    energyKcal: null,
  });
  expect(first.sourceFoodId).toBe("first");
  expect(first.nutrientsPer100g.energyKcal).toBe(1);
});
