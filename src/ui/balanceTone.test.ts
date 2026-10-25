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
  [result({ status: "high", sufficiency: null }), "#d8b4fe"],
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

it("TC-NFR-07-01 使用する赤〜黄256色と紫は黒文字と4.5:1以上", () => {
  const colors = Array.from({ length: 256 }, (_, green) => {
    const tone = balanceTone(result({ sufficiency: green / 255 }));
    expect(tone).toBe(`rgb(255, ${green}, 0)`);
    return [255, green, 0];
  });
  expect(balanceTone(result({ status: "high" }))).toBe("#d8b4fe");
  colors.push([216, 180, 254]);
  const contrasts = colors.map((color) => (luminance(color) + 0.05) / 0.05);
  for (const contrast of contrasts)
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  expect(Math.min(...contrasts)).toBeCloseTo(5.252, 3);
  expect(contrasts[255]).toBeCloseTo(19.556, 3);
  expect(contrasts[256]).toBeCloseTo(11.879, 3);
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
