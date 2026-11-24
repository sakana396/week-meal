import { expect, test } from "@playwright/test";
import { initialAppState } from "../src/core/basket";
import { serializeState } from "../src/core/storage";

test("TC-FR-BAL-09-02 ホームと前の買い物の案内と境界", async ({ page }) => {
  await page.goto("#/");
  const foods = [
    ["06212", "にんじん"],
    ["06061", "キャベツ"],
    ["11115", "豚肉"],
    ["12004", "鶏卵"],
    ["06211", "玉ねぎ"],
  ];
  for (const staple of ["rice", "none"] as const) {
    for (const count of [2, 3, 4, 5]) {
      const items = (shoppingId: string) =>
        foods.slice(0, count).map(([foodId, displayName], index) => ({
          id: `${shoppingId}-${index}`,
          foodId,
          displayName,
          quantity: { kind: "count" as const, count: 1 },
        }));
      const saved = serializeState({
        ...initialAppState,
        profile: { ...initialAppState.profile, staple },
        shoppings: [
          {
            id: "old",
            date: "2026-10-01",
            origin: "normal",
            items: items("old"),
          },
          {
            id: "new",
            date: "2026-10-02",
            origin: "normal",
            items: items("new"),
          },
        ],
      });
      await page.evaluate(
        (value) => localStorage.setItem("weekmeal:state", value),
        saved,
      );
      for (const route of ["#/", "#/history/old"]) {
        await page.goto(route);
        await page.reload();
        const panel = page.getByRole("region", { name: "栄養バランスの判定" });
        const notice = panel
          .locator("h3 + p")
          .filter({ hasText: "登録した食材が少ないため" });
        if (count === 3 || count === 4) {
          await expect(notice).toHaveText(
            staple === "none"
              ? "登録した食材が少ないため、判定は登録した食材に基づく目安です。"
              : "登録した食材が少ないため、判定は登録した食材と設定した主食に基づく目安です。",
          );
        } else {
          await expect(notice).toHaveCount(0);
        }
      }
    }
  }
});
