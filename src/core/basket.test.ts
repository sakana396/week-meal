import { describe, expect, it } from "vitest";
import foodsJson from "../data/foods.json";
import type { FoodItem } from "../types";
import {
  basketReducer,
  initialAppState,
  latestShopping,
  toRegisteredItems,
  validShoppingDate,
  type AppState,
} from "./basket";
import { defaultProfile } from "./profile";
import { analyzeShopping } from "./shoppingAnalysis";
import { suggestSupplements } from "./suggestions";

const today = "2026-10-31";
const base: AppState = {
  ...initialAppState,
  shoppings: [{ id: "a", date: today, origin: "normal", items: [] }],
};
const register = (shoppingId = "a", id = "r1") => ({
  type: "register" as const,
  shoppingId,
  id,
  foodId: "06212",
  displayName: "にんじん",
});

describe("買い物の状態（DES-SHP-01〜03）", () => {
  it("TC-FR-ING-17-01 新しい買い物は空で作成し入力を変えない", () => {
    const before = basketReducer(base, register());
    const after = basketReducer(before, {
      type: "createShopping",
      id: "b",
      date: today,
    });
    expect(after.shoppings[1]).toEqual({
      id: "b",
      date: today,
      origin: "normal",
      items: [],
    });
    expect(before.shoppings).toHaveLength(1);
    expect(
      basketReducer(after, { type: "createShopping", id: "b", date: today }),
    ).toBe(after);
  });
  it.each(["2026-02-29", "2026-13-01", "2026-04-31", "2026-1-01", ""])(
    "TC-FR-ING-18-01 不正日付 %s を拒否",
    (date) => {
      expect(validShoppingDate(date)).toBe(false);
      expect(
        basketReducer(base, { type: "setShoppingDate", shoppingId: "a", date }),
      ).toBe(base);
    },
  );
  it("TC-FR-ING-18-01 日付と同日の作成順で最新を選ぶ", () => {
    const two = basketReducer(base, {
      type: "createShopping",
      id: "b",
      date: today,
    });
    expect(latestShopping(two.shoppings)?.id).toBe("b");
    const changed = basketReducer(two, {
      type: "setShoppingDate",
      shoppingId: "a",
      date: "2026-11-01",
    });
    expect(latestShopping(changed.shoppings)?.id).toBe("a");
    expect(changed.shoppings.map((shopping) => shopping.id)).toEqual([
      "a",
      "b",
    ]);
    expect(
      basketReducer(changed, {
        type: "setShoppingDate",
        shoppingId: "missing",
        date: today,
      }),
    ).toBe(changed);
  });
  it("TC-FR-ING-17-02 初回登録で買い物を原子的に作る", () => {
    const action = { ...register(), initialShopping: { id: "a", date: today } };
    const state = basketReducer(initialAppState, action);
    expect(state.shoppings[0].items).toHaveLength(1);
    expect(basketReducer(initialAppState, register())).toBe(initialAppState);
  });
  it("TC-FR-ING-19-02 操作は指定した買い物だけに適用する", () => {
    const two = basketReducer(base, {
      type: "createShopping",
      id: "b",
      date: today,
    });
    const first = basketReducer(two, register());
    const second = basketReducer(first, register("b", "r2"));
    expect(second.shoppings.map((shopping) => shopping.items.length)).toEqual([
      1, 1,
    ]);
    const incremented = basketReducer(second, {
      type: "increment",
      shoppingId: "a",
      id: "r1",
    });
    expect(incremented.shoppings[0].items[0].count).toBe(1.5);
    expect(incremented.shoppings[1]).toBe(second.shoppings[1]);
    expect(
      basketReducer(incremented, { type: "remove", shoppingId: "b", id: "r1" }),
    ).toBe(incremented);
  });
  it("TC-FR-ING-20-01 買い物削除でも台帳と設定を保つ", () => {
    const withFood = {
      ...base,
      manualFoods: [
        {
          id: "manual-1",
          name: "料理",
          category: "手入力 / 野菜",
          refusePct: null,
          nutrientsPer100g:
            {} as AppState["manualFoods"][number]["nutrientsPer100g"],
        },
      ],
    };
    const removed = basketReducer(withFood, {
      type: "removeShopping",
      shoppingId: "a",
    });
    expect(removed.shoppings).toEqual([]);
    expect(removed.manualFoods).toBe(withFood.manualFoods);
    expect(removed.profile).toBe(withFood.profile);
  });
  it("TC-FR-ING-20-02 最新と最後の買い物を削除する", () => {
    const two = basketReducer(base, {
      type: "createShopping",
      id: "b",
      date: today,
    });
    const one = basketReducer(two, { type: "removeShopping", shoppingId: "b" });
    expect(latestShopping(one.shoppings)?.id).toBe("a");
    expect(
      latestShopping(
        basketReducer(one, { type: "removeShopping", shoppingId: "a" })
          .shoppings,
      ),
    ).toBeNull();
    expect(
      basketReducer(one, { type: "removeShopping", shoppingId: "missing" }),
    ).toBe(one);
  });
  it("TC-FR-NUT-07-01 日付が新しい買い物だけを分析し合算しない", () => {
    const foods = new Map(
      (foodsJson as FoodItem[]).map((food) => [food.id, food]),
    );
    const shoppings = [
      {
        id: "older",
        date: "2026-10-30",
        origin: "normal" as const,
        items: [
          { id: "r1", foodId: "06061", displayName: "キャベツ", count: 1 },
          { id: "r2", foodId: "06212", displayName: "にんじん", count: 1 },
          { id: "r3", foodId: "11115", displayName: "豚肉", count: 1 },
        ],
      },
      {
        id: "newer",
        date: "2026-10-31",
        origin: "normal" as const,
        items: [{ id: "r4", foodId: "12004", displayName: "鶏卵", count: 1 }],
      },
    ];
    const state = { ...initialAppState, shoppings };
    expect(
      analyzeShopping(latestShopping(shoppings), state, foods),
    ).toMatchObject({ kind: "insufficient", itemCount: 1 });
    expect(analyzeShopping(shoppings[0], state, foods).kind).toBe("judged");
  });
  it("TC-FR-NUT-07-01・02 分析対象は選んだ買い物のみ", () => {
    const state = basketReducer(base, register());
    expect(analyzeShopping(state.shoppings[0], state, new Map()).kind).toBe(
      "insufficient",
    );
    expect(toRegisteredItems(null, [], new Map())).toEqual([]);
    expect(
      analyzeShopping(null, { ...state, profile: defaultProfile }, new Map()),
    ).toMatchObject({ kind: "insufficient", itemCount: 0 });
  });
  it.each([
    { ids: [], count: 0, noData: [] },
    { ids: ["06061", "06212"], count: 2, noData: [] },
    {
      ids: ["06061", "06212", "missingEnergy"],
      count: 2,
      noData: ["missingEnergy"],
    },
  ])("TC-FR-NUT-07-02 未判定と候補: $ids", ({ ids, count, noData }) => {
    const foods = new Map(
      (foodsJson as FoodItem[]).map((food) => [food.id, food]),
    );
    const withEnergy = foods.get("06212");
    if (withEnergy)
      foods.set("missingEnergy", {
        ...withEnergy,
        id: "missingEnergy",
        nutrientsPer100g: { ...withEnergy.nutrientsPer100g, energyKcal: null },
      });
    const shopping = {
      ...base.shoppings[0],
      items: ids.map((foodId, index) => ({
        id: `r${index}`,
        foodId,
        displayName: foodId,
        count: 1,
      })),
    };
    const state = { ...base, shoppings: [shopping] };
    expect(analyzeShopping(shopping, state, foods)).toMatchObject({
      kind: "insufficient",
      itemCount: count,
      noDataItems: noData,
    });
    const candidate = foods.get("06212");
    expect(
      suggestSupplements(
        state,
        foods,
        candidate
          ? [{ food: candidate, displayName: "にんじん", priority: 1 }]
          : [],
      ),
    ).toEqual([]);
  });
  it.each([
    { date: "2026-11-02", latest: "a", kind: "judged" },
    { date: "2026-10-29", latest: "b", kind: "insufficient" },
  ])(
    "TC-FR-NUT-07-02 日付変更で最新を再分析する（$date）",
    ({ date, latest, kind }) => {
      const foods = new Map(
        (foodsJson as FoodItem[]).map((food) => [food.id, food]),
      );
      const older = {
        ...base.shoppings[0],
        items: [
          { id: "r1", foodId: "06061", displayName: "キャベツ", count: 1 },
          { id: "r2", foodId: "06212", displayName: "にんじん", count: 1 },
          { id: "r3", foodId: "11115", displayName: "豚肉", count: 1 },
        ],
      };
      const newer = { ...older, id: "b", date: "2026-11-01", items: [] };
      const state = { ...base, shoppings: [older, newer] };
      expect(
        analyzeShopping(latestShopping(state.shoppings), state, foods).kind,
      ).toBe("insufficient");
      const changed = basketReducer(state, {
        type: "setShoppingDate",
        shoppingId: "a",
        date,
      });
      expect(latestShopping(changed.shoppings)?.id).toBe(latest);
      expect(
        analyzeShopping(latestShopping(changed.shoppings), changed, foods).kind,
      ).toBe(kind);
    },
  );
  it("TC-FR-ING-19-02 行 ID は買い物全体で一意にする", () => {
    const first = basketReducer(base, register());
    const two = basketReducer(first, {
      type: "createShopping",
      id: "b",
      date: today,
    });
    expect(basketReducer(two, register("b", "r1"))).toBe(two);
  });
});
