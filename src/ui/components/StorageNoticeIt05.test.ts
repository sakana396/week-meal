import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StorageNotice } from "./StorageNotice";

describe("保存の通知（DES-STO-14）", () => {
  it("TC-NFR-12-39 買い物と食材の件数を分けて知らせる", () => {
    const html = renderToStaticMarkup(
      createElement(StorageNotice, {
        issue: { droppedItems: 2, droppedShoppings: 1, profileReset: false },
        backedUp: true,
        available: true,
        saveFailed: false,
      }),
    );
    expect(html).toContain("買い物 1 件・食材 2 件を読み込めませんでした");
  });
  it("TC-NFR-12-39 一部破棄の退避失敗は保存を止めた理由を知らせる", () => {
    const html = renderToStaticMarkup(
      createElement(StorageNotice, {
        issue: { droppedItems: 1, droppedShoppings: 0, profileReset: false },
        backedUp: false,
        available: false,
        saveFailed: false,
      }),
    );
    expect(html).toContain(
      "読み込めなかったデータを退避できなかったので、保存を止めています",
    );
  });
});
