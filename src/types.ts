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
