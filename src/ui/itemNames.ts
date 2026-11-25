import type { BasketEntry } from "../core/basket";
import { foodPresentation } from "../core/catalog";
import type { FoodItem } from "../types";

/** 同名行の詳細と操作の識別名を表示順に求める（DES-UI-53）。 */
export function itemNames(
  items: BasketEntry[],
  findFood: (id: string) => FoodItem | undefined,
): { detail: string | null; name: string }[] {
  const counts = new Map<string, number>();
  for (const item of items)
    counts.set(item.displayName, (counts.get(item.displayName) ?? 0) + 1);
  const rows = items.map((item) => {
    const food =
      (counts.get(item.displayName) ?? 0) > 1
        ? findFood(item.foodId)
        : undefined;
    const detail = food
      ? food.id.startsWith("manual-")
        ? "手入力"
        : foodPresentation(food.name, food.category).details || food.name
      : null;
    return {
      detail,
      name: detail ? `${item.displayName} ${detail}` : item.displayName,
    };
  });
  const duplicates = new Map<string, Map<string, number>>();
  rows.forEach((row, index) => {
    const displayName = items[index].displayName;
    const group = duplicates.get(displayName) ?? new Map<string, number>();
    group.set(row.name, (group.get(row.name) ?? 0) + 1);
    duplicates.set(displayName, group);
  });
  const positions = new Map<string, number>();
  return rows.map((row, index) => {
    const displayName = items[index].displayName;
    const position = (positions.get(displayName) ?? 0) + 1;
    positions.set(displayName, position);
    return (duplicates.get(displayName)?.get(row.name) ?? 0) > 1
      ? { ...row, name: `${row.name} ${position} 行目` }
      : row;
  });
}
