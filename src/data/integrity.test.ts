import { describe, expect, it } from "vitest";
import selection from "../../scripts/food-selection.json";
import { groupFoods, isRegistrable, representativeFood } from "../core/catalog";
import type { FoodItem } from "../types";
import {
  foodCategoryGroupAliases,
  foodGroupAliases,
  foodRepresentativePatterns,
} from "./foodDisplayNames";
import { foodShelfOverrides } from "./foodShelfOverrides";
import foodsJson from "./foods.json";
import { stapleFoodIds } from "./staples";
import { supermarketFoodPriorities } from "./supermarketFoods";
import { unitWeights } from "./unitWeights";

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

  it("TC-NFR-11-03 代表食品の指定は、同じ食材名にまとまる食品に当てはまる", () => {
    const groups = groupFoods(foods);
    const unmatched = Object.entries(foodRepresentativePatterns).flatMap(
      ([name, patterns]) => {
        const members = groups
          .filter((group) => group.name === name)
          .flatMap((group) => group.foods);
        return patterns
          .filter(
            (pattern) => !members.some((food) => food.name.includes(pattern)),
          )
          .map((pattern) => `${name}: ${pattern}`);
      },
    );
    expect(unmatched).toEqual([]);
  });

  it("TC-NFR-11-06 登録の一覧の食材名は重複しない（目安重量のキーが一意に決まる）", () => {
    const names = groupFoods(foods)
      .filter((group) => group.foods.some(isRegistrable))
      .map((group) => group.name);
    expect(names.length).toBe(new Set(names).size);
  });

  it("TC-NFR-11-04 よくある食材は、すべて食品データの食材名として存在する", () => {
    const missing = supermarketFoodPriorities.filter(
      (name) => !groupNames.has(name),
    );
    expect(missing).toEqual([]);
  });

  it("TC-NFR-11-05 目安重量の食材名は、すべて食品データの食材名として存在する", () => {
    const missing = Object.keys(unitWeights).filter(
      (name) => !groupNames.has(name),
    );
    expect(missing).toEqual([]);
  });

  it("TC-FR-QTY-02-04 よくある食材には、すべて目安重量がある", () => {
    const missing = supermarketFoodPriorities.filter(
      (name) => !(name in unitWeights),
    );
    expect(missing).toEqual([]);
  });

  it("TC-FR-QTY-02-05 目安重量は正の重さで、廃棄率の上書きは 0〜100 の範囲にある", () => {
    const invalid = Object.entries(unitWeights).filter(
      ([, weight]) =>
        !(weight.purchaseG > 0) ||
        (weight.refusePct !== undefined &&
          (weight.refusePct < 0 || weight.refusePct >= 100)) ||
        weight.source.length === 0,
    );
    expect(invalid).toEqual([]);
  });

  it("TC-NFR-11-07 表示名の別名は、食品データの食品に当てはまる", () => {
    const missingGroupAliases = Object.keys(foodGroupAliases).filter(
      (alias) => !foods.some((food) => food.name.includes(alias)),
    );
    const missingCategoryAliases = Object.keys(foodCategoryGroupAliases).filter(
      (key) => {
        const [category, alias] = key.split(":");
        return !foods.some(
          (food) => food.category === category && food.name.includes(alias),
        );
      },
    );
    expect([...missingGroupAliases, ...missingCategoryAliases]).toEqual([]);
  });

  it("TC-FR-FDB-01-02 乾物・粉類（SRS v0.2 の TBD-10）が、登録できる食材名として食品データにある", () => {
    const names = [
      "でん粉",
      "はるさめ（乾燥）",
      "あずき（乾燥）",
      "ひよこまめ（乾燥）",
      "ぎんだら",
      "しょうがの漬物",
      "かぶの漬物",
      "かんきつ（缶詰）",
    ];
    const registrable = new Set(
      groupFoods(foods)
        .filter((group) => group.foods.some(isRegistrable))
        .map((group) => group.name),
    );
    expect(names.filter((name) => !registrable.has(name))).toEqual([]);
  });

  it.each([
    ["でん粉", "02034"],
    ["かぶの漬物", "06041"],
    ["はるさめ（乾燥）", "02040"],
    ["しょうがの漬物", "06104"],
    ["かんきつ（缶詰）", "07035"],
    ["にんじん", "06212"],
    ["牛肉", "11030"],
    ["豆腐", "04032"],
  ])(
    "TC-NFR-11-08 食材名 %s の代表食品は、意図した食品（%s）になる",
    (name, id) => {
      const group = groupFoods(foods).find(
        (candidate) => candidate.name === name,
      );
      expect(group && representativeFood(group).id).toBe(id);
    },
  );
});
