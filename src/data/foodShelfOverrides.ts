import type { FoodShelf } from "./foodShelves";

/**
 * スーパーでの置き場所を、食品ごとに変更するための設定です。
 *
 * キーには文科省の食品番号を使います。栄養データや文科省分類は変更せず、
 * アプリ上の棚だけをここで指定します。
 * 食品データ（foods.json）にある食品番号だけを書きます（NFR-11）。
 * 絞り込みの定義（scripts/food-selection.json）にアイス類などを戻すときは、
 * 冷凍食品の棚に置くよう、ここにも食品番号を足します。
 */
export const foodShelfOverrides: Partial<Record<string, FoodShelf>> = {
  // 豆腐などと同じ日配の練り製品売場で探す食品
  "10376": "豆腐・納豆", // かに風味かまぼこ
};
