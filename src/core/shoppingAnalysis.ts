import type { FoodItem } from "../types";
import { analyzeBasket, type AnalysisResult } from "./analyze";
import { toRegisteredItems, type AppState, type Shopping } from "./basket";

/** 指定した買い物だけを分析する（DES-SHP-03）。 */
export function analyzeShopping(
  shopping: Shopping | null,
  state: AppState,
  foodsById: ReadonlyMap<string, FoodItem>,
): AnalysisResult {
  return analyzeBasket(
    toRegisteredItems(shopping, state.manualFoods, foodsById),
    state.profile,
  );
}
