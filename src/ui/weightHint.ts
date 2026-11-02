import type { UnitWeight } from "../data/unitWeights";

/** 個数行の買うときの目安重量を示す（DES-QTY-07）。 */
export function weightHintText(weight: UnitWeight | undefined): string {
  return weight
    ? `1 ${weight.unit} ≒ ${weight.purchaseG} g`
    : "1 単位 ≒ 100 g（概算）";
}
