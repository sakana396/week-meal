import { describe, expect, it } from "vitest";
import { basketReducer, initialAppState } from "../core/basket";
import { registerMessage } from "./registerMessage";

const action = {
  type: "register" as const,
  shoppingId: "s",
  id: "r1",
  foodId: "06212",
  displayName: "にんじん",
  initialShopping: { id: "s", date: "2026-10-31" },
};
const state = basketReducer(initialAppState, action);

describe("登録通知（DES-UI-21、DES-SHP-02）", () => {
  it("TC-FR-ING-01-08 再登録したら増えた個数", () => {
    const before = {
      ...state,
      shoppings: [
        {
          ...state.shoppings[0],
          items: [{ ...state.shoppings[0].items[0], count: 1.5 }],
        },
      ],
    };
    expect(registerMessage(before, { ...action, id: "r2" })).toBe(
      "にんじんを登録しました（2.5 本）",
    );
  });
  it("TC-FR-ING-01-09 前の買い物に同じ食品があっても新しい買い物では個数 1（境界）", () => {
    const before = {
      ...state,
      shoppings: [
        ...state.shoppings,
        {
          id: "next",
          date: "2026-11-01",
          origin: "normal" as const,
          items: [],
        },
      ],
    };
    expect(
      registerMessage(before, { ...action, shoppingId: "next", id: "r2" }),
    ).toBe("にんじんを登録しました（1 本）");
  });
  it("TC-FR-ING-01-11 目安重量のない食材は「つ（概算）」", () => {
    expect(
      registerMessage(state, {
        ...action,
        id: "r3",
        foodId: "unknown",
        displayName: "目安重量のない食材",
      }),
    ).toBe("目安重量のない食材を登録しました（1 つ（概算））");
  });
  it("TC-FR-ING-08-11 手入力の食品を登録したときも知らせる", () => {
    const food = {
      id: "manual-1",
      name: "スープ",
      category: "手入力 / 野菜",
      refusePct: null,
      nutrientsPer100g: {},
    } as import("../types").FoodItem;
    expect(
      registerMessage(state, {
        type: "addManualFood",
        shoppingId: "s",
        id: "m1",
        food,
        displayName: "スープ",
      }),
    ).toBe("スープを登録しました（1 つ（概算））");
  });
  it.each([
    [initialAppState, action, "にんじんを登録しました（1 本）"],
    [state, { ...action, id: "r2" }, "にんじんを登録しました（2 本）"],
  ] as const)(
    "TC-FR-ING-01-07・08 登録後の個数を知らせる",
    (before, next, expected) => {
      expect(registerMessage(before, next)).toBe(expected);
    },
  );
  it("TC-FR-ING-01-10 上限なら増やせないと知らせる", () => {
    const full = {
      ...state,
      shoppings: [
        {
          ...state.shoppings[0],
          items: [{ ...state.shoppings[0].items[0], count: 999 }],
        },
      ],
    };
    expect(registerMessage(full, { ...action, id: "r2" })).toContain(
      "これ以上増やせません",
    );
  });
  it("TC-FR-ING-01-12 登録以外は通知しない", () => {
    expect(
      registerMessage(state, { type: "increment", shoppingId: "s", id: "r1" }),
    ).toBe("");
  });
});
