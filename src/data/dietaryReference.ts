/**
 * 日本人の食事摂取基準（2025年版）の成人の値（DES-BAL-01、ADR-0003）。
 *
 * 1 日あたりの値。推定エネルギー必要量は身体活動レベル「ふつう」。
 * 女性の鉄は「月経なし」の値（ADR-0003 の仮置き）。
 * 値は下の出典の一次資料（厚生労働省の報告書 PDF、正誤表 令和7年3月25日 反映版）で確かめた。
 */

export type Sex = "male" | "female";
export type AgeGroup = "18-29" | "30-49" | "50-64" | "65-74" | "75+";

export const ageGroups: AgeGroup[] = [
  "18-29",
  "30-49",
  "50-64",
  "65-74",
  "75+",
];

export type DailyReference = {
  /** 推定エネルギー必要量（kcal、身体活動レベル ふつう） */
  energyKcal: number;
  /** たんぱく質の目標量（%エネルギー） */
  proteinPctRange: [number, number];
  /** 脂質の目標量（%エネルギー） */
  fatPctRange: [number, number];
  /** 炭水化物の目標量（%エネルギー） */
  carbohydratePctRange: [number, number];
  /** 食物繊維の目標量（g、以上） */
  fiberGMin: number;
  /** 食塩相当量の目標量（g、未満） */
  saltGMax: number;
  /** ビタミン A の推奨量（μgRAE） */
  vitaminAUg: number;
  /** ビタミン B1 の推奨量（mg） */
  vitaminB1Mg: number;
  /** ビタミン B2 の推奨量（mg） */
  vitaminB2Mg: number;
  /** ビタミン C の推奨量（mg） */
  vitaminCMg: number;
  /** ビタミン D の目安量（μg） */
  vitaminDUg: number;
  /** 鉄の推奨量（mg。女性は月経なし） */
  ironMg: number;
  /** カルシウムの推奨量（mg） */
  calciumMg: number;
  /** カリウムの目標量（mg、以上） */
  potassiumMgMin: number;
  /** 亜鉛の推奨量（mg） */
  zincMg: number;
};

/**
 * 出典（QA-09）。表ごとの掲載ページ（報告書の印刷ページ）:
 * 推定エネルギー必要量 p.78 参考表2、たんぱく質 p.103、脂質 p.126、炭水化物 p.143、
 * 食物繊維 p.144、ビタミンA p.181、ビタミンD p.182、ビタミンB1 p.234、ビタミンB2 p.235、
 * ビタミンC p.242、ナトリウム（食塩相当量） p.281、カリウム p.282、カルシウム p.283、
 * 鉄 p.345、亜鉛 p.346
 */
export const dietaryReferenceSource = {
  title: "「日本人の食事摂取基準（2025年版）」策定検討会報告書（厚生労働省）",
  url: "https://www.mhlw.go.jp/stf/newpage_44138.html",
  /** 厚生労働省の公表ページの日付。値は正誤表（令和7年3月25日）を反映した版の PDF で確かめた */
  publishedAt: "2024-10-11",
  erratum: "正誤表 令和7年3月25日（成人の上記の値に関わる訂正はなし）",
} as const;

export const dietaryReference: Record<Sex, Record<AgeGroup, DailyReference>> = {
  male: {
    "18-29": {
      energyKcal: 2600,
      proteinPctRange: [13, 20],
      fatPctRange: [20, 30],
      carbohydratePctRange: [50, 65],
      fiberGMin: 20,
      saltGMax: 7.5,
      vitaminAUg: 850,
      vitaminB1Mg: 1.1,
      vitaminB2Mg: 1.6,
      vitaminCMg: 100,
      vitaminDUg: 9,
      ironMg: 7,
      calciumMg: 800,
      potassiumMgMin: 3000,
      zincMg: 9,
    },
    "30-49": {
      energyKcal: 2750,
      proteinPctRange: [13, 20],
      fatPctRange: [20, 30],
      carbohydratePctRange: [50, 65],
      fiberGMin: 22,
      saltGMax: 7.5,
      vitaminAUg: 900,
      vitaminB1Mg: 1.2,
      vitaminB2Mg: 1.7,
      vitaminCMg: 100,
      vitaminDUg: 9,
      ironMg: 7.5,
      calciumMg: 750,
      potassiumMgMin: 3000,
      zincMg: 9.5,
    },
    "50-64": {
      energyKcal: 2650,
      proteinPctRange: [14, 20],
      fatPctRange: [20, 30],
      carbohydratePctRange: [50, 65],
      fiberGMin: 22,
      saltGMax: 7.5,
      vitaminAUg: 900,
      vitaminB1Mg: 1.1,
      vitaminB2Mg: 1.6,
      vitaminCMg: 100,
      vitaminDUg: 9,
      ironMg: 7,
      calciumMg: 750,
      potassiumMgMin: 3000,
      zincMg: 9.5,
    },
    "65-74": {
      energyKcal: 2350,
      proteinPctRange: [15, 20],
      fatPctRange: [20, 30],
      carbohydratePctRange: [50, 65],
      fiberGMin: 21,
      saltGMax: 7.5,
      vitaminAUg: 850,
      vitaminB1Mg: 1,
      vitaminB2Mg: 1.4,
      vitaminCMg: 100,
      vitaminDUg: 9,
      ironMg: 7,
      calciumMg: 750,
      potassiumMgMin: 3000,
      zincMg: 9,
    },
    "75+": {
      energyKcal: 2250,
      proteinPctRange: [15, 20],
      fatPctRange: [20, 30],
      carbohydratePctRange: [50, 65],
      fiberGMin: 20,
      saltGMax: 7.5,
      vitaminAUg: 800,
      vitaminB1Mg: 1,
      vitaminB2Mg: 1.4,
      vitaminCMg: 100,
      vitaminDUg: 9,
      ironMg: 6.5,
      calciumMg: 750,
      potassiumMgMin: 3000,
      zincMg: 9,
    },
  },
  female: {
    "18-29": {
      energyKcal: 1950,
      proteinPctRange: [13, 20],
      fatPctRange: [20, 30],
      carbohydratePctRange: [50, 65],
      fiberGMin: 18,
      saltGMax: 6.5,
      vitaminAUg: 650,
      vitaminB1Mg: 0.8,
      vitaminB2Mg: 1.2,
      vitaminCMg: 100,
      vitaminDUg: 9,
      ironMg: 6,
      calciumMg: 650,
      potassiumMgMin: 2600,
      zincMg: 7.5,
    },
    "30-49": {
      energyKcal: 2050,
      proteinPctRange: [13, 20],
      fatPctRange: [20, 30],
      carbohydratePctRange: [50, 65],
      fiberGMin: 18,
      saltGMax: 6.5,
      vitaminAUg: 700,
      vitaminB1Mg: 0.9,
      vitaminB2Mg: 1.2,
      vitaminCMg: 100,
      vitaminDUg: 9,
      ironMg: 6,
      calciumMg: 650,
      potassiumMgMin: 2600,
      zincMg: 8,
    },
    "50-64": {
      energyKcal: 1950,
      proteinPctRange: [14, 20],
      fatPctRange: [20, 30],
      carbohydratePctRange: [50, 65],
      fiberGMin: 18,
      saltGMax: 6.5,
      vitaminAUg: 700,
      vitaminB1Mg: 0.8,
      vitaminB2Mg: 1.2,
      vitaminCMg: 100,
      vitaminDUg: 9,
      ironMg: 6,
      calciumMg: 650,
      potassiumMgMin: 2600,
      zincMg: 8,
    },
    "65-74": {
      energyKcal: 1850,
      proteinPctRange: [15, 20],
      fatPctRange: [20, 30],
      carbohydratePctRange: [50, 65],
      fiberGMin: 18,
      saltGMax: 6.5,
      vitaminAUg: 700,
      vitaminB1Mg: 0.8,
      vitaminB2Mg: 1.1,
      vitaminCMg: 100,
      vitaminDUg: 9,
      ironMg: 6,
      calciumMg: 650,
      potassiumMgMin: 2600,
      zincMg: 7.5,
    },
    "75+": {
      energyKcal: 1750,
      proteinPctRange: [15, 20],
      fatPctRange: [20, 30],
      carbohydratePctRange: [50, 65],
      fiberGMin: 17,
      saltGMax: 6.5,
      vitaminAUg: 650,
      vitaminB1Mg: 0.7,
      vitaminB2Mg: 1.1,
      vitaminCMg: 100,
      vitaminDUg: 9,
      ironMg: 5.5,
      calciumMg: 600,
      potassiumMgMin: 2600,
      zincMg: 7,
    },
  },
};

/**
 * 判定しないビタミン・ミネラルの基準値（DES-BAL-06、REV-013 #1）。
 * 栄養詳細画面で充足率だけを出すのに使う。推奨量があれば推奨量、なければ目安量。
 * 値は上と同じ報告書（正誤表 令和7年3月25日 反映版の分割 PDF）で、表のページを画像とテキストの 2 通りで読んで確かめた。
 */
export type ExtraReferenceKey =
  | "alphaTocopherolMg"
  | "vitaminKUg"
  | "vitaminB6Mg"
  | "vitaminB12Ug"
  | "folateUg"
  | "niacinEquivalentMg"
  | "pantothenicAcidMg"
  | "biotinUg"
  | "magnesiumMg"
  | "phosphorusMg"
  | "copperMg"
  | "manganeseMg"
  | "iodineUg"
  | "seleniumUg"
  | "chromiumUg"
  | "molybdenumUg";

/** 各栄養素の基準の種類と、報告書の印刷ページ（QA-09） */
export const extraReferenceBasis: Record<
  ExtraReferenceKey,
  { basis: "推奨量" | "目安量"; page: number; label: string }
> = {
  alphaTocopherolMg: {
    basis: "目安量",
    page: 183,
    label: "ビタミン E（α-トコフェロール）（mg）",
  },
  vitaminKUg: { basis: "目安量", page: 184, label: "ビタミン K（μg）" },
  vitaminB6Mg: { basis: "推奨量", page: 237, label: "ビタミン B6（mg）" },
  vitaminB12Ug: { basis: "目安量", page: 238, label: "ビタミン B12（μg）" },
  folateUg: { basis: "推奨量", page: 239, label: "葉酸（μg）" },
  niacinEquivalentMg: {
    basis: "推奨量",
    page: 236,
    label: "ナイアシン（mgNE）",
  },
  pantothenicAcidMg: {
    basis: "目安量",
    page: 240,
    label: "パントテン酸（mg）",
  },
  biotinUg: { basis: "目安量", page: 241, label: "ビオチン（μg）" },
  magnesiumMg: { basis: "推奨量", page: 284, label: "マグネシウム（mg）" },
  phosphorusMg: { basis: "目安量", page: 285, label: "リン（mg）" },
  copperMg: { basis: "推奨量", page: 347, label: "銅（mg）" },
  manganeseMg: { basis: "目安量", page: 348, label: "マンガン（mg）" },
  iodineUg: { basis: "推奨量", page: 349, label: "ヨウ素（μg）" },
  seleniumUg: { basis: "推奨量", page: 350, label: "セレン（μg）" },
  chromiumUg: { basis: "目安量", page: 351, label: "クロム（μg）" },
  molybdenumUg: { basis: "推奨量", page: 352, label: "モリブデン（μg）" },
};

export const extraDietaryReference: Record<
  Sex,
  Record<AgeGroup, Record<ExtraReferenceKey, number>>
> = {
  male: {
    "18-29": {
      alphaTocopherolMg: 6.5,
      vitaminKUg: 150,
      vitaminB6Mg: 1.5,
      vitaminB12Ug: 4,
      folateUg: 240,
      niacinEquivalentMg: 15,
      pantothenicAcidMg: 6,
      biotinUg: 50,
      magnesiumMg: 340,
      phosphorusMg: 1000,
      copperMg: 0.8,
      manganeseMg: 3.5,
      iodineUg: 140,
      seleniumUg: 30,
      chromiumUg: 10,
      molybdenumUg: 30,
    },
    "30-49": {
      alphaTocopherolMg: 6.5,
      vitaminKUg: 150,
      vitaminB6Mg: 1.5,
      vitaminB12Ug: 4,
      folateUg: 240,
      niacinEquivalentMg: 16,
      pantothenicAcidMg: 6,
      biotinUg: 50,
      magnesiumMg: 380,
      phosphorusMg: 1000,
      copperMg: 0.9,
      manganeseMg: 3.5,
      iodineUg: 140,
      seleniumUg: 35,
      chromiumUg: 10,
      molybdenumUg: 30,
    },
    "50-64": {
      alphaTocopherolMg: 6.5,
      vitaminKUg: 150,
      vitaminB6Mg: 1.5,
      vitaminB12Ug: 4,
      folateUg: 240,
      niacinEquivalentMg: 15,
      pantothenicAcidMg: 6,
      biotinUg: 50,
      magnesiumMg: 370,
      phosphorusMg: 1000,
      copperMg: 0.9,
      manganeseMg: 3.5,
      iodineUg: 140,
      seleniumUg: 30,
      chromiumUg: 10,
      molybdenumUg: 30,
    },
    "65-74": {
      alphaTocopherolMg: 7.5,
      vitaminKUg: 150,
      vitaminB6Mg: 1.4,
      vitaminB12Ug: 4,
      folateUg: 240,
      niacinEquivalentMg: 14,
      pantothenicAcidMg: 6,
      biotinUg: 50,
      magnesiumMg: 350,
      phosphorusMg: 1000,
      copperMg: 0.8,
      manganeseMg: 3.5,
      iodineUg: 140,
      seleniumUg: 30,
      chromiumUg: 10,
      molybdenumUg: 30,
    },
    "75+": {
      alphaTocopherolMg: 7,
      vitaminKUg: 150,
      vitaminB6Mg: 1.4,
      vitaminB12Ug: 4,
      folateUg: 240,
      niacinEquivalentMg: 13,
      pantothenicAcidMg: 6,
      biotinUg: 50,
      magnesiumMg: 330,
      phosphorusMg: 1000,
      copperMg: 0.8,
      manganeseMg: 3.5,
      iodineUg: 140,
      seleniumUg: 30,
      chromiumUg: 10,
      molybdenumUg: 25,
    },
  },
  female: {
    "18-29": {
      alphaTocopherolMg: 5,
      vitaminKUg: 150,
      vitaminB6Mg: 1.2,
      vitaminB12Ug: 4,
      folateUg: 240,
      niacinEquivalentMg: 11,
      pantothenicAcidMg: 5,
      biotinUg: 50,
      magnesiumMg: 280,
      phosphorusMg: 800,
      copperMg: 0.7,
      manganeseMg: 3,
      iodineUg: 140,
      seleniumUg: 25,
      chromiumUg: 10,
      molybdenumUg: 25,
    },
    "30-49": {
      alphaTocopherolMg: 6,
      vitaminKUg: 150,
      vitaminB6Mg: 1.2,
      vitaminB12Ug: 4,
      folateUg: 240,
      niacinEquivalentMg: 12,
      pantothenicAcidMg: 5,
      biotinUg: 50,
      magnesiumMg: 290,
      phosphorusMg: 800,
      copperMg: 0.7,
      manganeseMg: 3,
      iodineUg: 140,
      seleniumUg: 25,
      chromiumUg: 10,
      molybdenumUg: 25,
    },
    "50-64": {
      alphaTocopherolMg: 6,
      vitaminKUg: 150,
      vitaminB6Mg: 1.2,
      vitaminB12Ug: 4,
      folateUg: 240,
      niacinEquivalentMg: 11,
      pantothenicAcidMg: 5,
      biotinUg: 50,
      magnesiumMg: 290,
      phosphorusMg: 800,
      copperMg: 0.7,
      manganeseMg: 3,
      iodineUg: 140,
      seleniumUg: 25,
      chromiumUg: 10,
      molybdenumUg: 25,
    },
    "65-74": {
      alphaTocopherolMg: 7,
      vitaminKUg: 150,
      vitaminB6Mg: 1.2,
      vitaminB12Ug: 4,
      folateUg: 240,
      niacinEquivalentMg: 11,
      pantothenicAcidMg: 5,
      biotinUg: 50,
      magnesiumMg: 280,
      phosphorusMg: 800,
      copperMg: 0.7,
      manganeseMg: 3,
      iodineUg: 140,
      seleniumUg: 25,
      chromiumUg: 10,
      molybdenumUg: 25,
    },
    "75+": {
      alphaTocopherolMg: 6,
      vitaminKUg: 150,
      vitaminB6Mg: 1.2,
      vitaminB12Ug: 4,
      folateUg: 240,
      niacinEquivalentMg: 10,
      pantothenicAcidMg: 5,
      biotinUg: 50,
      magnesiumMg: 270,
      phosphorusMg: 800,
      copperMg: 0.7,
      manganeseMg: 3,
      iodineUg: 140,
      seleniumUg: 25,
      chromiumUg: 10,
      molybdenumUg: 25,
    },
  },
};
