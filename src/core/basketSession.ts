import {
  basketReducer,
  type AppState,
  type BasketAction,
  type BasketEntry,
} from "./basket";

/** 直前に削除した買い物・行・位置（DES-SHP-02）。 */
export type PendingRemoval = {
  shoppingId: string;
  entry: BasketEntry;
  index: number;
};
/** 保存しない取り消し情報（DES-SHP-02）。 */
export type BasketSessionState = {
  appState: AppState;
  pendingRemoval: PendingRemoval | null;
};
/** 買い物操作と取り消し（DES-SHP-02）。 */
export type BasketSessionAction =
  BasketAction | { type: "undoRemove" } | { type: "clearPendingRemoval" };

/** 行だけを元の位置へ戻す（DES-SHP-02）。 */
export function basketSessionReducer(
  state: BasketSessionState,
  action: BasketSessionAction,
): BasketSessionState {
  if (action.type === "clearPendingRemoval")
    return state.pendingRemoval ? { ...state, pendingRemoval: null } : state;
  if (action.type === "undoRemove") {
    const pending = state.pendingRemoval;
    if (!pending) return state;
    const shopping = state.appState.shoppings.find(
      (entry) => entry.id === pending.shoppingId,
    );
    if (
      !shopping ||
      shopping.items.some((item) => item.id === pending.entry.id)
    )
      return { ...state, pendingRemoval: null };
    const items = [...shopping.items];
    items.splice(pending.index, 0, pending.entry);
    return {
      appState: {
        ...state.appState,
        shoppings: state.appState.shoppings.map((entry) =>
          entry === shopping ? { ...entry, items } : entry,
        ),
      },
      pendingRemoval: null,
    };
  }
  const appState = basketReducer(state.appState, action);
  if (appState === state.appState) return state;
  if (action.type === "remove") {
    const shopping = state.appState.shoppings.find(
      (entry) => entry.id === action.shoppingId,
    );
    const index =
      shopping?.items.findIndex((entry) => entry.id === action.id) ?? -1;
    return {
      appState,
      pendingRemoval:
        shopping && index >= 0
          ? {
              shoppingId: action.shoppingId,
              entry: shopping.items[index],
              index,
            }
          : null,
    };
  }
  if (action.type === "setProfile")
    return { appState, pendingRemoval: state.pendingRemoval };
  if (action.type === "replace" || action.type === "removeShopping")
    return { appState, pendingRemoval: null };
  if (action.type === "createShopping")
    return { appState, pendingRemoval: state.pendingRemoval };
  if (
    action.type === "setShoppingDate" &&
    state.pendingRemoval?.shoppingId === action.shoppingId
  )
    return { appState, pendingRemoval: state.pendingRemoval };
  return { appState, pendingRemoval: null };
}
