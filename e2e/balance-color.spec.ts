import { expect, test, type Locator, type Page } from "@playwright/test";
import { balanceTargets, referenceFor } from "../src/core/balance";
import type { AppState } from "../src/core/basket";
import { defaultProfile } from "../src/core/profile";
import { serializeState } from "../src/core/storage";
import { nutrientDefinitions } from "../src/data/nutrients";
import type { FoodItem, NutrientsPer100g } from "../src/types";
import { openTab } from "./helpers";

// 架空の成分値は色と判定境界の検査専用。実際の食品データには使わない。
function fixture(vitaminRatio: number, proteinRatio: number): AppState {
  const profile = { ...defaultProfile, staple: "none" as const };
  const reference = referenceFor(profile);
  const nutrients = Object.fromEntries(
    nutrientDefinitions.map(({ key }) => [key, 0]),
  ) as NutrientsPer100g;
  for (const { key, rule } of balanceTargets) {
    if (rule.kind === "lower") {
      nutrients[key] = (reference[rule.reference] / reference.energyKcal) * 100;
    }
  }
  const manualFoods: FoodItem[] = [1, 2, 3].map((index) => ({
    id: `manual-color-${index}`,
    name: `色検査${index}`,
    category: "手入力 / 野菜",
    refusePct: 0,
    nutrientsPer100g: {
      ...nutrients,
      energyKcal: 100,
      proteinG: (reference.proteinPctRange[0] * proteinRatio) / 4,
      fatG: 25 / 9,
      // PFC は 3 成分の合計を分母にするので、合計を 100 kcal に保つ。
      carbohydrateG:
        (100 - reference.proteinPctRange[0] * proteinRatio - 25) / 4,
      vitaminCMg:
        (reference.vitaminCMg / reference.energyKcal) * 100 * vitaminRatio,
      saltEquivalentG: (reference.saltGMax / reference.energyKcal) * 131,
      fiberG: 0,
      vitaminDUg: null,
    },
  }));
  return {
    profile,
    manualFoods,
    shoppings: [
      {
        id: "s",
        date: "2026-10-31",
        origin: "normal",
        items: manualFoods.map((food) => ({
          id: food.id,
          foodId: food.id,
          displayName: food.name,
          count: 1,
        })),
      },
    ],
  };
}

async function loadFixture(
  page: Page,
  vitaminRatio = 0.699999,
  proteinRatio = 0.99999,
) {
  await page.addInitScript(
    (saved) => {
      localStorage.setItem("weekmeal:state", saved);
    },
    serializeState(fixture(vitaminRatio, proteinRatio)),
  );
  await page.goto("/#/");
}

function row(page: Page, name: string) {
  return page
    .locator(".detail-row")
    .filter({ has: page.getByText(name, { exact: true }) });
}

async function expectBadge(target: Locator, label: string, color: string) {
  const badge = target.locator(".balance-status");
  await expect(badge).toHaveText(label);
  await expect(badge).toHaveCSS("background-color", color);
  await expect(badge).toHaveCSS("color", "rgb(0, 0, 0)");
}

for (const [ratio, proteinRatio, low] of [
  [0.699999, 0.99999, true],
  [0.7, 1, false],
  [0.700001, 1.00001, false],
] as const) {
  test(`TC-FR-UI-06-03 下限規則${ratio}とPFC下限比${proteinRatio}の境界・中立色`, async ({
    page,
  }) => {
    await loadFixture(page, ratio, proteinRatio);
    const home = page.getByRole("region", { name: "栄養バランスの判定" });
    await expect(home).toHaveCSS("border-color", "rgb(216, 210, 199)");
    await expect(home).toHaveCSS(
      "background-color",
      "rgba(255, 255, 255, 0.78)",
    );
    for (const [name, color] of [
      ["ビタミンC", "rgb(255, 178, 0)"],
      ["たんぱく質", "rgb(255, 255, 0)"],
    ]) {
      const flagged = home
        .locator(".balance-list li")
        .filter({ hasText: name });
      if (low) await expectBadge(flagged, "不足", color);
      else await expect(flagged).toHaveCount(0);
    }
    await expectBadge(
      home.locator(".balance-list li").filter({ hasText: "食塩相当量" }),
      "過剰",
      "rgb(216, 180, 254)",
    );
    await openTab(page, "詳細");
    await expectBadge(
      row(page, "ビタミンC"),
      low ? "不足" : "適正",
      low ? "rgb(255, 178, 0)" : "rgb(243, 244, 246)",
    );
    await expectBadge(
      row(page, "たんぱく質"),
      low ? "不足" : "適正",
      low ? "rgb(255, 255, 0)" : "rgb(243, 244, 246)",
    );
    await expectBadge(row(page, "食塩相当量"), "過剰", "rgb(216, 180, 254)");
    await expectBadge(row(page, "ビタミンD"), "不明", "rgb(243, 244, 246)");
    await expectBadge(row(page, "脂質"), "適正", "rgb(243, 244, 246)");
    for (const selector of [
      ".detail-fill",
      ".detail-value",
      ".detail-band",
      ".detail-bar",
    ]) {
      const elements = page.locator(selector);
      expect(await elements.count()).toBeGreaterThan(0);
      for (const element of await elements.all()) {
        await expect(element).toHaveCSS(
          "background-color",
          selector === ".detail-fill" || selector === ".detail-value"
            ? "rgb(107, 114, 128)"
            : "rgb(229, 231, 235)",
        );
      }
    }
  });
}

test("TC-NFR-07-01 強制カラーでも不足・過剰と栄養素名が読める", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active" });
  await loadFixture(page);
  const home = page.getByRole("region", { name: "栄養バランスの判定" });
  for (const [name, label] of [
    ["ビタミンC", "不足"],
    ["食塩相当量", "過剰"],
  ]) {
    const target = home.locator(".balance-list li").filter({ hasText: name });
    await expect(target).toContainText(name);
    await expect(target.locator(".balance-status")).toHaveText(label);
    await expect(target).toBeVisible();
  }
  await openTab(page, "詳細");
  for (const [name, label] of [
    ["ビタミンC", "不足"],
    ["食塩相当量", "過剰"],
    ["ビタミンD", "不明"],
  ]) {
    const target = row(page, name);
    await expect(target.getByText(name, { exact: true })).toBeVisible();
    await expect(target.locator(".balance-status")).toHaveText(label);
    await expect(target.locator(".balance-status")).toBeVisible();
  }
});
