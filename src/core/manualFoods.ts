import type { FoodShelf } from "../data/foodShelves";
import type { FoodItem } from "../types";
import { registrableShelves } from "./catalog";

/** 覚えた手入力食品と任意の下書き元（DES-MAN-01, 02、DES-STO-08）。 */
export type ManualFood = FoodItem & { sourceFoodId?: string };

/** 完全一致する手入力の棚だけを返す（DES-UI-43）。旧データの未知の分類は null。 */
export function manualFoodShelf(food: FoodItem): FoodShelf | null {
  return (
    registrableShelves.find((shelf) => food.category === `手入力 / ${shelf}`) ??
    null
  );
}
