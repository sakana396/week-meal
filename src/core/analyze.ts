import foodsJson from "../data/foods.json";
import { stapleFoodIds, type StapleKind } from "../data/staples";
import {
  unitWeights as defaultUnitWeights,
  type UnitWeight,
} from "../data/unitWeights";
import type { FoodItem } from "../types";
import {
  detailSufficiencies,
  extraReferenceFor,
  judgeBalance,
  referenceFor,
  type BalanceResult,
  type DetailResult,
} from "./balance";
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
      /** エネルギーのデータがなく、判定に数えなかった食材名（DES-ANL-03） */
      noDataItems: string[];
    }
  | {
      kind: "judged";
      results: BalanceResult[];
      pfc: Pfc | null;
      /** 目安重量がなく、1 単位 = 100g の概算で数えた食材名 */
      approximateItems: string[];
      /** エネルギーのデータがなく、判定に数えなかった食材名（DES-ANL-03） */
      noDataItems: string[];
      /** 判定しないビタミン・ミネラルの充足率（栄養詳細用。DES-BAL-06） */
      details: DetailResult[];
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
 * 使い切った食材と個数 0 以下の食材を除き、エネルギーのデータがある食材が
 * 主食を除いて 3 品目未満なら判定しない（DES-ANL-03）。
 * 量を換算し、主食を盛りの比率で足し、1,000 kcal あたりに直して基準値と比べる。
 */
export function analyzeBasket(
  items: RegisteredItem[],
  profile: Profile,
  data: AnalysisData = defaultAnalysisData,
): AnalysisResult {
  const counted = items.filter(
    (item) => !item.usedUp && Number.isFinite(item.count) && item.count > 0,
  );
  // エネルギーのデータがない食材は割合を求められないので、3 品目の数に入れない（DES-ANL-03）
  const active = counted.filter(
    (item) => item.food.nutrientsPer100g.energyKcal !== null,
  );
  const noDataItems = [
    ...new Set(
      counted
        .filter((item) => item.food.nutrientsPer100g.energyKcal === null)
        .map((item) => item.displayName),
    ),
  ];
  if (active.length < minimumItemCount) {
    return {
      kind: "insufficient",
      reason: "tooFewItems",
      itemCount: active.length,
      noDataItems,
    };
  }

  const approximateItems: string[] = [];
  const basket: BasketItem[] = active.map((item) => {
    const amount = edibleGrams(
      item.food,
      // 保存データから来る自由な食材名で Object.prototype の値を拾わないよう、自分のキーだけを引く
      Object.hasOwn(data.unitWeights, item.displayName)
        ? data.unitWeights[item.displayName]
        : undefined,
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
      noDataItems,
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
  const reference = referenceFor(profile);
  const results = judgeBalance(ratios, pfc, reference);
  const details = detailSufficiencies(
    ratios,
    reference.energyKcal,
    extraReferenceFor(profile),
  );
  return {
    kind: "judged",
    results,
    pfc,
    approximateItems,
    noDataItems,
    details,
  };
}

/** 感度分析の結果: ずらした食材と、判定が変わった栄養素（DES-ANL-02） */
export type SensitivityChange = {
  displayName: string;
  key: BalanceResult["key"];
  before: BalanceResult["status"];
  after: BalanceResult["status"];
};

/**
 * 食材を 1 つずつ選び、その食材の目安重量（購入時の重さ）だけを factor 倍したときに
 * 判定が変わる栄養素を返す（DES-ANL-02、仮説 H-02）。
 * すべての食材を同じ倍率にしても割合は変わらない（FR-NUT-03）ので、1 つずつずらす。
 * 目安重量がない食材はずらさない。もとの買い物を判定できないときは空の配列を返す。
 */
export function sensitivity(
  items: RegisteredItem[],
  profile: Profile,
  factor: number,
  data: AnalysisData = defaultAnalysisData,
): SensitivityChange[] {
  const base = analyzeBasket(items, profile, data);
  if (base.kind !== "judged") return [];

  const names = [...new Set(items.map((item) => item.displayName))].filter(
    (name) => data.unitWeights[name],
  );
  return names.flatMap((name) => {
    const weight = data.unitWeights[name];
    const unitWeights = {
      ...data.unitWeights,
      [name]: { ...weight, purchaseG: weight.purchaseG * factor },
    };
    const scaled = analyzeBasket(items, profile, { ...data, unitWeights });
    if (scaled.kind !== "judged") return [];
    const scaledStatus = new Map(
      scaled.results.map((result) => [result.key, result.status]),
    );
    return base.results.flatMap((result) => {
      const after = scaledStatus.get(result.key) ?? "unknown";
      return after === result.status
        ? []
        : [
            {
              displayName: name,
              key: result.key,
              before: result.status,
              after,
            },
          ];
    });
  });
}
