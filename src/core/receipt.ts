import { unitWeights } from "../data/unitWeights";
import { normalizeSearchText } from "./catalog";
import type { Quantity } from "./quantity";

/** 登録一覧を先、覚えた手入力を新しい順に渡す（DES-RCP-03）。 */
export type ReceiptCatalog = {
  foods: readonly { displayName: string; foodId: string }[];
  manualFoods: readonly { displayName: string; foodId: string }[];
};

/** 読み取った登録候補（DES-RCP-03）。 */
export type ReceiptCandidate = {
  line: number;
  displayName: string;
  foodId: string;
  quantity: Quantity;
  needsCheck: boolean;
};

/** 外部の AI に渡す指示文を組み立てる（DES-RCP-02）。 */
export function receiptPrompt(names: string[]): string {
  const sorted = [...new Set(names)].sort((a, b) =>
    a.localeCompare(b, "ja-JP"),
  );
  return [
    "添付するレシートの画像から食べ物だけを書き出してください。日用品など食べ物でない物は書かないでください。",
    "下の一覧の名前に当てはまる食べ物は、その名前をそのまま使ってください。当てはまらない食べ物は、レシートの商品名のまま書いてください。",
    "1 行に 1 品、食材名,量 の形で書いてください。重さが分かれば 300g や 2kg、分からなければ個数（2）を書いてください。量が分からなければ 1 としてください。数字に桁区切りのコンマと分数を使わず、4 分の 1 は 0.25 と書いてください。",
    "説明や見出しは書かないでください。",
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
  `^(.*?)[\\s,、\\t]*(\\d+(?:\\.\\d+)?)\\s*(kg|g|${escapedWords.join("|")})?$`,
  "i",
);
const fractionPattern = /^(.*?)[\s,、\t]*(\d+)\/(\d+)\s*$/;

function parsedQuantity(
  value: number,
  unit: string | undefined,
): { quantity: Quantity; needsCheck: boolean } {
  if (!Number.isFinite(value))
    return { quantity: { kind: "count", count: 1 }, needsCheck: true };
  if (unit?.toLowerCase() === "g" || unit?.toLowerCase() === "kg") {
    const grams = Math.round(value * (unit.toLowerCase() === "kg" ? 1000 : 1));
    const bounded = Math.max(1, Math.min(100000, grams));
    return {
      quantity: {
        kind: "weight",
        grams: bounded,
        unit: unit.toLowerCase() as "g" | "kg",
      },
      needsCheck:
        grams !== bounded ||
        value * (unit.toLowerCase() === "kg" ? 1000 : 1) !== grams,
    };
  }
  const rounded = Math.round(value * 2) / 2;
  const bounded = rounded <= 0 ? 1 : Math.min(999, rounded);
  return {
    quantity: { kind: "count", count: bounded },
    needsCheck: value !== bounded,
  };
}

/** 行ごとに読み、完全一致した食材と一覧にない物を返す（DES-RCP-03）。 */
export function parseReceiptText(
  text: string,
  catalog: ReceiptCatalog,
): {
  candidates: ReceiptCandidate[];
  unmatched: { line: number; text: string }[];
} {
  const names = new Map<string, { displayName: string; foodId: string }>();
  for (const food of [...catalog.foods, ...catalog.manualFoods]) {
    const key = normalizeSearchText(food.displayName.normalize("NFKC"));
    if (!names.has(key)) names.set(key, food);
  }
  const candidates: ReceiptCandidate[] = [];
  const unmatched: { line: number; text: string }[] = [];
  text.split(/\r?\n/).forEach((original, index) => {
    const line = index + 1;
    let value = original.normalize("NFKC").trim();
    if (!value || value.startsWith("```") || value.startsWith("#")) return;
    value = value
      .replace(/^(?:[-*・]\s*|\d+\.\s*)/, "")
      .replace(/(\d),(?=\d{3}(?:\D|$))/g, "$1");
    const fraction = value.match(fractionPattern);
    const match = fraction ?? value.match(quantityPattern);
    const name = match ? match[1].replace(/[\s,、\t]+$/, "").trim() : value;
    const amount = fraction
      ? parsedQuantity(Number(fraction[2]) / Number(fraction[3]), undefined)
      : match
        ? parsedQuantity(Number(match[2]), match[3])
        : { quantity: { kind: "count" as const, count: 1 }, needsCheck: true };
    const found = names.get(normalizeSearchText(name.normalize("NFKC")));
    if (!found) {
      unmatched.push({ line, text: original });
      return;
    }
    candidates.push({
      line,
      ...found,
      quantity: amount.quantity,
      needsCheck: amount.needsCheck || Boolean(fraction),
    });
  });
  return { candidates, unmatched };
}
