export type NutrientKey =
  | "energyKcal"
  | "proteinG"
  | "fatG"
  | "carbohydrateG"
  | "fiberG"
  | "saltEquivalentG";

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
  tone: "energy" | "protein" | "fat" | "carb" | "fiber" | "salt";
};
