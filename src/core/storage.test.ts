import { describe, expect, it } from "vitest";
import type { FoodItem } from "../types";
import {
  basketReducer,
  initialAppState,
  type AppState,
  type BasketAction,
} from "./basket";
import { defaultProfile } from "./profile";
import { parseStoredState, serializeState, storageVersion } from "./storage";

const known = new Set(["06212", "06153"]);
const manualFood = {
  id: "manual-1",
  name: "自家製ぬか漬け",
  category: "手入力 / 野菜",
  refusePct: null,
  nutrientsPer100g: { energyKcal: 30, proteinG: null },
} as unknown as FoodItem;

const actions: BasketAction[] = [
  { type: "register", id: "r1", foodId: "06212", displayName: "にんじん" },
  { type: "increment", id: "r1" },
  { type: "register", id: "r2", foodId: "06153", displayName: "玉ねぎ" },
  { type: "toggleUsedUp", id: "r2" },
  {
    type: "addManualFood",
    id: "m1",
    food: manualFood,
    displayName: "自家製ぬか漬け",
  },
  {
    type: "setProfile",
    profile: {
      ...defaultProfile,
      staple: "bread",
      portion: "large",
      sex: "female",
    },
  },
];
const saved: AppState = actions.reduce(basketReducer, initialAppState);

function stored(overrides: Record<string, unknown>) {
  return JSON.stringify({ ...JSON.parse(serializeState(saved)), ...overrides });
}

describe("serializeState・parseStoredState（DES-STO-01, 02）", () => {
  it("TC-FR-SYS-01-02 書き出した状態を読み込むと、同じ状態に戻る（問題なし）", () => {
    const result = parseStoredState(serializeState(saved), known);
    expect(result).toEqual({ state: saved, issue: null });
  });

  it("TC-FR-SYS-01-03 書き出した JSON に版番号が入る", () => {
    expect(JSON.parse(serializeState(saved)).version).toBe(storageVersion);
  });

  it("TC-FR-SYS-01-04 保存データがなければ、初期状態（問題なし）（境界）", () => {
    expect(parseStoredState(null, known)).toEqual({
      state: initialAppState,
      issue: null,
    });
  });
});

describe("壊れた保存データ（DES-STO-02, 03、NFR-12）", () => {
  it.each([
    ["TC-NFR-12-01 JSON として読めない", "{not json"],
    ["TC-NFR-12-02 オブジェクトでない", "[1,2,3]"],
    ["TC-NFR-12-03 版番号がない", JSON.stringify({ items: [] })],
    [
      "TC-NFR-12-04 版番号が今より新しい",
      stored({ version: storageVersion + 1 }),
    ],
    ["TC-NFR-12-05 版番号が 0 以下", stored({ version: 0 })],
    ["TC-NFR-12-06 版番号が整数でない", stored({ version: 1.5 })],
    ["TC-NFR-12-07 items が配列でない", stored({ items: "x" })],
  ])("%s なら、初期状態と corrupted を返す（異常）", (_title, text) => {
    expect(parseStoredState(text, known)).toEqual({
      state: initialAppState,
      issue: "corrupted",
    });
  });

  it("TC-NFR-12-08 形のおかしい行と、知らない食品の行と、重複した ID の行を捨て、件数を返す", () => {
    const text = stored({
      items: [
        {
          id: "r1",
          foodId: "06212",
          displayName: "にんじん",
          count: 2,
          usedUp: false,
        },
        {
          id: "r2",
          foodId: "99999",
          displayName: "なくなった食品",
          count: 1,
          usedUp: false,
        },
        {
          id: "r3",
          foodId: "06153",
          displayName: "玉ねぎ",
          count: "たくさん",
          usedUp: false,
        },
        {
          id: "r4",
          foodId: "06153",
          displayName: "玉ねぎ",
          count: 0.2,
          usedUp: false,
        },
        {
          id: "r1",
          foodId: "06153",
          displayName: "玉ねぎ",
          count: 1,
          usedUp: false,
        },
        "壊れた行",
      ],
    });
    const result = parseStoredState(text, known);
    expect(result.state.items.map((item) => item.id)).toEqual(["r1"]);
    expect(result.issue).toEqual({ droppedItems: 5, profileReset: false });
  });

  it("TC-NFR-12-09 設定の形が違えば初期値にし、そのことを返す", () => {
    const result = parseStoredState(
      stored({ profile: { sex: "other" } }),
      known,
    );
    expect(result.state.profile).toEqual(defaultProfile);
    expect(result.issue).toEqual({ droppedItems: 0, profileReset: true });
  });

  it("TC-NFR-12-10 設定がなくても初期値で読み込む（境界）", () => {
    const result = parseStoredState(stored({ profile: undefined }), known);
    expect(result.state.profile).toEqual(defaultProfile);
  });

  it("TC-NFR-12-11 手入力の食品の形が違えば捨て、それを参照する行も捨てる", () => {
    const result = parseStoredState(
      stored({ manualFoods: [{ id: "manual-1", name: 3 }] }),
      known,
    );
    expect(result.state.manualFoods).toEqual([]);
    expect(result.state.items.some((item) => item.foodId === "manual-1")).toBe(
      false,
    );
    expect(result.issue).toEqual({ droppedItems: 1, profileReset: false });
  });

  it("TC-NFR-12-12 手入力の食品の成分値が数でなければ捨てる（異常）", () => {
    const broken = { ...manualFood, nutrientsPer100g: { energyKcal: "多い" } };
    const result = parseStoredState(stored({ manualFoods: [broken] }), known);
    expect(result.state.manualFoods).toEqual([]);
  });

  it("TC-NFR-12-13 手入力の食品がなくても読み込む（境界）", () => {
    const result = parseStoredState(stored({ manualFoods: undefined }), known);
    expect(result.state.manualFoods).toEqual([]);
    expect(result.state.items.map((item) => item.id)).toEqual(["r2", "r1"]);
  });
});
