import { analyzeShopping } from "../core/shoppingAnalysis";
import type { AnalysisResult } from "../core/analyze";
import type { AppState, Shopping } from "../core/basket";
import { foodsById } from "./foodData";
import { measurePerformanceDetail } from "./performanceDetail";

/** 行・手入力食品・属性の参照が同じ間、買い物の分析を再利用する（DES-PER-05）。 */
export function createShoppingAnalysisCache() {
  const byItems = new WeakMap<
    Shopping["items"],
    WeakMap<
      AppState["manualFoods"],
      WeakMap<AppState["profile"], AnalysisResult>
    >
  >();

  return {
    analyze(shopping: Shopping | null, state: AppState): AnalysisResult {
      if (!shopping) return analyzeShopping(null, state, foodsById);
      let byManualFoods = byItems.get(shopping.items);
      if (!byManualFoods) {
        byManualFoods = new WeakMap();
        byItems.set(shopping.items, byManualFoods);
      }
      let byProfile = byManualFoods.get(state.manualFoods);
      if (!byProfile) {
        byProfile = new WeakMap();
        byManualFoods.set(state.manualFoods, byProfile);
      }
      const cached = byProfile.get(state.profile);
      if (cached) return cached;
      const result = measurePerformanceDetail("analysis", () =>
        analyzeShopping(shopping, state, foodsById),
      );
      byProfile.set(state.profile, result);
      return result;
    },
  };
}
