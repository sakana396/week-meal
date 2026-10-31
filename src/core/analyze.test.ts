import { describe, expect, it } from "vitest";
import { extraReferenceBasis } from "../data/dietaryReference";
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
function item(displayName: string, count = 1): RegisteredItem {
  const group = groups.find((candidate) => candidate.name === displayName);
  if (!group) throw new Error(`食材名がない: ${displayName}`);
  return { food: representativeFood(group), displayName, count };
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
      noDataItems: [],
      itemCount: 2,
    });
  });

  it("TC-FR-BAL-05-02 ちょうど 3 品目なら判定する（境界）", () => {
    expect(analyzeBasket(basket.slice(0, 3), defaultProfile).kind).toBe(
      "judged",
    );
  });

  it("TC-FR-NUT-06-01 個数 0 の食材は数えない", () => {
    const items = [
      basket[0],
      basket[1],
      { ...basket[2], count: 0 },
      { ...basket[3], count: 0 },
    ];
    expect(analyzeBasket(items, defaultProfile)).toEqual({
      kind: "insufficient",
      reason: "tooFewItems",
      noDataItems: [],
      itemCount: 2,
    });
  });

  it("TC-FR-BAL-01-04 判定すると、14 種の結果と PFC 比率を返す", () => {
    const result = analyzeBasket(basket, defaultProfile);
    if (result.kind !== "judged") throw new Error("判定されなかった");
    expect(result.results).toHaveLength(14);
    expect(result.details.map((detail) => detail.key).sort()).toEqual(
      Object.keys(extraReferenceBasis).sort(),
    );
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
      noDataItems: [],
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
    // 野菜が少ない買い物で、にんじんを 20 倍にすると判定が変わる
    const items = [
      item("豚肉"),
      item("鶏卵", 6),
      item("にんじん"),
      item("牛乳"),
    ];
    const changes = sensitivity(items, defaultProfile, 20);
    // にんじん（炭水化物が多く脂質が少ない）を 20 倍にすると、炭水化物の不足が解消する
    expect(changes).toContainEqual({
      displayName: "にんじん",
      key: "carbohydrateG",
      before: "low",
      after: "ok",
    });
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

describe("仮説 H-02 の記録（docs/iterations/it01/retrospective.md）", () => {
  const baskets: Record<string, RegisteredItem[]> = {
    "A 野菜多め": [
      item("キャベツ"),
      item("にんじん", 3),
      item("玉ねぎ", 3),
      item("豚肉"),
      item("鶏卵", 6),
      item("豆腐"),
      item("納豆"),
    ],
    "B 肉中心": [
      item("鶏肉", 2),
      item("豚肉"),
      item("牛肉"),
      item("玉ねぎ", 2),
      item("もやし"),
      item("鶏卵", 10),
    ],
    "C 魚と野菜": [
      item("さけ・ます", 2),
      item("さば"),
      item("ほうれんそう"),
      item("トマト", 3),
      item("ブロッコリー"),
      item("牛乳"),
      item("ヨーグルト"),
      item("バナナ", 3),
    ],
    "D 少なめ": [
      item("もやし", 2),
      item("豆腐"),
      item("納豆"),
      item("鶏卵", 6),
    ],
  };

  it("TC-H-02-05 4 つの買い物で目安重量を 1 つずつ ±30% ずらすと、判定が変わるのは B の鶏卵 −30% のビタミン A だけ", () => {
    const changes = Object.entries(baskets).flatMap(([name, items]) =>
      [1.3, 0.7].flatMap((factor) =>
        sensitivity(items, defaultProfile, factor).map((change) => ({
          name,
          factor,
          ...change,
        })),
      ),
    );
    expect(changes).toEqual([
      {
        name: "B 肉中心",
        factor: 0.7,
        displayName: "鶏卵",
        key: "vitaminAUg",
        before: "ok",
        after: "low",
      },
    ]);
  });
});

describe("エネルギーのデータがない食材（DES-ANL-03）", () => {
  const noEnergy = {
    ...item("キャベツ"),
    displayName: "自家製スープ",
    food: {
      ...item("キャベツ").food,
      id: "manual-1",
      nutrientsPer100g: {
        ...item("キャベツ").food.nutrientsPer100g,
        energyKcal: null,
      },
    },
  };

  it("TC-FR-BAL-05-04 エネルギーのデータがない食材は 3 品目に数えず、名前を返す", () => {
    expect(
      analyzeBasket([basket[0], basket[1], noEnergy], defaultProfile),
    ).toEqual({
      kind: "insufficient",
      reason: "tooFewItems",
      itemCount: 2,
      noDataItems: ["自家製スープ"],
    });
  });

  it("TC-FR-BAL-05-05 判定したときも、数えなかった食材名を返す", () => {
    const result = analyzeBasket([...basket, noEnergy], defaultProfile);
    expect(result.kind).toBe("judged");
    expect(result.noDataItems).toEqual(["自家製スープ"]);
  });

  it("TC-FR-QTY-05-05 食材名が constructor でも Object.prototype の値を目安重量にしない（異常）", () => {
    const odd = { ...item("キャベツ"), displayName: "constructor" };
    const result = analyzeBasket([...basket, odd], defaultProfile);
    expect(result.kind === "judged" && result.approximateItems).toEqual([
      "constructor",
    ]);
  });
});
