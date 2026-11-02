import { describe, expect, it } from "vitest";
import foodsJson from "../data/foods.json";
import type { FoodItem } from "../types";
import {
  addQuantity,
  convertQuantity,
  edibleGrams,
  unitWeightFor,
} from "./quantity";

const food = (foodsJson as FoodItem[]).find((item) => item.id === "06212")!;
const weight = { unit: "本", purchaseG: 150, refusePct: 20, source: "試験用" };

describe("IT05 の量（DES-QTY-03〜06）", () => {
  it.each([
    [
      { kind: "weight" as const, grams: 2000, unit: "g" as const },
      weight,
      1600,
      false,
    ],
    [
      { kind: "weight" as const, grams: 2000, unit: "kg" as const },
      undefined,
      2000 * (1 - (food.refusePct ?? 0) / 100),
      false,
    ],
    [{ kind: "count" as const, count: 2 }, weight, 240, false],
    [{ kind: "count" as const, count: 2 }, undefined, 200, true],
  ])(
    "TC-FR-QTY-07-01 可食部を換算する %#",
    (quantity, unitWeight, grams, approximate) => {
      expect(edibleGrams(food, unitWeight, quantity)).toEqual({
        grams,
        approximate,
      });
    },
  );
  it.each([
    [{ ...food, refusePct: null }, undefined, 2000],
    [{ ...food, id: "manual-1", refusePct: 25 }, undefined, 1500],
  ])(
    "TC-FR-QTY-07-01 廃棄率が欠損の食材と手入力の重さを求める %#",
    (target, unitWeight, grams) => {
      expect(
        edibleGrams(target, unitWeight, {
          kind: "weight",
          grams: 2000,
          unit: "g",
        }),
      ).toEqual({ grams, approximate: false });
    },
  );
  it.each([
    [{ kind: "count" as const, count: 2 }, "g" as const, 300, weight],
    [{ kind: "count" as const, count: 999 }, "kg" as const, 100000, weight],
    [
      { kind: "weight" as const, grams: 2250, unit: "g" as const },
      "kg" as const,
      2250,
      weight,
    ],
    [
      { kind: "weight" as const, grams: 2250, unit: "kg" as const },
      "g" as const,
      2250,
      weight,
    ],
    [{ kind: "count" as const, count: 1 }, "g" as const, 100, undefined],
    [
      { kind: "count" as const, count: 0.5 },
      "g" as const,
      1,
      { ...weight, purchaseG: 0.8 },
    ],
  ])(
    "TC-FR-QTY-07-02 個数と重さを換算する %#",
    (quantity, to, grams, unitWeight) => {
      const snapshot = structuredClone(quantity);
      expect(convertQuantity(quantity, to, unitWeight)).toEqual({
        kind: "weight",
        grams,
        unit: to,
      });
      expect(quantity).toEqual(snapshot);
    },
  );
  it("TC-FR-QTY-07-02 重さから個数へ 0.5 刻みに丸める", () => {
    expect(
      convertQuantity(
        { kind: "weight", grams: 225, unit: "g" },
        "count",
        weight,
      ),
    ).toEqual({ kind: "count", count: 1.5 });
  });
  it("TC-FR-QTY-07-02 999 個と 1,500 g の目安は 100 kg で止める", () => {
    expect(
      convertQuantity({ kind: "count", count: 999 }, "kg", {
        ...weight,
        purchaseG: 1500,
      }),
    ).toEqual({ kind: "weight", grams: 100000, unit: "kg" });
  });
  it.each([
    [
      { kind: "count" as const, count: 998.5 },
      { kind: "count" as const, count: 0.5 },
      999,
      false,
    ],
    [
      { kind: "count" as const, count: 998.5 },
      { kind: "count" as const, count: 1 },
      999,
      true,
    ],
    [
      { kind: "count" as const, count: 999 },
      { kind: "count" as const, count: 1 },
      999,
      true,
    ],
    [
      { kind: "weight" as const, grams: 99900, unit: "kg" as const },
      { kind: "count" as const, count: 1 },
      100000,
      true,
    ],
  ])("TC-FR-QTY-07-02 上限で止める %#", (existing, added, value, clamped) => {
    const result = addQuantity(existing, added, weight);
    expect(result.clamped).toBe(clamped);
    expect(
      result.quantity.kind === "count"
        ? result.quantity.count
        : result.quantity.grams,
    ).toBe(value);
  });
  it("TC-FR-QTY-07-05 手入力は同名でも目安重量を引かない", () => {
    expect(unitWeightFor("manual-1", "にんじん")).toBeUndefined();
  });
});
