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
  it.each([
    [
      { kind: "count" as const, count: 998.5 },
      { kind: "count", count: 999 },
    ],
    [
      { kind: "weight" as const, grams: 99950, unit: "g" as const },
      { kind: "weight", grams: 100000, unit: "g" },
    ],
  ])(
    "TC-FR-QTY-07-03 登録で上限の手前から上限に達する %#",
    (quantity, expected) => {
      const before = basketReducer(first, {
        type: "setQuantity",
        shoppingId: "s",
        id: "r",
        quantity,
      });
      const after = basketReducer(before, {
        type: "register",
        shoppingId: "s",
        id: "unused",
        foodId: "06212",
        displayName: "にんじん",
      });
      expect(after.shoppings[0].items[0].quantity).toEqual(expected);
      expect(after.shoppings[0].items).toHaveLength(1);
      expect(before.shoppings[0].items[0].quantity).toEqual(quantity);
    },
  );
  it("TC-FR-QTY-07-03 未知の行 ID と重さの上限では変更しない", () => {
    const unknown = basketReducer(first, {
      type: "setQuantity",
      shoppingId: "s",
      id: "missing",
      quantity: { kind: "count", count: 2 },
    });
    expect(unknown).toBe(first);
    const maximum = basketReducer(first, {
      type: "setQuantity",
      shoppingId: "s",
      id: "r",
      quantity: { kind: "weight", grams: 100000, unit: "g" },
    });
    expect(
      basketReducer(maximum, {
        type: "register",
        shoppingId: "s",
        id: "unused",
        foodId: "06212",
        displayName: "にんじん",
      }),
    ).toBe(maximum);
  });
  it("TC-FR-ING-01-13 既存の同じ食材なら他の買い物の行 ID と重複しても加算する", () => {
    const other = basketReducer(first, {
      type: "createShopping",
      id: "t",
      date: "2026-11-02",
    });
    const withDuplicate = basketReducer(other, {
      type: "register",
      shoppingId: "t",
      id: "x",
      foodId: "06061",
      displayName: "キャベツ",
    });
    const added = basketReducer(withDuplicate, {
      type: "register",
      shoppingId: "s",
      id: "x",
      foodId: "06212",
      displayName: "にんじん",
    });
    expect(added.shoppings[0].items[0].quantity).toEqual({
      kind: "count",
      count: 2,
    });
    expect(added.shoppings[1]).toBe(withDuplicate.shoppings[1]);
  });
  it("TC-FR-ING-01-13 新しい食材の行 ID が他の買い物と重複すると変更しない", () => {
    const other = basketReducer(first, {
      type: "createShopping",
      id: "t",
      date: "2026-11-02",
    });
    const withDuplicate = basketReducer(other, {
      type: "register",
      shoppingId: "t",
      id: "x",
      foodId: "06061",
      displayName: "キャベツ",
    });
    expect(
      basketReducer(withDuplicate, {
        type: "register",
        shoppingId: "s",
        id: "x",
        foodId: "12004",
        displayName: "鶏卵",
      }),
    ).toBe(withDuplicate);
  });
});
