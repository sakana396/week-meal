import { describe, expect, it } from "vitest";
import type { FoodItem } from "../types";
import {
  foodPresentation,
  groupFoods,
  isRegistrable,
  normalizeSearchText,
  prioritizeSupermarketFoods,
  representativeFood,
  supermarketPriority,
} from "./catalog";

function food(id: string, name: string, category: string): FoodItem {
  return { id, name, category } as FoodItem;
}

describe("foodPresentation（DES-CAT-01）", () => {
  it.each([
    [
      "TC-FR-ING-05-01 （あじ類）の分類を食材名にまとめる",
      "＜魚類＞ （あじ類） まあじ 皮つき 生",
      "魚介類",
      "あじ",
      "まあじ・皮つき・生",
    ],
    [
      "TC-FR-ING-05-02 別名の設定で一般的な食材名にする",
      "（たまねぎ類） たまねぎ りん茎 生",
      "野菜類",
      "玉ねぎ",
      "たまねぎ・りん茎・生",
    ],
    [
      "TC-FR-ING-05-03 分類ごとの別名は、同じ名前の別の分類に影響しない（果実の柿）",
      "かき 甘がき 生",
      "果実類",
      "柿",
      "かき・甘がき・生",
    ],
    [
      "TC-FR-ING-05-04 分類ごとの別名は、同じ名前の別の分類に影響しない（貝の牡蠣）",
      "＜貝類＞ かき 養殖 生",
      "魚介類",
      "かき",
      "養殖・生",
    ],
  ])("%s", (_title, officialName, category, name, details) => {
    expect(foodPresentation(officialName, category)).toEqual({ name, details });
  });

  it.each([
    [
      "TC-FR-ING-06-01 から揚げは別の食材名にする",
      "にわとり ［その他］ から揚げ",
      "肉類",
      "鶏のから揚げ",
    ],
    [
      "TC-FR-ING-06-02 フライドポテトは別の食材名にする",
      "＜いも類＞ じゃがいも 塊茎 皮つき フライドポテト （生を揚げたもの）",
      "いも及びでん粉類",
      "フライドポテト",
    ],
    [
      "TC-FR-ING-06-03 缶詰は別の食材名にする",
      "＜魚類＞ （まぐろ類） 缶詰 水煮 フレーク ライト",
      "魚介類",
      "まぐろ（缶詰）",
    ],
    [
      "TC-FR-ING-06-04 かぼちゃの種は別の食材名にする",
      "かぼちゃ いり 味付け",
      "種実類",
      "かぼちゃの種",
    ],
    [
      "TC-FR-ING-06-05 天ぷらは別の食材名にする",
      "なす 果実 天ぷら",
      "野菜類",
      "なすの天ぷら",
    ],
    [
      "TC-FR-ING-06-06 フライは別の食材名にする",
      "とうもろこし ジャイアントコーン フライ 味付け",
      "種実類",
      "とうもろこしのフライ",
    ],
    [
      "TC-FR-ING-06-07 「フライ」が語の一部（フライ用）なら分けない（境界）",
      "なす 果実 フライ用 生",
      "野菜類",
      "なす",
    ],
    [
      "TC-FR-ING-06-08 漬物は別の食材名にする",
      "かぶ 漬物 塩漬 根 皮つき",
      "野菜類",
      "かぶの漬物",
    ],
    [
      "TC-FR-ING-06-09 乾燥品は別の食材名にする",
      "おおむぎ 押麦 乾",
      "穀類",
      "おおむぎ（乾燥）",
    ],
    [
      "TC-FR-ING-06-10 「乾」が語の一部（乾パン）なら乾燥品にしない（境界）",
      "こむぎ ［パン類］ 乾パン",
      "穀類",
      "こむぎ",
    ],
  ])("%s", (_title, officialName, category, name) => {
    expect(foodPresentation(officialName, category).name).toBe(name);
  });
});

describe("大豆製品の分け方（DES-CAT-01、FR-ING-06）", () => {
  it.each([
    [
      "TC-FR-ING-06-11 木綿豆腐は豆腐",
      "だいず ［豆腐・油揚げ類］ 木綿豆腐",
      "豆腐",
    ],
    [
      "TC-FR-ING-06-12 糸引き納豆は納豆",
      "だいず ［納豆類］ 糸引き納豆",
      "納豆",
    ],
    [
      "TC-FR-ING-06-13 生揚げは厚揚げ",
      "だいず ［豆腐・油揚げ類］ 生揚げ",
      "厚揚げ",
    ],
    [
      "TC-FR-ING-06-14 絹生揚げも厚揚げ",
      "だいず ［豆腐・油揚げ類］ 絹生揚げ",
      "厚揚げ",
    ],
    [
      "TC-FR-ING-06-15 油抜きした油揚げも油揚げ",
      "だいず ［豆腐・油揚げ類］ 油揚げ 油抜き 生",
      "油揚げ",
    ],
    [
      "TC-FR-ING-06-16 がんもどきは油揚げにまとめない",
      "だいず ［豆腐・油揚げ類］ がんもどき",
      "がんもどき",
    ],
    [
      "TC-FR-ING-06-17 凍り豆腐は豆腐にまとめず高野豆腐にする",
      "だいず ［豆腐・油揚げ類］ 凍り豆腐 水煮",
      "高野豆腐",
    ],
    [
      "TC-FR-ING-06-18 豆腐竹輪は豆腐にまとめない",
      "だいず ［豆腐・油揚げ類］ 豆腐竹輪 蒸し",
      "豆腐竹輪",
    ],
    ["TC-FR-ING-06-19 豆乳は豆乳", "だいず ［その他］ 豆乳 調製豆乳", "豆乳"],
    [
      "TC-FR-ING-06-20 おからは分けず「だいず」のまま（境界）",
      "だいず ［その他］ おから 生",
      "だいず",
    ],
  ])("%s", (_title, officialName, name) => {
    expect(foodPresentation(officialName, "豆類").name).toBe(name);
  });
});

describe("groupFoods・representativeFood（DES-CAT-02, 03）", () => {
  it("TC-FR-ING-05-05 同じ食材名の食品を 1 つにまとめる", () => {
    const groups = groupFoods([
      food("10003", "＜魚類＞ （あじ類） まあじ 皮つき 生", "魚介類"),
      food("10008", "＜魚類＞ （あじ類） にしまあじ 生", "魚介類"),
      food("06153", "（たまねぎ類） たまねぎ りん茎 生", "野菜類"),
    ]);
    expect(groups.map((group) => [group.name, group.foods.length])).toEqual([
      ["あじ", 2],
      ["玉ねぎ", 1],
    ]);
  });

  it("TC-FR-ING-05-06 代表食品の指定があれば、それを選ぶ", () => {
    const [group] = groupFoods([
      food("10008", "＜魚類＞ （あじ類） にしまあじ 生", "魚介類"),
      food("10003", "＜魚類＞ （あじ類） まあじ 皮つき 生", "魚介類"),
    ]);
    expect(representativeFood(group).id).toBe("10003");
  });

  it("TC-FR-ING-05-07 指定がなければ「生」を「焼き」「ゆで」より優先する", () => {
    const [group] = groupFoods([
      food("1", "（さば類） まさば 焼き", "魚介類"),
      food("2", "（さば類） まさば ゆで", "魚介類"),
      food("3", "（さば類） まさば 生", "魚介類"),
    ]);
    expect(representativeFood(group).id).toBe("3");
  });

  it.each([
    [
      "TC-FR-ING-05-09 生がなければ、冷凍をゆで・焼きより優先する",
      ["まさば 焼き", "まさば ゆで", "まさば 冷凍"],
      "3",
    ],
    [
      "TC-FR-ING-05-10 ゆでがなければ、蒸しを焼きより優先する",
      ["まさば 焼き", "まさば 蒸し"],
      "2",
    ],
  ])("%s", (_title, names, expectedId) => {
    const [group] = groupFoods(
      names.map((name, index) =>
        food(String(index + 1), `（さば類） ${name}`, "魚介類"),
      ),
    );
    expect(representativeFood(group).id).toBe(expectedId);
  });

  it("TC-FR-ING-05-08 状態の表記がなければ、先頭の食品を選ぶ（境界）", () => {
    const [group] = groupFoods([
      food("1", "（さば類） まさば 水煮", "魚介類"),
      food("2", "（さば類） まさば みそ煮", "魚介類"),
    ]);
    expect(representativeFood(group).id).toBe("1");
  });
});

describe("prioritizeSupermarketFoods（DES-CAT-04）", () => {
  it("TC-FR-ING-04-01 よくある食材を一覧の順に先に、それ以外を日本語の辞書順（localeCompare）で後に並べる", () => {
    const groups = groupFoods([
      food("1", "アーティチョーク 花らい 生", "野菜類"),
      food("2", "にんじん 根 皮つき 生", "野菜類"),
      food("3", "（たまねぎ類） たまねぎ りん茎 生", "野菜類"),
      food("4", "あしたば 茎葉 生", "野菜類"),
    ]);
    expect(
      prioritizeSupermarketFoods(groups).map((group) => group.name),
    ).toEqual(["玉ねぎ", "にんじん", "アーティチョーク", "あしたば"]);
  });

  it.each([
    ["TC-FR-ING-04-02 一覧にある食材名は順番を返す", "玉ねぎ", 0],
    ["TC-FR-ING-04-03 部分一致では一覧の食材として扱わない", "玉ねぎ類", null],
  ])("%s", (_title, name, expected) => {
    expect(supermarketPriority(name)).toBe(expected);
  });
});

describe("normalizeSearchText（DES-CAT-06）", () => {
  it.each([
    ["TC-FR-ING-03-01 半角・全角の空白を除く", "玉 ねぎ　生", "玉ねぎ生"],
    ["TC-FR-ING-03-02 英字は小文字にする", "ABC", "abc"],
    ["TC-FR-ING-03-03 空文字はそのまま（境界）", "", ""],
  ])("%s", (_title, input, expected) => {
    expect(normalizeSearchText(input)).toBe(expected);
  });
});

describe("isRegistrable（DES-CAT-05）", () => {
  it.each([
    [
      "TC-FR-ING-09-01 野菜は登録できる",
      "にんじん 根 皮つき 生",
      "野菜類",
      true,
    ],
    [
      "TC-FR-ING-09-02 ご飯（米・パン・麺）は登録しない",
      "こめ ［水稲めし］ 精白米 うるち米",
      "穀類",
      false,
    ],
    [
      "TC-FR-ING-09-03 しょうゆ（調味料）は登録しない",
      "＜調味料類＞ （しょうゆ類） こいくちしょうゆ",
      "調味料及び香辛料類",
      false,
    ],
    [
      "TC-FR-ING-09-04 油（油脂類）は登録しない",
      "（植物油脂類） オリーブ油",
      "油脂類",
      false,
    ],
    [
      "TC-FR-ING-09-05 米・パン・麺の棚に入らない穀類（小麦粉）は登録できる（境界）",
      "こむぎ ［小麦粉］ 薄力粉 1等",
      "穀類",
      true,
    ],
  ])("%s", (_title, name, category, expected) => {
    expect(isRegistrable(food("x", name, category))).toBe(expected);
  });
});
