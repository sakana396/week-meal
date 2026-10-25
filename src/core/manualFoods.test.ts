import { expect, it } from "vitest";
import { registrableShelves } from "./catalog";
import { manualFoodShelf } from "./manualFoods";
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
