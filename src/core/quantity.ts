import type { UnitWeight } from "../data/unitWeights";
import type { FoodItem } from "../types";

/** 目安重量がない食材の、1 単位あたりの重さ（g）（FR-QTY-05） */
export const fallbackGramsPerUnit = 100;

/** 換算した可食部の重さと、概算かどうか（DES-QTY-02）。 */
export type EdibleAmount = {
  grams: number;
  /** 目安重量がなく、1 単位 = 100g として扱ったとき true */
  approximate: boolean;
};

/**
 * 個数から可食部の重さを求める（DES-QTY-02、FR-QTY-01〜03, 05）。
 *
 * 目安重量があるときは「個数 × 購入時の重さ × (1 − 廃棄率 ÷ 100)」とする。
 * 廃棄率は目安重量の上書き → 代表食品の成分表の値 → 0 の順に使う。
 * 目安重量がないときは 1 単位を 100g とし、概算として返す。
 * 個数が 0 以下や有限でないときは 0g を返す。
 */
export function edibleGrams(
  food: FoodItem,
  unitWeight: UnitWeight | undefined,
  count: number,
): EdibleAmount {
  const validCount = Number.isFinite(count) && count > 0 ? count : 0;

  if (!unitWeight) {
    return { grams: validCount * fallbackGramsPerUnit, approximate: true };
  }

  const refusePct = unitWeight.refusePct ?? food.refusePct ?? 0;
  const grams = validCount * unitWeight.purchaseG * (1 - refusePct / 100);
  return { grams, approximate: false };
}
