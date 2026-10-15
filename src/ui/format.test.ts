import { describe, expect, it } from "vitest";
import { formatCount, parseManualValue } from "./format";

describe("parseManualValue（DES-UI-35）", () => {
  it.each([
    ["TC-FR-ING-08-06 数を読み、小数第 2 位で丸める", "12.345", 12.35],
    ["TC-FR-ING-08-07 空は null（データなし。境界）", "  ", null],
    ["TC-FR-ING-08-08 数でなければ null（異常）", "たくさん", null],
    ["TC-FR-ING-08-09 負の数は null（異常）", "-3", null],
    ["TC-FR-ING-08-10 0 は 0（境界）", "0", 0],
  ])("%s", (_title, input, expected) => {
    expect(parseManualValue(input)).toBe(expected);
  });
});

describe("formatCount", () => {
  it.each([
    [1, "1"],
    [1.5, "1.5"],
  ])("個数 %s を %s と表す", (count, expected) => {
    expect(formatCount(count)).toBe(expected);
  });
});
