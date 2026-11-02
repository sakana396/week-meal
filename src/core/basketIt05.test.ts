import { describe, expect, it } from "vitest";
import { basketReducer, initialAppState } from "./basket";
import { basketSessionReducer } from "./basketSession";

const first = basketReducer(initialAppState, {
  type: "register",
  shoppingId: "s",
  initialShopping: { id: "s", date: "2026-11-03" },
  id: "r",
  foodId: "06212",
  displayName: "にんじん",
});

describe("量の reducer（DES-QTY-06）", () => {
  it("TC-FR-QTY-07-03 重さの行を削除して取り消すと量ごと戻る", () => {
    const weighted = basketReducer(first, {
      type: "setQuantity",
      shoppingId: "s",
      id: "r",
      quantity: { kind: "weight", grams: 2250, unit: "kg" },
    });
    const removed = basketSessionReducer(
      { appState: weighted, pendingRemoval: null },
      { type: "remove", shoppingId: "s", id: "r" },
    );
    const restored = basketSessionReducer(removed, { type: "undoRemove" });
    expect(restored.appState.shoppings[0].items[0].quantity).toEqual({
      kind: "weight",
      grams: 2250,
      unit: "kg",
    });
  });
  it.each([
    [{ kind: "weight" as const, grams: 2000, unit: "g" as const }, true],
    [{ kind: "weight" as const, grams: 0, unit: "g" as const }, false],
    [{ kind: "weight" as const, grams: 1.5, unit: "kg" as const }, false],
    [{ kind: "count" as const, count: 0.3 }, false],
  ])("TC-FR-QTY-07-03 量の直接指定を検査する %#", (quantity, accepted) => {
    const result = basketReducer(first, {
      type: "setQuantity",
      shoppingId: "s",
      id: "r",
      quantity,
    });
    expect(result !== first).toBe(accepted);
  });
  it("TC-FR-QTY-07-03 重さの行に 1 回押しで 1 単位の購入時重量を足す", () => {
    const weighted = basketReducer(first, {
      type: "setQuantity",
      shoppingId: "s",
      id: "r",
      quantity: { kind: "weight", grams: 2000, unit: "g" },
    });
    const added = basketReducer(weighted, {
      type: "register",
      shoppingId: "s",
      id: "r",
      foodId: "06212",
      displayName: "にんじん",
    });
    expect(added.shoppings[0].items[0].quantity).toEqual({
      kind: "weight",
      grams: 2000 + 150,
      unit: "g",
    });
  });
  it("TC-FR-ING-01-13 同じ食材の加算は他の買い物の行 ID と重複しても行う", () => {
    const other = basketReducer(first, {
      type: "createShopping",
      id: "t",
      date: "2026-11-02",
    });
    const added = basketReducer(other, {
      type: "register",
      shoppingId: "s",
      id: "r",
      foodId: "06212",
      displayName: "にんじん",
    });
    expect(added.shoppings[0].items[0].quantity).toEqual({
      kind: "count",
      count: 2,
    });
  });
});
