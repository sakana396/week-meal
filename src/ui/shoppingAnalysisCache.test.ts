import { expect, it } from "vitest";
import { basketReducer, initialAppState, type Shopping } from "../core/basket";
import { createShoppingAnalysisCache } from "./shoppingAnalysisCache";

const shopping: Shopping = {
  id: "shopping",
  date: "2026-10-31",
  origin: "normal",
  items: [],
};

it("TC-NFR-03-05 日付だけを変えた買い物の分析を再利用する", () => {
  const cache = createShoppingAnalysisCache();
  const state = { ...initialAppState, shoppings: [shopping] };
  const changed = basketReducer(state, {
    type: "setShoppingDate",
    shoppingId: shopping.id,
    date: "2026-10-30",
  });
  expect(changed.shoppings[0].items).toBe(shopping.items);
  expect(cache.analyze(shopping, state)).toBe(
    cache.analyze(changed.shoppings[0], changed),
  );
});

it.each(["items", "manualFoods", "profile"] as const)(
  "TC-NFR-03-05 %s の参照が変わると分析を作り直す",
  (key) => {
    const cache = createShoppingAnalysisCache();
    const state = { ...initialAppState, shoppings: [shopping] };
    const changed = {
      ...state,
      shoppings:
        key === "items"
          ? [{ ...shopping, items: [...shopping.items] }]
          : [shopping],
      manualFoods:
        key === "manualFoods" ? [...state.manualFoods] : state.manualFoods,
      profile: key === "profile" ? { ...state.profile } : state.profile,
    };
    expect(cache.analyze(changed.shoppings[0], changed)).not.toBe(
      cache.analyze(shopping, state),
    );
  },
);
