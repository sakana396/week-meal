import type { NutrientDefinition } from "../types";

export const nutrientDefinitions: NutrientDefinition[] = [
  {
    key: "energyKcal",
    label: "エネルギー",
    unit: "kcal",
    maxValue: 900,
    tone: "energy",
  },
  {
    key: "proteinG",
    label: "たんぱく質",
    unit: "g",
    maxValue: 50,
    tone: "protein",
  },
  {
    key: "fatG",
    label: "脂質",
    unit: "g",
    maxValue: 100,
    tone: "fat",
  },
  {
    key: "carbohydrateG",
    label: "炭水化物",
    unit: "g",
    maxValue: 100,
    tone: "carb",
  },
  {
    key: "fiberG",
    label: "食物繊維",
    unit: "g",
    maxValue: 30,
    tone: "fiber",
  },
  {
    key: "saltEquivalentG",
    label: "食塩相当量",
    unit: "g",
    maxValue: 20,
    tone: "salt",
  },
];

export const sourceLabel = "日本食品標準成分表（八訂）増補2023年";
