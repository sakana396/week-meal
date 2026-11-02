import {
  basketReducer,
  maximumCount,
  type AppState,
  type BasketAction,
} from "../core/basket";
import { unitWeights } from "../data/unitWeights";
import { maximumGrams } from "../core/quantity";
import { formatCount } from "./format";

/**
 * 登録したあとに出すお知らせの文言（P-09、DES-UI-21）。
 * 登録後の状態から個数を読み、単位は目安重量の単位（なければ「つ（概算）」）。
 * 個数が上限のまま増えなかったときは、増やせなかったことを伝える。
 */
export function registerMessage(state: AppState, action: BasketAction): string {
  if (action.type !== "register" && action.type !== "addManualFood") return "";
  const foodId = action.type === "register" ? action.foodId : action.food.id;
  const find = (target: AppState) =>
    target.shoppings
      .find((shopping) => shopping.id === action.shoppingId)
      ?.items.find(
        (item) =>
          item.foodId === foodId && item.displayName === action.displayName,
      );
  const before = find(state);
  const after = find(basketReducer(state, action));
  if (!after) return "";
  const weight = Object.hasOwn(unitWeights, action.displayName)
    ? unitWeights[action.displayName]
    : undefined;
  const unit =
    after.quantity.kind === "weight"
      ? after.quantity.unit
      : (weight?.unit ?? "つ（概算）");
  const amount = `${formatCount(after.quantity.kind === "count" ? after.quantity.count : after.quantity.grams / (after.quantity.unit === "kg" ? 1000 : 1))} ${unit}`;
  if (
    before &&
    (before.quantity.kind === "count"
      ? before.quantity.count >= maximumCount
      : before.quantity.grams >= maximumGrams)
  ) {
    return `${action.displayName}はこれ以上増やせません（${amount}）`;
  }
  return `${action.displayName}を登録しました（${amount}）`;
}
