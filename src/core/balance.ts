import {
  dietaryReference,
  type DailyReference,
} from "../data/dietaryReference";
import type { NutrientKey } from "../types";
import type { NutrientRatios, Pfc } from "./nutrition";
import type { Profile } from "./profile";

function averageRange(
  left: [number, number],
  right: [number, number],
): [number, number] {
  return [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2];
}

/** 男女の基準値の平均（性別が未選択のとき。ADR-0003 の 4） */
function averageReference(
  male: DailyReference,
  female: DailyReference,
): DailyReference {
  const average = (key: keyof DailyReference) =>
    ((male[key] as number) + (female[key] as number)) / 2;
  return {
    energyKcal: average("energyKcal"),
    proteinPctRange: averageRange(male.proteinPctRange, female.proteinPctRange),
    fatPctRange: averageRange(male.fatPctRange, female.fatPctRange),
    carbohydratePctRange: averageRange(
      male.carbohydratePctRange,
      female.carbohydratePctRange,
    ),
    fiberGMin: average("fiberGMin"),
    saltGMax: average("saltGMax"),
    vitaminAUg: average("vitaminAUg"),
    vitaminB1Mg: average("vitaminB1Mg"),
    vitaminB2Mg: average("vitaminB2Mg"),
    vitaminCMg: average("vitaminCMg"),
    vitaminDUg: average("vitaminDUg"),
    ironMg: average("ironMg"),
    calciumMg: average("calciumMg"),
    potassiumMgMin: average("potassiumMgMin"),
    zincMg: average("zincMg"),
  };
}

/**
 * 利用者の性別・年齢区分の基準値（1 日あたり）を返す（DES-BAL-02、FR-STP-04）。
 * 性別が未選択のときは、同じ年齢区分の男女の平均とする。
 */
export function referenceFor(
  profile: Pick<Profile, "sex" | "ageGroup">,
): DailyReference {
  const male = dietaryReference.male[profile.ageGroup];
  const female = dietaryReference.female[profile.ageGroup];
  if (profile.sex === "male") return male;
  if (profile.sex === "female") return female;
  return averageReference(male, female);
}

/** 判定の規則（DES-BAL-03） */
export type BalanceRule =
  | {
      kind: "pfcRange";
      range: "proteinPctRange" | "fatPctRange" | "carbohydratePctRange";
    }
  | { kind: "lower"; reference: LowerReferenceKey }
  | { kind: "upper"; reference: "saltGMax" };

type LowerReferenceKey =
  | "fiberGMin"
  | "vitaminAUg"
  | "vitaminB1Mg"
  | "vitaminB2Mg"
  | "vitaminCMg"
  | "vitaminDUg"
  | "ironMg"
  | "calciumMg"
  | "potassiumMgMin"
  | "zincMg";

export type BalanceTarget = { key: NutrientKey; rule: BalanceRule };

/** 判定する 14 種の栄養素と規則（DES-BAL-03、TBD-11、ADR-0003 の 5） */
export const balanceTargets: BalanceTarget[] = [
  { key: "proteinG", rule: { kind: "pfcRange", range: "proteinPctRange" } },
  { key: "fatG", rule: { kind: "pfcRange", range: "fatPctRange" } },
  {
    key: "carbohydrateG",
    rule: { kind: "pfcRange", range: "carbohydratePctRange" },
  },
  { key: "fiberG", rule: { kind: "lower", reference: "fiberGMin" } },
  { key: "saltEquivalentG", rule: { kind: "upper", reference: "saltGMax" } },
  { key: "vitaminAUg", rule: { kind: "lower", reference: "vitaminAUg" } },
  { key: "vitaminB1Mg", rule: { kind: "lower", reference: "vitaminB1Mg" } },
  { key: "vitaminB2Mg", rule: { kind: "lower", reference: "vitaminB2Mg" } },
  { key: "vitaminCMg", rule: { kind: "lower", reference: "vitaminCMg" } },
  { key: "vitaminDUg", rule: { kind: "lower", reference: "vitaminDUg" } },
  { key: "ironMg", rule: { kind: "lower", reference: "ironMg" } },
  { key: "calciumMg", rule: { kind: "lower", reference: "calciumMg" } },
  { key: "potassiumMg", rule: { kind: "lower", reference: "potassiumMgMin" } },
  { key: "zincMg", rule: { kind: "lower", reference: "zincMg" } },
];

/** 不足と判定する充足率の下限・過剰と判定する上限（TBD-03） */
export const lowSufficiency = 0.7;
export const highSufficiency = 1.3;

export type BalanceStatus = "low" | "ok" | "high" | "unknown";

/** 栄養素 1 つの判定結果（DES-BAL-04） */
export type BalanceResult = {
  key: NutrientKey;
  status: BalanceStatus;
  /** 充足率（栄養の割合 ÷ 基準値）。PFC と不明のときは null */
  sufficiency: number | null;
  /** PFC のエネルギー比率（%）と目標の範囲。PFC 以外は null */
  pfcPct: number | null;
  pfcRange: [number, number] | null;
  /** データのある食材がエネルギーに占める割合。不明のときは null */
  coverage: number | null;
};

const pfcKeys = {
  proteinPctRange: "proteinPct",
  fatPctRange: "fatPct",
  carbohydratePctRange: "carbohydratePct",
} as const;

/**
 * 栄養素ごとに偏りを判定する（DES-BAL-04、FR-BAL-01〜03）。
 * PFC は目標の範囲（%エネルギー）を下回れば不足、上回れば過剰。
 * それ以外は、基準値を 1,000 kcal あたりに直した値（基準値 ÷ 推定エネルギー必要量 × 1,000）
 * との比を充足率とし、下限の規則は 70% 未満で不足、上限の規則は 130% 超で過剰とする。
 */
export function judgeBalance(
  ratios: NutrientRatios,
  pfc: Pfc | null,
  reference: DailyReference,
): BalanceResult[] {
  return balanceTargets.map(({ key, rule }) => {
    const coverage = ratios[key]?.coverage ?? null;

    if (rule.kind === "pfcRange") {
      const range = reference[rule.range];
      if (!pfc) {
        return {
          key,
          status: "unknown",
          sufficiency: null,
          pfcPct: null,
          pfcRange: range,
          coverage,
        };
      }
      const pct = pfc[pfcKeys[rule.range]];
      const status: BalanceStatus =
        pct < range[0] ? "low" : pct > range[1] ? "high" : "ok";
      return {
        key,
        status,
        sufficiency: null,
        pfcPct: pct,
        pfcRange: range,
        coverage,
      };
    }

    const ratio = ratios[key];
    if (!ratio) {
      return {
        key,
        status: "unknown",
        sufficiency: null,
        pfcPct: null,
        pfcRange: null,
        coverage: null,
      };
    }
    const referencePer1000kcal =
      (reference[rule.reference] / reference.energyKcal) * 1000;
    const sufficiency = ratio.per1000kcal / referencePer1000kcal;
    const status: BalanceStatus =
      rule.kind === "lower"
        ? sufficiency < lowSufficiency
          ? "low"
          : "ok"
        : sufficiency > highSufficiency
          ? "high"
          : "ok";
    return { key, status, sufficiency, pfcPct: null, pfcRange: null, coverage };
  });
}
