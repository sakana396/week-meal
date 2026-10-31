import type { FoodItem } from "../types";
import type { RegisteredItem } from "./analyze";
import type { ManualFood } from "./manualFoods";
import { defaultProfile, type Profile } from "./profile";

/** 買い物内の登録行（DES-SHP-01）。 */
export type BasketEntry = {
  id: string;
  foodId: string;
  displayName: string;
  count: number;
};
/** 作成順を配列位置で保持する買い物（DES-SHP-01）。 */
export type Shopping = {
  id: string;
  date: string;
  origin: "normal" | "usedUpMigration";
  items: BasketEntry[];
};
/** 保存する状態（DES-SHP-01）。 */
export type AppState = {
  shoppings: Shopping[];
  manualFoods: ManualFood[];
  profile: Profile;
};
/** 買い物 ID は画面から渡す（DES-SHP-02）。 */
export type BasketAction =
  | { type: "createShopping"; id: string; date: string }
  | { type: "setShoppingDate"; shoppingId: string; date: string }
  | {
      type: "register";
      shoppingId: string;
      foodId: string;
      displayName: string;
      id: string;
      initialShopping?: { id: string; date: string };
    }
  | {
      type: "addManualFood";
      shoppingId: string;
      food: ManualFood;
      displayName: string;
      id: string;
      initialShopping?: { id: string; date: string };
    }
  | {
      type: "increment" | "decrement" | "remove";
      shoppingId: string;
      id: string;
    }
  | { type: "removeShopping"; shoppingId: string }
  | { type: "setProfile"; profile: Profile }
  | { type: "replace"; state: AppState };

export const countStep = 0.5;
export const minimumCount = 0.5;
export const maximumCount = 999;
export const initialAppState: AppState = {
  shoppings: [],
  manualFoods: [],
  profile: defaultProfile,
};

/** 実在する現地の暦日を検査する（DES-SHP-01）。 */
export function validShoppingDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

/** 日付、同日の作成順で最新を選ぶ（DES-SHP-01）。 */
export function latestShopping(
  shoppings: readonly Shopping[],
): Shopping | null {
  return shoppings.reduce<Shopping | null>(
    (latest, shopping) =>
      latest === null || shopping.date >= latest.date ? shopping : latest,
    null,
  );
}

function changeShopping(
  state: AppState,
  shoppingId: string,
  update: (shopping: Shopping) => Shopping,
): AppState {
  const index = state.shoppings.findIndex(
    (shopping) => shopping.id === shoppingId,
  );
  if (index < 0) return state;
  const original = state.shoppings[index];
  const changed = update(original);
  if (changed === original) return state;
  return {
    ...state,
    shoppings: state.shoppings.map((shopping, position) =>
      position === index ? changed : shopping,
    ),
  };
}

function register(
  shopping: Shopping,
  entry: Omit<BasketEntry, "count">,
): Shopping {
  const existing = shopping.items.find(
    (item) =>
      item.foodId === entry.foodId && item.displayName === entry.displayName,
  );
  if (existing) {
    if (existing.count >= maximumCount) return shopping;
    return {
      ...shopping,
      items: shopping.items.map((item) =>
        item === existing
          ? { ...item, count: Math.min(maximumCount, item.count + 1) }
          : item,
      ),
    };
  }
  if (shopping.items.some((item) => item.id === entry.id)) return shopping;
  return { ...shopping, items: [{ ...entry, count: 1 }, ...shopping.items] };
}

/** 入力を変更せず買い物単位で操作する（DES-SHP-02）。 */
export function basketReducer(state: AppState, action: BasketAction): AppState {
  switch (action.type) {
    case "createShopping":
      return !action.id ||
        !validShoppingDate(action.date) ||
        state.shoppings.some((shopping) => shopping.id === action.id)
        ? state
        : {
            ...state,
            shoppings: [
              ...state.shoppings,
              { id: action.id, date: action.date, origin: "normal", items: [] },
            ],
          };
    case "setShoppingDate":
      return validShoppingDate(action.date)
        ? changeShopping(state, action.shoppingId, (shopping) =>
            shopping.date === action.date
              ? shopping
              : { ...shopping, date: action.date },
          )
        : state;
    case "register":
    case "addManualFood": {
      if (
        !action.id ||
        !action.displayName ||
        (action.type === "register" ? !action.foodId : !action.food.id)
      )
        return state;
      const start =
        state.shoppings.length === 0 &&
        action.initialShopping &&
        action.initialShopping.id === action.shoppingId
          ? basketReducer(state, {
              type: "createShopping",
              ...action.initialShopping,
            })
          : state;
      const entry = {
        id: action.id,
        foodId: action.type === "register" ? action.foodId : action.food.id,
        displayName: action.displayName,
      };
      if (
        start.shoppings.some(
          (shopping) =>
            shopping.id !== action.shoppingId &&
            shopping.items.some((item) => item.id === entry.id),
        )
      )
        return state;
      const updated = changeShopping(start, action.shoppingId, (shopping) =>
        register(shopping, entry),
      );
      if (updated === state || action.type === "register") return updated;
      return updated.manualFoods.some((food) => food.id === action.food.id)
        ? updated
        : { ...updated, manualFoods: [action.food, ...updated.manualFoods] };
    }
    case "increment":
    case "decrement":
      return changeShopping(state, action.shoppingId, (shopping) => {
        const item = shopping.items.find((entry) => entry.id === action.id);
        if (!item) return shopping;
        const count =
          item.count + (action.type === "increment" ? countStep : -countStep);
        if (count < minimumCount || count > maximumCount) return shopping;
        return {
          ...shopping,
          items: shopping.items.map((entry) =>
            entry === item ? { ...entry, count } : entry,
          ),
        };
      });
    case "remove":
      return changeShopping(state, action.shoppingId, (shopping) =>
        shopping.items.some((item) => item.id === action.id)
          ? {
              ...shopping,
              items: shopping.items.filter((item) => item.id !== action.id),
            }
          : shopping,
      );
    case "removeShopping":
      return state.shoppings.some(
        (shopping) => shopping.id === action.shoppingId,
      )
        ? {
            ...state,
            shoppings: state.shoppings.filter(
              (shopping) => shopping.id !== action.shoppingId,
            ),
          }
        : state;
    case "setProfile":
      return { ...state, profile: action.profile };
    case "replace":
      return action.state;
  }
}

/** 対象の買い物だけを分析用の行に直す（DES-SHP-03）。 */
export function toRegisteredItems(
  shopping: Shopping | null,
  manualFoods: readonly ManualFood[],
  foodsById: ReadonlyMap<string, FoodItem>,
): RegisteredItem[] {
  if (!shopping) return [];
  const manualById = new Map(manualFoods.map((food) => [food.id, food]));
  return shopping.items.flatMap((item) => {
    const food = foodsById.get(item.foodId) ?? manualById.get(item.foodId);
    return food
      ? [{ food, displayName: item.displayName, count: item.count }]
      : [];
  });
}
