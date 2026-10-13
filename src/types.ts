export type NutrientKey =
  | "energyKcal"
  | "proteinG"
  | "fatG"
  | "carbohydrateG"
  | "fiberG"
  | "saltEquivalentG"
  | "sodiumMg"
  | "potassiumMg"
  | "calciumMg"
  | "magnesiumMg"
  | "phosphorusMg"
  | "ironMg"
  | "zincMg"
  | "copperMg"
  | "manganeseMg"
  | "iodineUg"
  | "seleniumUg"
  | "chromiumUg"
  | "molybdenumUg"
  | "retinolUg"
  | "alphaCaroteneUg"
  | "betaCaroteneUg"
  | "betaCryptoxanthinUg"
  | "betaCaroteneEquivalentUg"
  | "vitaminAUg"
  | "vitaminDUg"
  | "alphaTocopherolMg"
  | "betaTocopherolMg"
  | "gammaTocopherolMg"
  | "deltaTocopherolMg"
  | "vitaminKUg"
  | "vitaminB1Mg"
  | "vitaminB2Mg"
  | "niacinMg"
  | "niacinEquivalentMg"
  | "vitaminB6Mg"
  | "vitaminB12Ug"
  | "folateUg"
  | "pantothenicAcidMg"
  | "biotinUg"
  | "vitaminCMg";

export type NutrientsPer100g = Record<NutrientKey, number | null>;

export type FoodItem = {
  id: string;
  name: string;
  category: string;
  /** 廃棄率（%）。成分表の REFUSE 列（DES-FDB-03） */
  refusePct: number | null;
  nutrientsPer100g: NutrientsPer100g;
};

export type NutrientDefinition = {
  key: NutrientKey;
  label: string;
  unit: string;
  maxValue: number;
  group: "basic" | "vitamin" | "mineral";
  tone:
    | "energy"
    | "protein"
    | "fat"
    | "carb"
    | "fiber"
    | "salt"
    | "vitamin"
    | "mineral";
};
