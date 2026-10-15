import type { NutrientDefinition } from "../types";

/** 栄養素の値を単位つきで表す。データがなければ「データなし」 */
export function formatValue(value: number | null, unit: string): string {
  if (value === null) return "データなし";
  if (unit === "kcal") {
    return `${Math.round(value).toLocaleString("ja-JP")} ${unit}`;
  }
  return `${value.toLocaleString("ja-JP", { maximumFractionDigits: 2 })} ${unit}`;
}

/** 栄養素の棒の長さ（%）。表示の目安の最大値に対する割合 */
export function nutrientPercent(
  value: number | null,
  definition: NutrientDefinition,
): number {
  if (value === null || definition.maxValue <= 0) return 0;
  return Math.min(100, Math.max(0, (value / definition.maxValue) * 100));
}

/** 手入力の成分値を読む。空・数でない・負なら null（データなし） */
export function parseManualValue(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

/** 個数の表示（例: 1.5） */
export function formatCount(count: number): string {
  return count.toLocaleString("ja-JP", { maximumFractionDigits: 1 });
}
