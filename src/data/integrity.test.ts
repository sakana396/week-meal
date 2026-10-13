import { describe, expect, it } from "vitest";
import selection from "../../scripts/food-selection.json";
import { groupFoods } from "../core/catalog";
import type { FoodItem } from "../types";
import { foodRepresentativePatterns } from "./foodDisplayNames";
import { foodShelfOverrides } from "./foodShelfOverrides";
import foodsJson from "./foods.json";
import { stapleFoodIds } from "./staples";
import { supermarketFoodPriorities } from "./supermarketFoods";

// 定義データが食品データにあるものだけを参照していることを確かめる（DES-FDB-04、NFR-11）
const foods = foodsJson as FoodItem[];
const foodIds = new Set(foods.map((food) => food.id));
const groupNames = new Set(groupFoods(foods).map((group) => group.name));

describe("食品データの整合性（DES-FDB-04）", () => {
  it("TC-FR-FDB-01-01 食品データは、絞り込みの定義にある食品だけを持つ", () => {
    expect(foods.map((food) => food.id).sort()).toEqual(
      selection.map((entry) => entry.id).sort(),
    );
  });

  it("TC-FR-FDB-02-01 絞り込みの定義の正式名称は、食品データの正式名称と一致する", () => {
    const names = new Map(foods.map((food) => [food.id, food.name]));
    const mismatched = selection.filter(
      (entry) => names.get(entry.id) !== entry.name,
    );
    expect(mismatched).toEqual([]);
  });

  it("TC-FR-FDB-02-02 すべての食品が廃棄率を数値または null で持つ", () => {
    const invalid = foods.filter(
      (food) =>
        food.refusePct !== null &&
        (typeof food.refusePct !== "number" ||
          food.refusePct < 0 ||
          food.refusePct > 100),
    );
    expect(invalid).toEqual([]);
  });

  it("TC-NFR-11-01 棚の個別設定は、食品データにある食品番号だけを指す", () => {
    const missing = Object.keys(foodShelfOverrides).filter(
      (id) => !foodIds.has(id),
    );
    expect(missing).toEqual([]);
  });

  it("TC-NFR-11-02 主食の代表食品は、食品データにある", () => {
    const missing = Object.values(stapleFoodIds).filter(
      (id) => !foodIds.has(id),
    );
    expect(missing).toEqual([]);
  });

  it("TC-NFR-11-03 代表食品の指定は、食品データの食品に当てはまる", () => {
    const unmatched = Object.entries(foodRepresentativePatterns).flatMap(
      ([name, patterns]) =>
        patterns
          .filter(
            (pattern) => !foods.some((food) => food.name.includes(pattern)),
          )
          .map((pattern) => `${name}: ${pattern}`),
    );
    expect(unmatched).toEqual([]);
  });

  it("TC-NFR-11-04 よくある食材は、すべて食品データの食材名として存在する", () => {
    const missing = supermarketFoodPriorities.filter(
      (name) => !groupNames.has(name),
    );
    expect(missing).toEqual([]);
  });
});
