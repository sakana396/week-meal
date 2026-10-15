import { describe, expect, it } from "vitest";
import { nutrientDefinitions } from "../data/nutrients";
import type { FoodItem } from "../types";
import {
  basketReducer,
  initialAppState,
  maximumCount,
  type AppState,
  type BasketAction,
} from "./basket";
import { defaultProfile } from "./profile";
import {
  migrateStored,
  parseStoredState,
  serializeState,
  storageVersion,
  type Migrations,
} from "./storage";

const known = new Set(["06212", "06153"]);
const manualFood: FoodItem = {
  id: "manual-1",
  name: "自家製ぬか漬け",
  category: "手入力 / 野菜",
  refusePct: null,
  nutrientsPer100g: {
    ...(Object.fromEntries(
      nutrientDefinitions.map((definition) => [definition.key, null]),
    ) as FoodItem["nutrientsPer100g"]),
    energyKcal: 30,
  },
};

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
    ["TC-NFR-13-01 版番号がない", JSON.stringify({ items: [] })],
    [
      "TC-NFR-12-04 版番号が今より新しい",
      stored({ version: storageVersion + 1 }),
    ],
    ["TC-NFR-13-03 版番号が 0 以下", stored({ version: 0 })],
    ["TC-NFR-13-04 版番号が整数でない", stored({ version: 1.5 })],
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

  it("TC-NFR-12-10 設定がなくても初期値で読み込み、設定を戻したことを知らせる（境界）", () => {
    const result = parseStoredState(stored({ profile: undefined }), known);
    expect(result.state.profile).toEqual(defaultProfile);
    expect(result.issue).toEqual({ droppedItems: 0, profileReset: true });
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
    expect(result.issue).toEqual({ droppedItems: 1, profileReset: false });
  });
});

describe("値の検査の境界（DES-STO-04〜06、REV-014）", () => {
  const row = {
    id: "r1",
    foodId: "06212",
    displayName: "にんじん",
    count: 1,
    usedUp: false,
  };

  it.each([
    ["TC-NFR-12-14 個数が 0.5 刻みでない", { ...row, count: 0.7 }],
    ["TC-NFR-12-15 個数が上限を超える", { ...row, count: maximumCount + 0.5 }],
    [
      "TC-NFR-12-16 個数が JSON の 1e999（Infinity）",
      { ...row, count: Number.POSITIVE_INFINITY },
    ],
    ["TC-NFR-12-17 食材名が空", { ...row, displayName: "" }],
    ["TC-NFR-12-18 ID が空", { ...row, id: "" }],
  ])("%s 行は捨てる（異常）", (_title, entry) => {
    // JSON.stringify は Infinity を null にするので、1e999（読むと Infinity）に置き換える
    const text = stored({ items: [entry], manualFoods: [] }).replace(
      '"count":null',
      '"count":1e999',
    );
    const result = parseStoredState(text, known);
    expect(result.state.items).toEqual([]);
    expect(result.issue).toEqual({ droppedItems: 1, profileReset: false });
  });

  it("TC-NFR-12-19 個数がちょうど上限なら読み込む（境界）", () => {
    const result = parseStoredState(
      stored({ items: [{ ...row, count: maximumCount }], manualFoods: [] }),
      known,
    );
    expect(result.state.items[0].count).toBe(maximumCount);
  });

  it.each([
    ["TC-NFR-12-20 廃棄率が 100 を超える", { refusePct: 120 }, 1],
    ["TC-NFR-12-21 廃棄率が負", { refusePct: -1 }, 1],
    ["TC-NFR-12-22 成分値が負", { nutrientsPer100g: { energyKcal: -5 } }, 1],
    ["TC-NFR-12-23 ID が manual- で始まらない", { id: "x-1" }, 1],
    // 行は食品データの 06212（にんじん）を指すことになるので、行は捨てない
    ["TC-NFR-12-24 ID が食品番号とぶつかる", { id: "06212" }, 0],
  ])("%s 手入力の食品は捨てる（異常）", (_title, override, dropped) => {
    const broken = { ...manualFood, ...override };
    const text = stored({
      manualFoods: [broken],
      items: [{ ...row, id: "m", foodId: broken.id, displayName: "自家製" }],
    });
    const result = parseStoredState(text, known);
    expect(result.state.manualFoods).toEqual([]);
    expect(result.issue).toEqual(
      dropped > 0 ? { droppedItems: dropped, profileReset: false } : null,
    );
  });

  it("TC-NFR-12-28 手入力の食品の成分のキーがなければ null にして読み込む（正常）", () => {
    const sparse = { ...manualFood, nutrientsPer100g: { energyKcal: 30 } };
    const result = parseStoredState(stored({ manualFoods: [sparse] }), known);
    expect(result.state.manualFoods[0].nutrientsPer100g.energyKcal).toBe(30);
    expect(result.state.manualFoods[0].nutrientsPer100g.proteinG).toBeNull();
    expect(result.issue).toBeNull();
  });

  it("TC-NFR-12-25 同じ ID の手入力の食品が 2 つあれば、先のものだけ使う", () => {
    const text = stored({
      manualFoods: [manualFood, { ...manualFood, name: "別の名前" }],
    });
    expect(
      parseStoredState(text, known).state.manualFoods.map((food) => food.name),
    ).toEqual(["自家製ぬか漬け"]);
  });

  it("TC-NFR-12-26 どの行からも参照されない手入力の食品は捨てる", () => {
    const text = stored({
      manualFoods: [manualFood, { ...manualFood, id: "manual-2" }],
    });
    expect(
      parseStoredState(text, known).state.manualFoods.map((food) => food.id),
    ).toEqual(["manual-1"]);
  });

  it("TC-NFR-12-27 余計なキーや __proto__ を状態に持ち込まない", () => {
    const text = JSON.stringify({
      version: 1,
      items: [{ ...row, extra: "x", __proto__: { polluted: true } }],
      manualFoods: [{ ...manualFood, extra: 1 }],
      profile: { ...defaultProfile, extra: true },
    }).replace('"items":[{', '"items":[{"__proto__":{"polluted":true},');
    const result = parseStoredState(text, known);
    expect(Object.keys(result.state.items[0]).sort()).toEqual([
      "count",
      "displayName",
      "foodId",
      "id",
      "usedUp",
    ]);
    expect(Object.keys(result.state.profile).sort()).toEqual([
      "ageGroup",
      "portion",
      "sex",
      "staple",
    ]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("版の移行（DES-STO-07、NFR-13）", () => {
  const table: Migrations = {
    1: (old) => ({ ...old, version: 2, renamed: old.items }),
    2: (old) => ({ ...old, version: 3, items: old.renamed }),
  };

  it("TC-NFR-13-05 旧い版を 1 つずつ今の版まで移行する", () => {
    const migrated = migrateStored({ version: 1, items: ["x"] }, table, 3);
    expect(migrated).toMatchObject({ version: 3, items: ["x"] });
  });

  it("TC-NFR-13-06 旧い版の保存データを、移行してから読み込む", () => {
    const old = JSON.stringify({
      version: 1,
      items: [],
      profile: defaultProfile,
    });
    const moveItems: Migrations = {
      1: (stored) => ({ ...stored, version: 2 }),
    };
    expect(parseStoredState(old, known, moveItems, 2)).toEqual({
      state: { items: [], manualFoods: [], profile: defaultProfile },
      issue: null,
    });
  });

  it("TC-NFR-13-07 移行の関数がなければ corrupted（異常）", () => {
    expect(migrateStored({ version: 1 }, {}, 2)).toBeNull();
    expect(
      parseStoredState(JSON.stringify({ version: 1, items: [] }), known, {}, 2)
        .issue,
    ).toBe("corrupted");
  });

  it("TC-NFR-13-08 移行しても版が上がらなければ止める（無限ループにしない。異常）", () => {
    expect(
      migrateStored({ version: 1 }, { 1: (stored) => stored }, 2),
    ).toBeNull();
  });

  it("TC-NFR-13-10 移行の関数が例外を出したら止める（異常）", () => {
    const throwing: Migrations = {
      1: () => {
        throw new Error("想定外の形");
      },
    };
    expect(migrateStored({ version: 1 }, throwing, 2)).toBeNull();
  });

  it("TC-NFR-13-11 移行で今の版を飛び越えたら止める（異常）", () => {
    expect(
      migrateStored(
        { version: 1 },
        { 1: (stored) => ({ ...stored, version: 5 }) },
        2,
      ),
    ).toBeNull();
  });

  it("TC-NFR-13-09 今の版なら何もしない（境界）", () => {
    const current = { version: storageVersion, items: [] };
    expect(migrateStored(current, {}, storageVersion)).toBe(current);
  });
});
