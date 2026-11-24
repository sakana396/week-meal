import { describe, expect, it } from "vitest";
import foodsJson from "../data/foods.json";
import { receiptAliases } from "../data/receiptAliases";
import type { FoodItem } from "../types";
import {
  basketReducer,
  initialAppState,
  planRegisterMany,
  type BasketEntry,
  type Shopping,
} from "./basket";
import { groupFoods, isRegistrable } from "./catalog";
import {
  parseReceiptText,
  receiptPrompt,
  type ReceiptCatalog,
} from "./receipt";
import { serializeState } from "./storage";

const catalog: ReceiptCatalog = {
  foods: [
    { displayName: "にんじん", foodId: "06212" },
    { displayName: "はるさめ（乾燥）", foodId: "01000" },
  ],
  manualFoods: [
    { displayName: "にんじん", foodId: "manual-new" },
    { displayName: "手作り豆腐", foodId: "manual-recent" },
    { displayName: "手作り豆腐", foodId: "manual-old" },
  ],
};

describe("レシート指示文（DES-RCP-02）", () => {
  it("TC-FR-RCP-02-01 一覧を重複なく並べ、答えの形を示す", () => {
    const names = ["にんじん", "手作り豆腐", "にんじん", "はるさめ（乾燥）"];
    const prompt = receiptPrompt(names);
    expect(prompt).toContain("食材名,量");
    expect(prompt).toContain("商品名のまま");
    expect(prompt).toContain("桁区切りのコンマと分数を使わず");
    expect(prompt.split("\n")).toContain("手作り豆腐");
    expect(prompt.match(/\nにんじん\n/g)).toHaveLength(1);
    expect(prompt.indexOf("\nにんじん\n")).toBeLessThan(
      prompt.indexOf("\nはるさめ（乾燥）\n"),
    );
    expect(names).toEqual([
      "にんじん",
      "手作り豆腐",
      "にんじん",
      "はるさめ（乾燥）",
    ]);
  });
  it("TC-FR-RCP-02-01 登録一覧 188 件での実文字数を確かめる", () => {
    const names = groupFoods(
      (foodsJson as FoodItem[]).filter(isRegistrable),
    ).map((group) => group.name);
    expect(names).toHaveLength(188);
    expect(receiptPrompt(names)).toHaveLength(1376);
  });
  it.each([
    "マークダウンや装飾を使わず、プレーンテキストで答えてください",
    "コードブロックに入れてもかまいません",
    "生椎茸→しいたけ",
    "コマツ菜→こまつな",
  ])("TC-FR-RCP-02-03 指示文に貼り付けの注意を含む: %s", (phrase) => {
    expect(receiptPrompt(["しいたけ", "こまつな"])).toContain(phrase);
  });
});

describe("レシート読み取り（DES-RCP-03）", () => {
  it("TC-FR-RCP-05-01 複数組を順番付きで読み、未一致は正規化後の組を返す", () => {
    const result = parseReceiptText(
      "にんじん,1　ﾐｼﾗﾇ,2\tにんじん,1,000g",
      catalog,
    );
    expect(
      result.candidates.map((item) => [item.line, item.itemOrder]),
    ).toEqual([
      [1, 1],
      [1, 3],
    ]);
    expect(result.unmatched).toEqual([
      { line: 1, itemOrder: 2, text: "ミシラヌ,2" },
    ]);
  });
  it.each([
    ["A,1 B,2 C,3", ["A", "B", "C"]],
    ["豚肉,1 個 鶏卵,1", ["豚肉", "個 鶏卵"]],
    ["豚肉,1,000g 鶏卵,1", ["豚肉", "鶏卵"]],
    ["豚肉,1 • 鶏卵,1", ["豚肉", "• 鶏卵"]],
    ["A,1 B,2\\", ["A", "B"]],
    ["• 豚肉,1 鶏卵,1", ["豚肉", "鶏卵"]],
  ])("TC-FR-RCP-05-01 組の境界を解析する %#", (input, names) => {
    const result = parseReceiptText(input, {
      foods: names.map((displayName) => ({ displayName, foodId: displayName })),
      manualFoods: [],
    });
    expect(result.candidates.map((item) => item.displayName)).toEqual(names);
  });
  it("TC-FR-RCP-05-02 分割できない行と長さの上限を扱う", () => {
    expect(
      parseReceiptText("にんじん, 1 にんじん,1", catalog).candidates,
    ).toHaveLength(0);
    expect(parseReceiptText("にんじん,1\\", catalog).candidates).toHaveLength(
      1,
    );
    const valid = `${"x".repeat(198)},1 にんじん,1`;
    expect(parseReceiptText(valid, catalog).candidates).toHaveLength(1);
    const invalid = `${"x".repeat(199)},1 にんじん,1`;
    expect(parseReceiptText(invalid, catalog).unmatched).toEqual([
      { line: 1, text: invalid },
    ]);
    const boundary = `${Array(20)
      .fill(`${"x".repeat(197)},1`)
      .join(" ")} `;
    expect(boundary.length).toBe(4000);
    expect(parseReceiptText(boundary, catalog).unmatched).toHaveLength(20);
    expect(parseReceiptText(`${boundary} `, catalog).unmatched).toEqual([
      { line: 1, text: `${boundary} ` },
    ]);
    const long = `${"x".repeat(3996)},1 a,1`;
    expect(parseReceiptText(long, catalog).unmatched).toEqual([
      { line: 1, text: long },
    ]);
  });
  it.each([
    "豚肉 300g",
    "ロース ハム,1",
    "豚肉,1 個",
    "豚肉,1 鶏卵,1 余り",
    ",1 鶏卵,1",
  ])("TC-FR-RCP-05-02 分割しない行を従来解析に渡す: %s", (input) => {
    const result = parseReceiptText(input, { foods: [], manualFoods: [] });
    expect(result.unmatched).toEqual([{ line: 1, text: input }]);
  });
  it("TC-FR-RCP-05-01 未一致の組の桁区切りを除く", () => {
    expect(
      parseReceiptText("豚肉,1 未知,1,000g", { foods: [], manualFoods: [] })
        .unmatched,
    ).toEqual([
      { line: 1, itemOrder: 1, text: "豚肉,1" },
      { line: 1, itemOrder: 2, text: "未知,1000g" },
    ]);
  });
  it.each([`# ${"x".repeat(249)}`, "\\".repeat(250)])(
    "TC-FR-RCP-05-02 分割しない長い行を登録しない: %s",
    (input) => {
      expect(parseReceiptText(input, catalog).unmatched).toEqual([
        { line: 1, text: input },
      ]);
    },
  );
  it("TC-FR-RCP-05-02 行中に長い空白がある 4000 文字の行を短時間で処理する", () => {
    const input = `a${" ".repeat(3998)}b`;
    const start = performance.now();
    for (let i = 0; i < 100; i++) parseReceiptText(input, catalog);
    expect(performance.now() - start).toBeLessThan(1000);
  });
  it.each([
    ["生椎茸", "しいたけ"],
    ["コマツ菜", "こまつな"],
    ["プチトマト", "ミニトマト"],
    ["カイワレ", "かいわれだいこん"],
    ["玉子", "鶏卵"],
    ["長ねぎ", "ねぎ"],
  ])(
    "TC-FR-RCP-04-01 初版の言い換え表で %s を %s に当てる",
    (alias, expected) => {
      const foods = [expected].map((displayName) => ({
        displayName,
        foodId: displayName,
      }));
      const catalogWithAlias = {
        foods,
        manualFoods: [],
        aliases: receiptAliases,
      };
      const snapshot = JSON.stringify(catalogWithAlias);
      const result = parseReceiptText(`${alias},1`, catalogWithAlias);
      expect(result.candidates[0]).toMatchObject({
        displayName: expected,
        aliasFrom: alias,
      });
      expect(JSON.stringify(catalogWithAlias)).toBe(snapshot);
    },
  );
  it.each([
    ["生椎茸,1", "しいたけ", "生椎茸"],
    ["プチトマト,1", "ミニトマト", "プチトマト"],
    ["生椎茸,1", "生椎茸", undefined],
  ])(
    "TC-FR-RCP-04-01 言い換えと直接一致を区別する %#",
    (line, expected, aliasFrom) => {
      const foods = ["しいたけ", "ミニトマト", "生椎茸"].map((displayName) => ({
        displayName,
        foodId: displayName,
      }));
      const result = parseReceiptText(line, {
        foods: aliasFrom ? foods.slice(0, 2) : foods,
        manualFoods: [],
        aliases: { 生椎茸: "しいたけ", プチトマト: "ミニトマト" },
      });
      expect(result.candidates[0]).toMatchObject({ displayName: expected });
      expect(result.candidates[0].aliasFrom).toBe(aliasFrom);
      expect(result.unmatched).toEqual([]);
    },
  );

  it("TC-FR-RCP-04-01 言い換えは一段だけで、手入力名を優先し、表にない名前は残す", () => {
    const result = parseReceiptText("生椎茸,1\nプチトマト,1\n似た名前,1", {
      foods: [{ displayName: "しいたけ", foodId: "1" }],
      manualFoods: [{ displayName: "生椎茸", foodId: "manual-1" }],
      aliases: { 生椎茸: "しいたけ", プチトマト: "生椎茸" },
    });
    expect(result.candidates.map(({ foodId }) => foodId)).toEqual([
      "manual-1",
      "manual-1",
    ]);
    expect(result.unmatched).toEqual([{ line: 3, text: "似た名前,1" }]);
  });
  it("TC-FR-RCP-04-01 言い換えの先は再び言い換えない", () => {
    const result = parseReceiptText("A,1", {
      foods: [{ displayName: "しいたけ", foodId: "1" }],
      manualFoods: [],
      aliases: { A: "B", B: "しいたけ" },
    });
    expect(result.candidates).toEqual([]);
    expect(result.unmatched).toEqual([{ line: 1, text: "A,1" }]);
  });
  it.each([
    ["にんじん,2", { kind: "count", count: 2 }, false],
    ["－ にんじん、１．３個", { kind: "count", count: 1.5 }, true],
    ["* にんじん\t300g", { kind: "weight", grams: 300, unit: "g" }, false],
    ["1. にんじん 1.25kg", { kind: "weight", grams: 1250, unit: "kg" }, false],
    ["にんじん,1/4", { kind: "count", count: 0.5 }, true],
    ["にんじん,0", { kind: "count", count: 1 }, true],
    ["にんじん,1/0", { kind: "count", count: 1 }, true],
    ["にんじん,1000個", { kind: "count", count: 999 }, true],
    ["にんじん,1,000g", { kind: "weight", grams: 1000, unit: "g" }, false],
    ["にんじん,2本", { kind: "count", count: 2 }, false],
    ["にんじん,2KG", { kind: "weight", grams: 2000, unit: "kg" }, false],
    ["にんじん,200kg", { kind: "weight", grams: 100000, unit: "kg" }, true],
    ["にんじん", { kind: "count", count: 1 }, true],
  ])("TC-FR-RCP-01-01 量を読む %#", (line, quantity, needsCheck) => {
    const result = parseReceiptText(line, catalog);
    expect(result.unmatched).toEqual([]);
    expect(result.candidates[0]).toMatchObject({
      foodId: "06212",
      quantity,
      needsCheck,
    });
  });

  it("TC-FR-RCP-01-01 囲みや見出しを飛ばし、同名は登録一覧・新しい手入力を優先する", () => {
    const result = parseReceiptText(
      "# 見出し\n```\nにんじん,1\nはるさめ（乾燥）,2\n手作り豆腐,1\n```\n\n洗剤,1",
      catalog,
    );
    expect(result.candidates.map((item) => item.foodId)).toEqual([
      "06212",
      "01000",
      "manual-recent",
    ]);
    expect(result.unmatched).toEqual([{ line: 8, text: "洗剤,1" }]);
  });
  it("TC-FR-RCP-01-01 空文字列と崩れた行を例外なく扱う", () => {
    expect(parseReceiptText("", catalog)).toEqual({
      candidates: [],
      unmatched: [],
    });
    expect(parseReceiptText("にんじん,???", catalog)).toEqual({
      candidates: [],
      unmatched: [{ line: 1, text: "にんじん,???" }],
    });
  });
  it("TC-FR-RCP-01-01 長い行は量を読まず一覧にない物にする", () => {
    const longLine = `${"1".repeat(50000)}x`;
    const result = parseReceiptText(longLine, catalog);
    expect(result).toEqual({
      candidates: [],
      unmatched: [{ line: 1, text: longLine }],
    });
  }, 1000);
  it("TC-FR-RCP-01-01 NFKC 後の行長 200 字までは読み、201 字から除外する", () => {
    const accepted = `にんじん,${"1".repeat(195)}`;
    const rejected = `にんじん,${"１".repeat(196)}`;
    expect(accepted.length).toBe(200);
    expect(parseReceiptText(accepted, catalog).candidates).toHaveLength(1);
    expect(parseReceiptText(rejected, catalog).unmatched).toEqual([
      { line: 1, text: rejected },
    ]);
  });
  it("TC-FR-RCP-01-01 一覧の余分なキーを候補に渡さない", () => {
    const extraCatalog = {
      foods: [
        {
          displayName: "にんじん",
          foodId: "06212",
          line: 99,
          needsCheck: true,
        },
      ],
      manualFoods: [],
    };
    expect(parseReceiptText("にんじん,2", extraCatalog).candidates).toEqual([
      {
        line: 1,
        displayName: "にんじん",
        foodId: "06212",
        quantity: { kind: "count", count: 2 },
        needsCheck: false,
      },
    ]);
  });
  it.each([
    ["にんじん,1\\", 1],
    ["にんじん,1  ", 1],
    ["にんじん,1　　", 1],
    ["にんじん,1\\  ", 1],
    ["にんじん,1  \\", 1],
    ["にんじん,1 \\ \\", 1],
    ["にんじん,2", 2],
  ])("TC-FR-RCP-01-09 行末の改行印を外して量を読む %#", (line, count) => {
    const result = parseReceiptText(line, catalog);
    expect(result.unmatched).toEqual([]);
    expect(result.candidates[0]).toMatchObject({
      displayName: "にんじん",
      quantity: { kind: "count", count },
      needsCheck: false,
    });
  });
  it("TC-FR-RCP-01-09 5 行の貼り付けでは一覧にない生椎茸だけを残す", () => {
    const receiptCatalog: ReceiptCatalog = {
      foods: ["しいたけ", "こまつな", "バナナ", "トマト", "ねぎ"].map(
        (displayName) => ({ displayName, foodId: displayName }),
      ),
      manualFoods: [],
    };
    const result = parseReceiptText(
      "生椎茸,1\\\nこまつな,1\\\nバナナ,1\\\nトマト,1\\\nねぎ,1",
      receiptCatalog,
    );
    expect(
      result.candidates.map(({ displayName, quantity }) => ({
        displayName,
        quantity,
      })),
    ).toEqual(
      ["こまつな", "バナナ", "トマト", "ねぎ"].map((displayName) => ({
        displayName,
        quantity: { kind: "count", count: 1 },
      })),
    );
    expect(result.unmatched).toEqual([{ line: 1, text: "生椎茸,1\\" }]);
  });
  it("TC-FR-RCP-01-09 200 字超の行は改行印を外す前に除外する", () => {
    const line = `にんじん,${"1".repeat(195)}\\`;
    expect(line.length).toBe(201);
    expect(parseReceiptText(line, catalog)).toEqual({
      candidates: [],
      unmatched: [{ line: 1, text: line }],
    });
  });
  it("TC-FR-RCP-01-09 行中に空白が 100 個あっても短時間で終わる", () => {
    const line = `にんじん${" ".repeat(100)}x`;
    const start = performance.now();
    const result = parseReceiptText(line, catalog);
    expect(performance.now() - start).toBeLessThan(100);
    expect(result).toEqual({
      candidates: [],
      unmatched: [{ line: 1, text: line }],
    });
  });
  it("TC-FR-RCP-01-09 201 字以上の空白だけの行を飛ばす", () => {
    expect(
      parseReceiptText(`${" ".repeat(201)}\nにんじん,1`, catalog),
    ).toMatchObject({
      candidates: [{ line: 2, displayName: "にんじん" }],
      unmatched: [],
    });
  });
});

const shopping: Shopping = {
  id: "s",
  date: "2026-11-03",
  origin: "normal",
  items: [],
};
const entry = (id: string, count: number): BasketEntry => ({
  id,
  foodId: "06212",
  displayName: "にんじん",
  quantity: { kind: "count", count },
});

describe("レシート一括登録（DES-RCP-05）", () => {
  it("TC-FR-RCP-01-02 貼った中の重複を加算し、入力を変更しない", () => {
    const entries = [entry("a", 2), entry("b", 1)];
    const planned = planRegisterMany(shopping, entries);
    expect(planned).toMatchObject({ registeredCount: 2, clampedCount: 0 });
    expect(planned.shopping.items).toEqual([entry("a", 3)]);
    expect(shopping.items).toEqual([]);
    expect(entries).toEqual([entry("a", 2), entry("b", 1)]);
    const state = basketReducer(
      { ...initialAppState, shoppings: [shopping] },
      { type: "registerMany", shoppingId: "s", entries },
    );
    expect(state.shoppings[0]).toEqual(planned.shopping);
  });

  it.each([
    [
      { kind: "count" as const, count: 998.5 },
      { kind: "count" as const, count: 2 },
      999,
    ],
    [
      { kind: "weight" as const, grams: 2000, unit: "g" as const },
      { kind: "count" as const, count: 2 },
      2300,
    ],
  ])(
    "TC-FR-RCP-01-02 既存の種類に換算し上限で止める %#",
    (existing, added, expected) => {
      const current = {
        ...shopping,
        items: [{ ...entry("a", 1), quantity: existing }],
      };
      const planned = planRegisterMany(current, [
        { ...entry("b", 1), quantity: added },
      ]);
      const quantity = planned.shopping.items[0].quantity;
      expect(quantity.kind === "count" ? quantity.count : quantity.grams).toBe(
        expected,
      );
      expect(planned.registeredCount).toBe(1);
      expect(planned.clampedCount).toBe(existing.kind === "count" ? 1 : 0);
    },
  );

  it("TC-FR-RCP-01-02 全体の ID 重複を拒み、買い物 0 件では初回の買い物を作る", () => {
    const another = { ...shopping, id: "other", items: [entry("used", 1)] };
    expect(
      planRegisterMany(shopping, [entry("used", 1)], [another, shopping])
        .registeredCount,
    ).toBe(0);
    const created = basketReducer(initialAppState, {
      type: "registerMany",
      shoppingId: "s",
      initialShopping: { id: "s", date: "2026-11-03" },
      entries: [entry("a", 2)],
    });
    expect(created.shoppings[0].items).toEqual([entry("a", 2)]);
    expect(
      basketReducer(created, {
        type: "registerMany",
        shoppingId: "missing",
        entries: [entry("x", 1)],
      }),
    ).toBe(created);
  });
  it("TC-FR-RCP-01-02 上限で止めた件数を数え、すでに上限なら状態を変えない", () => {
    const current = { ...shopping, items: [entry("a", 999)] };
    const planned = planRegisterMany(current, [entry("b", 2)]);
    expect(planned).toMatchObject({ registeredCount: 0, clampedCount: 1 });
    expect(planned.shopping).toBe(current);
  });
  it("TC-FR-RCP-01-02 新しい行の余分なキーを状態と保存に渡さない", () => {
    const input = { ...entry("a", 2), line: 99, needsCheck: true };
    const planned = planRegisterMany(shopping, [input]);
    expect(planned.shopping.items).toEqual([entry("a", 2)]);
    const state = basketReducer(
      { ...initialAppState, shoppings: [shopping] },
      { type: "registerMany", shoppingId: "s", entries: [input] },
    );
    expect(state.shoppings[0].items).toEqual([entry("a", 2)]);
    expect(JSON.parse(serializeState(state)).shoppings[0].items).toEqual([
      entry("a", 2),
    ]);
  });
});
