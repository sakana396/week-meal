import {
  basketReducer,
  maximumCount,
  type AppState,
  type BasketAction,
} from "../core/basket";
import { maximumGrams, unitWeightFor } from "../core/quantity";
import { formatCount } from "./format";

/**
 * 登録したあとに出すお知らせの文言（P-09、DES-UI-21）。
 * 登録後の量を読み、個数の単位は食品 ID に対応する目安重量から求める。
 * 目安重量がなければ「つ（概算）」とする。
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
  const weight = unitWeightFor(foodId, action.displayName);
  const unit =
    after.quantity.kind === "weight"
      ? after.quantity.unit
      : (weight?.unit ?? "つ（概算）");
  const value =
    after.quantity.kind === "count"
      ? formatCount(after.quantity.count)
      : String(
          after.quantity.grams / (after.quantity.unit === "kg" ? 1000 : 1),
        );
  const amount = `${value} ${unit}`;
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
