import { nutrientDefinitions } from "../data/nutrients";
import type { ManualFood } from "./manualFoods";
import { describe, expect, it } from "vitest";
import { initialAppState, type BasketEntry } from "./basket";
import {
  basketSessionReducer,
  type BasketSessionAction,
  type BasketSessionState,
} from "./basketSession";

const nutrients = Object.fromEntries(
  nutrientDefinitions.map(({ key }) => [key, null]),
) as ManualFood["nutrientsPer100g"];

const entries: BasketEntry[] = ["先頭", "中間", "末尾"].map(
  (displayName, i) => ({
    id: `row-${i}`,
    foodId: `food-${i}`,
    displayName,
    count: 1.5,
    usedUp: false,
  }),
);
const initial = (): BasketSessionState => ({
  appState: { ...initialAppState, items: structuredClone(entries) },
  pendingRemoval: null,
});
const remove = (state = initial()) =>
  basketSessionReducer(state, { type: "remove", id: "row-1" });

describe("削除の取り消し（DES-BSK-09）", () => {
  it("TC-FR-ING-14-01 同じ行を同じ添字に復元し入力を変えない", () => {
    const before = initial();
    const copy = structuredClone(before);
    const removed = remove(before);
    expect(removed.pendingRemoval).toEqual({ entry: entries[1], index: 1 });
    expect(removed.appState.items).toEqual([entries[0], entries[2]]);
    expect(basketSessionReducer(removed, { type: "undoRemove" })).toEqual(
      before,
    );
    expect(before).toEqual(copy);
    expect(removed.pendingRemoval).not.toBeNull();
  });

  it.each([false, true])(
    "TC-FR-ING-14-02 手入力の成分・来歴と usedUp=%s を保持する",
    (usedUp) => {
      const before = initial();
      before.appState.items[1] = {
        ...entries[1],
        foodId: "manual-food",
        usedUp,
      };
      before.appState.manualFoods = [
        {
          id: "manual-food",
          name: "手入力",
          category: "手入力 / 野菜",
          refusePct: null,
          nutrientsPer100g: nutrients,
          sourceFoodId: "06212",
        },
      ];
      const removed = remove(before);
      expect(removed.appState.manualFoods).toEqual(before.appState.manualFoods);
      expect(basketSessionReducer(removed, { type: "undoRemove" })).toEqual(
        before,
      );
    },
  );

  it("TC-FR-ING-14-03 連続削除は直前の 1 件だけ復元する", () => {
    const removed = basketSessionReducer(remove(), {
      type: "remove",
      id: "row-2",
    });
    const restored = basketSessionReducer(removed, { type: "undoRemove" });
    expect(restored.appState.items).toEqual([entries[0], entries[2]]);
    expect(restored.pendingRemoval).toBeNull();
  });

  it.each([
    { type: "register", id: "new", foodId: "food-0", displayName: "先頭" },
    { type: "register", id: "new", foodId: "new", displayName: "新規" },
    {
      type: "addManualFood",
      id: "new",
      displayName: "手入力",
      food: {
        id: "manual-new",
        name: "手入力",
        category: "手入力 / 野菜",
        refusePct: null,
        nutrientsPer100g: nutrients,
      },
    },
    { type: "increment", id: "row-0" },
    { type: "decrement", id: "row-0" },
    { type: "toggleUsedUp", id: "row-0" },
  ] satisfies BasketSessionAction[])(
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
    expect(changed.pendingRemoval).toEqual(removed.pendingRemoval);
    expect(
      basketSessionReducer(changed, { type: "undoRemove" }).appState,
    ).toEqual({ ...initial().appState, profile });
    expect(
      basketSessionReducer(removed, {
        type: "replace",
        state: initialAppState,
      }),
    ).toEqual({ appState: initialAppState, pendingRemoval: null });
  });

  it.each([
    { type: "remove", id: "unknown" },
    { type: "increment", id: "unknown" },
    { type: "decrement", id: "unknown" },
    { type: "toggleUsedUp", id: "unknown" },
    { type: "increment", id: "row-0" },
    { type: "decrement", id: "row-2" },
    { type: "register", id: "new", foodId: "food-0", displayName: "先頭" },
    {
      type: "addManualFood",
      id: "new",
      displayName: "先頭",
      food: {
        id: "food-0",
        name: "先頭",
        category: "手入力 / 野菜",
        refusePct: null,
        nutrientsPer100g: nutrients,
      },
    },
  ] satisfies BasketSessionAction[])(
    "TC-FR-ING-14-04 無効・上限下限の $type は対象を保持する",
    (action) => {
      const before = initial();
      before.appState.items[0].count = 999;
      before.appState.items[2].count = 0.5;
      const removed = remove(before);
      const copy = structuredClone(removed);
      expect(basketSessionReducer(removed, action).pendingRemoval).toEqual(
        removed.pendingRemoval,
      );
      expect(removed).toEqual(copy);
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
});
