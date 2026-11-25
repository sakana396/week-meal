import { expect, it } from "vitest";
import type { BasketEntry } from "../core/basket";
import type { FoodItem } from "../types";
import { itemNames } from "./itemNames";

it("TC-FR-UI-10-05 詳細を取得できない同名行に表示順の番号を付ける", () => {
  const items: BasketEntry[] = ["a", "b"].map((id) => ({
    id,
    foodId: id,
    displayName: "不明",
    quantity: { kind: "count", count: 1 },
  }));
  expect(itemNames(items, () => undefined)).toEqual([
    { detail: null, name: "不明 1 行目" },
    { detail: null, name: "不明 2 行目" },
  ]);
});

const foods: Record<string, FoodItem> = {
  manual: {
    id: "manual-1",
    name: "豚肉",
    category: "手入力",
    refusePct: null,
    nutrientsPer100g: {} as FoodItem["nutrientsPer100g"],
  },
  other: {
    id: "other",
    name: "別の詳細",
    category: "",
    refusePct: null,
    nutrientsPer100g: {} as FoodItem["nutrientsPer100g"],
  },
};
const rows: BasketEntry[] = ["a", "b", "c", "d"].map((id) => ({
  id,
  foodId: id === "b" ? "other" : "manual",
  displayName: "豚肉",
  quantity: { kind: "count", count: 1 },
}));

it.each([
  {
    label: "削除前",
    ids: ["a", "b", "c", "d"],
    expected: [
      "豚肉 手入力 1 行目",
      "豚肉 別の詳細",
      "豚肉 手入力 3 行目",
      "豚肉 手入力 4 行目",
    ],
  },
  {
    label: "先頭の重複行を削除後",
    ids: ["b", "c", "d"],
    expected: ["豚肉 別の詳細", "豚肉 手入力 2 行目", "豚肉 手入力 3 行目"],
  },
  {
    label: "行を並べ替え後",
    ids: ["d", "b", "a", "c"],
    expected: [
      "豚肉 手入力 1 行目",
      "豚肉 別の詳細",
      "豚肉 手入力 3 行目",
      "豚肉 手入力 4 行目",
    ],
  },
])("TC-FR-UI-10-05 $label の番号と行 ID の対応", ({ ids, expected }) => {
  const items = ids.map((id) => rows.find((row) => row.id === id)!);
  const names = itemNames(items, (id) => foods[id]);
  expect(items.map((item, index) => [item.id, names[index].name])).toEqual(
    ids.map((id, index) => [id, expected[index]]),
  );
});
