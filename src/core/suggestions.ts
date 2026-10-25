import type { FoodItem, NutrientKey } from "../types";
import {
  defaultAnalysisData,
  minimumItemCount,
  type AnalysisData,
} from "./analyze";
import {
  balanceTargets,
  highSufficiency,
  judgeBalance,
  lowerTargetRatio,
  lowSufficiency,
  referenceFor,
  type BalanceResult,
} from "./balance";
import { maximumCount, toRegisteredItems, type AppState } from "./basket";
import {
  groupFoods,
  isRegistrable,
  representativeFood,
  supermarketPriority,
} from "./catalog";
import {
  nutrientRatios,
  pfcRatio,
  stapleItem,
  stapleShares,
  sumNutrients,
  type NutrientTotals,
} from "./nutrition";
import { edibleGrams } from "./quantity";

/** 登録できるよくある食材の代表食品（DES-SUG-01）。 */
export type SupplementCandidate = {
  food: FoodItem;
  displayName: string;
  priority: number;
};
/** 独立に1単位追加した場合の改善と注意（DES-SUG-01〜03）。 */
export type SupplementSuggestion = {
  foodId: string;
  displayName: string;
  improvedKeys: NutrientKey[];
  improvement: number;
  newHighKeys: NutrientKey[];
  newLowKeys: NutrientKey[];
  worsenedHighKeys: NutrientKey[];
  approximate: boolean;
};

/** 登録可能なよくある食材をまとめ、食品番号の重複を除く（DES-SUG-01）。 */
export function supplementCandidates(foods: FoodItem[]): SupplementCandidate[] {
  const seen = new Set<string>();
  return groupFoods(foods.filter(isRegistrable)).flatMap((group) => {
    const priority = supermarketPriority(group.name);
    if (priority === null) return [];
    const food = representativeFood(group);
    if (seen.has(food.id)) return [];
    seen.add(food.id);
    return [{ food, displayName: group.name, priority }];
  });
}

const round = (value: number) => Math.round(value * 1e6) / 1e6;

/** nullの有無とカバーするエネルギーを保ちながら増分を加える（DES-SUG-02）。 */
function addTotals(
  base: NutrientTotals,
  delta: NutrientTotals,
): NutrientTotals {
  return Object.fromEntries(
    Object.entries(base).map(([key, value]) => {
      const added = delta[key as NutrientKey];
      return [
        key,
        value || added
          ? {
              amount: (value?.amount ?? 0) + (added?.amount ?? 0),
              coveredEnergyKcal:
                (value?.coveredEnergyKcal ?? 0) +
                (added?.coveredEnergyKcal ?? 0),
            }
          : null,
      ];
    }),
  ) as NutrientTotals;
}

/** 判定境界までの不足量。不明・上限規則は評価から除く（DES-SUG-03）。 */
function deficit(result: BalanceResult): number | null {
  const ratio = lowerTargetRatio(result);
  if (ratio === null) return null;
  const rule = balanceTargets.find(({ key }) => key === result.key)?.rule;
  return Math.max(0, (rule?.kind === "pfcRange" ? 1 : lowSufficiency) - ratio);
}

/** 既存過剰の上限超過比を判定と同じ桁で比較する（DES-SUG-03）。 */
function excess(result: BalanceResult): number {
  return round(
    Math.max(
      0,
      result.pfcRange
        ? (result.pfcPct ?? 0) / result.pfcRange[1] - 1
        : (result.sufficiency ?? 0) / highSufficiency - 1,
    ),
  );
}

/** 元の合計を一度求め、各候補の増分と主食だけを足して評価する（DES-SUG-01〜03）。 */
export function suggestSupplements(
  state: AppState,
  foodsById: ReadonlyMap<string, FoodItem>,
  candidates: SupplementCandidate[],
  data: AnalysisData = defaultAnalysisData,
): SupplementSuggestion[] {
  if (candidates.length === 0) return [];
  const items = toRegisteredItems(state, foodsById);
  const active = items.filter(
    (item) =>
      !item.usedUp &&
      Number.isFinite(item.count) &&
      item.count > 0 &&
      item.food.nutrientsPer100g.energyKcal !== null,
  );
  if (active.length < minimumItemCount) return [];
  const weightFor = (name: string) =>
    Object.hasOwn(data.unitWeights, name) ? data.unitWeights[name] : undefined;
  const base = sumNutrients(
    active.map((item) => ({
      food: item.food,
      grams: edibleGrams(item.food, weightFor(item.displayName), item.count)
        .grams,
    })),
  );
  if (!((base.energyKcal?.amount ?? 0) > 0)) return [];
  const reference = referenceFor(state.profile);
  const stapleFood =
    state.profile.staple === "none"
      ? undefined
      : data.stapleFoods[state.profile.staple];
  const judge = (nonStaple: NutrientTotals): BalanceResult[] | null => {
    const energy = nonStaple.energyKcal?.amount ?? 0;
    if (!(energy > 0)) return null;
    const staple = stapleFood
      ? stapleItem(stapleFood, stapleShares[state.profile.portion], energy)
      : null;
    const totals = staple
      ? addTotals(nonStaple, sumNutrients([staple]))
      : nonStaple;
    const ratios = nutrientRatios(totals, totals.energyKcal?.amount ?? 0);
    return judgeBalance(ratios, pfcRatio(ratios), reference);
  };
  const before = judge(base);
  if (!before || !before.some((r) => r.status === "low")) return [];
  // 通常登録と同じく、食品番号と表示名が一致する最初の行を使う。
  const existing = new Map<string, Map<string, (typeof items)[number]>>();
  for (const item of items) {
    let names = existing.get(item.food.id);
    if (!names) {
      names = new Map();
      existing.set(item.food.id, names);
    }
    if (!names.has(item.displayName)) names.set(item.displayName, item);
  }
  const evaluated: { suggestion: SupplementSuggestion; priority: number }[] =
    [];
  for (const candidate of candidates) {
    const { food, displayName, priority } = candidate;
    if (!((food.nutrientsPer100g.energyKcal ?? 0) > 0)) continue;
    const item = existing.get(food.id)?.get(displayName);
    const count =
      item && !item.usedUp
        ? Math.min(item.count + 1, maximumCount) - item.count
        : 1;
    if (!(count > 0)) continue;
    const amount = edibleGrams(food, weightFor(displayName), count);
    const after = judge(
      addTotals(base, sumNutrients([{ food, grams: amount.grams }])),
    );
    if (!after) continue;
    if (
      before.some(
        (r, index) =>
          r.status !== "unknown" &&
          (after[index].status === "unknown" ||
            r.coverage === null ||
            after[index].coverage === null ||
            after[index].coverage < r.coverage),
      )
    )
      continue;
    const suggestion: SupplementSuggestion = {
      foodId: food.id,
      displayName,
      improvedKeys: [],
      improvement: 0,
      newHighKeys: [],
      newLowKeys: [],
      worsenedHighKeys: [],
      approximate: amount.approximate,
    };
    for (const [index, previous] of before.entries()) {
      const next = after[index];
      const oldDeficit = deficit(previous);
      const newDeficit = deficit(next);
      if (oldDeficit !== null && newDeficit !== null) {
        suggestion.improvement += oldDeficit - newDeficit;
        const isPfc = balanceTargets[index].rule.kind === "pfcRange";
        const hasData = isPfc
          ? ["proteinG", "fatG", "carbohydrateG"].every(
              (key) => food.nutrientsPer100g[key as NutrientKey] != null,
            )
          : food.nutrientsPer100g[previous.key] != null;
        if (previous.status === "low" && newDeficit < oldDeficit && hasData)
          suggestion.improvedKeys.push(previous.key);
      }
      if (previous.status !== "high" && next.status === "high")
        suggestion.newHighKeys.push(next.key);
      if (previous.status !== "low" && next.status === "low")
        suggestion.newLowKeys.push(next.key);
      if (
        previous.status === "high" &&
        next.status === "high" &&
        excess(next) > excess(previous)
      )
        suggestion.worsenedHighKeys.push(next.key);
    }
    suggestion.improvement = round(suggestion.improvement);
    if (suggestion.improvement > 0) evaluated.push({ suggestion, priority });
  }
  return evaluated
    .sort(
      (a, b) =>
        Number(a.suggestion.newHighKeys.length > 0) -
          Number(b.suggestion.newHighKeys.length > 0) ||
        a.suggestion.newLowKeys.length - b.suggestion.newLowKeys.length ||
        a.suggestion.worsenedHighKeys.length -
          b.suggestion.worsenedHighKeys.length ||
        b.suggestion.improvement - a.suggestion.improvement ||
        a.priority - b.priority ||
        (a.suggestion.foodId < b.suggestion.foodId
          ? -1
          : a.suggestion.foodId > b.suggestion.foodId
            ? 1
            : 0),
    )
    .slice(0, 3)
    .map(({ suggestion }) => suggestion);
}
