import { describe, expect, it } from "vitest";
import {
  basketReducer,
  initialAppState,
  type AppState,
  type BasketAction,
} from "../core/basket";
import type { FoodItem } from "../types";
import { registerMessage } from "./registerMessage";

const carrot: BasketAction = {
  type: "register",
  id: "r1",
  foodId: "06212",
  displayName: "にんじん",
};

function stateWith(count: number, usedUp = false): AppState {
  const base = basketReducer(initialAppState, carrot);
  return { ...base, items: [{ ...base.items[0], count, usedUp }] };
}

describe("registerMessage（P-09、DES-UI-21）", () => {
  it.each<[string, AppState, BasketAction, string]>([
    [
      "TC-FR-ING-01-07 初めて登録したら個数 1 と単位",
      initialAppState,
      carrot,
      "にんじんを登録しました（1 本）",
    ],
    [
      "TC-FR-ING-01-08 再登録したら増えた個数",
      stateWith(1.5),
      { ...carrot, id: "r2" },
      "にんじんを登録しました（2.5 本）",
    ],
    [
      "TC-FR-ING-01-09 使い切った行を再登録したら 1 に戻った個数（境界）",
      stateWith(3, true),
      { ...carrot, id: "r2" },
      "にんじんを登録しました（1 本）",
    ],
    [
      "TC-FR-ING-01-10 上限 999 のときは増やせないと伝える（境界）",
      stateWith(999),
      { ...carrot, id: "r2" },
      "にんじんはこれ以上増やせません（999 本）",
    ],
    [
      "TC-FR-ING-01-11 目安重量のない食材は「つ（概算）」",
      initialAppState,
      {
        type: "register",
        id: "r3",
        foodId: "99999",
        displayName: "目安重量のない食材",
      },
      "目安重量のない食材を登録しました（1 つ（概算））",
    ],
  ])("%s", (_title, state, action, expected) => {
    expect(registerMessage(state, action)).toBe(expected);
  });

  it("TC-FR-ING-08-11 手入力の食品を登録したときも知らせる", () => {
    const food = {
      id: "manual-1",
      name: "スープ",
      category: "手入力 / 野菜",
      refusePct: null,
      nutrientsPer100g: {},
    } as FoodItem;
    expect(
      registerMessage(initialAppState, {
        type: "addManualFood",
        id: "m1",
        food,
        displayName: "スープ",
      }),
    ).toBe("スープを登録しました（1 つ（概算））");
  });

  it("TC-FR-ING-01-12 登録でない操作では空（異常）", () => {
    expect(
      registerMessage(initialAppState, { type: "increment", id: "r1" }),
    ).toBe("");
  });
});
