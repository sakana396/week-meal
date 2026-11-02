import { unitWeightFor } from "../core/quantity";

/** 個数行の買うときの目安重量を示す（DES-QTY-07）。 */
export function weightHint(foodId: string, displayName: string): string {
  const weight = unitWeightFor(foodId, displayName);
  return weight
    ? `1 ${weight.unit} ≒ ${weight.purchaseG} g`
    : "1 単位 ≒ 100 g（概算）";
}
