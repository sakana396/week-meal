import { describe, expect, it } from "vitest";
import foodsJson from "../data/foods.json";
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
  it("TC-FR-RCP-02-01 登録一覧 186 件での実文字数は 1316", () => {
    const names = groupFoods(
      (foodsJson as FoodItem[]).filter(isRegistrable),
    ).map((group) => group.name);
    expect(names).toHaveLength(186);
    expect(receiptPrompt(names)).toHaveLength(1316);
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
