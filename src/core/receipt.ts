import { unitWeights } from "../data/unitWeights";
import { normalizeSearchText } from "./catalog";
import type { Quantity } from "./quantity";

/** 登録一覧を先、覚えた手入力を新しい順に渡す（DES-RCP-03）。 */
export type ReceiptCatalog = {
  foods: readonly { displayName: string; foodId: string }[];
  manualFoods: readonly { displayName: string; foodId: string }[];
  aliases?: Readonly<Record<string, string>>;
};

/** 読み取った登録候補（DES-RCP-03、09、DES-RCP-10）。 */
export type ReceiptCandidate = {
  line: number;
  itemOrder?: number;
  displayName: string;
  foodId: string;
  quantity: Quantity;
  needsCheck: boolean;
  convertedFromMl?: boolean;
  aliasFrom?: string;
};

/** 外部の AI に渡す指示文を組み立てる（DES-RCP-02）。 */
export function receiptPrompt(names: string[]): string {
  const sorted = [...new Set(names)].sort((a, b) =>
    a.localeCompare(b, "ja-JP"),
  );
  return [
    "添付するレシートの画像から食べ物だけを書き出してください。日用品など食べ物でない物は書かないでください。",
    "レシートの表記が一覧と違っても、同じ食べ物なら一覧の名前に置き換えてください（例: 生椎茸→しいたけ、コマツ菜→こまつな）。一覧に当てはまらない食べ物は、レシートの商品名のまま書いてください。",
    "必ず食材 1 品ごとに改行し、1 行に 1 品だけを「食材名,量」の形で書いてください。複数の品を空白でつないで 1 行に書かないでください。重さが分かれば 300g や 2kg、分からなければ個数（2）を書いてください。量が分からなければ 1 としてください。数字に桁区切りのコンマと分数を使わず、4 分の 1 は 0.25 と書いてください。",
    "説明や見出しは書かないでください。マークダウンや装飾を使わず、プレーンテキストで答えてください。コードブロックに入れてもかまいません。",
    "食材名の一覧:",
    ...sorted,
  ].join("\n");
}

const unitWords = [
  ...new Set([
    ...Object.values(unitWeights).map((weight) =>
      weight.unit.replace(/^\d+(?:\/\d+)?/, ""),
    ),
    "個",
    "つ",
  ]),
].filter(Boolean);
const escapedWords = unitWords.map((word) =>
  word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
);
const quantityPattern = new RegExp(
  `^(.*?)[\\s,、\\t]*([+\\-−]?)(\\d+(?:\\.\\d+)?)(?:/(\\d+))?\\s*(kg|g|ml|${escapedWords.join("|")})?$`,
  "i",
);

/** 量を個数または重さに換算する（DES-RCP-10）。 */
function parsedQuantity(
  value: number,
  unit: string | undefined,
): { quantity: Quantity; needsCheck: boolean } {
  if (!Number.isFinite(value))
    return { quantity: { kind: "count", count: 1 }, needsCheck: true };
  if (["g", "kg", "ml"].includes(unit?.toLowerCase() ?? "")) {
    // 外部資料による値ではない概算。本人の査閲待ち。
    const mlToGrams = 1;
    const factor =
      unit?.toLowerCase() === "kg"
        ? 1000
        : unit?.toLowerCase() === "ml"
          ? mlToGrams
          : 1;
    const grams = Math.round(value * factor);
    const bounded = Math.max(1, Math.min(100000, grams));
    return {
      quantity: {
        kind: "weight",
        grams: bounded,
        unit: unit?.toLowerCase() === "kg" ? "kg" : "g",
      },
      needsCheck:
        grams !== bounded ||
        value * factor !== grams ||
        unit?.toLowerCase() === "ml",
    };
  }
  const rounded = Math.round(value * 2) / 2;
  const bounded = rounded <= 0 ? 1 : Math.min(999, rounded);
  return {
    quantity: { kind: "count", count: bounded },
    needsCheck: value !== bounded,
  };
}

/** 物理行を「名前,量」の組に分ける（DES-RCP-09）。 */
function splitPairs(value: string): string[] {
  const tokens = value.matchAll(/[^ \t]+/g);
  const pairs: string[] = [];
  let start = 0;
  const amountPattern = new RegExp(
    `^[+\\-−]?\\d+(?:\\.\\d+)?(?:/\\d+)?(?:kg|g|ml|${escapedWords.join("|")})?$`,
    "i",
  );
  for (const match of tokens) {
    const token = match[0];
    const comma = token.indexOf(",");
    if (comma < 0) {
      continue;
    }
    if (
      token.indexOf(",", comma + 1) >= 0 ||
      !amountPattern.test(token.slice(comma + 1))
    )
      return [];
    const name = value.slice(start, match.index + comma).trim();
    if (!name) return [];
    pairs.push(value.slice(start, match.index + token.length).trim());
    start = match.index + token.length;
  }
  return !value.slice(start).trim() && pairs.length > 1 ? pairs : [];
}

/** 行ごとに読み、直接一致・一段の言い換え・一覧にない物を返す（DES-RCP-03、06、09、DES-RCP-10）。 */
export function parseReceiptText(
  text: string,
  catalog: ReceiptCatalog,
): {
  candidates: ReceiptCandidate[];
  unmatched: { line: number; itemOrder?: number; text: string }[];
} {
  const names = new Map<string, { displayName: string; foodId: string }>();
  for (const food of [...catalog.foods, ...catalog.manualFoods]) {
    const key = normalizeSearchText(food.displayName.normalize("NFKC"));
    if (!names.has(key)) names.set(key, food);
  }
  const aliases = new Map(
    Object.entries(catalog.aliases ?? {}).map(([alias, name]) => [
      normalizeSearchText(alias.normalize("NFKC")),
      name,
    ]),
  );
  const candidates: ReceiptCandidate[] = [];
  const unmatched: { line: number; itemOrder?: number; text: string }[] = [];
  text.split(/\r?\n/).forEach((original, index) => {
    const line = index + 1;
    const normalized = original.normalize("NFKC");
    if (!normalized.trim()) return;
    if (normalized.length > 4000) {
      unmatched.push({ line, text: original });
      return;
    }
    const cleaned = normalized
      .trim()
      .replace(/(?<![\\ \t])[\\ \t]+$/, "")
      .trim();
    const splitValue = cleaned
      .replace(/^(?:[-*・•]\s*|\d+\.\s*)/, "")
      .replace(/(\d),(?=\d{3}(?:\D|$))/g, "$1");
    const pairs = splitPairs(splitValue);
    if (
      pairs.length
        ? pairs.some((pair) => pair.length > 200)
        : normalized.length > 200
    ) {
      unmatched.push({ line, text: original });
      return;
    }
    if (!cleaned || cleaned.startsWith("```") || cleaned.startsWith("#"))
      return;
    const values = pairs.length ? pairs : [original];
    values.forEach((raw, pairIndex) => {
      let value = raw
        .normalize("NFKC")
        .trim()
        .replace(/(?<![\\ \t])[\\ \t]+$/, "")
        .trim();
      if (!pairs.length)
        value = value
          .replace(/^(?:[-*・•]\s*|\d+\.\s*)/, "")
          .replace(/(\d),(?=\d{3}(?:\D|$))/g, "$1");
      const itemOrder = pairs.length ? pairIndex + 1 : undefined;
      const match = value.match(quantityPattern);
      const name = match ? match[1].replace(/[\s,、\t]+$/, "").trim() : value;
      if (match && (match[2] === "-" || match[2] === "−")) {
        unmatched.push({
          line,
          ...(itemOrder ? { itemOrder } : {}),
          text: pairs.length ? raw : original,
        });
        return;
      }
      const fraction = Boolean(match?.[4]);
      const amount = match
        ? parsedQuantity(
            fraction ? Number(match[3]) / Number(match[4]) : Number(match[3]),
            match[5],
          )
        : { quantity: { kind: "count" as const, count: 1 }, needsCheck: true };
      const convertedFromMl =
        match?.[5]?.toLowerCase() === "ml" && amount.quantity.kind === "weight";
      const key = normalizeSearchText(name.normalize("NFKC"));
      const direct = names.get(key);
      const aliasedName = direct ? undefined : aliases.get(key);
      const found =
        direct ??
        (aliasedName
          ? names.get(normalizeSearchText(aliasedName.normalize("NFKC")))
          : undefined);
      if (!found) {
        unmatched.push({
          line,
          ...(itemOrder ? { itemOrder } : {}),
          text: pairs.length ? raw : original,
        });
        return;
      }
      candidates.push({
        line,
        ...(itemOrder ? { itemOrder } : {}),
        displayName: found.displayName,
        foodId: found.foodId,
        quantity: amount.quantity,
        needsCheck: amount.needsCheck || fraction,
        ...(convertedFromMl ? { convertedFromMl: true } : {}),
        ...(aliasedName ? { aliasFrom: name } : {}),
      });
    });
  });
  return { candidates, unmatched };
}
