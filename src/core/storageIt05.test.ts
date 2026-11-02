import { describe, expect, it } from "vitest";
import { initialAppState } from "./basket";
import {
  parseStoredState,
  serializeState,
  type MigrationContext,
} from "./storage";

const known = new Set(["06212"]);
const context: MigrationContext = {
  date: "2026-11-03",
  shoppingIds: { usedUp: "old", normal: "new" },
};
const oldRow = { id: "r", foodId: "06212", displayName: "にんじん", count: 2 };
const row = {
  id: "r",
  foodId: "06212",
  displayName: "にんじん",
  quantity: { kind: "count", count: 2 },
};
const shopping = {
  id: "s",
  date: "2026-11-03",
  origin: "normal",
  items: [oldRow],
};
const stored = (version: number, shoppings: unknown) =>
  JSON.stringify({
    version,
    shoppings,
    manualFoods: [],
    profile: initialAppState.profile,
  });

describe("保存版 4（DES-STO-13・14）", () => {
  it.each([1, 2, 3])(
    "TC-FR-SYS-01-13 版 %i から版 4 に値を保って移行する",
    (version) => {
      const text =
        version === 3
          ? stored(3, [shopping])
          : JSON.stringify({
              version,
              items: [{ ...oldRow, usedUp: false }],
              manualFoods: [],
              profile: initialAppState.profile,
            });
      const result = parseStoredState(
        text,
        known,
        undefined,
        undefined,
        context,
      );
      expect(result.migrated).toBe(true);
      expect(result.issue).toBeNull();
      expect(result.state.shoppings.at(-1)?.items[0]).toEqual(row);
      expect(JSON.parse(serializeState(result.state)).version).toBe(4);
    },
  );
  it("TC-FR-SYS-01-13 重さの行を版 4 で往復する", () => {
    const state = {
      ...initialAppState,
      shoppings: [
        {
          ...shopping,
          origin: "normal" as const,
          items: [
            {
              ...row,
              quantity: {
                kind: "weight" as const,
                grams: 2250,
                unit: "kg" as const,
              },
            },
          ],
        },
      ],
    };
    expect(parseStoredState(serializeState(state), known).state).toEqual(state);
  });
  it.each([
    { kind: "other", count: 2 },
    { kind: "count", count: 0.3 },
    { kind: "weight", grams: 0, unit: "g" },
    { kind: "weight", grams: 1.5, unit: "g" },
    { kind: "weight", grams: 100001, unit: "kg" },
    { kind: "weight", grams: 10, unit: "lb" },
  ])("TC-NFR-12-39 不正な量を持つ行を捨てる %#", (quantity) => {
    const result = parseStoredState(
      stored(4, [{ ...shopping, items: [{ ...row, quantity }] }]),
      known,
    );
    expect(result.state.shoppings[0].items).toEqual([]);
    expect(result.issue).toEqual({
      droppedItems: 1,
      droppedShoppings: 0,
      profileReset: false,
    });
  });
  it("TC-NFR-12-39 余計なキーを読み込まない", () => {
    const result = parseStoredState(
      stored(4, [
        {
          ...shopping,
          items: [
            {
              ...row,
              extra: 1,
              quantity: { kind: "weight", grams: 1, unit: "g", extra: 1 },
            },
          ],
        },
      ]),
      known,
    );
    expect(result.state.shoppings[0].items[0]).toEqual({
      ...row,
      quantity: { kind: "weight", grams: 1, unit: "g" },
    });
  });
  it("TC-NFR-12-39 捨てた買い物は空でも件数に数え、行の件数には足さない", () => {
    const result = parseStoredState(
      stored(4, [
        { ...shopping, date: "bad", items: [row] },
        { ...shopping, id: "empty", date: "bad", items: [] },
        { ...shopping, items: [row] },
        { ...shopping, items: [row] },
      ]),
      known,
    );
    expect(result.issue).toEqual({
      droppedItems: 0,
      droppedShoppings: 3,
      profileReset: false,
    });
    expect(result.state.shoppings).toHaveLength(1);
  });
});
