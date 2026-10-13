import { describe, expect, it } from "vitest";
import foodsJson from "../data/foods.json";
import type { FoodItem } from "../types";
import {
  analyzeBasket,
  defaultAnalysisData,
  sensitivity,
  type RegisteredItem,
} from "./analyze";
import { groupFoods, representativeFood } from "./catalog";
import { defaultProfile, type Profile } from "./profile";

const groups = groupFoods(foodsJson as FoodItem[]);

/** 実際の食品データから、食材名の代表食品を個数つきで登録する */
function item(displayName: string, count = 1, usedUp = false): RegisteredItem {
  const group = groups.find((candidate) => candidate.name === displayName);
  if (!group) throw new Error(`食材名がない: ${displayName}`);
  return { food: representativeFood(group), displayName, count, usedUp };
}

// キャベツ 1 玉、にんじん 3 本、豚肉 1 パック、鶏卵 6 個
const basket = [
  item("キャベツ"),
  item("にんじん", 3),
  item("豚肉"),
  item("鶏卵", 6),
];

describe("analyzeBasket（DES-ANL-01）", () => {
  it("TC-FR-BAL-05-01 主食を除いて 3 品目未満なら判定しない", () => {
    expect(analyzeBasket(basket.slice(0, 2), defaultProfile)).toEqual({
      kind: "insufficient",
      reason: "tooFewItems",
      itemCount: 2,
    });
  });

  it("TC-FR-BAL-05-02 ちょうど 3 品目なら判定する（境界）", () => {
    expect(analyzeBasket(basket.slice(0, 3), defaultProfile).kind).toBe(
      "judged",
    );
  });

  it("TC-FR-NUT-06-01 使い切った食材と個数 0 の食材は数えない", () => {
    const items = [
      basket[0],
      basket[1],
      { ...basket[2], usedUp: true },
      { ...basket[3], count: 0 },
    ];
    expect(analyzeBasket(items, defaultProfile)).toEqual({
      kind: "insufficient",
      reason: "tooFewItems",
      itemCount: 2,
    });
  });

  it("TC-FR-BAL-01-04 判定すると、14 種の結果と PFC 比率を返す", () => {
    const result = analyzeBasket(basket, defaultProfile);
    if (result.kind !== "judged") throw new Error("判定されなかった");
    expect(result.results).toHaveLength(14);
    expect(result.pfc).not.toBeNull();
    expect(result.approximateItems).toEqual([]);
  });

  it("TC-FR-NUT-03-02 食材の個数を一律に 2 倍しても、判定は変わらない", () => {
    const base = analyzeBasket(basket, defaultProfile);
    const doubled = analyzeBasket(
      basket.map((entry) => ({ ...entry, count: entry.count * 2 })),
      defaultProfile,
    );
    if (base.kind !== "judged" || doubled.kind !== "judged")
      throw new Error("判定されなかった");
    expect(doubled.results.map((r) => r.status)).toEqual(
      base.results.map((r) => r.status),
    );
    expect(doubled.pfc?.carbohydratePct).toBeCloseTo(
      base.pfc?.carbohydratePct ?? Number.NaN,
      10,
    );
  });

  it("TC-FR-STP-03-07 主食の盛りを大きくすると、炭水化物の比率が上がる", () => {
    const pctOf = (profile: Profile) => {
      const result = analyzeBasket(basket, profile);
      return result.kind === "judged" ? (result.pfc?.carbohydratePct ?? 0) : 0;
    };
    const none = pctOf({ ...defaultProfile, staple: "none" });
    const small = pctOf({ ...defaultProfile, portion: "small" });
    const large = pctOf({ ...defaultProfile, portion: "large" });
    expect(none).toBeLessThan(small);
    expect(small).toBeLessThan(large);
  });

  it("TC-FR-QTY-05-03 目安重量のない食材は、概算の食材として名前を返す", () => {
    const unknown = { ...item("キャベツ"), displayName: "目安重量のない食材" };
    const result = analyzeBasket([...basket, unknown], defaultProfile);
    expect(result.kind === "judged" && result.approximateItems).toEqual([
      "目安重量のない食材",
    ]);
  });

  it("TC-FR-BAL-05-03 エネルギーが 0 の食材だけなら判定しない（異常）", () => {
    const zero = basket.map((entry) => ({
      ...entry,
      food: {
        ...entry.food,
        nutrientsPer100g: { ...entry.food.nutrientsPer100g, energyKcal: 0 },
      },
    }));
    expect(analyzeBasket(zero, defaultProfile)).toEqual({
      kind: "insufficient",
      reason: "noEnergy",
      itemCount: 4,
    });
  });

  it("TC-FR-STP-03-08 主食の代表食品がなければ、主食なしで判定する（異常）", () => {
    const data = {
      ...defaultAnalysisData,
      stapleFoods: { rice: undefined, bread: undefined, noodle: undefined },
    };
    const withoutStaple = analyzeBasket(basket, defaultProfile, data);
    const none = analyzeBasket(basket, { ...defaultProfile, staple: "none" });
    expect(withoutStaple).toEqual(none);
  });

  it("TC-FR-NUT-06-02 主食の代表食品は食品データにある（既定のデータ）", () => {
    expect(Object.values(defaultAnalysisData.stapleFoods).every(Boolean)).toBe(
      true,
    );
  });
});

describe("sensitivity（DES-ANL-02）", () => {
  it("TC-H-02-01 倍率 1 なら、どの食材をずらしても判定は変わらない（境界）", () => {
    expect(sensitivity(basket, defaultProfile, 1)).toEqual([]);
  });

  it("TC-H-02-02 1 つの食材を大きくずらすと、その食材の名前つきで判定の変化を返す", () => {
    // 野菜が少ない買い物で、にんじんを 20 倍にするとビタミン A などが変わる
    const items = [
      item("豚肉"),
      item("鶏卵", 6),
      item("にんじん"),
      item("牛乳"),
    ];
    const changes = sensitivity(items, defaultProfile, 20);
    expect(changes.length).toBeGreaterThan(0);
    expect(
      changes.every(
        (change) =>
          change.displayName === "にんじん" || change.before !== change.after,
      ),
    ).toBe(true);
    expect(changes.some((change) => change.displayName === "にんじん")).toBe(
      true,
    );
  });

  it("TC-H-02-03 もとの買い物を判定できないときは空の配列（境界）", () => {
    expect(sensitivity(basket.slice(0, 1), defaultProfile, 1.3)).toEqual([]);
  });

  it("TC-H-02-04 目安重量のない食材はずらさない", () => {
    const unknown = { ...item("キャベツ"), displayName: "目安重量のない食材" };
    const changes = sensitivity([...basket, unknown], defaultProfile, 20);
    expect(
      changes.some((change) => change.displayName === "目安重量のない食材"),
    ).toBe(false);
  });
});

describe("analyzeBasket の概算の食材名（DES-ANL-01）", () => {
  it("TC-FR-QTY-05-04 同じ食材名を 2 回登録しても、概算の食材名は 1 つだけ返す", () => {
    const unknown = { ...item("キャベツ"), displayName: "目安重量のない食材" };
    const result = analyzeBasket([...basket, unknown, unknown], defaultProfile);
    expect(result.kind === "judged" && result.approximateItems).toEqual([
      "目安重量のない食材",
    ]);
  });
});
