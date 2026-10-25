import {
  basketReducer,
  type AppState,
  type BasketAction,
  type BasketEntry,
} from "./basket";

/** 直前に削除した行と、保存する配列内の位置（DES-BSK-09）。 */
export type PendingRemoval = { entry: BasketEntry; index: number };

/** 保存しない削除の取り消し情報を、保存対象と分離する（DES-BSK-09）。 */
export type BasketSessionState = {
  appState: AppState;
  pendingRemoval: PendingRemoval | null;
};

/** 通常の食材操作と、直前の削除の取り消し（DES-BSK-09）。 */
export type BasketSessionAction = BasketAction | { type: "undoRemove" };

/** 行の参照が変わっても、内容が同じなら有効な食材操作ではない（DES-BSK-09）。 */
function sameItems(before: BasketEntry[], after: BasketEntry[]): boolean {
  return (
    before.length === after.length &&
    before.every((item, index) => {
      const next = after[index];
      return (
        item.id === next.id &&
        item.foodId === next.foodId &&
        item.displayName === next.displayName &&
        item.count === next.count &&
        item.usedUp === next.usedUp
      );
    })
  );
}

/** 行だけを復元し、設定や手入力の台帳を巻き戻さない（DES-BSK-09）。 */
export function basketSessionReducer(
  state: BasketSessionState,
  action: BasketSessionAction,
): BasketSessionState {
  if (action.type === "undoRemove") {
    if (!state.pendingRemoval) return state;
    const { entry, index } = state.pendingRemoval;
    const items = [...state.appState.items];
    items.splice(index, 0, entry);
    return { appState: { ...state.appState, items }, pendingRemoval: null };
  }
  const appState = basketReducer(state.appState, action);
  if (action.type === "replace") return { appState, pendingRemoval: null };
  if (action.type === "remove") {
    const index = state.appState.items.findIndex(
      (item) => item.id === action.id,
    );
    if (index < 0) return state;
    return {
      appState,
      pendingRemoval: { entry: state.appState.items[index], index },
    };
  }
  return {
    appState,
    pendingRemoval: sameItems(state.appState.items, appState.items)
      ? state.pendingRemoval
      : null,
  };
}
