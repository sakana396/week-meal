import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AnalysisResult } from "../core/analyze";
import { defaultProfile } from "../core/profile";
import { BalancePanel } from "./components/BalancePanel";
import { BalanceDetailScreen } from "./screens/BalanceDetailScreen";
import { expect, it } from "vitest";
import type { BalanceResult } from "../core/balance";
import { balanceTone } from "./balanceTone";

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

it.each([
  [0, "rgb(255, 0, 0)"],
  [0.5, "rgb(255, 128, 0)"],
  [0.699999, "rgb(255, 178, 0)"],
  [1, "rgb(255, 255, 0)"],
  [2, "rgb(255, 255, 0)"],
] as const)("TC-FR-UI-06-01 下限比 %s の不足色は %s", (ratio, expected) => {
  expect(balanceTone(result({ sufficiency: ratio }))).toBe(expected);
  expect(
    balanceTone(
      result({
        key: "proteinG",
        sufficiency: null,
        pfcPct: ratio * 15,
        pfcRange: [15, 20],
      }),
    ),
  ).toBe(expected);
});

it.each([
  [result({ status: "high", key: "saltEquivalentG", sufficiency: null }), null],
  [result({ status: "ok", sufficiency: 0 }), null],
  [result({ status: "unknown", sufficiency: 0 }), null],
  [result({ key: "saltEquivalentG" }), null],
  ...[null, -1, NaN, Infinity, -Infinity].map((sufficiency) => [
    result({ sufficiency }),
    null,
  ]),
  [result({ key: "proteinG", pfcPct: 10, pfcRange: [0, 20] }), null],
] as [BalanceResult, string | null][])(
  "TC-FR-UI-06-02 TC-FR-BAL-07-07 状態と異常な下限比を先に確認する %j",
  (input, expected) => {
    const before = { ...input };
    expect(balanceTone(input)).toBe(expected);
    expect(input).toEqual(before);
  },
);

// W3C WCAG 2.2 の相対輝度とコントラスト比。一次資料と式は TST-IT03 2.3 に記録。
function luminance([r, g, b]: number[]): number {
  const [red, green, blue] = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

it.each([
  ["塩分", { key: "saltEquivalentG", pfcRange: null }, "sufficiency", 1.3],
  [
    "PFC",
    {
      key: "proteinG",
      sufficiency: null,
      pfcRange: [15, 20] as [number, number],
    },
    "pfcPct",
    20,
  ],
] as const)(
  "TC-FR-UI-06-04 %s の上限超過比を色へ変換する",
  (_name, changes, field, upper) => {
    for (const [ratio, expected] of [
      [0, "rgb(216, 180, 254)"],
      [0.25, "rgb(192, 133, 251)"],
      [0.5, "rgb(168, 85, 247)"],
      [0.75, "rgb(168, 85, 247)"],
    ] as const) {
      const input = result({
        status: "high",
        ...changes,
        [field]: upper * (1 + ratio),
      });
      const before = structuredClone(input);
      expect(balanceTone(input)).toBe(expected);
      expect(input).toEqual(before);
    }
  },
);

it.each([
  result({ status: "high", key: "saltEquivalentG", sufficiency: null }),
  result({ status: "high", key: "saltEquivalentG", sufficiency: Infinity }),
  result({ status: "high", key: "proteinG", pfcPct: 30, pfcRange: [15, 0] }),
  result({ status: "high", key: "proteinG", pfcPct: NaN, pfcRange: [15, 20] }),
])("TC-FR-UI-06-04 判定不能な過剰値には警告色を付けない %j", (input) => {
  expect(balanceTone(input)).toBeNull();
});

it("TC-NFR-07-01 使用する赤〜黄256色と上限ちょうどの紫は黒文字と4.5:1以上", () => {
  const colors = Array.from({ length: 256 }, (_, green) => {
    const tone = balanceTone(result({ sufficiency: green / 255 }));
    expect(tone).toBe(`rgb(255, ${green}, 0)`);
    return [255, green, 0];
  });
  expect(
    balanceTone(
      result({ status: "high", key: "saltEquivalentG", sufficiency: 1.3 }),
    ),
  ).toBe("rgb(216, 180, 254)");
  colors.push([216, 180, 254]);
  const contrasts = colors.map((color) => (luminance(color) + 0.05) / 0.05);
  for (const contrast of contrasts)
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  expect(Math.min(...contrasts)).toBeCloseTo(5.252, 3);
  expect(contrasts[255]).toBeCloseTo(19.556, 3);
  expect(contrasts[256]).toBeCloseTo(11.879, 3);
});

it("TC-NFR-07-02 紫の全256段階と不足の全256段階は黒文字と4.5:1以上", () => {
  for (let step = 0; step < 256; step += 1) {
    for (const tone of [
      balanceTone(result({ sufficiency: step / 255 })),
      balanceTone(
        result({
          status: "high",
          key: "saltEquivalentG",
          sufficiency: 1.3 * (1 + step / 510),
        }),
      ),
    ]) {
      expect(tone).not.toBeNull();
      const channels = tone?.match(/\d+/g)?.map(Number);
      expect(channels).toHaveLength(3);
      expect((luminance(channels ?? []) + 0.05) / 0.05).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  }
});

it("TC-FR-UI-06-02 比のない不足でも両画面に文字と栄養素名を残す", () => {
  const analysis: AnalysisResult = {
    kind: "judged",
    results: [result({ sufficiency: null })],
    pfc: null,
    approximateItems: [],
    noDataItems: [],
    details: [],
  };
  const props = { analysis, profile: defaultProfile };
  for (const element of [
    createElement(BalancePanel, props),
    createElement(BalanceDetailScreen, { ...props, navigate: () => {} }),
  ]) {
    const markup = renderToStaticMarkup(element);
    expect(markup).toContain('class="balance-status">不足</span>');
    expect(markup).toContain("ビタミンC");
  }
});
