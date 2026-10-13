import foodsJson from "../data/foods.json";
import { stapleFoodIds, type StapleKind } from "../data/staples";
import {
  unitWeights as defaultUnitWeights,
  type UnitWeight,
} from "../data/unitWeights";
import type { FoodItem } from "../types";
import { judgeBalance, referenceFor, type BalanceResult } from "./balance";
import {
  nutrientRatios,
  pfcRatio,
  stapleItem,
  stapleShares,
  sumNutrients,
  type BasketItem,
  type Pfc,
} from "./nutrition";
import type { Profile } from "./profile";
import { edibleGrams } from "./quantity";

/** 登録した食材 1 件（DES-ANL-01） */
export type RegisteredItem = {
  food: FoodItem;
  /** 登録一覧の食材名（目安重量を引くキー） */
  displayName: string;
  count: number;
  usedUp: boolean;
};

/** 判定に必要な、主食を除いた食材の最低品目数（TBD-12 の仮置き、DES-BAL-05） */
export const minimumItemCount = 3;

export type AnalysisResult =
  | {
      kind: "insufficient";
      /** tooFewItems: 品目が足りない、noEnergy: 品目はあるがエネルギーが 0 */
      reason: "tooFewItems" | "noEnergy";
      itemCount: number;
    }
  | {
      kind: "judged";
      results: BalanceResult[];
      pfc: Pfc | null;
      /** 目安重量がなく、1 単位 = 100g の概算で数えた食材名 */
      approximateItems: string[];
    };

/** 計算に使う定義データ。テストで差し替えられるようにする */
export type AnalysisData = {
  unitWeights: Record<string, UnitWeight>;
  stapleFoods: Record<StapleKind, FoodItem | undefined>;
};

const foods = foodsJson as FoodItem[];

export const defaultAnalysisData: AnalysisData = {
  unitWeights: defaultUnitWeights,
  stapleFoods: {
    rice: foods.find((food) => food.id === stapleFoodIds.rice),
    bread: foods.find((food) => food.id === stapleFoodIds.bread),
    noodle: foods.find((food) => food.id === stapleFoodIds.noodle),
  },
};

/**
 * 登録した食材から偏りを判定する（DES-ANL-01、FR-NUT-06、FR-BAL-05）。
 * 使い切った食材と個数 0 以下の食材を除き、主食を除いて 3 品目未満なら判定しない。
 * 量を換算し、主食を盛りの比率で足し、1,000 kcal あたりに直して基準値と比べる。
 */
export function analyzeBasket(
  items: RegisteredItem[],
  profile: Profile,
  data: AnalysisData = defaultAnalysisData,
): AnalysisResult {
  const active = items.filter(
    (item) => !item.usedUp && Number.isFinite(item.count) && item.count > 0,
  );
  if (active.length < minimumItemCount) {
    return {
      kind: "insufficient",
      reason: "tooFewItems",
      itemCount: active.length,
    };
  }

  const approximateItems: string[] = [];
  const basket: BasketItem[] = active.map((item) => {
    const amount = edibleGrams(
      item.food,
      data.unitWeights[item.displayName],
      item.count,
    );
    if (amount.approximate && !approximateItems.includes(item.displayName)) {
      approximateItems.push(item.displayName);
    }
    return { food: item.food, grams: amount.grams };
  });

  const nonStapleEnergy = sumNutrients(basket).energyKcal?.amount ?? 0;
  if (nonStapleEnergy <= 0) {
    return {
      kind: "insufficient",
      reason: "noEnergy",
      itemCount: active.length,
    };
  }

  const stapleFood =
    profile.staple === "none" ? undefined : data.stapleFoods[profile.staple];
  const staple = stapleFood
    ? stapleItem(stapleFood, stapleShares[profile.portion], nonStapleEnergy)
    : null;
  const all = staple ? [...basket, staple] : basket;

  const totals = sumNutrients(all);
  const ratios = nutrientRatios(totals, totals.energyKcal?.amount ?? 0);
  const pfc = pfcRatio(ratios);
  const results = judgeBalance(ratios, pfc, referenceFor(profile));
  return { kind: "judged", results, pfc, approximateItems };
}
