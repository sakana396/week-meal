import { describe, expect, it } from "vitest";
import { nutrientDefinitions } from "../data/nutrients";
import type { ManualFood } from "./manualFoods";
import { initialAppState, type AppState } from "./basket";
import {
  migrateV2ToV3,
  parseStoredState,
  serializeState,
  storageVersion,
  type MigrationContext,
} from "./storage";

const known = new Set(["06212"]);
const context: MigrationContext = {
  date: "2026-10-31",
  shoppingIds: { usedUp: "old", normal: "current" },
};
const entry = { id: "r1", foodId: "06212", displayName: "にんじん", count: 1 };
const state: AppState = {
  ...initialAppState,
  shoppings: [
    { id: "current", date: context.date, origin: "normal", items: [entry] },
  ],
};
const version2 = (items: object[]) =>
  JSON.stringify({
    version: 2,
    items,
    manualFoods: [],
    profile: state.profile,
  });

describe("保存版 3（DES-STO-10〜12）", () => {
  it("TC-FR-SYS-01-11 買い物と設定を往復する", () => {
    expect(JSON.parse(serializeState(state)).version).toBe(storageVersion);
    expect(parseStoredState(serializeState(state), known).state).toEqual(state);
  });
  it.each([
    [[{ ...entry, usedUp: false }], ["normal"]],
    [[{ ...entry, usedUp: true }], ["usedUpMigration", "normal"]],
    [
      [
        { ...entry, usedUp: true },
        { ...entry, id: "r2", usedUp: false },
      ],
      ["usedUpMigration", "normal"],
    ],
    [[], []],
  ] as const)(
    "TC-NFR-13-15 版 2 の有効行と使い切った行を分離",
    (items, origins) => {
      const result = parseStoredState(
        version2([...items]),
        known,
        undefined,
        undefined,
        context,
      );
      expect(result.state.shoppings.map((shopping) => shopping.origin)).toEqual(
        origins,
      );
      expect(result.state.shoppings.at(-1)?.origin ?? null).toBe(
        origins.at(-1) ?? null,
      );
      expect(
        result.state.shoppings
          .flatMap((shopping) => shopping.items)
          .every((row) => !Object.hasOwn(row, "usedUp")),
      ).toBe(true);
      expect(result.migrated).toBe(true);
    },
  );
  it.each([{ usedUp: undefined }, { usedUp: "不正" }, { usedUp: 0 }])(
    "TC-NFR-13-15 usedUp が真偽値でない行も通常の買い物に残す（%j）",
    (extra) => {
      const result = parseStoredState(
        version2([{ ...entry, ...extra }]),
        known,
        undefined,
        undefined,
        context,
      );
      expect(result.state.shoppings[0].items).toEqual([entry]);
    },
  );
  it("TC-FR-SYS-01-11 版 1 から連続移行", () => {
    const old = version2([{ ...entry, usedUp: false }]).replace(
      '"version":2',
      '"version":1',
    );
    expect(
      parseStoredState(old, known, undefined, undefined, context).state
        .shoppings[0].items,
    ).toEqual([entry]);
  });
  it("TC-NFR-12-37 未知の食品番号の行を捨てて件数を返す", () => {
    const text = JSON.stringify({
      ...JSON.parse(serializeState(state)),
      shoppings: [
        {
          ...state.shoppings[0],
          items: [entry, { ...entry, id: "r2", foodId: "removed" }],
        },
      ],
    });
    expect(parseStoredState(text, known)).toMatchObject({
      issue: { droppedItems: 1, profileReset: false },
      state,
    });
  });
  it("TC-NFR-12-37 版 2 の除外済み食品も移行後に捨てる", () => {
    const old = version2([{ ...entry, foodId: "02032", usedUp: false }]);
    const result = parseStoredState(old, known, undefined, undefined, context);
    expect(result.issue).toEqual({ droppedItems: 1, profileReset: false });
    expect(result.state.shoppings[0].items).toEqual([]);
  });
  it.each(["{", JSON.stringify({ version: 99, shoppings: [] })])(
    "TC-NFR-12-38 壊れた保存データを初期状態に戻す",
    (text) => {
      expect(parseStoredState(text, known).issue).toBe("corrupted");
    },
  );
  it("TC-NFR-12-38 重複した買い物 ID は先の買い物を採る", () => {
    const text = JSON.stringify({
      ...JSON.parse(serializeState(state)),
      shoppings: [
        state.shoppings[0],
        { ...state.shoppings[0], items: [{ ...entry, id: "r2" }] },
      ],
    });
    const result = parseStoredState(text, known);
    expect(result.state.shoppings).toEqual(state.shoppings);
    expect(result.issue).toEqual({ droppedItems: 1, profileReset: false });
  });
  it.each([
    { id: "", date: context.date, origin: "normal", items: [entry] },
    { id: "bad", date: "2026-02-30", origin: "normal", items: [entry] },
    { id: "bad", date: context.date, origin: "unknown", items: [entry] },
    { id: "bad", date: context.date, origin: "normal", items: "不正" },
  ])("TC-NFR-12-38 不正な買い物だけを破棄する（%j）", (invalid) => {
    const text = JSON.stringify({
      ...JSON.parse(serializeState(state)),
      shoppings: [state.shoppings[0], invalid],
    });
    expect(parseStoredState(text, known)).toMatchObject({
      state,
      issue: { droppedItems: 1, profileReset: false },
    });
  });
  it("TC-NFR-12-38 不正個数と重複行 ID を個別に捨てる", () => {
    const text = JSON.stringify({
      ...JSON.parse(serializeState(state)),
      shoppings: [
        {
          ...state.shoppings[0],
          items: [entry, entry, { ...entry, id: "r3", count: 0.3 }],
        },
      ],
    });
    expect(parseStoredState(text, known).issue).toEqual({
      droppedItems: 2,
      profileReset: false,
    });
  });
  it("TC-FR-SYS-01-12 代表試料の JSON 長を測る", () => {
    const sample = {
      ...state,
      manualFoods: Array.from({ length: 100 }, (_, index): ManualFood => ({
        id: `manual-${index}`,
        name: `手入力${index}`,
        category: "手入力 / 野菜",
        refusePct: null,
        nutrientsPer100g: Object.fromEntries(
          nutrientDefinitions.map(({ key }) => [key, null]),
        ) as ManualFood["nutrientsPer100g"],
      })),
      shoppings: Array.from({ length: 100 }, (_, index) => ({
        ...state.shoppings[0],
        id: `s${index}`,
        items: Array.from({ length: 30 }, (_, row) => ({
          ...entry,
          id: `r${index}-${row}`,
        })),
      })),
    };
    expect(serializeState(sample).length).toBeGreaterThan(100000);
  });
  it("TC-NFR-13-15 移行用 ID が重複したら移行しない", () => {
    expect(
      migrateV2ToV3(
        { version: 2, items: [] },
        { ...context, shoppingIds: { usedUp: "same", normal: "same" } },
      ).version,
    ).toBe(2);
  });
});
