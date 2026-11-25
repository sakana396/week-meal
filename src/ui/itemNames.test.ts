import { expect, it } from "vitest";
import type { BasketEntry } from "../core/basket";
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
