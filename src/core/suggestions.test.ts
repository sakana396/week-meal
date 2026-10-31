import { describe, expect, it, vi } from "vitest";
import foodsJson from "../data/foods.json";
import { nutrientDefinitions } from "../data/nutrients";
import type { FoodItem, NutrientsPer100g } from "../types";
import * as balance from "./balance";
import { analyzeBasket, type AnalysisData } from "./analyze";
import {
  balanceTargets,
  lowerTargetRatio,
  referenceFor,
  type BalanceResult,
} from "./balance";
import {
  basketReducer,
  maximumCount,
  toRegisteredItems,
  type AppState,
} from "./basket";
import {
  groupFoods,
  isRegistrable,
  representativeFood,
  supermarketPriority,
} from "./catalog";
import { defaultProfile } from "./profile";
import {
  supplementCandidates,
  suggestSupplements,
  type SupplementCandidate,
} from "./suggestions";

const profile = { ...defaultProfile, staple: "none" as const };
const reference = referenceFor(profile);
// 架空の成分値は式の検査専用。実際の食品データには使わない。
function food(id: string, changes: Partial<NutrientsPer100g> = {}): FoodItem {
  const nutrients = Object.fromEntries(
    nutrientDefinitions.map(({ key }) => [key, 0]),
  ) as NutrientsPer100g;
  for (const { key, rule } of balanceTargets) {
    if (rule.kind === "lower")
      nutrients[key] = (reference[rule.reference] / reference.energyKcal) * 100;
  }
  return {
    id,
    name: id,
    category: "野菜類",
    refusePct: 0,
    nutrientsPer100g: {
      ...nutrients,
      energyKcal: 100,
      proteinG: 5,
      fatG: 25 / 9,
      carbohydrateG: 13.75,
      vitaminCMg: (reference.vitaminCMg / reference.energyKcal) * 40,
      ...changes,
    },
  };
}
const baseFoods = [food("base1"), food("base2"), food("base3")];
function state(): AppState {
  return {
    profile: { ...profile },
    manualFoods: [],
    shoppings: [
      {
        id: "s",
        date: "2026-10-31",
        origin: "normal",
        items: baseFoods.map((f) => ({
          id: f.id,
          foodId: f.id,
          displayName: f.id,
          count: 1,
        })),
      },
    ],
  };
}
const data: AnalysisData = {
  unitWeights: {},
  stapleFoods: { rice: undefined, bread: undefined, noodle: undefined },
};
function candidate(
  id: string,
  changes: Partial<NutrientsPer100g> = {},
  priority = 0,
): SupplementCandidate {
  return {
    food: food(id, {
      vitaminCMg: (reference.vitaminCMg / reference.energyKcal) * 120,
      ...changes,
    }),
    displayName: id,
    priority,
  };
}
function shelfCandidate(
  id: string,
  category: string,
  changes: Partial<NutrientsPer100g> = {},
  priority = 0,
): SupplementCandidate {
  const base = candidate(id, changes, priority);
  return { ...base, food: { ...base.food, category } };
}
function suggest(
  candidates: SupplementCandidate[],
  current = state(),
  analysisData = data,
) {
  return suggestSupplements(
    current,
    new Map(
      [...baseFoods, ...candidates.map((c) => c.food)].map((f) => [f.id, f]),
    ),
    candidates,
    analysisData,
  );
}
function result(changes: Partial<BalanceResult> = {}): BalanceResult {
  return {
    key: "vitaminCMg",
    status: "low",
    sufficiency: 0.5,
    pfcPct: null,
    pfcRange: null,
    coverage: 1,
    ...changes,
  };
}

describe("補う候補（DES-SUG-01〜03）", () => {
  it("TC-FR-BAL-06-01 登録可能なよくある食材の代表食品を重複なく選び80件に制限しない", () => {
    const foods = foodsJson as FoodItem[];
    const expected = groupFoods(foods.filter(isRegistrable))
      .flatMap((group) => {
        const priority = supermarketPriority(group.name);
        return priority === null
          ? []
          : [
              {
                food: representativeFood(group),
                displayName: group.name,
                priority,
              },
            ];
      })
      .filter(
        (c, i, all) =>
          all.findIndex((other) => other.food.id === c.food.id) === i,
      );
    expect(supplementCandidates([...foods, ...foods])).toEqual(expected);
    const many = Array.from({ length: 81 }, (_, index) => ({
      ...food(`synthetic-${index}`),
      name: "キャベツ 生",
      category: `検査分類${index}`,
    }));
    expect(supplementCandidates(many)).toHaveLength(81);
    expect(supplementCandidates([food("manual-x")])).toEqual([]);
  });
  it.each(["2品目", "不足なし", "候補なし", "エネルギーなし"])(
    "TC-FR-BAL-06-02 %sなら空配列",
    (kind) => {
      const current = state();
      if (kind === "2品目") current.shoppings[0].items.pop();
      const foods = baseFoods.map((f) =>
        food(
          f.id,
          kind === "不足なし"
            ? {
                vitaminCMg: (reference.vitaminCMg / reference.energyKcal) * 100,
              }
            : kind === "エネルギーなし"
              ? { energyKcal: 0 }
              : {},
        ),
      );
      expect(
        suggestSupplements(
          current,
          new Map(foods.map((f) => [f.id, f])),
          kind === "候補なし" ? [] : [candidate("c")],
          data,
        ),
      ).toEqual([]);
    },
  );
  it("TC-FR-BAL-06-03 改善しない候補を除き上位3件まで返す", () => {
    expect(
      suggest([
        candidate("d"),
        candidate("c"),
        candidate("b"),
        candidate("a"),
        candidate("zero", { vitaminCMg: 0 }),
      ]).map((c) => c.foodId),
    ).toEqual(["a", "b", "c"]);
    expect(
      suggest([candidate("a"), candidate("zero", { vitaminCMg: 0 })]),
    ).toHaveLength(1);
  });
  it.each([{ count: 1 }, { count: 998.5 }, { count: maximumCount }])(
    "TC-FR-BAL-06-04 登録と同じ追加を仮定する $count",
    ({ count }) => {
      const c = candidate("c");
      const current = state();
      current.shoppings[0].items.push({
        id: "c",
        foodId: c.food.id,
        displayName: c.displayName,
        count,
      });
      const snapshot = structuredClone(current);
      const suggestions = suggest([c], current, {
        ...data,
        unitWeights: { c: { unit: "個", purchaseG: 0.1, source: "テスト用" } },
      });
      expect(suggestions).toHaveLength(count === maximumCount ? 0 : 1);
      expect(current).toEqual(snapshot);
    },
  );
  it("TC-FR-BAL-06-04 前の買い物の上限行は最新の買い物の候補を妨げない", () => {
    const c = candidate("c");
    const current = state();
    current.shoppings.unshift({
      id: "previous",
      date: "2026-10-30",
      origin: "normal",
      items: [
        {
          id: "previous-c",
          foodId: "c",
          displayName: "c",
          count: maximumCount,
        },
      ],
    });
    expect(suggest([c], current)).toHaveLength(1);
  });
  it.each([
    { energyKcal: null },
    { energyKcal: 0 },
    { vitaminCMg: null },
    { vitaminAUg: null },
    { proteinG: null },
    { energyKcal: -1 },
  ])("TC-FR-BAL-06-05 欠損やカバー率低下を改善と扱わない %j", (changes) => {
    expect(suggest([candidate("c", changes)])).toEqual([]);
  });
  it("TC-FR-BAL-07-01 下限の不足量0.3→0.1の寄与0.2を返す", () => {
    expect(suggest([candidate("c")])[0]).toMatchObject({
      improvement: 0.2,
      improvedKeys: ["vitaminCMg"],
      approximate: true,
    });
    // 別の不足を0.7→0.525に悪化させると、0.175を減点する。
    const current = state();
    const foods = baseFoods.map((f) =>
      food(f.id, {
        vitaminAUg: (reference.vitaminAUg / reference.energyKcal) * 70,
      }),
    );
    const c = candidate("c", { vitaminAUg: 0 });
    expect(
      suggestSupplements(
        current,
        new Map(foods.map((f) => [f.id, f])),
        [c],
        data,
      )[0].improvement,
    ).toBe(0.025);
  });
  it("TC-FR-BAL-07-02 改善量より新しい過剰がない候補を優先する", () => {
    const high = candidate("high", { saltEquivalentG: 10, vitaminCMg: 100 });
    const suggestions = suggest([high, candidate("safe")]);
    expect(suggestions.map((c) => c.foodId)).toEqual(["safe", "high"]);
    expect(suggestions[1].newHighKeys).toContain("saltEquivalentG");
  });
  it("TC-FR-BAL-07-03 丸め後0は除外し同点は優先順位と食品番号順", () => {
    const candidates = [
      candidate("z", {}, 1),
      candidate("b"),
      candidate("a"),
      candidate("zero", {
        vitaminCMg: (reference.vitaminCMg / reference.energyKcal) * 40.00001,
      }),
    ];
    expect(suggest(candidates).map((c) => c.foodId)).toEqual(["a", "b", "z"]);
    expect(suggest(candidates)).toEqual(suggest(candidates));
  });
  it("TC-FR-BAL-07-04 PFC下限比0.5→0.8で不足量が0.3減る", () => {
    const before = result({
      key: "proteinG",
      sufficiency: null,
      pfcPct: 7.5,
      pfcRange: [15, 20],
    });
    const after = { ...before, pfcPct: 12 };
    expect(lowerTargetRatio(before)).toBe(0.5);
    expect(lowerTargetRatio(after)).toBe(0.8);
    expect(
      1 - lowerTargetRatio(before)! - (1 - lowerTargetRatio(after)!),
    ).toBeCloseTo(0.3);
    expect(before.sufficiency).toBeNull();
  });
  it.each([
    { key: "saltEquivalentG" as const, base: 1, extra: 2, worsened: true },
    {
      key: "saltEquivalentG" as const,
      base: 1,
      extra: 1.00000001,
      worsened: false,
    },
    { key: "fatG" as const, base: 10, extra: 20, worsened: true },
    { key: "fatG" as const, base: 10, extra: 10.00000001, worsened: false },
  ])(
    "TC-FR-BAL-07-05 既存過剰と丸め境界 $key/$extra",
    ({ key, base, extra, worsened }) => {
      const foods = baseFoods.map((f) => food(f.id, { [key]: base }));
      const candidates = [
        candidate("worse", { [key]: extra, vitaminCMg: 100 }),
        candidate("safe", { [key]: base }),
      ];
      const suggestions = suggestSupplements(
        state(),
        new Map(foods.map((f) => [f.id, f])),
        candidates,
        data,
      );
      const worse = suggestions.find((c) => c.foodId === "worse")!;
      expect(worse.newHighKeys).not.toContain(key);
      expect(worse.worsenedHighKeys.includes(key)).toBe(worsened);
      if (worsened) expect(suggestions[0].foodId).toBe("safe");
    },
  );
  it("TC-FR-BAL-07-06 新しい不足を減点し件数が少ない候補を先にする", () => {
    const candidates = [
      candidate("newLow", { vitaminAUg: 0, vitaminCMg: 100 }),
      candidate("safe"),
    ];
    const foods = baseFoods.map((f) =>
      food(f.id, {
        vitaminAUg: (reference.vitaminAUg / reference.energyKcal) * 80,
      }),
    );
    const suggestions = suggestSupplements(
      state(),
      new Map(foods.map((f) => [f.id, f])),
      candidates,
      data,
    );
    expect(suggestions.map((c) => c.foodId)).toEqual(["safe", "newLow"]);
    expect(suggestions[1].newLowKeys).toContain("vitaminAUg");
  });
  it("TC-FR-NUT-06-04 仮候補の計算は登録・実際の分析・食品を変更しない", () => {
    const current = state();
    const candidates = [candidate("c"), candidate("d")];
    const map = new Map(baseFoods.map((f) => [f.id, f]));
    const snapshot = structuredClone({ current, candidates, map });
    const before = analyzeBasket(
      toRegisteredItems(current.shoppings[0], current.manualFoods, map),
      current.profile,
      data,
    );
    suggestSupplements(current, map, candidates, data);
    expect({ current, candidates, map }).toEqual(snapshot);
    expect(
      analyzeBasket(
        toRegisteredItems(current.shoppings[0], current.manualFoods, map),
        current.profile,
        data,
      ),
    ).toEqual(before);
  });
});

it.each([
  [result(), 0.5],
  [result({ key: "saltEquivalentG" }), null],
  [result({ status: "unknown" }), null],
  ...[null, -1, Infinity, NaN].map((sufficiency) => [
    result({ sufficiency }),
    null,
  ]),
  ...[null, -1, Infinity, NaN].map((pfcPct) => [
    result({ key: "proteinG", pfcPct, pfcRange: [15, 20] }),
    null,
  ]),
  ...[0, -1, Infinity, NaN].map((lower) => [
    result({ key: "proteinG", pfcPct: 5, pfcRange: [lower!, 20] }),
    null,
  ]),
] as [BalanceResult, number | null][])(
  "TC-FR-BAL-07-07 下限比の欠損・異常値を扱う %j",
  (input, expected) => {
    expect(lowerTargetRatio(input)).toBe(expected);
  },
);

// 全行再集計を独立した参照として使う。候補評価の中間判定は spy で観測するだけにする。
it.each(
  (["none", "rice", "bread", "noodle"] as const).flatMap((staple) =>
    (["small", "medium", "large"] as const).flatMap((portion) =>
      ["新規", "既存", "998.5", "999", "欠損", "概算", "前の買い物"].map(
        (mode) => ({
          staple,
          portion,
          mode,
        }),
      ),
    ),
  ),
)(
  "TC-FR-BAL-07-08 全行再集計と差分が同値 $staple/$portion/$mode",
  ({ staple, portion, mode }) => {
    const current = state();
    current.profile = { ...profile, staple, portion };
    const c = candidate("c");
    const foods = baseFoods.map((f) =>
      food(f.id, mode === "欠損" ? { vitaminAUg: null, proteinG: null } : {}),
    );
    const map = new Map([...foods, c.food].map((f) => [f.id, f]));
    if (mode === "前の買い物") {
      current.shoppings.unshift({
        id: "previous",
        date: "2026-10-30",
        origin: "normal",
        items: [
          { id: "previous-c", foodId: "c", displayName: "c", count: 999 },
        ],
      });
    }
    // エネルギー欠損の行は、既存の判定と同じく品目数と合計から除く。
    const noEnergy = food("noEnergy", { energyKcal: null });
    current.manualFoods.push(noEnergy);
    current.shoppings[0].items.push({
      id: "missing",
      foodId: noEnergy.id,
      displayName: "missing",
      count: 1,
    });
    if (["既存", "998.5", "999"].includes(mode)) {
      current.shoppings[0].items.push({
        id: "c",
        foodId: "c",
        displayName: "c",
        count: mode === "998.5" ? 998.5 : mode === "999" ? 999 : 1,
      });
    }
    const testData: AnalysisData = {
      unitWeights:
        mode === "概算"
          ? {}
          : {
              c: {
                unit: "個",
                purchaseG: 0.1,
                refusePct: 20,
                source: "テスト用",
              },
            },
      stapleFoods: {
        rice: food("rice"),
        bread: food("bread"),
        noodle: food("noodle"),
      },
    };
    const target = current.shoppings.find((shopping) => shopping.id === "s")!;
    const before = analyzeBasket(
      toRegisteredItems(target, current.manualFoods, map),
      current.profile,
      testData,
    );
    const added = basketReducer(current, {
      type: "register",
      shoppingId: "s",
      id: "new",
      foodId: "c",
      displayName: "c",
    });
    const after = analyzeBasket(
      toRegisteredItems(
        added.shoppings.find((shopping) => shopping.id === "s")!,
        added.manualFoods,
        map,
      ),
      added.profile,
      testData,
    );
    expect(before.kind).toBe("judged");
    expect(after.kind).toBe("judged");
    if (before.kind !== "judged" || after.kind !== "judged") return;
    const spy = vi.spyOn(balance, "judgeBalance");
    let suggestions;
    let observed: BalanceResult[][];
    try {
      suggestions = suggestSupplements(current, map, [c], testData);
      observed = spy.mock.results.map((r) => r.value as BalanceResult[]);
    } finally {
      spy.mockRestore();
    }
    const expectedResults =
      mode === "999" ? [before.results] : [before.results, after.results];
    expect(observed).toHaveLength(expectedResults.length);
    for (const [i, results] of expectedResults.entries()) {
      for (const [j, expected] of results.entries()) {
        const actual = observed[i][j];
        expect(actual.key).toBe(expected.key);
        expect(actual.status).toBe(expected.status);
        expect(actual.pfcRange).toEqual(expected.pfcRange);
        for (const key of ["sufficiency", "pfcPct", "coverage"] as const) {
          if (expected[key] === null) expect(actual[key]).toBeNull();
          else expect(actual[key]).toBeCloseTo(expected[key], 10);
        }
      }
    }
    const deficit = (r: BalanceResult) => {
      if (r.status === "unknown" || r.key === "saltEquivalentG") return null;
      const ratio = r.pfcRange ? r.pfcPct! / r.pfcRange[0] : r.sufficiency;
      return ratio === null
        ? null
        : Math.max(0, (r.pfcRange ? 1 : 0.7) - ratio);
    };
    const improvement =
      Math.round(
        before.results.reduce((sum, r, index) => {
          const oldD = deficit(r),
            newD = deficit(after.results[index]);
          return sum + (oldD === null || newD === null ? 0 : oldD - newD);
        }, 0) * 1e6,
      ) / 1e6;
    const coverageRetained = before.results.every(
      (r, index) =>
        r.status === "unknown" ||
        (after.results[index].status !== "unknown" &&
          after.results[index].coverage! >= r.coverage!),
    );
    expect(suggestions!).toHaveLength(
      improvement > 0 && coverageRetained ? 1 : 0,
    );
    if (suggestions!.length)
      expect(suggestions![0].improvement).toBe(improvement);
  },
);

it("TC-FR-BAL-07-04 PFCの下限比0.5→0.8を候補評価へ反映する", () => {
  // たんぱく質6.5→10.4%、脂質25%、炭水化物68.5→64.6%。
  const foods = baseFoods.map((f) =>
    food(f.id, { proteinG: 6.5 / 4, carbohydrateG: 68.5 / 4 }),
  );
  const c = candidate("pfc", {
    proteinG: 22.1 / 4,
    carbohydrateG: 52.9 / 4,
    vitaminCMg: (reference.vitaminCMg / reference.energyKcal) * 40,
  });
  const suggestions = suggestSupplements(
    state(),
    new Map(foods.map((f) => [f.id, f])),
    [c],
    data,
  );
  expect(suggestions[0]).toMatchObject({
    improvement: 0.3,
    improvedKeys: ["proteinG"],
  });
});

it.each([
  {
    label: "ビタミンの希釈",
    changes: { vitaminAUg: 0 },
    key: "vitaminAUg",
    improvement: 0.2,
  },
  {
    label: "PFC炭水化物",
    changes: { proteinG: 14 / 4, fatG: 86 / 9, carbohydrateG: 0 },
    key: "carbohydrateG",
    improvement: 0.065,
  },
])(
  "TC-FR-BAL-07-06 $labelの新しい不足も減点する",
  ({ changes, key, improvement }) => {
    const foods = baseFoods.map((f) =>
      food(f.id, {
        vitaminAUg: (reference.vitaminAUg / reference.energyKcal) * 80,
        ...(key === "carbohydrateG"
          ? { proteinG: 14 / 4, fatG: 35 / 9, carbohydrateG: 51 / 4 }
          : {}),
      }),
    );
    const c = candidate("c", { vitaminCMg: 100, ...changes });
    const suggestions = suggestSupplements(
      state(),
      new Map(foods.map((f) => [f.id, f])),
      [c],
      data,
    );
    expect(suggestions[0].newHighKeys).toEqual([]);
    expect(suggestions[0].newLowKeys).toContain(key);
    expect(suggestions[0].improvement).toBe(improvement);
    const harmful = {
      ...c,
      food: food("c", {
        ...changes,
        vitaminCMg: (reference.vitaminCMg / reference.energyKcal) * 50,
      }),
    };
    expect(
      suggestSupplements(
        state(),
        new Map(foods.map((f) => [f.id, f])),
        [harmful],
        data,
      ),
    ).toEqual([]);
  },
);

it("TC-FR-BAL-06-05 現在不明の成分を0として改善量に加算しない", () => {
  const foods = baseFoods.map((f) => food(f.id, { vitaminAUg: null }));
  const c = candidate("c", { vitaminAUg: 0 });
  const suggestions = suggestSupplements(
    state(),
    new Map(foods.map((f) => [f.id, f])),
    [c],
    data,
  );
  expect(suggestions[0]).toMatchObject({
    improvement: 0.2,
    improvedKeys: ["vitaminCMg"],
    newLowKeys: ["vitaminAUg"],
  });
});

it("TC-FR-BAL-06-04 食品番号と表示名が両方一致する最初の行だけを使う", () => {
  const c = candidate("c");
  const current = state();
  current.shoppings[0].items.push({
    id: "different",
    foodId: "c",
    displayName: "別名",
    count: 1,
  });
  expect(suggest([c], current)).toHaveLength(1);
  current.shoppings[0].items.push({
    id: "first",
    foodId: "c",
    displayName: "c",
    count: 999,
  });
  current.shoppings[0].items.push({
    id: "second",
    foodId: "c",
    displayName: "c",
    count: 1,
  });
  expect(suggest([c], current)).toEqual([]);
});

it("TC-FR-BAL-06-03 注意条件が同じなら改善量の大きい候補が先", () => {
  const small = candidate("small", {}, 0);
  const large = candidate(
    "large",
    { vitaminCMg: (reference.vitaminCMg / reference.energyKcal) * 140 },
    100,
  );
  expect(suggest([small, large]).map((c) => c.foodId)).toEqual([
    "large",
    "small",
  ]);
});

it.each([
  {
    name: "3棚",
    categories: ["魚介類", "野菜類", "野菜類", "肉類", "魚介類"],
    expected: ["a", "b", "d"],
  },
  {
    name: "2棚",
    categories: ["魚介類", "魚介類", "野菜類", "野菜類"],
    expected: ["a", "c", "b"],
  },
  {
    name: "分類できない候補はその他",
    categories: ["魚介類", "魚介類", "未知の分類"],
    expected: ["a", "c", "b"],
  },
  {
    name: "1棚",
    categories: ["魚介類", "魚介類", "魚介類"],
    expected: ["a", "b", "c"],
  },
  { name: "候補0件", categories: [], expected: [] },
  { name: "候補1件", categories: ["魚介類"], expected: ["a"] },
  {
    name: "候補2件",
    categories: ["魚介類", "野菜類"],
    expected: ["a", "b"],
  },
])("TC-FR-BAL-08-01 棚の分散と同点順: $name", ({ categories, expected }) => {
  const candidates = categories.map((category, index) =>
    shelfCandidate(String.fromCharCode(97 + index), category, {}, index),
  );
  expect(suggest(candidates).map(({ foodId }) => foodId)).toEqual(expected);
});

it("TC-FR-BAL-08-02 安全性の違う棚は繰り上げず、入力と評価値を変えない", () => {
  const candidates = [
    shelfCandidate("fish1", "魚介類", {}, 0),
    shelfCandidate("fish2", "魚介類", {}, 1),
    shelfCandidate("vegetable", "野菜類", { saltEquivalentG: 10 }, 2),
    shelfCandidate("no-improvement", "肉類", { vitaminCMg: 0 }, 3),
  ];
  const snapshot = structuredClone(candidates);
  const first = suggest(candidates);
  expect(first.map(({ foodId }) => foodId)).toEqual([
    "fish1",
    "fish2",
    "vegetable",
  ]);
  expect(first[2].newHighKeys).toContain("saltEquivalentG");
  expect(suggest([candidates[3]])).toEqual([]);
  expect(first.map(({ improvement }) => improvement)).toEqual(
    suggest(candidates).map(({ improvement }) => improvement),
  );
  expect(candidates).toEqual(snapshot);
});

it.each([
  {
    name: "新しい不足",
    baseChanges: {
      vitaminAUg: (reference.vitaminAUg / reference.energyKcal) * 80,
    },
    safeChanges: {},
    unsafeChanges: { vitaminAUg: 0 },
    warning: "newLowKeys" as const,
    key: "vitaminAUg",
  },
  {
    name: "既存過剰の悪化",
    baseChanges: { saltEquivalentG: 1 },
    safeChanges: { saltEquivalentG: 1 },
    unsafeChanges: { saltEquivalentG: 2 },
    warning: "worsenedHighKeys" as const,
    key: "saltEquivalentG",
  },
])(
  "TC-FR-BAL-08-02 $nameがある別棚を安全な同棚より先にしない",
  ({ baseChanges, safeChanges, unsafeChanges, warning, key }) => {
    const candidates = [
      shelfCandidate("fish1", "魚介類", safeChanges, 0),
      shelfCandidate("fish2", "魚介類", safeChanges, 1),
      shelfCandidate("vegetable", "野菜類", unsafeChanges, 2),
    ];
    const foods = [
      ...baseFoods.map((base) => food(base.id, baseChanges)),
      ...candidates.map(({ food }) => food),
    ];
    const suggestions = suggestSupplements(
      state(),
      new Map(foods.map((item) => [item.id, item])),
      candidates,
      data,
    );
    expect(suggestions.map(({ foodId }) => foodId)).toEqual([
      "fish1",
      "fish2",
      "vegetable",
    ]);
    expect(suggestions[2][warning]).toContain(key);
  },
);
