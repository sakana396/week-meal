import { describe, expect, it } from "vitest";
import type { UnitWeight } from "../data/unitWeights";
import type { FoodItem } from "../types";
import { edibleGrams } from "./quantity";

function food(refusePct: number | null): FoodItem {
  return { id: "x", name: "x", category: "野菜類", refusePct } as FoodItem;
}

const cabbage: UnitWeight = { unit: "玉", purchaseG: 1200, source: "テスト" };
const fillet: UnitWeight = {
  unit: "切れ",
  purchaseG: 80,
  refusePct: 0,
  source: "テスト",
};

describe("edibleGrams（DES-QTY-02）", () => {
  it.each([
    // 1 × 1200 × (1 − 15 ÷ 100) = 1020
    [
      "TC-FR-QTY-02-01 購入時の重さと代表食品の廃棄率から可食部を求める",
      food(15),
      cabbage,
      1,
      1020,
    ],
    // 3 × 1200 × 0.85 = 3060
    ["TC-FR-QTY-02-02 個数に比例する", food(15), cabbage, 3, 3060],
    // 0.5 × 1200 × 0.85 = 510
    [
      "TC-FR-QTY-02-03 半分（0.5）でも計算できる（境界）",
      food(15),
      cabbage,
      0.5,
      510,
    ],
    // 廃棄率 55% の代表食品でも、上書きの 0% を使う: 2 × 80 × 1 = 160
    [
      "TC-FR-QTY-03-01 目安重量の廃棄率の上書きを、代表食品の値より優先する",
      food(55),
      fillet,
      2,
      160,
    ],
    // 廃棄率が null なら 0% とみなす: 1 × 1200 = 1200
    [
      "TC-FR-QTY-03-02 代表食品の廃棄率がないときは 0% とみなす（境界）",
      food(null),
      cabbage,
      1,
      1200,
    ],
  ])("%s", (_title, item, unitWeight, count, grams) => {
    expect(edibleGrams(item, unitWeight, count)).toEqual({
      grams,
      approximate: false,
    });
  });

  it.each([
    ["TC-FR-QTY-05-01 目安重量がないときは 1 単位 = 100g の概算にする", 1, 100],
    ["TC-FR-QTY-05-02 目安重量がないときも個数に比例する", 2.5, 250],
  ])("%s", (_title, count, grams) => {
    expect(edibleGrams(food(10), undefined, count)).toEqual({
      grams,
      approximate: true,
    });
  });

  it.each([
    ["TC-FR-QTY-01-01 個数 0 は 0g（境界）", 0],
    ["TC-FR-QTY-01-02 負の個数は 0g（異常）", -1],
    ["TC-FR-QTY-01-03 数でない個数は 0g（異常）", Number.NaN],
    ["TC-FR-QTY-01-04 無限大の個数は 0g（異常）", Number.POSITIVE_INFINITY],
  ])("%s", (_title, count) => {
    expect(edibleGrams(food(15), cabbage, count).grams).toBe(0);
    expect(edibleGrams(food(15), undefined, count).grams).toBe(0);
  });
});
