import { nutrientDefinitions } from "../data/nutrients";
import type { FoodItem, NutrientKey } from "../types";
import type { Portion } from "./profile";

/** 集計する食材 1 件（可食部の重さつき）（DES-NUT-01） */
export type BasketItem = { food: FoodItem; grams: number };

/**
 * 栄養素 1 つの合計。データのある食材だけで合計し、その食材のエネルギーの合計も持つ。
 * すべての食材でデータがなければ null（DES-NUT-01、FR-NUT-05）
 */
export type NutrientTotal = {
  amount: number;
  coveredEnergyKcal: number;
} | null;
export type NutrientTotals = Record<NutrientKey, NutrientTotal>;

/** 1,000 kcal あたりの量と、データのある食材がエネルギーに占める割合（DES-NUT-03） */
export type NutrientRatio = { per1000kcal: number; coverage: number } | null;
export type NutrientRatios = Record<NutrientKey, NutrientRatio>;

/** たんぱく質・脂質・炭水化物のエネルギー比率（%）（DES-NUT-04） */
export type Pfc = {
  proteinPct: number;
  fatPct: number;
  carbohydratePct: number;
};

/** 盛りごとに、主食が全体のエネルギーに占める比率（TBD-14、ADR-0003 の 1） */
export const stapleShares: Record<Portion, number> = {
  small: 0.3,
  medium: 0.4,
  large: 0.5,
};

const nutrientKeys = nutrientDefinitions.map((definition) => definition.key);

/**
 * 栄養素ごとに、データのある食材だけで合計する（DES-NUT-01、FR-NUT-01, 05）。
 * 各食材の量は「重さ ÷ 100 × 100g あたりの成分値」。エネルギーのデータがない食材や、
 * 重さが 0 以下の食材は、割合を求められないので数えない。
 */
export function sumNutrients(items: BasketItem[]): NutrientTotals {
  const usable = items.filter(
    (item) =>
      Number.isFinite(item.grams) &&
      item.grams > 0 &&
      item.food.nutrientsPer100g.energyKcal !== null,
  );

  return Object.fromEntries(
    nutrientKeys.map((key) => {
      let amount = 0;
      let coveredEnergyKcal = 0;
      let hasValue = false;
      for (const { food, grams } of usable) {
        const value = food.nutrientsPer100g[key];
        if (value === null || value === undefined) continue;
        const factor = grams / 100;
        amount += value * factor;
        coveredEnergyKcal += (food.nutrientsPer100g.energyKcal ?? 0) * factor;
        hasValue = true;
      }
      return [key, hasValue ? { amount, coveredEnergyKcal } : null];
    }),
  ) as NutrientTotals;
}

/**
 * 主食の集計用の食材を作る（DES-NUT-02、FR-STP-03）。
 * 主食以外のエネルギーを E、比率を s とすると、主食のエネルギーは E × s ÷ (1 − s)。
 * そのエネルギーになる重さを、主食の代表食品の 100g あたりのエネルギーから逆算する。
 * 比率が 0 以下・1 以上、E が 0 以下、主食のエネルギーのデータがないときは null。
 */
export function stapleItem(
  stapleFood: FoodItem,
  share: number,
  nonStapleEnergyKcal: number,
): BasketItem | null {
  const kcalPer100g = stapleFood.nutrientsPer100g.energyKcal;
  if (
    !(share > 0 && share < 1) ||
    !(nonStapleEnergyKcal > 0) ||
    kcalPer100g === null ||
    kcalPer100g <= 0
  ) {
    return null;
  }
  const stapleEnergyKcal = (nonStapleEnergyKcal * share) / (1 - share);
  return { food: stapleFood, grams: (stapleEnergyKcal / kcalPer100g) * 100 };
}

/**
 * 栄養素ごとに、1,000 kcal あたりの量とカバー率を求める（DES-NUT-03、FR-NUT-02, 03, 05）。
 * 1,000 kcal あたりの量は、データのある食材の合計 ÷ その食材のエネルギーの合計 × 1,000。
 * カバー率は、データのある食材のエネルギー ÷ 全体のエネルギー。
 */
export function nutrientRatios(
  totals: NutrientTotals,
  totalEnergyKcal: number,
): NutrientRatios {
  return Object.fromEntries(
    nutrientKeys.map((key) => {
      const total = totals[key];
      if (!total || total.coveredEnergyKcal <= 0 || totalEnergyKcal <= 0) {
        return [key, null];
      }
      return [
        key,
        {
          per1000kcal: (total.amount / total.coveredEnergyKcal) * 1000,
          // 数式上は 1 を超えないが、浮動小数点の誤差で 1 をわずかに超えないようにする
          coverage: Math.min(1, total.coveredEnergyKcal / totalEnergyKcal),
        },
      ];
    }),
  ) as NutrientRatios;
}

/**
 * たんぱく質・脂質・炭水化物のエネルギー比率を求める（DES-NUT-04、FR-NUT-04）。
 * 1,000 kcal あたりの量に 4・9・4 kcal/g を掛け、3 つの合計に対する比とする（ADR-0003 の 3）。
 * どれかのデータがない、または合計が 0 のときは null。
 */
export function pfcRatio(ratios: NutrientRatios): Pfc | null {
  const protein = ratios.proteinG;
  const fat = ratios.fatG;
  const carbohydrate = ratios.carbohydrateG;
  if (!protein || !fat || !carbohydrate) return null;

  const proteinKcal = protein.per1000kcal * 4;
  const fatKcal = fat.per1000kcal * 9;
  const carbohydrateKcal = carbohydrate.per1000kcal * 4;
  const sum = proteinKcal + fatKcal + carbohydrateKcal;
  if (sum <= 0) return null;

  return {
    proteinPct: (proteinKcal / sum) * 100,
    fatPct: (fatKcal / sum) * 100,
    carbohydratePct: (carbohydrateKcal / sum) * 100,
  };
}
