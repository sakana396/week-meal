import { describe, expect, it } from "vitest";
import { ageGroups, dietaryReference } from "../data/dietaryReference";
import { referenceFor } from "./balance";
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
