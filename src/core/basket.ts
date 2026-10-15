import type { FoodItem } from "../types";
import type { RegisteredItem } from "./analyze";
import { defaultProfile, type Profile } from "./profile";

/** 登録した食材 1 行（DES-BSK） */
export type BasketEntry = {
  /** 登録ごとの ID（画面側で作って action に入れる） */
  id: string;
  /** 食品番号。手入力の食品は manualFoods の id（"manual-" で始め、食品番号とぶつからないようにする） */
  foodId: string;
  /** 登録一覧の食材名（目安重量を引くキー） */
  displayName: string;
  /** 個数（0.5 刻み、0.5 以上 999 以下） */
  count: number;
  usedUp: boolean;
};

/** 画面の状態のうち、保存するもの（DES-BSK、ADR-0004） */
export type AppState = {
  items: BasketEntry[];
  manualFoods: FoodItem[];
  profile: Profile;
};

export type BasketAction =
  | { type: "register"; foodId: string; displayName: string; id: string }
  | { type: "increment"; id: string }
  | { type: "decrement"; id: string }
  | { type: "toggleUsedUp"; id: string }
  | { type: "remove"; id: string }
  | { type: "addManualFood"; food: FoodItem; displayName: string; id: string }
  | { type: "setProfile"; profile: Profile }
  | { type: "replace"; state: AppState };

/** 個数の増減の幅と、下限・上限（DES-BSK-02、FR-QTY-04。上限は保存データの検査 DES-STO-04 と合わせる） */
export const countStep = 0.5;
export const minimumCount = 0.5;
export const maximumCount = 999;

export const initialAppState: AppState = {
  items: [],
  manualFoods: [],
  profile: defaultProfile,
};

function updateItem(
  state: AppState,
  id: string,
  update: (item: BasketEntry) => BasketEntry,
): AppState {
  if (!state.items.some((item) => item.id === id)) return state;
  return {
    ...state,
    items: state.items.map((item) => (item.id === id ? update(item) : item)),
  };
}

/**
 * 同じ食材名かつ同じ食品番号の行があれば個数を増やし、なければ先頭に足す（DES-BSK-01）。
 * 詳細モードで同じ食材名の別の食品を選んだときは、栄養が違うので別の行にする。
 */
function register(
  state: AppState,
  entry: Omit<BasketEntry, "count" | "usedUp">,
): AppState {
  const existing = state.items.find(
    (item) =>
      item.displayName === entry.displayName && item.foodId === entry.foodId,
  );
  if (!existing) {
    return {
      ...state,
      items: [{ ...entry, count: 1, usedUp: false }, ...state.items],
    };
  }
  return updateItem(state, existing.id, (item) =>
    item.usedUp
      ? { ...item, usedUp: false, count: 1 }
      : { ...item, count: Math.min(item.count + 1, maximumCount) },
  );
}

/**
 * 登録した食材と設定の状態を更新する（DES-BSK-01〜06）。
 * 引数を変えず、新しい状態を返す。知らない ID への操作は状態をそのまま返す。
 */
export function basketReducer(state: AppState, action: BasketAction): AppState {
  switch (action.type) {
    case "register":
      return register(state, {
        id: action.id,
        foodId: action.foodId,
        displayName: action.displayName,
      });
    case "increment":
      return updateItem(state, action.id, (item) =>
        item.count + countStep > maximumCount
          ? item
          : { ...item, count: item.count + countStep },
      );
    case "decrement":
      return updateItem(state, action.id, (item) =>
        item.count - countStep < minimumCount
          ? item
          : { ...item, count: item.count - countStep },
      );
    case "toggleUsedUp":
      return updateItem(state, action.id, (item) => ({
        ...item,
        usedUp: !item.usedUp,
      }));
    case "remove": {
      const target = state.items.find((item) => item.id === action.id);
      if (!target) return state;
      const items = state.items.filter((item) => item.id !== action.id);
      // 手入力の食品は、ほかの行から参照されていなければ一緒に消す（DES-BSK-04）
      const stillUsed = items.some((item) => item.foodId === target.foodId);
      const manualFoods = stillUsed
        ? state.manualFoods
        : state.manualFoods.filter((food) => food.id !== target.foodId);
      return { ...state, items, manualFoods };
    }
    case "addManualFood": {
      const withFood = state.manualFoods.some(
        (food) => food.id === action.food.id,
      )
        ? state
        : { ...state, manualFoods: [action.food, ...state.manualFoods] };
      return register(withFood, {
        id: action.id,
        foodId: action.food.id,
        displayName: action.displayName,
      });
    }
    case "setProfile":
      return { ...state, profile: action.profile };
    case "replace":
      return action.state;
  }
}

/**
 * 分析用の登録食材に直す（DES-BSK-07）。食品データにも手入力にも見つからない行は除く。
 */
export function toRegisteredItems(
  state: AppState,
  foodsById: ReadonlyMap<string, FoodItem>,
): RegisteredItem[] {
  const manualById = new Map(state.manualFoods.map((food) => [food.id, food]));
  return state.items.flatMap((item) => {
    const food = foodsById.get(item.foodId) ?? manualById.get(item.foodId);
    return food
      ? [
          {
            food,
            displayName: item.displayName,
            count: item.count,
            usedUp: item.usedUp,
          },
        ]
      : [];
  });
}
