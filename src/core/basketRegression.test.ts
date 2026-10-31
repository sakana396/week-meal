import { describe, expect, it } from "vitest";
import type { FoodItem } from "../types";
import {
  basketReducer,
  initialAppState,
  toRegisteredItems,
  type AppState,
  type BasketAction,
} from "./basket";
import { defaultProfile } from "./profile";

const shoppingId = "s";
const empty: AppState = {
  ...initialAppState,
  shoppings: [
    { id: shoppingId, date: "2026-10-31", origin: "normal", items: [] },
  ],
};
const carrot: BasketAction = {
  type: "register",
  shoppingId,
  id: "r1",
  foodId: "06212",
  displayName: "にんじん",
};
const onion: BasketAction = {
  type: "register",
  shoppingId,
  id: "r2",
  foodId: "06153",
  displayName: "玉ねぎ",
};
const apply = (state: AppState, ...actions: BasketAction[]) =>
  actions.reduce(basketReducer, state);
const items = (state: AppState) => state.shoppings[0].items;
const food = (id: string) =>
  ({
    id,
    name: id,
    category: "野菜類",
    refusePct: 0,
    nutrientsPer100g: {},
  }) as FoodItem;

describe("旧登録ケースを買い物単位で検証（DES-SHP-02、03）", () => {
  it("TC-FR-ING-01-01 食材を個数 1 で一覧の先頭に足す", () => {
    expect(
      items(apply(empty, carrot, onion)).map((item) => [
        item.displayName,
        item.count,
      ]),
    ).toEqual([
      ["玉ねぎ", 1],
      ["にんじん", 1],
    ]);
  });
  it("TC-FR-ING-01-02 同じ食材をもう一度登録すると、行を増やさず個数を 1 増やす", () => {
    expect(items(apply(empty, carrot, { ...carrot, id: "r9" }))).toEqual([
      { id: "r1", foodId: "06212", displayName: "にんじん", count: 2 },
    ]);
  });
  it("TC-FR-ING-01-03 前の買い物と同じ食材を登録しても新しい買い物は個数 1（境界）", () => {
    const old = apply(empty, carrot, {
      type: "increment",
      shoppingId,
      id: "r1",
    });
    const two = apply(
      old,
      { type: "createShopping", id: "next", date: "2026-11-01" },
      { ...carrot, shoppingId: "next", id: "r9" },
    );
    expect(two.shoppings[0].items[0].count).toBe(1.5);
    expect(two.shoppings[1].items[0].count).toBe(1);
  });
  it("TC-FR-ING-01-04 同じ食材名でも食品番号が違えば別の行にする（詳細モードで別の状態を選んだとき）", () => {
    expect(
      items(apply(empty, carrot, { ...carrot, id: "r3", foodId: "06213" })),
    ).toHaveLength(2);
  });
  it("TC-FR-ING-01-05 再登録しても個数は 999 を超えない（境界）", () => {
    const first = apply(empty, carrot);
    const full = {
      ...first,
      shoppings: [
        {
          ...first.shoppings[0],
          items: [{ ...items(first)[0], count: 998.5 }],
        },
      ],
    };
    expect(items(apply(full, { ...carrot, id: "r9" }))[0].count).toBe(999);
    expect(
      apply(
        {
          ...full,
          shoppings: [
            {
              ...full.shoppings[0],
              items: [{ ...items(first)[0], count: 999 }],
            },
          ],
        },
        { ...carrot, id: "r9" },
      ).shoppings[0].items[0].count,
    ).toBe(999);
  });
  it.each([
    ["TC-FR-QTY-04-01 個数を 0.5 ずつ増やす", "increment", 1.5],
    ["TC-FR-QTY-04-02 個数を 0.5 ずつ減らす", "decrement", 0.5],
  ] as const)("%s", (_name, type, expected) => {
    expect(
      items(apply(empty, carrot, { type, shoppingId, id: "r1" }))[0].count,
    ).toBe(expected);
  });
  it("TC-FR-QTY-04-03 0.5 からは減らさない（境界）", () => {
    const min = apply(empty, carrot, {
      type: "decrement",
      shoppingId,
      id: "r1",
    });
    expect(apply(min, { type: "decrement", shoppingId, id: "r1" })).toBe(min);
  });
  it("TC-FR-QTY-04-04 999 からは増やさない（境界）", () => {
    const first = apply(empty, carrot);
    const full = {
      ...first,
      shoppings: [
        { ...first.shoppings[0], items: [{ ...items(first)[0], count: 999 }] },
      ],
    };
    expect(apply(full, { type: "increment", shoppingId, id: "r1" })).toBe(full);
  });
  it("TC-FR-ING-10-01 削除すると行がなくなる", () => {
    expect(
      items(apply(empty, carrot, { type: "remove", shoppingId, id: "r1" })),
    ).toEqual([]);
  });
  it.each([
    [
      "TC-FR-ING-10-02 知らない ID を増やそうとしても状態を変えない（異常）",
      "increment",
    ],
    [
      "TC-FR-ING-10-03 知らない ID を減らそうとしても状態を変えない（異常）",
      "decrement",
    ],
    [
      "TC-FR-ING-10-05 知らない ID を削除しても状態を変えない（異常）",
      "remove",
    ],
  ] as const)("%s", (_name, type) => {
    const before = apply(empty, carrot);
    expect(apply(before, { type, shoppingId, id: "unknown" })).toBe(before);
  });
  it("TC-FR-ING-10-04 知らない買い物 ID を指定しても状態を変えない（異常）", () => {
    const before = apply(empty, carrot);
    expect(
      apply(before, { type: "increment", shoppingId: "unknown", id: "r1" }),
    ).toBe(before);
    expect(
      apply(before, { type: "decrement", shoppingId: "unknown", id: "r1" }),
    ).toBe(before);
    expect(
      apply(before, { type: "remove", shoppingId: "unknown", id: "r1" }),
    ).toBe(before);
  });
  it.each([
    ["register", carrot],
    ["register", onion],
    ["increment", { type: "increment", shoppingId, id: "r1" }],
    ["decrement", { type: "decrement", shoppingId, id: "r1" }],
    ["remove", { type: "remove", shoppingId, id: "r1" }],
    [
      "setProfile",
      { type: "setProfile", profile: { ...defaultProfile, portion: "large" } },
    ],
    [
      "addManualFood",
      {
        type: "addManualFood",
        shoppingId,
        id: "m1",
        food: food("manual-1"),
        displayName: "自家製",
      },
    ],
    [
      "setShoppingDate",
      { type: "setShoppingDate", shoppingId, date: "2026-11-01" },
    ],
  ] as [string, BasketAction][])(
    "TC-FR-ING-10-06 引数の状態を変えない（%s）",
    (_type, action) => {
      const before = apply(empty, carrot);
      const snapshot = structuredClone(before);
      apply(before, action);
      expect(before).toEqual(snapshot);
    },
  );
  it("TC-FR-ING-08-01 手入力の食品を足し、個数 1 で登録する", () => {
    const manual = food("manual-1");
    const state = apply(empty, {
      type: "addManualFood",
      shoppingId,
      id: "m1",
      food: manual,
      displayName: "手入力",
    });
    expect(items(state)[0].count).toBe(1);
    expect(state.manualFoods).toEqual([manual]);
  });
  it("TC-FR-ING-08-02 手入力の食品の行を消しても、覚えた食品は残る", () => {
    const manual = food("manual-1");
    const added = apply(empty, {
      type: "addManualFood",
      shoppingId,
      id: "m1",
      food: manual,
      displayName: "手入力",
    });
    const removed = apply(added, { type: "remove", shoppingId, id: "m1" });
    expect(removed.manualFoods).toEqual([manual]);
  });
  it("TC-FR-ING-08-03 同じ手入力の食品をもう一度足しても、食品は 1 つのまま個数を増やす（境界）", () => {
    const action: BasketAction = {
      type: "addManualFood",
      shoppingId,
      id: "m1",
      food: food("manual-1"),
      displayName: "手入力",
    };
    const state = apply(empty, action, { ...action, id: "m2" });
    expect(state.manualFoods).toHaveLength(1);
    expect(items(state)[0].count).toBe(2);
  });
  it("TC-FR-ING-08-04 同じ手入力の食品をほかの行がまだ使っていれば、行を消しても食品は残す（境界）", () => {
    const action: BasketAction = {
      type: "addManualFood",
      shoppingId,
      id: "m1",
      food: food("manual-1"),
      displayName: "手入力",
    };
    const state = apply(
      empty,
      action,
      { ...action, id: "m2", displayName: "別名" },
      { type: "remove", shoppingId, id: "m1" },
    );
    expect(state.manualFoods).toHaveLength(1);
    expect(items(state)).toHaveLength(1);
  });
  it("TC-FR-ING-08-05 食品データの食品の行を消しても、手入力の食品は変わらない", () => {
    const action: BasketAction = {
      type: "addManualFood",
      shoppingId,
      id: "m1",
      food: food("manual-1"),
      displayName: "手入力",
    };
    const state = apply(empty, action, carrot);
    expect(
      apply(state, { type: "remove", shoppingId, id: "r1" }).manualFoods,
    ).toEqual(state.manualFoods);
  });
  it("TC-FR-STP-01-01 設定（主食・盛り・性別・年齢区分）を置き換える", () => {
    const profile = {
      ...defaultProfile,
      sex: "female" as const,
      staple: "bread" as const,
    };
    expect(apply(empty, { type: "setProfile", profile }).profile).toEqual(
      profile,
    );
  });
  it("TC-FR-SYS-01-01 状態をまるごと置き換える（保存データの読み込み）", () => {
    const state = apply(empty, carrot);
    expect(apply(empty, { type: "replace", state })).toBe(state);
  });
  it("TC-FR-NUT-06-03 食品データと手入力から食品を引き、見つからない行は除く", () => {
    const manual = food("manual-1");
    const state = apply(
      empty,
      carrot,
      {
        type: "addManualFood",
        shoppingId,
        id: "m1",
        food: manual,
        displayName: "手入力",
      },
      { ...onion, foodId: "missing" },
    );
    expect(
      toRegisteredItems(
        state.shoppings[0],
        state.manualFoods,
        new Map([["06212", food("06212")]]),
      ),
    ).toHaveLength(2);
  });
  it("TC-FR-ING-15-01 削除した食品を同じ ID で再登録でき、未登録の台帳は分析に混ざらない", () => {
    const manual = food("manual-1");
    const added = apply(empty, {
      type: "addManualFood",
      shoppingId,
      id: "m1",
      food: manual,
      displayName: "自家製",
    });
    const removed = apply(added, { type: "remove", shoppingId, id: "m1" });
    expect(removed.manualFoods).toEqual([manual]);
    expect(
      toRegisteredItems(removed.shoppings[0], removed.manualFoods, new Map()),
    ).toEqual([]);
    const restored = apply(removed, {
      type: "register",
      shoppingId,
      id: "m2",
      foodId: manual.id,
      displayName: "自家製",
    });
    expect(items(restored)[0]).toMatchObject({
      id: "m2",
      foodId: manual.id,
      count: 1,
    });
  });
  it.each(["同じ買い物", "別の買い物"] as const)(
    "TC-FR-ING-15-02 再登録で加算し台帳を増やさない（%s）",
    (target) => {
      const manual = food("manual-1");
      const added = apply(empty, {
        type: "addManualFood",
        shoppingId,
        id: "m1",
        food: manual,
        displayName: "自家製",
      });
      const before =
        target === "同じ買い物"
          ? added
          : apply(added, {
              type: "createShopping",
              id: "next",
              date: "2026-11-01",
            });
      const result = apply(before, {
        type: "register",
        shoppingId: target === "同じ買い物" ? shoppingId : "next",
        id: "m2",
        foodId: manual.id,
        displayName: "自家製",
      });
      expect(result.manualFoods).toBe(before.manualFoods);
      expect(
        result.shoppings[target === "同じ買い物" ? 0 : 1].items[0].count,
      ).toBe(target === "同じ買い物" ? 2 : 1);
    },
  );
  it("TC-FR-ING-15-03 同じ名前の新規手入力は別 ID で保存し覚えた順を保つ", () => {
    const first = { ...food("manual-first"), name: "自家製" };
    const second = { ...first, id: "manual-second" };
    const state = apply(
      empty,
      {
        type: "addManualFood",
        shoppingId,
        id: "first",
        food: first,
        displayName: "自家製",
      },
      {
        type: "addManualFood",
        shoppingId,
        id: "second",
        food: second,
        displayName: "自家製",
      },
    );
    expect(state.manualFoods.map((entry) => entry.id)).toEqual([
      "manual-second",
      "manual-first",
    ]);
    expect(items(state).map((entry) => entry.foodId)).toEqual([
      "manual-second",
      "manual-first",
    ]);
  });
});
