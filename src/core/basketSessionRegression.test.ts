import { describe, expect, it } from "vitest";
import type { NutrientsPer100g } from "../types";
import { basketReducer, initialAppState, type BasketAction } from "./basket";
import {
  basketSessionReducer,
  type BasketSessionAction,
  type BasketSessionState,
} from "./basketSession";

const id = "s";
const empty = basketReducer(initialAppState, {
  type: "createShopping",
  id,
  date: "2026-10-31",
});
const entries = [
  { id: "row-0", foodId: "f0", displayName: "先頭", count: 999 },
  { id: "row-1", foodId: "f1", displayName: "中央", count: 1 },
  { id: "row-2", foodId: "f2", displayName: "末尾", count: 0.5 },
];
const initial = (): BasketSessionState => ({
  appState: {
    ...empty,
    shoppings: [{ ...empty.shoppings[0], items: structuredClone(entries) }],
  },
  pendingRemoval: null,
});
const remove = (state = initial()) =>
  basketSessionReducer(state, { type: "remove", shoppingId: id, id: "row-1" });
const rows = (state: BasketSessionState) => state.appState.shoppings[0].items;

describe("旧取り消しケースを買い物単位で検証（DES-SHP-02）", () => {
  it("TC-FR-ING-14-01 同じ行を同じ添字に復元し入力を変えない", () => {
    const before = initial();
    const snapshot = structuredClone(before);
    const restored = basketSessionReducer(remove(before), {
      type: "undoRemove",
    });
    expect(rows(restored)).toEqual(entries);
    expect(before).toEqual(snapshot);
  });
  it.each(["normal", "usedUpMigration"] as const)(
    "TC-FR-ING-14-02 手入力の成分・来歴と %s の買い物を保持する",
    (origin) => {
      const before = initial();
      before.appState.shoppings[0].origin = origin;
      const manual = {
        id: "manual-1",
        name: "自家製",
        category: "手入力 / 野菜",
        refusePct: null,
        nutrientsPer100g: {
          energyKcal: 30,
        } as NutrientsPer100g,
        sourceFoodId: "06212",
      };
      before.appState.manualFoods = [manual];
      before.appState.shoppings[0].items[1].foodId = manual.id;
      const restored = basketSessionReducer(remove(before), {
        type: "undoRemove",
      });
      expect(restored.appState.shoppings[0].origin).toBe(origin);
      expect(rows(restored)).toEqual(before.appState.shoppings[0].items);
      expect(restored.appState.manualFoods).toEqual([manual]);
    },
  );
  it.each([
    {
      type: "register",
      shoppingId: id,
      id: "new",
      foodId: "f3",
      displayName: "新規",
    },
    {
      type: "addManualFood",
      shoppingId: id,
      id: "new",
      displayName: "手入力",
      food: {
        id: "manual-1",
        name: "手入力",
        category: "手入力 / 野菜",
        refusePct: null,
        nutrientsPer100g: {},
      },
    },
    { type: "increment", shoppingId: id, id: "row-2" },
    { type: "decrement", shoppingId: id, id: "row-0" },
  ] as BasketAction[])(
    "TC-FR-ING-14-03 有効な $type は取り消し対象を消す",
    (action) => {
      expect(basketSessionReducer(remove(), action).pendingRemoval).toBeNull();
    },
  );
  it("TC-FR-ING-14-03 設定変更を保ったまま行だけ復元し replace は対象を消す", () => {
    const removed = remove();
    const profile = { ...removed.appState.profile, portion: "large" as const };
    const changed = basketSessionReducer(removed, {
      type: "setProfile",
      profile,
    });
    expect(
      basketSessionReducer(changed, { type: "undoRemove" }).appState.profile,
    ).toEqual(profile);
    expect(rows(basketSessionReducer(changed, { type: "undoRemove" }))).toEqual(
      entries,
    );
    expect(
      basketSessionReducer(removed, { type: "replace", state: empty })
        .pendingRemoval,
    ).toBeNull();
  });
  it("TC-FR-ING-14-03 連続削除は直前の 1 件だけ復元する", () => {
    const twice = basketSessionReducer(remove(), {
      type: "remove",
      shoppingId: id,
      id: "row-2",
    });
    expect(rows(basketSessionReducer(twice, { type: "undoRemove" }))).toEqual([
      entries[0],
      entries[2],
    ]);
  });
  it.each([
    { type: "remove", shoppingId: id, id: "unknown" },
    { type: "increment", shoppingId: id, id: "unknown" },
    { type: "decrement", shoppingId: id, id: "unknown" },
    { type: "increment", shoppingId: id, id: "row-0" },
    { type: "decrement", shoppingId: id, id: "row-2" },
    {
      type: "register",
      shoppingId: id,
      id: "new",
      foodId: "f0",
      displayName: "先頭",
    },
    {
      type: "addManualFood",
      shoppingId: id,
      id: "new",
      displayName: "先頭",
      food: {
        id: "f0",
        name: "先頭",
        category: "手入力 / 野菜",
        refusePct: null,
        nutrientsPer100g: {},
      },
    },
    { type: "setShoppingDate", shoppingId: "unknown", date: "2026-11-01" },
  ] as BasketSessionAction[])(
    "TC-FR-ING-14-04 無効・上限下限の $type は対象を保持する",
    (action) => {
      const removed = remove();
      const before = structuredClone(removed);
      expect(basketSessionReducer(removed, action).pendingRemoval).toEqual(
        removed.pendingRemoval,
      );
      expect(removed).toEqual(before);
    },
  );
  it("TC-FR-ING-14-04 空の復元・二重復元は何もしない", () => {
    const before = initial();
    expect(basketSessionReducer(before, { type: "undoRemove" })).toBe(before);
    const restored = basketSessionReducer(remove(), { type: "undoRemove" });
    expect(basketSessionReducer(restored, { type: "undoRemove" })).toBe(
      restored,
    );
  });
  it("TC-FR-ING-14-03 別の買い物の登録でも取り消し対象を消す", () => {
    const withOther = basketReducer(initial().appState, {
      type: "createShopping",
      id: "other",
      date: "2026-10-31",
    });
    const removed = remove({ appState: withOther, pendingRemoval: null });
    const edited = basketSessionReducer(removed, {
      type: "register",
      shoppingId: "other",
      id: "new",
      foodId: "f3",
      displayName: "新規",
    });
    expect(edited.pendingRemoval).toBeNull();
  });
});
