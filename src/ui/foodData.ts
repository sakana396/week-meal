import foodsJson from "../data/foods.json";
import type { FoodItem } from "../types";

/** 食品データ（文科省の成分表から絞り込んだもの） */
export const baseFoods = foodsJson as FoodItem[];

/** 食品番号から食品を引く表 */
export const foodsById: ReadonlyMap<string, FoodItem> = new Map(
  baseFoods.map((food) => [food.id, food]),
);

/** 食品データにある食品番号（保存データの検査に使う） */
export const knownFoodIds: ReadonlySet<string> = new Set(foodsById.keys());
