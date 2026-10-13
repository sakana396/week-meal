import { describe, expect, it } from "vitest";
import { ageGroups, dietaryReference } from "../data/dietaryReference";
import type { DailyReference } from "../data/dietaryReference";
import { balanceTargets, judgeBalance, referenceFor } from "./balance";
import type { NutrientRatios, Pfc } from "./nutrition";
import { defaultProfile } from "./profile";

describe("referenceFor（DES-BAL-02）", () => {
  it.each([
    [
      "TC-FR-STP-04-01 男性 30〜49 歳の基準値を返す",
      "male",
      "30-49",
      2750,
      7.5,
      7.5,
    ],
    [
      "TC-FR-STP-04-02 女性 75 歳以上の基準値を返す（境界: 最後の年齢区分）",
      "female",
      "75+",
      1750,
      6.5,
      5.5,
    ],
    [
      "TC-FR-STP-04-03 男性 18〜29 歳の基準値を返す（境界: 最初の年齢区分）",
      "male",
      "18-29",
      2600,
      7.5,
      7,
    ],
  ] as const)("%s", (_title, sex, ageGroup, energyKcal, saltGMax, ironMg) => {
    const reference = referenceFor({ sex, ageGroup });
    expect(reference.energyKcal).toBe(energyKcal);
    expect(reference.saltGMax).toBe(saltGMax);
    expect(reference.ironMg).toBe(ironMg);
  });

  it("TC-FR-STP-04-04 性別が未選択なら、同じ年齢区分の男女の平均を返す", () => {
    const reference = referenceFor({ sex: "unspecified", ageGroup: "30-49" });
    // エネルギー (2750 + 2050) ÷ 2 = 2400、食塩 (7.5 + 6.5) ÷ 2 = 7.0、
    // 鉄 (7.5 + 6.0) ÷ 2 = 6.75、たんぱく質の範囲は男女とも 13〜20
    expect(reference.energyKcal).toBe(2400);
    expect(reference.saltGMax).toBe(7);
    expect(reference.ironMg).toBe(6.75);
    expect(reference.proteinPctRange).toEqual([13, 20]);
  });

  it("TC-FR-STP-04-05 初期値の設定（未選択・30〜49 歳）でも基準値を返す", () => {
    expect(referenceFor(defaultProfile).energyKcal).toBe(2400);
  });
});

describe("基準値データ（DES-BAL-01）", () => {
  it("TC-FR-BAL-01-01 すべての性別・年齢区分で、値が正で、範囲の下限が上限以下", () => {
    const invalid = (["male", "female"] as const).flatMap((sex) =>
      ageGroups.flatMap((ageGroup) => {
        const reference = dietaryReference[sex][ageGroup];
        const values = Object.values(reference).flat();
        const ranges = [
          reference.proteinPctRange,
          reference.fatPctRange,
          reference.carbohydratePctRange,
        ];
        const ok =
          values.every((value) => value > 0) &&
          ranges.every(([min, max]) => min <= max);
        return ok ? [] : [`${sex} ${ageGroup}`];
      }),
    );
    expect(invalid).toEqual([]);
  });
});

// 計算しやすい基準値: エネルギー 2,000 kcal → 1,000 kcal あたりは基準値の半分
const reference: DailyReference = {
  energyKcal: 2000,
  proteinPctRange: [13, 20],
  fatPctRange: [20, 30],
  carbohydratePctRange: [50, 65],
  fiberGMin: 20,
  saltGMax: 8,
  vitaminAUg: 800,
  vitaminB1Mg: 1,
  vitaminB2Mg: 1.2,
  vitaminCMg: 100,
  vitaminDUg: 9,
  ironMg: 7,
  calciumMg: 700,
  potassiumMgMin: 3000,
  zincMg: 8,
};

function ratiosWith(values: Partial<Record<string, number>>): NutrientRatios {
  return new Proxy({} as NutrientRatios, {
    get: (_target, key: string) =>
      key in values ? { per1000kcal: values[key], coverage: 0.9 } : null,
  });
}

const balancedPfc: Pfc = { proteinPct: 15, fatPct: 25, carbohydratePct: 60 };

function resultOf(results: ReturnType<typeof judgeBalance>, key: string) {
  return results.find((result) => result.key === key);
}

describe("balanceTargets（DES-BAL-03）", () => {
  it("TC-FR-BAL-04-01 判定する栄養素は 14 種で、重複がない", () => {
    const keys = balanceTargets.map((target) => target.key);
    expect(keys).toHaveLength(14);
    expect(new Set(keys).size).toBe(14);
    expect(keys).toEqual(
      expect.arrayContaining([
        "proteinG",
        "fatG",
        "carbohydrateG",
        "fiberG",
        "saltEquivalentG",
        "zincMg",
      ]),
    );
  });
});

describe("judgeBalance（DES-BAL-04）", () => {
  it.each([
    // ビタミン C の基準 100 ÷ 2000 × 1000 = 50mg/1000kcal
    ["TC-FR-BAL-02-01 充足率 70% 未満は不足", 34.9, "low"],
    ["TC-FR-BAL-02-02 充足率ちょうど 70% は不足にしない（境界）", 35, "ok"],
    [
      "TC-FR-BAL-02-03 充足率 100% 超でも、下限の規則では過剰にしない",
      500,
      "ok",
    ],
  ])("%s", (_title, vitaminC, status) => {
    const result = resultOf(
      judgeBalance(
        ratiosWith({ vitaminCMg: vitaminC }),
        balancedPfc,
        reference,
      ),
      "vitaminCMg",
    );
    expect(result?.status).toBe(status);
    expect(result?.sufficiency).toBeCloseTo(vitaminC / 50, 10);
    expect(result?.coverage).toBe(0.9);
  });

  it.each([
    // 食塩の基準 8 ÷ 2000 × 1000 = 4g/1000kcal
    ["TC-FR-BAL-03-01 食塩は充足率 130% 超で過剰", 5.3, "high"],
    [
      "TC-FR-BAL-03-02 食塩は充足率ちょうど 130% なら過剰にしない（境界）",
      5.2,
      "ok",
    ],
    ["TC-FR-BAL-03-03 食塩は少なくても不足にしない", 0.1, "ok"],
  ])("%s", (_title, salt, status) => {
    const result = resultOf(
      judgeBalance(
        ratiosWith({ saltEquivalentG: salt }),
        balancedPfc,
        reference,
      ),
      "saltEquivalentG",
    );
    expect(result?.status).toBe(status);
  });

  it.each([
    [
      "TC-FR-BAL-02-04 たんぱく質の比率が範囲の下限未満なら不足",
      { proteinPct: 12.9, fatPct: 25, carbohydratePct: 62.1 },
      "proteinG",
      "low",
    ],
    [
      "TC-FR-BAL-03-04 脂質の比率が範囲の上限超なら過剰",
      { proteinPct: 15, fatPct: 30.1, carbohydratePct: 54.9 },
      "fatG",
      "high",
    ],
    [
      "TC-FR-BAL-02-05 範囲の端ちょうど（たんぱく質 13%）は適正（境界）",
      { proteinPct: 13, fatPct: 22, carbohydratePct: 65 },
      "proteinG",
      "ok",
    ],
    [
      "TC-FR-BAL-03-05 炭水化物の比率が上限ちょうど（65%）は適正（境界）",
      { proteinPct: 13, fatPct: 22, carbohydratePct: 65 },
      "carbohydrateG",
      "ok",
    ],
  ])("%s", (_title, pfc, key, status) => {
    const result = resultOf(judgeBalance(ratiosWith({}), pfc, reference), key);
    expect(result?.status).toBe(status);
    expect(result?.pfcRange).not.toBeNull();
  });

  it("TC-FR-BAL-01-02 データがない栄養素と、PFC が求められないときは不明", () => {
    const results = judgeBalance(ratiosWith({}), null, reference);
    expect(results.every((result) => result.status === "unknown")).toBe(true);
  });

  it("TC-FR-BAL-01-03 実際の基準値（男性 30〜49 歳）を 1,000 kcal あたりに直して比べる", () => {
    // 鉄 7.5 ÷ 2750 × 1000 = 2.727mg/1000kcal。1.88 ÷ 2.727 = 0.69 は不足
    const male = referenceFor({ sex: "male", ageGroup: "30-49" });
    const result = resultOf(
      judgeBalance(ratiosWith({ ironMg: 1.88 }), balancedPfc, male),
      "ironMg",
    );
    expect(result?.status).toBe("low");
    expect(result?.sufficiency).toBeCloseTo(1.88 / ((7.5 / 2750) * 1000), 10);
  });
});
