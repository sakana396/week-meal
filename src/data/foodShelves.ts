import type { FoodItem } from "../types";
import { foodShelfOverrides } from "./foodShelfOverrides";

export const foodShelves = [
  "野菜",
  "果物",
  "魚",
  "肉",
  "卵",
  "豆腐・納豆",
  "乳製品",
  "米・パン・麺",
  "惣菜",
  "冷凍食品",
  "飲み物",
  "お菓子",
  "調味料",
  "その他",
] as const;

export type FoodShelf = (typeof foodShelves)[number];

function isVegetable(food: FoodItem) {
  return (
    food.category === "野菜類" ||
    food.category === "きのこ類" ||
    (food.category === "いも及びでん粉類" && food.name.startsWith("＜いも類＞"))
  );
}

function isPreparedFood(food: FoodItem) {
  return (
    food.category === "調理済み流通食品類" ||
    /から揚げ|唐揚げ|フライドポテト|天ぷら|(?:^|\s)フライ(?:\s|$)/.test(
      food.name,
    )
  );
}

function isPickledFood(food: FoodItem) {
  return /漬物|塩漬|ぬかみそ漬/.test(food.name);
}

function isTofuOrNatto(food: FoodItem) {
  return (
    food.category === "豆類" &&
    /豆腐|納豆|油揚げ|生揚げ|がんもどき|豆乳|湯葉|おから|大豆たんぱく|テンペ/.test(
      food.name,
    )
  );
}

function isRiceBreadOrNoodles(food: FoodItem) {
  return (
    food.category === "穀類" &&
    /こめ|ごはん|米|パン|うどん|そうめん|ひやむぎ|そば|中華めん|ラーメン|パスタ|マカロニ|スパゲッティ|ビーフン|フォー/.test(
      food.name,
    )
  );
}

/**
 * 食品成分表の分類を、利用者がスーパーで探す棚へ変換します。
 * 個別の棚設定がある場合は、自動分類より優先します。
 * 冷凍品と惣菜は、元の食品分類より売られている状態を優先します。
 * どの棚にも自然に入らない食品は「その他」に表示します。
 */
export function foodShelf(food: FoodItem): FoodShelf {
  const override = foodShelfOverrides[food.id];
  if (override) return override;

  if (food.name.startsWith("＜いも類＞ こんにゃく")) return "豆腐・納豆";
  if (isPickledFood(food)) return "豆腐・納豆";
  if (/冷凍/.test(food.name)) return "冷凍食品";
  if (isPreparedFood(food)) return "惣菜";
  if (isVegetable(food)) return "野菜";
  if (food.category === "果実類" && /^(?:うめ|アボカド)(?:\s|$)/.test(food.name)) {
    return "野菜";
  }
  if (food.category === "果実類") return "果物";
  if (food.category === "魚介類") return "魚";
  if (food.category === "肉類") return "肉";
  if (food.category === "卵類") return "卵";
  if (isTofuOrNatto(food)) return "豆腐・納豆";
  if (food.category === "乳類") return "乳製品";
  if (isRiceBreadOrNoodles(food)) return "米・パン・麺";
  if (food.category === "し好飲料類") return "飲み物";
  if (food.category === "菓子類") return "お菓子";
  if (food.category === "調味料及び香辛料類") return "調味料";

  return "その他";
}
