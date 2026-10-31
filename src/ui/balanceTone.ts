import {
  excessRatio,
  lowerTargetRatio,
  type BalanceResult,
} from "../core/balance";

/** 判定バッジの背景色（DES-COL-01、DES-COL-03）。 */
export function balanceTone(result: BalanceResult): string | null {
  if (result.status === "high") {
    const ratio = excessRatio(result);
    if (ratio === null) return null;
    const t = Math.min(1, Math.max(0, ratio / 0.5));
    const [red, green, blue] = [
      [216, 168],
      [180, 85],
      [254, 247],
    ].map(([start, end]) => Math.round(start + (end - start) * t));
    return `rgb(${red}, ${green}, ${blue})`;
  }
  if (result.status !== "low") return null;
  const ratio = lowerTargetRatio(result);
  if (ratio === null) return null;
  const t = Math.min(1, Math.max(0, ratio));
  return `rgb(255, ${Math.round(255 * t)}, 0)`;
}
