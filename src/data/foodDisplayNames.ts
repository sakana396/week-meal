/**
 * 文科省名に「（○○類）」が付いていない食品を、一般的な食材名へまとめる設定です。
 * キーは正式名称の先頭にある食品名、値は登録一覧に表示する食材名です。
 */
export const foodGroupAliases: Record<string, string> = {
  たまねぎ: "玉ねぎ",
  だいこん: "大根",
  しまあじ: "あじ",
  にわとり: "鶏肉",
  うし: "牛肉",
  ぶた: "豚肉",
  液状乳: "牛乳",
  えんどう: "えんどうまめ",
};

/** 同名の別食品へ影響させず、文科省分類ごとに表示名を変える設定です。 */
export const foodCategoryGroupAliases: Record<string, string> = {
  "果実類:かき": "柿",
};

/** 一般名を押したときに使う代表データ。先に書いた文字列を優先します。 */
export const foodRepresentativePatterns: Record<string, string[]> = {
  あじ: ["まあじ 皮つき 生"],
  鶏肉: ["［若どり・主品目］ もも 皮つき 生"],
  牛乳: ["普通牛乳"],
};
