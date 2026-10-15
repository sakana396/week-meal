import { nutrientDefinitions } from "../data/nutrients";
import type { BalanceResult } from "../core/balance";
import type { Profile } from "../core/profile";
import type { NutrientKey } from "../types";

export const statusLabels: Record<BalanceResult["status"], string> = {
  low: "不足",
  ok: "適正",
  high: "過剰",
  unknown: "不明",
};

export const stapleLabels: Record<Profile["staple"], string> = {
  rice: "ご飯",
  bread: "パン",
  noodle: "麺",
  none: "なし",
};

export const portionLabels: Record<Profile["portion"], string> = {
  small: "小盛り",
  medium: "中盛り",
  large: "大盛り",
};

export const sexLabels: Record<Profile["sex"], string> = {
  male: "男性",
  female: "女性",
  unspecified: "未選択",
};

/** 栄養素の表示名 */
export function nutrientLabel(key: NutrientKey): string {
  return (
    nutrientDefinitions.find((definition) => definition.key === key)?.label ??
    key
  );
}

/** 判定の前提にした主食の説明（DES-UI-41） */
export function stapleNote(profile: Profile): string {
  return profile.staple === "none"
    ? "主食なしとして計算しています"
    : `主食は${stapleLabels[profile.staple]}・${portionLabels[profile.portion]}として計算しています`;
}
