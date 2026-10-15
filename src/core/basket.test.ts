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

function food(id: string): FoodItem {
  return {
    id,
    name: id,
    category: "野菜類",
    refusePct: 0,
    nutrientsPer100g: {},
  } as FoodItem;
}

function apply(state: AppState, ...actions: BasketAction[]) {
  return actions.reduce(basketReducer, state);
}

const carrot: BasketAction = {
  type: "register",
  id: "r1",
  foodId: "06212",
  displayName: "にんじん",
};
const onion: BasketAction = {
  type: "register",
  id: "r2",
  foodId: "06153",
  displayName: "玉ねぎ",
};

describe("basketReducer の登録（DES-BSK-01）", () => {
  it("TC-FR-ING-01-01 食材を個数 1 で一覧の先頭に足す", () => {
    const state = apply(initialAppState, carrot, onion);
    expect(
      state.items.map((item) => [item.displayName, item.count, item.usedUp]),
    ).toEqual([
      ["玉ねぎ", 1, false],
      ["にんじん", 1, false],
    ]);
  });

  it("TC-FR-ING-01-02 同じ食材をもう一度登録すると、行を増やさず個数を 1 増やす", () => {
    const state = apply(initialAppState, carrot, { ...carrot, id: "r9" });
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({ id: "r1", count: 2 });
  });

  it("TC-FR-ING-01-03 使い切った食材をもう一度登録すると、使い切ったを外して個数 1 に戻す（境界）", () => {
    const state = apply(
      initialAppState,
      carrot,
      { type: "increment", id: "r1" },
      { type: "toggleUsedUp", id: "r1" },
      { ...carrot, id: "r9" },
    );
    expect(state.items[0]).toMatchObject({ count: 1, usedUp: false });
  });

  it("TC-FR-ING-01-05 再登録しても個数は 999 を超えない（境界）", () => {
    const base = apply(initialAppState, carrot);
    const state = { ...base, items: [{ ...base.items[0], count: 998.5 }] };
    expect(basketReducer(state, { ...carrot, id: "r9" }).items[0].count).toBe(
      999,
    );
  });

  it("TC-FR-ING-01-04 同じ食材名でも食品番号が違えば別の行にする（詳細モードで別の状態を選んだとき）", () => {
    const boiled: BasketAction = {
      type: "register",
      id: "r3",
      foodId: "06213",
      displayName: "にんじん",
    };
    expect(apply(initialAppState, carrot, boiled).items).toHaveLength(2);
  });
});

describe("basketReducer の個数・使い切った・削除（DES-BSK-02〜04）", () => {
  it("TC-FR-QTY-04-01 個数を 0.5 ずつ増やす", () => {
    const state = apply(initialAppState, carrot, {
      type: "increment",
      id: "r1",
    });
    expect(state.items[0].count).toBe(1.5);
  });

  it("TC-FR-QTY-04-02 個数を 0.5 ずつ減らす", () => {
    const state = apply(initialAppState, carrot, {
      type: "decrement",
      id: "r1",
    });
    expect(state.items[0].count).toBe(0.5);
  });

  it("TC-FR-QTY-04-03 0.5 からは減らさない（境界）", () => {
    const state = apply(
      initialAppState,
      carrot,
      { type: "decrement", id: "r1" },
      { type: "decrement", id: "r1" },
    );
    expect(state.items[0].count).toBe(0.5);
  });

  it("TC-FR-QTY-04-04 999 からは増やさない（境界）", () => {
    const at999 = apply(initialAppState, carrot);
    const state = { ...at999, items: [{ ...at999.items[0], count: 999 }] };
    expect(
      basketReducer(state, { type: "increment", id: "r1" }).items[0].count,
    ).toBe(999);
  });

  it("TC-FR-ING-11-01 使い切ったにすると、行は残して使い切ったにする", () => {
    const state = apply(initialAppState, carrot, {
      type: "toggleUsedUp",
      id: "r1",
    });
    expect(state.items[0]).toMatchObject({ usedUp: true, count: 1 });
  });

  it("TC-FR-ING-12-01 使い切ったは 1 回の操作で取り消せる", () => {
    const state = apply(
      initialAppState,
      carrot,
      { type: "toggleUsedUp", id: "r1" },
      { type: "toggleUsedUp", id: "r1" },
    );
    expect(state.items[0].usedUp).toBe(false);
  });

  it("TC-FR-ING-10-01 削除すると行がなくなる", () => {
    const state = apply(initialAppState, carrot, onion, {
      type: "remove",
      id: "r1",
    });
    expect(state.items.map((item) => item.id)).toEqual(["r2"]);
  });

  it.each<[string, BasketAction]>([
    [
      "TC-FR-ING-10-02 知らない ID を増やそうとしても状態を変えない（異常）",
      { type: "increment", id: "x" },
    ],
    [
      "TC-FR-ING-10-03 知らない ID を減らそうとしても状態を変えない（異常）",
      { type: "decrement", id: "x" },
    ],
    [
      "TC-FR-ING-10-04 知らない ID を使い切ったにしても状態を変えない（異常）",
      { type: "toggleUsedUp", id: "x" },
    ],
    [
      "TC-FR-ING-10-05 知らない ID を削除しても状態を変えない（異常）",
      { type: "remove", id: "x" },
    ],
  ])("%s", (_title, action) => {
    const state = apply(initialAppState, carrot);
    expect(basketReducer(state, action)).toBe(state);
  });

  function deepFreeze<T>(value: T): T {
    if (typeof value === "object" && value !== null) {
      Object.values(value).forEach(deepFreeze);
      Object.freeze(value);
    }
    return value;
  }

  it.each<BasketAction>([
    { ...carrot, id: "r9" },
    { type: "register", id: "r8", foodId: "06153", displayName: "玉ねぎ" },
    { type: "increment", id: "r1" },
    { type: "decrement", id: "r1" },
    { type: "toggleUsedUp", id: "r1" },
    { type: "remove", id: "r1" },
    {
      type: "addManualFood",
      id: "m9",
      food: food("manual-9"),
      displayName: "手入力",
    },
    { type: "setProfile", profile: { ...defaultProfile, sex: "male" } },
  ])("TC-FR-ING-10-06 引数の状態を変えない（$type）", (action) => {
    const state = deepFreeze(apply(initialAppState, carrot));
    const snapshot = structuredClone(state);
    expect(() => basketReducer(state, action)).not.toThrow();
    expect(state).toEqual(snapshot);
  });
});

describe("basketReducer の手入力と設定（DES-BSK-04, 05）", () => {
  const manual: BasketAction = {
    type: "addManualFood",
    id: "m1",
    food: food("manual-1"),
    displayName: "自家製ぬか漬け",
  };

  it("TC-FR-ING-08-01 手入力の食品を足し、個数 1 で登録する", () => {
    const state = apply(initialAppState, manual);
    expect(state.manualFoods.map((item) => item.id)).toEqual(["manual-1"]);
    expect(state.items[0]).toMatchObject({
      foodId: "manual-1",
      displayName: "自家製ぬか漬け",
      count: 1,
    });
  });

  it("TC-FR-ING-08-02 手入力の食品の行を消すと、手入力の食品も消す", () => {
    const state = apply(initialAppState, manual, { type: "remove", id: "m1" });
    expect(state.manualFoods).toEqual([]);
  });

  it("TC-FR-ING-08-03 同じ手入力の食品をもう一度足しても、食品は 1 つのまま個数を増やす（境界）", () => {
    const state = apply(initialAppState, manual, { ...manual, id: "m2" });
    expect(state.manualFoods).toHaveLength(1);
    expect(state.items[0].count).toBe(2);
  });

  it("TC-FR-ING-08-04 同じ手入力の食品をほかの行がまだ使っていれば、行を消しても食品は残す（境界）", () => {
    const shared = food("manual-2");
    const state = apply(
      initialAppState,
      {
        type: "addManualFood",
        id: "a",
        food: shared,
        displayName: "スープ（朝）",
      },
      {
        type: "addManualFood",
        id: "b",
        food: shared,
        displayName: "スープ（夜）",
      },
      { type: "remove", id: "a" },
    );
    expect(state.manualFoods.map((item) => item.id)).toEqual(["manual-2"]);
    expect(state.items.map((item) => item.id)).toEqual(["b"]);
  });

  it("TC-FR-ING-08-05 食品データの食品の行を消しても、手入力の食品は変わらない", () => {
    const state = apply(initialAppState, manual, carrot, {
      type: "remove",
      id: "r1",
    });
    expect(state.manualFoods.map((item) => item.id)).toEqual(["manual-1"]);
  });

  it("TC-FR-STP-01-01 設定（主食・盛り・性別・年齢区分）を置き換える", () => {
    const profile = {
      staple: "bread" as const,
      portion: "large" as const,
      sex: "female" as const,
      ageGroup: "65-74" as const,
    };
    expect(
      apply(initialAppState, { type: "setProfile", profile }).profile,
    ).toEqual(profile);
  });

  it("TC-FR-SYS-01-01 状態をまるごと置き換える（保存データの読み込み）", () => {
    const loaded = apply(initialAppState, carrot);
    expect(
      basketReducer(initialAppState, { type: "replace", state: loaded }),
    ).toBe(loaded);
  });
});

describe("toRegisteredItems（DES-BSK-07）", () => {
  it("TC-FR-NUT-06-03 食品データと手入力から食品を引き、見つからない行は除く", () => {
    const state = apply(
      initialAppState,
      carrot,
      {
        type: "register",
        id: "r4",
        foodId: "99999",
        displayName: "なくなった食品",
      },
      {
        type: "addManualFood",
        id: "m1",
        food: food("manual-1"),
        displayName: "自家製",
      },
      { type: "toggleUsedUp", id: "r1" },
      { type: "increment", id: "r1" },
    );
    const foods = new Map([["06212", food("06212")]]);
    expect(
      toRegisteredItems(state, foods).map((item) => [
        item.displayName,
        item.food.id,
        item.count,
        item.usedUp,
      ]),
    ).toEqual([
      ["自家製", "manual-1", 1, false],
      ["にんじん", "06212", 1.5, true],
    ]);
  });
});
