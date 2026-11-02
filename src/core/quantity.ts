import { unitWeights, type UnitWeight } from "../data/unitWeights";
import type { FoodItem } from "../types";

/** 登録行の量（DES-QTY-03）。 */
export type Quantity =
  | { kind: "count"; count: number }
  | { kind: "weight"; grams: number; unit: "g" | "kg" };

/** 目安重量がない食材の概算重量（FR-QTY-05、DES-QTY-04）。 */
export const fallbackGramsPerUnit = 100;
/** 重さの最小値（DES-QTY-03）。 */
export const minimumGrams = 1;
/** 重さの最大値（DES-QTY-03）。 */
export const maximumGrams = 100000;
/** 個数の最小値・最大値（DES-QTY-03）。 */
export const minimumCount = 0.5;
export const maximumCount = 999;

/** 手入力の食品には同名の定義を流用しない（DES-QTY-04）。 */
export function unitWeightFor(
  foodId: string,
  displayName: string,
  weights: Readonly<Record<string, UnitWeight>> = unitWeights,
): UnitWeight | undefined {
  return !foodId.startsWith("manual-") && Object.hasOwn(weights, displayName)
    ? weights[displayName]
    : undefined;
}

/** 量の範囲と刻みを調べる（DES-QTY-03）。 */
export function validQuantity(value: Quantity): boolean {
  return value.kind === "count"
    ? Number.isInteger(value.count * 2) &&
        value.count >= minimumCount &&
        value.count <= maximumCount
    : Number.isInteger(value.grams) &&
        value.grams >= minimumGrams &&
        value.grams <= maximumGrams &&
        (value.unit === "g" || value.unit === "kg");
}

/** 可食部の重さと概算かどうか（DES-QTY-04）。 */
export type EdibleAmount = { grams: number; approximate: boolean };

/** 個数または買うときの重さから可食部を求める（DES-QTY-04）。 */
export function edibleGrams(
  food: FoodItem,
  unitWeight: UnitWeight | undefined,
  quantity: Quantity,
): EdibleAmount {
  const amount = quantity.kind === "count" ? quantity.count : quantity.grams;
  const positive = Number.isFinite(amount) && amount > 0 ? amount : 0;
  if (quantity.kind === "count" && !unitWeight)
    return { grams: positive * fallbackGramsPerUnit, approximate: true };
  const refusePct = unitWeight?.refusePct ?? food.refusePct ?? 0;
  const purchaseG =
    quantity.kind === "count"
      ? positive * (unitWeight?.purchaseG ?? fallbackGramsPerUnit)
      : positive;
  return { grams: purchaseG * (1 - refusePct / 100), approximate: false };
}

/** 個・g・kg を換算する（DES-QTY-05）。 */
export function convertQuantity(
  quantity: Quantity,
  to: "count" | "g" | "kg",
  unitWeight: UnitWeight | undefined,
): Quantity {
  const perUnit = unitWeight?.purchaseG ?? fallbackGramsPerUnit;
  if (to === "count")
    return quantity.kind === "count"
      ? quantity
      : {
          kind: "count",
          count: Math.min(
            maximumCount,
            Math.max(
              minimumCount,
              Math.round((quantity.grams / perUnit) * 2) / 2,
            ),
          ),
        };
  return {
    kind: "weight",
    grams:
      quantity.kind === "weight"
        ? quantity.grams
        : Math.min(
            maximumGrams,
            Math.max(minimumGrams, Math.round(quantity.count * perUnit)),
          ),
    unit: to,
  };
}

/** 同じ種類に換算して量を足し、上限で止める（DES-QTY-06）。 */
export function addQuantity(
  existing: Quantity,
  added: Quantity,
  unitWeight: UnitWeight | undefined,
): { quantity: Quantity; clamped: boolean } {
  const converted = convertQuantity(
    added,
    existing.kind === "count" ? "count" : existing.unit,
    unitWeight,
  );
  if (existing.kind === "count" && converted.kind === "count") {
    const sum = existing.count + converted.count;
    return {
      quantity: { kind: "count", count: Math.min(maximumCount, sum) },
      clamped: sum > maximumCount,
    };
  }
  if (existing.kind === "weight" && converted.kind === "weight") {
    const sum = existing.grams + converted.grams;
    return {
      quantity: { ...existing, grams: Math.min(maximumGrams, sum) },
      clamped: sum > maximumGrams,
    };
  }
  return { quantity: existing, clamped: false };
}
