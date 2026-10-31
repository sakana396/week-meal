import { describe, expect, it } from "vitest";
import { nutrientDefinitions } from "../data/nutrients";
import type { ManualFood } from "./manualFoods";
import { initialAppState, maximumCount } from "./basket";
import { defaultProfile } from "./profile";
import {
  migrateStored,
  parseStoredState,
  serializeState,
  storageVersion,
  type Migrations,
  type MigrationContext,
} from "./storage";

const known = new Set(["06212", "06153"]);
const context: MigrationContext = {
  date: "2026-10-31",
  shoppingIds: { usedUp: "old", normal: "current" },
};
const row = { id: "r1", foodId: "06212", displayName: "にんじん", count: 1 };
const manual: ManualFood = {
  id: "manual-1",
  name: "自家製ぬか漬け",
  category: "手入力 / 野菜",
  refusePct: null,
  nutrientsPer100g: {
    ...(Object.fromEntries(
      nutrientDefinitions.map(({ key }) => [key, null]),
    ) as ManualFood["nutrientsPer100g"]),
    energyKcal: 30,
  },
};
const saved = {
  ...initialAppState,
  shoppings: [
    {
      id: "current",
      date: context.date,
      origin: "normal" as const,
      items: [
        row,
        { ...row, id: "m1", foodId: manual.id, displayName: manual.name },
      ],
    },
  ],
  manualFoods: [manual],
  profile: {
    ...defaultProfile,
    staple: "bread" as const,
    portion: "large" as const,
  },
};
const version3 = (changes: Record<string, unknown> = {}) =>
  JSON.stringify({ ...JSON.parse(serializeState(saved)), ...changes });
const shoppingRows = (items: unknown[]) => [{ ...saved.shoppings[0], items }];
const parse = (text: string | null) =>
  parseStoredState(text, known, undefined, undefined, context);

describe("保存の旧ケースを買い物単位で検証（DES-STO-10〜12）", () => {
  it("TC-FR-SYS-01-02 書き出した状態を読み込むと、同じ状態に戻る（問題なし）", () => {
    expect(parse(serializeState(saved))).toEqual({
      state: saved,
      issue: null,
      migrated: false,
    });
  });
  it("TC-FR-SYS-01-03 書き出した JSON に版番号が入る", () => {
    expect(JSON.parse(serializeState(saved)).version).toBe(storageVersion);
  });
  it("TC-FR-SYS-01-04 保存データがなければ、初期状態（問題なし）（境界）", () => {
    expect(parse(null)).toEqual({
      state: initialAppState,
      issue: null,
      migrated: false,
    });
  });
  it.each([
    ["TC-NFR-12-01 JSON として読めない", "{not json"],
    ["TC-NFR-12-02 オブジェクトでない", "[1,2,3]"],
    ["TC-NFR-13-01 版番号がない", JSON.stringify({ shoppings: [] })],
    ["TC-NFR-12-04 版番号が今より新しい", version3({ version: 99 })],
    ["TC-NFR-13-03 版番号が 0 以下", version3({ version: 0 })],
    ["TC-NFR-13-04 版番号が整数でない", version3({ version: 1.5 })],
    ["TC-NFR-12-07 shoppings が配列でない", version3({ shoppings: "x" })],
  ])("%s なら、初期状態と corrupted を返す（異常）", (_name, text) => {
    expect(parse(text)).toEqual({
      state: initialAppState,
      issue: "corrupted",
      migrated: false,
    });
  });
  it("TC-NFR-12-08 形のおかしい行と、知らない食品の行と、重複した ID の行を捨て、件数を返す", () => {
    const rows = [
      row,
      { ...row, id: "r2", foodId: "99999" },
      { ...row, id: "r3", count: "多い" },
      { ...row, id: "r4", count: 0.2 },
      { ...row, foodId: "06153" },
      "壊れた行",
    ];
    const result = parse(version3({ shoppings: shoppingRows(rows) }));
    expect(result.state.shoppings[0].items).toEqual([row]);
    expect(result.issue).toEqual({ droppedItems: 5, profileReset: false });
  });
  it.each([
    [
      "TC-NFR-12-09 設定の形が違えば初期値にし、そのことを返す",
      { sex: "other" },
    ],
    [
      "TC-NFR-12-10 設定がなくても初期値で読み込み、設定を戻したことを知らせる（境界）",
      undefined,
    ],
  ])("%s", (_name, profile) => {
    const result = parse(version3({ profile }));
    expect(result.state.profile).toEqual(defaultProfile);
    expect(result.issue).toEqual({ droppedItems: 0, profileReset: true });
  });
  it("TC-NFR-12-11 手入力の食品の形が違えば捨て、それを参照する行も捨てる", () => {
    const result = parse(version3({ manualFoods: [{ ...manual, name: 3 }] }));
    expect(result.state.manualFoods).toEqual([]);
    expect(result.state.shoppings[0].items).toEqual([row]);
    expect(result.issue).toEqual({ droppedItems: 1, profileReset: false });
  });
  it("TC-NFR-12-12 手入力の食品の成分値が数でなければ捨てる（異常）", () => {
    const result = parse(
      version3({
        manualFoods: [{ ...manual, nutrientsPer100g: { energyKcal: "多い" } }],
      }),
    );
    expect(result.state.manualFoods).toEqual([]);
  });
  it("TC-NFR-12-13 手入力の食品がなくても読み込む（境界）", () => {
    const result = parse(version3({ manualFoods: undefined }));
    expect(result.state.shoppings[0].items).toEqual([row]);
    expect(result.issue).toEqual({ droppedItems: 1, profileReset: false });
  });
  it.each([
    ["TC-NFR-12-14 個数が 0.5 刻みでない", { ...row, count: 0.7 }],
    ["TC-NFR-12-15 個数が上限を超える", { ...row, count: maximumCount + 0.5 }],
    [
      "TC-NFR-12-16 個数が JSON の 1e999（Infinity）",
      { ...row, count: Infinity },
    ],
    ["TC-NFR-12-17 食材名が空", { ...row, displayName: "" }],
    ["TC-NFR-12-18 ID が空", { ...row, id: "" }],
  ])("%s 行は捨てる（異常）", (_name, invalid) => {
    const text = version3({ shoppings: shoppingRows([invalid]) }).replace(
      '"count":null',
      '"count":1e999',
    );
    expect(parse(text).state.shoppings[0].items).toEqual([]);
    expect(parse(text).issue).toEqual({ droppedItems: 1, profileReset: false });
  });
  it("TC-NFR-12-19 個数がちょうど上限なら読み込む（境界）", () => {
    expect(
      parse(
        version3({
          shoppings: shoppingRows([{ ...row, count: maximumCount }]),
        }),
      ).state.shoppings[0].items[0].count,
    ).toBe(maximumCount);
  });
  it.each([
    ["TC-NFR-12-20 廃棄率が 100 を超える", { refusePct: 120 }, 1],
    ["TC-NFR-12-21 廃棄率が負", { refusePct: -1 }, 1],
    ["TC-NFR-12-22 成分値が負", { nutrientsPer100g: { energyKcal: -5 } }, 1],
    ["TC-NFR-12-23 ID が manual- で始まらない", { id: "x-1" }, 1],
    ["TC-NFR-12-24 ID が食品番号とぶつかる", { id: "06212" }, 0],
  ] as const)("%s 手入力の食品は捨てる（異常）", (_name, change, dropped) => {
    const invalid = { ...manual, ...change };
    const result = parse(
      version3({
        manualFoods: [invalid],
        shoppings: shoppingRows([{ ...row, id: "m2", foodId: invalid.id }]),
      }),
    );
    expect(result.state.manualFoods).toEqual([]);
    expect(result.issue).toEqual(
      dropped ? { droppedItems: dropped, profileReset: false } : null,
    );
  });
  it("TC-NFR-12-25 同じ ID の手入力の食品が 2 つあれば、先のものだけ使う", () => {
    expect(
      parse(version3({ manualFoods: [manual, { ...manual, name: "別名" }] }))
        .state.manualFoods,
    ).toEqual([manual]);
  });
  it("TC-NFR-12-26 どの行からも参照されない手入力の食品も覚える", () => {
    expect(
      parse(version3({ manualFoods: [manual, { ...manual, id: "manual-2" }] }))
        .state.manualFoods,
    ).toHaveLength(2);
  });
  it("TC-NFR-12-27 余計なキーや __proto__ を状態に持ち込まない", () => {
    const text = version3({
      shoppings: shoppingRows([{ ...row, extra: 1 }]),
      manualFoods: [{ ...manual, extra: 1 }],
      profile: { ...defaultProfile, extra: 1 },
    }).replace('"items":[{', '"items":[{"__proto__":{"polluted":true},');
    const result = parse(text);
    expect(Object.keys(result.state.shoppings[0].items[0]).sort()).toEqual([
      "count",
      "displayName",
      "foodId",
      "id",
    ]);
    expect(Object.keys(result.state.manualFoods[0])).not.toContain("extra");
    expect(Object.keys(result.state.profile)).not.toContain("extra");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it("TC-NFR-12-28 手入力の食品の成分のキーがなければ null にして読み込む（正常）", () => {
    const result = parse(
      version3({
        manualFoods: [{ ...manual, nutrientsPer100g: { energyKcal: 30 } }],
      }),
    );
    expect(result.state.manualFoods[0].nutrientsPer100g.proteinG).toBeNull();
  });
  it("TC-NFR-13-05 旧い版を 1 つずつ今の版まで移行する", () => {
    const table: Migrations = {
      1: (old) => ({ ...old, version: 2 }),
      2: (old) => ({ ...old, version: 3 }),
    };
    expect(migrateStored({ version: 1 }, table, 3)?.version).toBe(3);
  });
  it("TC-NFR-13-06 旧い版の保存データを、移行してから読み込む", () => {
    const old = JSON.stringify({
      version: 1,
      items: [{ ...row, usedUp: false }],
      profile: defaultProfile,
    });
    expect(parse(old).state.shoppings[0].items).toEqual([row]);
  });
  it("TC-NFR-13-07 移行の関数がなければ corrupted（異常）", () => {
    expect(migrateStored({ version: 1 }, {}, 3)).toBeNull();
    expect(
      parseStoredState(JSON.stringify({ version: 1 }), known, {}, 3, context)
        .issue,
    ).toBe("corrupted");
  });
  it("TC-NFR-13-08 移行しても版が上がらなければ止める（無限ループにしない。異常）", () => {
    expect(migrateStored({ version: 1 }, { 1: (old) => old }, 3)).toBeNull();
  });
  it("TC-NFR-13-09 今の版なら何もしない（境界）", () => {
    const current = { version: 3 };
    expect(migrateStored(current, {}, 3)).toBe(current);
  });
  it("TC-NFR-13-10 移行の関数が例外を出したら止める（異常）", () => {
    expect(
      migrateStored(
        { version: 1 },
        {
          1: () => {
            throw new Error("想定外");
          },
        },
        3,
      ),
    ).toBeNull();
  });
  it("TC-NFR-13-11 移行で今の版を飛び越えたら止める（異常）", () => {
    expect(
      migrateStored(
        { version: 1 },
        { 1: (old) => ({ ...old, version: 5 }) },
        3,
      ),
    ).toBeNull();
  });
  it("TC-NFR-13-12 版 1 の全台帳・登録行・設定・順序を引き継ぎ版 2 で保存する", () => {
    const items = [
      { ...row, usedUp: false },
      {
        ...row,
        id: "m1",
        foodId: manual.id,
        displayName: manual.name,
        usedUp: true,
      },
    ];
    const result = parse(
      JSON.stringify({
        version: 1,
        items,
        manualFoods: [{ ...manual, id: "manual-unused" }, manual],
        profile: saved.profile,
        pendingRemoval: { id: "temporary" },
      }),
    );
    expect(result.state.shoppings.map((shopping) => shopping.origin)).toEqual([
      "usedUpMigration",
      "normal",
    ]);
    expect(
      result.state.shoppings
        .flatMap((shopping) => shopping.items)
        .map((entry) => entry.id),
    ).toEqual(["m1", "r1"]);
    expect(result.state.manualFoods).toHaveLength(2);
    expect(result.state.profile).toEqual(saved.profile);
    expect(parse(serializeState(result.state)).state).toEqual(result.state);
  });
  it.each(["99999", "", 123, null])(
    "TC-NFR-13-13 未参照の台帳と有効な来歴だけを往復で残す（%s）",
    (sourceFoodId) => {
      const result = parse(
        version3({ shoppings: [], manualFoods: [{ ...manual, sourceFoodId }] }),
      );
      expect(result.state.manualFoods[0]).toEqual({
        ...manual,
        ...(sourceFoodId === "99999" ? { sourceFoodId } : {}),
      });
      expect(parse(serializeState(result.state)).state).toEqual(result.state);
    },
  );
  it.each([1, 2])(
    "TC-NFR-13-14 版 %s でも個別の不正と余計なキーを検査する",
    (version) => {
      const items = [
        { ...row, usedUp: false },
        { ...row, id: "bad", count: -1, usedUp: false },
      ];
      const result = parse(
        JSON.stringify({
          version,
          items,
          manualFoods: [manual, { ...manual, name: 123 }],
          profile: defaultProfile,
          extra: true,
        }),
      );
      expect(result.state.shoppings[0].items).toEqual([row]);
      expect(result.issue).toEqual({ droppedItems: 1, profileReset: false });
      expect(parse(JSON.stringify({ version, items: "bad" })).issue).toBe(
        "corrupted",
      );
    },
  );
  it.each(["99999", "", 123, null])(
    "TC-FR-ING-16-03 来歴 %s の検査後も成分と登録行を往復で保つ",
    (sourceFoodId) => {
      const result = parse(
        version3({ manualFoods: [{ ...manual, sourceFoodId }] }),
      );
      expect(result.state.shoppings[0].items).toEqual(saved.shoppings[0].items);
      expect(parse(serializeState(result.state)).state).toEqual(result.state);
    },
  );
});
