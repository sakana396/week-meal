import { lowerTargetRatio, type BalanceResult } from "../core/balance";

/** 判定バッジの背景色。適正・不明・比の欠損には警告色を付けない（DES-COL-01）。 */
export function balanceTone(result: BalanceResult): string | null {
  if (result.status === "high") return "#d8b4fe";
  if (result.status !== "low") return null;
  const ratio = lowerTargetRatio(result);
  if (ratio === null) return null;
  const t = Math.min(1, Math.max(0, ratio));
  return `rgb(255, ${Math.round(255 * t)}, 0)`;
}
