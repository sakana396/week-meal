import { describe, expect, it } from "vitest";
import { weightHint } from "./weightHint";

describe("DES-QTY-07 個数行の目安重量", () => {
  it.each([
    ["seed", "ひよこまめ", "1 パック ≒ 120 g"],
    ["seed", "目安重量なし", "1 単位 ≒ 100 g（概算）"],
    ["manual-1", "ひよこまめ", "1 単位 ≒ 100 g（概算）"],
  ])(
    "TC-FR-QTY-08-01 %s / %s の目安を示す",
    (foodId, displayName, expected) => {
      expect(weightHint(foodId, displayName)).toBe(expected);
    },
  );
});
