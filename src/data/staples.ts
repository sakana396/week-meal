/** 主食の種類（DES-STP-01）。 */
export type StapleKind = "rice" | "bread" | "noodle";

/**
 * 主食の代表食品の食品番号（DES-FDB-05、ADR-0003 の仮置き）。
 * 主食は登録の一覧には出さず、設定から集計に足す。
 */
export const stapleFoodIds: Record<StapleKind, string> = {
  rice: "01088", // こめ ［水稲めし］ 精白米 うるち米
  bread: "01026", // こむぎ ［パン類］ 角形食パン 食パン
  noodle: "01039", // こむぎ ［うどん・そうめん類］ うどん ゆで
};
