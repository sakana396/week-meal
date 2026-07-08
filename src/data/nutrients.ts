import type { NutrientDefinition } from "../types";

export const basicNutrientDefinitions: NutrientDefinition[] = [
  {
    key: "energyKcal",
    label: "エネルギー",
    unit: "kcal",
    maxValue: 900,
    group: "basic",
    tone: "energy",
  },
  {
    key: "proteinG",
    label: "たんぱく質",
    unit: "g",
    maxValue: 50,
    group: "basic",
    tone: "protein",
  },
  {
    key: "fatG",
    label: "脂質",
    unit: "g",
    maxValue: 100,
    group: "basic",
    tone: "fat",
  },
  {
    key: "carbohydrateG",
    label: "炭水化物",
    unit: "g",
    maxValue: 100,
    group: "basic",
    tone: "carb",
  },
  {
    key: "fiberG",
    label: "食物繊維",
    unit: "g",
    maxValue: 30,
    group: "basic",
    tone: "fiber",
  },
  {
    key: "saltEquivalentG",
    label: "食塩相当量",
    unit: "g",
    maxValue: 20,
    group: "basic",
    tone: "salt",
  },
];

export const mineralDefinitions: NutrientDefinition[] = [
  { key: "sodiumMg", label: "ナトリウム", unit: "mg", maxValue: 1000, group: "mineral", tone: "mineral" },
  { key: "potassiumMg", label: "カリウム", unit: "mg", maxValue: 1000, group: "mineral", tone: "mineral" },
  { key: "calciumMg", label: "カルシウム", unit: "mg", maxValue: 500, group: "mineral", tone: "mineral" },
  { key: "magnesiumMg", label: "マグネシウム", unit: "mg", maxValue: 250, group: "mineral", tone: "mineral" },
  { key: "phosphorusMg", label: "リン", unit: "mg", maxValue: 700, group: "mineral", tone: "mineral" },
  { key: "ironMg", label: "鉄", unit: "mg", maxValue: 8, group: "mineral", tone: "mineral" },
  { key: "zincMg", label: "亜鉛", unit: "mg", maxValue: 8, group: "mineral", tone: "mineral" },
  { key: "copperMg", label: "銅", unit: "mg", maxValue: 1, group: "mineral", tone: "mineral" },
  { key: "manganeseMg", label: "マンガン", unit: "mg", maxValue: 4, group: "mineral", tone: "mineral" },
  { key: "iodineUg", label: "ヨウ素", unit: "μg", maxValue: 150, group: "mineral", tone: "mineral" },
  { key: "seleniumUg", label: "セレン", unit: "μg", maxValue: 35, group: "mineral", tone: "mineral" },
  { key: "chromiumUg", label: "クロム", unit: "μg", maxValue: 12, group: "mineral", tone: "mineral" },
  { key: "molybdenumUg", label: "モリブデン", unit: "μg", maxValue: 35, group: "mineral", tone: "mineral" },
];

export const vitaminDefinitions: NutrientDefinition[] = [
  { key: "retinolUg", label: "レチノール", unit: "μg", maxValue: 500, group: "vitamin", tone: "vitamin" },
  { key: "alphaCaroteneUg", label: "α-カロテン", unit: "μg", maxValue: 5000, group: "vitamin", tone: "vitamin" },
  { key: "betaCaroteneUg", label: "β-カロテン", unit: "μg", maxValue: 5000, group: "vitamin", tone: "vitamin" },
  { key: "betaCryptoxanthinUg", label: "β-クリプトキサンチン", unit: "μg", maxValue: 1000, group: "vitamin", tone: "vitamin" },
  { key: "betaCaroteneEquivalentUg", label: "β-カロテン当量", unit: "μg", maxValue: 5000, group: "vitamin", tone: "vitamin" },
  { key: "vitaminAUg", label: "ビタミンA", unit: "μg", maxValue: 900, group: "vitamin", tone: "vitamin" },
  { key: "vitaminDUg", label: "ビタミンD", unit: "μg", maxValue: 12, group: "vitamin", tone: "vitamin" },
  { key: "alphaTocopherolMg", label: "α-トコフェロール", unit: "mg", maxValue: 8, group: "vitamin", tone: "vitamin" },
  { key: "betaTocopherolMg", label: "β-トコフェロール", unit: "mg", maxValue: 2, group: "vitamin", tone: "vitamin" },
  { key: "gammaTocopherolMg", label: "γ-トコフェロール", unit: "mg", maxValue: 20, group: "vitamin", tone: "vitamin" },
  { key: "deltaTocopherolMg", label: "δ-トコフェロール", unit: "mg", maxValue: 5, group: "vitamin", tone: "vitamin" },
  { key: "vitaminKUg", label: "ビタミンK", unit: "μg", maxValue: 250, group: "vitamin", tone: "vitamin" },
  { key: "vitaminB1Mg", label: "ビタミンB1", unit: "mg", maxValue: 1.5, group: "vitamin", tone: "vitamin" },
  { key: "vitaminB2Mg", label: "ビタミンB2", unit: "mg", maxValue: 1.5, group: "vitamin", tone: "vitamin" },
  { key: "niacinMg", label: "ナイアシン", unit: "mg", maxValue: 20, group: "vitamin", tone: "vitamin" },
  { key: "niacinEquivalentMg", label: "ナイアシン当量", unit: "mg", maxValue: 20, group: "vitamin", tone: "vitamin" },
  { key: "vitaminB6Mg", label: "ビタミンB6", unit: "mg", maxValue: 1.5, group: "vitamin", tone: "vitamin" },
  { key: "vitaminB12Ug", label: "ビタミンB12", unit: "μg", maxValue: 3, group: "vitamin", tone: "vitamin" },
  { key: "folateUg", label: "葉酸", unit: "μg", maxValue: 300, group: "vitamin", tone: "vitamin" },
  { key: "pantothenicAcidMg", label: "パントテン酸", unit: "mg", maxValue: 7, group: "vitamin", tone: "vitamin" },
  { key: "biotinUg", label: "ビオチン", unit: "μg", maxValue: 60, group: "vitamin", tone: "vitamin" },
  { key: "vitaminCMg", label: "ビタミンC", unit: "mg", maxValue: 150, group: "vitamin", tone: "vitamin" },
];

export const vitaminMineralDefinitions = [
  ...vitaminDefinitions,
  ...mineralDefinitions,
];

export const nutrientDefinitions = [
  ...basicNutrientDefinitions,
  ...vitaminMineralDefinitions,
];

export const sourceLabel = "日本食品標準成分表（八訂）増補2023年";
