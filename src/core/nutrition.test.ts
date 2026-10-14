import { describe, expect, it } from "vitest";
import { nutrientDefinitions } from "../data/nutrients";
import type { FoodItem, NutrientKey, NutrientsPer100g } from "../types";
import {
  nutrientRatios,
  pfcRatio,
  stapleItem,
  stapleShares,
  sumNutrients,
  type BasketItem,
  type NutrientRatios,
} from "./nutrition";

function food(
  id: string,
  values: Partial<Record<NutrientKey, number | null>>,
): FoodItem {
  const nutrients = Object.fromEntries(
    nutrientDefinitions.map((definition) => [definition.key, null]),
  ) as NutrientsPer100g;
  return {
    id,
    name: id,
    category: "テスト",
    refusePct: 0,
    nutrientsPer100g: { ...nutrients, ...values },
  };
}

// 100g あたり: A = 200 kcal・たんぱく質 10g・ビタミン C 50mg、B = 100 kcal・たんぱく質 5g・ビタミン C なし
const foodA = food("A", {
  energyKcal: 200,
  proteinG: 10,
  fatG: 5,
  carbohydrateG: 30,
  vitaminCMg: 50,
});
const foodB = food("B", {
  energyKcal: 100,
  proteinG: 5,
  fatG: 0,
  carbohydrateG: 20,
  vitaminCMg: null,
});
const basket: BasketItem[] = [
  { food: foodA, grams: 200 },
  { food: foodB, grams: 300 },
];
const rice = food("rice", {
  energyKcal: 156,
  proteinG: 2.5,
  fatG: 0.3,
  carbohydrateG: 37.1,
});

describe("sumNutrients（DES-NUT-01）", () => {
  it("TC-FR-NUT-01-01 重さ ÷ 100 × 成分値を食材ごとに合計する", () => {
    const totals = sumNutrients(basket);
    // エネルギー 200×2 + 100×3 = 700、たんぱく質 10×2 + 5×3 = 35
    expect(totals.energyKcal).toEqual({ amount: 700, coveredEnergyKcal: 700 });
    expect(totals.proteinG).toEqual({ amount: 35, coveredEnergyKcal: 700 });
  });

  it("TC-FR-NUT-05-01 データのない食材を除いて合計し、そのエネルギーだけを数える", () => {
    // ビタミン C は A だけ: 50×2 = 100mg、エネルギーは A の 400 kcal だけ
    expect(sumNutrients(basket).vitaminCMg).toEqual({
      amount: 100,
      coveredEnergyKcal: 400,
    });
  });

  it("TC-FR-NUT-05-02 すべての食材でデータがなければ null", () => {
    expect(sumNutrients(basket).vitaminDUg).toBeNull();
  });

  it.each([
    ["TC-FR-NUT-01-02 重さ 0 の食材は数えない（境界）", 0],
    ["TC-FR-NUT-01-03 負の重さの食材は数えない（異常）", -100],
    ["TC-FR-NUT-01-04 数でない重さの食材は数えない（異常）", Number.NaN],
  ])("%s", (_title, grams) => {
    const totals = sumNutrients([...basket, { food: foodA, grams }]);
    expect(totals.energyKcal?.amount).toBe(700);
  });

  it("TC-FR-NUT-05-03 エネルギーのデータがない食材は、割合を求められないので数えない（異常）", () => {
    const noEnergy = food("C", { energyKcal: null, proteinG: 99 });
    expect(
      sumNutrients([...basket, { food: noEnergy, grams: 100 }]).proteinG
        ?.amount,
    ).toBe(35);
  });

  it("TC-FR-NUT-01-05 食材がなければ、すべて null（境界）", () => {
    expect(
      Object.values(sumNutrients([])).every((total) => total === null),
    ).toBe(true);
  });
});

describe("stapleItem（DES-NUT-02）", () => {
  it("TC-FR-STP-03-01 主食のエネルギーを E × s ÷ (1 − s) とし、重さを逆算する", () => {
    // 中盛り s = 0.4、E = 1,200 → 主食 800 kcal → 800 ÷ 156 × 100 = 512.82g
    const item = stapleItem(rice, stapleShares.medium, 1200);
    expect(item?.food).toBe(rice);
    expect(item?.grams).toBeCloseTo(512.82, 2);
  });

  it("TC-FR-STP-03-02 主食を足すと、全体のエネルギーに占める主食の比率が盛りの比率になる", () => {
    const nonStapleEnergy = sumNutrients(basket).energyKcal?.amount ?? 0;
    for (const share of Object.values(stapleShares)) {
      const item = stapleItem(rice, share, nonStapleEnergy);
      const stapleEnergy = ((item?.grams ?? 0) / 100) * 156;
      expect(stapleEnergy / (stapleEnergy + nonStapleEnergy)).toBeCloseTo(
        share,
        10,
      );
    }
  });

  it.each([
    ["TC-FR-STP-03-03 比率 0 は主食なし（境界）", rice, 0, 1200],
    ["TC-FR-STP-03-04 比率 1 以上は扱わない（異常）", rice, 1, 1200],
    [
      "TC-FR-STP-03-05 主食以外のエネルギーが 0 なら主食も足さない（境界）",
      rice,
      0.4,
      0,
    ],
    [
      "TC-FR-STP-03-06 主食のエネルギーのデータがなければ足さない（異常）",
      food("x", {}),
      0.4,
      1200,
    ],
  ])("%s", (_title, staple, share, energy) => {
    expect(stapleItem(staple, share, energy)).toBeNull();
  });
});

describe("nutrientRatios（DES-NUT-03）", () => {
  it("TC-FR-NUT-02-01 1,000 kcal あたりの量とカバー率を求める", () => {
    const ratios = nutrientRatios(sumNutrients(basket), 700);
    // たんぱく質 35 ÷ 700 × 1,000 = 50g、カバー率 1
    expect(ratios.proteinG).toEqual({ per1000kcal: 50, coverage: 1 });
    // ビタミン C 100 ÷ 400 × 1,000 = 250mg、カバー率 400 ÷ 700
    expect(ratios.vitaminCMg?.per1000kcal).toBe(250);
    expect(ratios.vitaminCMg?.coverage).toBeCloseTo(4 / 7, 10);
  });

  it("TC-FR-NUT-02-02 データがない栄養素や、全体のエネルギーが 0 なら null（境界）", () => {
    expect(nutrientRatios(sumNutrients(basket), 700).vitaminDUg).toBeNull();
    expect(nutrientRatios(sumNutrients(basket), 0).proteinG).toBeNull();
  });

  it.each([2, 3, 7.5])(
    "TC-FR-NUT-03-01 食材の量を一律に %d 倍しても、主食を足した割合は変わらない",
    (factor) => {
      const ratiosOf = (items: BasketItem[]) => {
        const nonStaple = sumNutrients(items).energyKcal?.amount ?? 0;
        const staple = stapleItem(rice, stapleShares.medium, nonStaple);
        const all = staple ? [...items, staple] : items;
        const totals = sumNutrients(all);
        return nutrientRatios(totals, totals.energyKcal?.amount ?? 0);
      };
      const base = ratiosOf(basket);
      const scaled = ratiosOf(
        basket.map((item) => ({ ...item, grams: item.grams * factor })),
      );
      for (const key of [
        "proteinG",
        "fatG",
        "carbohydrateG",
        "vitaminCMg",
      ] as const) {
        expect(scaled[key]?.per1000kcal).toBeCloseTo(
          base[key]?.per1000kcal ?? Number.NaN,
          10,
        );
        expect(scaled[key]?.coverage).toBeCloseTo(
          base[key]?.coverage ?? Number.NaN,
          10,
        );
      }
    },
  );
});

describe("pfcRatio（DES-NUT-04）", () => {
  function ratios(
    protein: number | null,
    fat: number | null,
    carbohydrate: number | null,
  ) {
    const ratio = (value: number | null) =>
      value === null ? null : { per1000kcal: value, coverage: 1 };
    return {
      proteinG: ratio(protein),
      fatG: ratio(fat),
      carbohydrateG: ratio(carbohydrate),
    } as NutrientRatios;
  }

  it("TC-FR-NUT-04-01 4・9・4 kcal/g で、3 つの合計に対する比を求める", () => {
    // P 50g × 4 = 200、F 20g × 9 = 180、C 155g × 4 = 620、合計 1,000
    expect(pfcRatio(ratios(50, 20, 155))).toEqual({
      proteinPct: 20,
      fatPct: 18,
      carbohydratePct: 62,
    });
  });

  it("TC-FR-NUT-04-02 どれかのデータがなければ null（異常）", () => {
    expect(pfcRatio(ratios(50, null, 155))).toBeNull();
  });

  it("TC-FR-NUT-04-03 3 つとも 0 なら null（境界）", () => {
    expect(pfcRatio(ratios(0, 0, 0))).toBeNull();
  });
});
