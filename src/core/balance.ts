import {
  dietaryReference,
  type DailyReference,
} from "../data/dietaryReference";
import type { Profile } from "./profile";

function averageRange(
  left: [number, number],
  right: [number, number],
): [number, number] {
  return [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2];
}

/** 男女の基準値の平均（性別が未選択のとき。ADR-0003 の 4） */
function averageReference(
  male: DailyReference,
  female: DailyReference,
): DailyReference {
  const average = (key: keyof DailyReference) =>
    ((male[key] as number) + (female[key] as number)) / 2;
  return {
    energyKcal: average("energyKcal"),
    proteinPctRange: averageRange(male.proteinPctRange, female.proteinPctRange),
    fatPctRange: averageRange(male.fatPctRange, female.fatPctRange),
    carbohydratePctRange: averageRange(
      male.carbohydratePctRange,
      female.carbohydratePctRange,
    ),
    fiberGMin: average("fiberGMin"),
    saltGMax: average("saltGMax"),
    vitaminAUg: average("vitaminAUg"),
    vitaminB1Mg: average("vitaminB1Mg"),
    vitaminB2Mg: average("vitaminB2Mg"),
    vitaminCMg: average("vitaminCMg"),
    vitaminDUg: average("vitaminDUg"),
    ironMg: average("ironMg"),
    calciumMg: average("calciumMg"),
    potassiumMgMin: average("potassiumMgMin"),
    zincMg: average("zincMg"),
  };
}

/**
 * 利用者の性別・年齢区分の基準値（1 日あたり）を返す（DES-BAL-02、FR-STP-04）。
 * 性別が未選択のときは、同じ年齢区分の男女の平均とする。
 */
export function referenceFor(
  profile: Pick<Profile, "sex" | "ageGroup">,
): DailyReference {
  const male = dietaryReference.male[profile.ageGroup];
  const female = dietaryReference.female[profile.ageGroup];
  if (profile.sex === "male") return male;
  if (profile.sex === "female") return female;
  return averageReference(male, female);
}
