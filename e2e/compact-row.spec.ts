import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { itemRow, registerFoods } from "./helpers";

test("TC-FR-UI-10-01 行の開閉と重量の検証", async ({ page }) => {
  await registerFoods(page, ["にんじん"]);
  await page.goto("#/");
  const row = itemRow(page, "にんじん");
  const toggle = row.locator("button.item-name");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await row.getByRole("button", { name: "にんじんを 0.5 増やす" }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await row.getByRole("button", { name: "にんじんを g に切り替える" }).click();
  const input = row.getByRole("textbox", { name: "にんじんの重さ" });
  await input.fill("0");
  await row.getByRole("button", { name: "にんじんの詳細を閉じる" }).click();
  await expect(input).toBeFocused();
  await expect(row.getByRole("alert")).toBeVisible();
  await input.fill("200");
  await row.getByRole("button", { name: "にんじんの詳細を閉じる" }).click();
  await expect(row).toContainText("200 g");
});

test("TC-FR-UI-10-02 行の操作領域と横幅", async ({ page }) => {
  await registerFoods(page, ["にんじん"]);
  await page.goto("#/");
  const row = itemRow(page, "にんじん");
  for (const button of await row.getByRole("button").all()) {
    const box = await button.boundingBox();
    expect(box && box.width >= 44 && box.height >= 44).toBeTruthy();
  }
  await row.getByRole("button", { name: "にんじんの詳細を開く" }).click();
  for (const button of await row.getByRole("button").all()) {
    const box = await button.boundingBox();
    expect(box && box.width >= 44 && box.height >= 44).toBeTruthy();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("TC-FR-UI-10-03 キーボードで詳細を開閉する", async ({ page }) => {
  await registerFoods(page, ["にんじん"]);
  await page.goto("#/");
  const row = itemRow(page, "にんじん");
  const toggle = row.locator("button.item-name");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("TC-FR-UI-10-03 閉じた詳細はフォーカスできず操作後も正しい状態を示す", async ({
  page,
}) => {
  await registerFoods(page, ["にんじん"]);
  await page.goto("#/");
  const row = itemRow(page, "にんじん");
  const toggle = row.locator("button.item-name");
  await expect(toggle).not.toHaveAttribute("aria-controls");
  await expect(row.locator(".item-details")).toHaveCount(0);
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const detailsId = await toggle.getAttribute("aria-controls");
  expect(detailsId).toBeTruthy();
  await expect(page.locator(`[id="${detailsId}"]`)).toBeVisible();
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).not.toHaveAttribute("aria-controls");
  await expect(page.locator(`[id="${detailsId}"]`)).toHaveCount(0);
});

test("TC-FR-UI-10-02 TC-FR-UI-10-03 同名行の詳細名と操作名を区別する", async ({
  page,
}) => {
  await page.goto("#/");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("weekmeal:state")))
    .not.toBeNull();
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("weekmeal:state")!);
    state.shoppings = [
      {
        id: "sample",
        date: "2026-11-24",
        origin: "normal",
        items: [
          {
            id: "loin",
            foodId: "11123",
            displayName: "豚肉",
            quantity: { kind: "count", count: 1 },
          },
          {
            id: "belly",
            foodId: "11129",
            displayName: "豚肉",
            quantity: { kind: "count", count: 1 },
          },
        ],
      },
    ];
    localStorage.setItem("weekmeal:state", JSON.stringify(state));
  });
  await page.reload();
  const rows = page.locator(".item-row");
  for (const [index, detail] of ["ロース", "ばら"].entries()) {
    const row = rows.nth(index);
    const toggle = row.locator("button.item-name");
    await expect(toggle.locator("small")).toContainText(detail);
    const name = await toggle.getAttribute("aria-label");
    expect(name).toContain(detail);
    const fullName = name!.replace("の詳細を開く", "");
    await expect(
      row.getByRole("button", { name: `${fullName}を 0.5 増やす` }),
    ).toBeVisible();
    await expect(
      row.getByRole("button", { name: `${fullName}を 0.5 減らす` }),
    ).toBeVisible();
    const box = await toggle.boundingBox();
    expect(box && box.width >= 44 && box.height >= 44).toBeTruthy();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

for (const screen of ["home", "history"] as const) {
  test(`TC-FR-UI-10-01 TC-FR-UI-10-03 ${screen} の重量行を削除して復元する`, async ({
    page,
  }) => {
    await page.goto("#/");
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("weekmeal:state")))
      .not.toBeNull();
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("weekmeal:state")!);
      const item = {
        id: "weight",
        foodId: "06212",
        displayName: "にんじん",
        quantity: { kind: "weight", grams: 200, unit: "g" },
      };
      state.shoppings = [
        { id: "old", date: "2026-10-01", origin: "normal", items: [item] },
        {
          id: "new",
          date: "2026-10-02",
          origin: "normal",
          items: [{ ...item, id: "new-weight" }],
        },
      ];
      localStorage.setItem("weekmeal:state", JSON.stringify(state));
    });
    await page.reload();
    if (screen === "history") await page.goto("#/history/old");
    const row = itemRow(page, "にんじん");
    await expect(
      row.getByRole("button", { name: /にんじんを 0\.5 (増やす|減らす)/ }),
    ).toHaveCount(0);
    await row.getByRole("button", { name: "にんじんの詳細を開く" }).click();
    await row
      .getByRole("button", { name: "にんじんを kg に切り替える" })
      .click();
    const input = row.getByRole("textbox", { name: "にんじんの重さ" });
    await expect(input).toBeFocused();
    await input.fill("0");
    await row.getByRole("button", { name: "にんじんの詳細を閉じる" }).click();
    await expect(input).toBeFocused();
    await expect(row.getByRole("alert")).toBeVisible();
    await input.fill("0.2");
    await row
      .getByRole("button", { name: "にんじんを g に切り替える" })
      .click();
    await expect(input).toBeFocused();
    await row.getByRole("button", { name: "にんじんを削除" }).click();
    const undo = page.getByRole("button", { name: "元に戻す" });
    await expect(undo).toBeFocused();
    await undo.click();
    const toggle = row.getByRole("button", { name: "にんじんの詳細を開く" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
    await expect(row).toContainText("200 g");
    await expect
      .poll(() =>
        page.evaluate(
          (index) => {
            const state = JSON.parse(localStorage.getItem("weekmeal:state")!);
            return state.shoppings[index].items.length;
          },
          screen === "home" ? 0 : 1,
        ),
      )
      .toBe(1);
  });
}

test("TC-FR-UI-10-03 閉じた行と開いた行の axe を検査する", async ({ page }) => {
  await registerFoods(page, ["にんじん"]);
  await page.goto("#/");
  for (const expanded of [false, true]) {
    if (expanded)
      await itemRow(page, "にんじん")
        .getByRole("button", { name: "にんじんの詳細を開く" })
        .click();
    const result = await new AxeBuilder({ page }).analyze();
    expect(
      result.violations.filter(
        ({ impact }) => impact === "critical" || impact === "serious",
      ),
    ).toEqual([]);
  }
});

test("TC-FR-UI-10-02 長い名前と量の操作領域と省略表示", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("#/");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("weekmeal:state")))
    .not.toBeNull();
  const name = "目安重量の定義がない長い食材名の測定用試料";
  await page.evaluate((name) => {
    const state = JSON.parse(localStorage.getItem("weekmeal:state")!);
    state.manualFoods = [
      {
        id: "manual-1",
        name,
        category: "手入力",
        refusePct: null,
        nutrientsPer100g: {},
      },
    ];
    state.shoppings = [
      {
        id: "long",
        date: "2026-11-24",
        origin: "normal",
        items: [
          {
            id: "long-item",
            foodId: "manual-1",
            displayName: name,
            quantity: { kind: "count", count: 998.5 },
          },
        ],
      },
    ];
    localStorage.setItem("weekmeal:state", JSON.stringify(state));
  }, name);
  await page.reload();
  const row = page.locator(".item-row");
  const toggle = row.getByRole("button", { name: `${name}の詳細を開く` });
  await expect(row).toContainText("998.5 つ（概算）");
  const text = toggle.locator("strong");
  expect(
    await text.evaluate(
      (el) =>
        el.scrollWidth > el.clientWidth &&
        getComputedStyle(el).textOverflow === "ellipsis",
    ),
  ).toBe(true);
  for (const expanded of [false, true]) {
    if (expanded) {
      await toggle.click();
      await expect(row.locator(".item-full-name")).toHaveText(name);
    }
    for (const button of await row.getByRole("button").all()) {
      const box = await button.boundingBox();
      expect(box && box.width >= 44 && box.height >= 44).toBeTruthy();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
