import {
  foodCategoryGroupAliases,
  foodGroupAliases,
  foodRepresentativePatterns,
} from "../data/foodDisplayNames";
import { foodShelf, type FoodShelf } from "../data/foodShelves";
import { supermarketFoodPriorities } from "../data/supermarketFoods";
import type { FoodItem } from "../types";

/** 一般的な食材名でまとめた食品の集まり（DES-CAT-02）。 */
export type FoodGroup = {
  key: string;
  name: string;
  foods: FoodItem[];
  supermarketPriority: number | null;
};

const separateFoodForms: Array<{
  pattern: RegExp;
  label: (name: string) => string;
}> = [
  // 大豆製品は、成分表の小分類でスーパーの別の商品に分ける（FR-ING-06）
  { pattern: /^だいず ［納豆類］/, label: () => "納豆" },
  { pattern: /^だいず ［豆腐・油揚げ類］ 凍り豆腐/, label: () => "高野豆腐" },
  {
    pattern: /^だいず ［豆腐・油揚げ類］ がんもどき/,
    label: () => "がんもどき",
  },
  { pattern: /^だいず ［豆腐・油揚げ類］ 豆腐竹輪/, label: () => "豆腐竹輪" },
  { pattern: /^だいず ［豆腐・油揚げ類］ 豆腐よう/, label: () => "豆腐よう" },
  {
    pattern: /^だいず ［豆腐・油揚げ類］ (?:絹)?生揚げ/,
    label: () => "厚揚げ",
  },
  { pattern: /^だいず ［豆腐・油揚げ類］ 油揚げ/, label: () => "油揚げ" },
  { pattern: /^だいず ［豆腐・油揚げ類］/, label: () => "豆腐" },
  { pattern: /^だいず ［その他］ 豆乳/, label: () => "豆乳" },
  { pattern: /^かぼちゃ いり/, label: () => "かぼちゃの種" },
  { pattern: /フライドポテト/, label: () => "フライドポテト" },
  {
    pattern: /から揚げ/,
    label: (name) => `${name.replace(/肉$/, "")}のから揚げ`,
  },
  { pattern: /天ぷら/, label: (name) => `${name}の天ぷら` },
  { pattern: /(?:^|\s)フライ(?:\s|$)/, label: (name) => `${name}のフライ` },
  { pattern: /漬物|塩漬|ぬかみそ漬/, label: (name) => `${name}の漬物` },
  { pattern: /缶詰/, label: (name) => `${name}（缶詰）` },
  {
    pattern: /(?:^|\s)(?:乾|乾燥)(?:\s|$)/,
    label: (name) => `${name}（乾燥）`,
  },
];

/** 正式名称から、登録一覧に出す食材名と詳細を求める（DES-CAT-01）。 */
export function foodPresentation(officialName: string, category?: string) {
  const nameWithoutHierarchy = officialName
    .replace(/^(?:＜[^＞]+＞\s*)+/, "")
    .trim();
  const classificationMatch =
    nameWithoutHierarchy.match(/^（([^）]+)）\s*(.+)$/);
  const classificationLabel = classificationMatch?.[1];
  const nameWithoutFamily = classificationMatch?.[2] ?? nameWithoutHierarchy;
  const [specificName = officialName, ...specificDetailParts] =
    nameWithoutFamily.split(/\s+/);
  const familyName = classificationLabel?.endsWith("類")
    ? classificationLabel.replace(/類$/, "")
    : undefined;
  const groupedName = familyName || specificName;
  const categoryAlias = category
    ? foodCategoryGroupAliases[`${category}:${groupedName}`]
    : undefined;
  const baseName =
    categoryAlias || foodGroupAliases[groupedName] || groupedName;
  const separateForm = separateFoodForms.find(({ pattern }) =>
    pattern.test(nameWithoutFamily),
  );
  const name = separateForm?.label(baseName) ?? baseName;
  const detailParts =
    baseName !== specificName
      ? [specificName, ...specificDetailParts]
      : specificDetailParts;
  const details = detailParts
    .map((part) => part.replace(/^［(.+)］$/, "$1"))
    .join("・");

  return { name, details };
}

/** 食材名を押したときに登録する代表食品を選ぶ（DES-CAT-03）。 */
export function representativeFood(group: FoodGroup) {
  const preferredPatterns = foodRepresentativePatterns[group.name] ?? [];
  const preferredFood = preferredPatterns
    .map((pattern) => group.foods.find((food) => food.name.includes(pattern)))
    .find(Boolean);

  if (preferredFood) {
    return preferredFood;
  }

  const preparationPriority = [
    /(?:^|\s)生(?:\s|$)/,
    /(?:^|\s)冷凍(?:\s|$)/,
    /(?:^|\s)ゆで(?:\s|$)/,
    /(?:^|\s)蒸し(?:\s|$)/,
    /(?:^|\s)焼き(?:\s|$)/,
  ];

  return [...group.foods].sort((left, right) => {
    const leftPriority = preparationPriority.findIndex((pattern) =>
      pattern.test(left.name),
    );
    const rightPriority = preparationPriority.findIndex((pattern) =>
      pattern.test(right.name),
    );
    return (
      (leftPriority < 0 ? preparationPriority.length : leftPriority) -
      (rightPriority < 0 ? preparationPriority.length : rightPriority)
    );
  })[0];
}

/** 食品を食材名でまとめる（DES-CAT-02）。 */
export function groupFoods(foods: FoodItem[]) {
  const groups = new Map<string, FoodGroup>();

  for (const food of foods) {
    const { name } = foodPresentation(food.name, food.category);
    const key = `${food.category}:${name}`;
    const group = groups.get(key);

    if (group) {
      group.foods.push(food);
    } else {
      groups.set(key, { key, name, foods: [food], supermarketPriority: null });
    }
  }

  return [...groups.values()];
}

/** よくある食材の並び順を返す。対象外なら null（DES-CAT-04）。 */
export function supermarketPriority(name: string) {
  const target = normalizeSearchText(name);
  const priority = supermarketFoodPriorities.findIndex(
    (foodName) => target === normalizeSearchText(foodName),
  );

  return priority >= 0 ? priority : null;
}

/** よくある食材を先に、それ以外を日本語の localeCompare の順に並べる（DES-CAT-04）。 */
export function prioritizeSupermarketFoods(groups: FoodGroup[]) {
  return groups
    .map((group) => ({
      ...group,
      supermarketPriority: supermarketPriority(group.name),
    }))
    .sort((left, right) => {
      if (
        left.supermarketPriority === null &&
        right.supermarketPriority === null
      ) {
        return left.name.localeCompare(right.name, "ja-JP");
      }
      if (left.supermarketPriority === null) {
        return 1;
      }
      if (right.supermarketPriority === null) {
        return -1;
      }
      return left.supermarketPriority - right.supermarketPriority;
    });
}

/** 検索用に、小文字化して空白を除く（DES-CAT-06）。 */
export function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase("ja-JP")
    .replace(/\s+/g, "")
    .replace(/\u3000/g, "");
}

/** 登録の一覧に出さない棚（長く使う物。主食は設定で扱う） */
const nonRegistrableShelves = new Set<FoodShelf>(["米・パン・麺", "調味料"]);

/**
 * 食品を登録の一覧に出してよいかを返す（DES-CAT-05、FR-ING-09）。
 * 米・パン・麺・調味料・油など長く使う物は登録しない。
 */
export function isRegistrable(food: FoodItem): boolean {
  if (food.category === "油脂類") return false;
  return !nonRegistrableShelves.has(foodShelf(food));
}
