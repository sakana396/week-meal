import { expect, test, type Page } from "@playwright/test";
import { basketReducer, type AppState } from "../src/core/basket";
import { balanceTargets, referenceFor } from "../src/core/balance";
import { defaultProfile } from "../src/core/profile";
import { nutrientDefinitions } from "../src/data/nutrients";
import type { NutrientsPer100g } from "../src/types";
import { itemRow } from "./helpers";

const initial: AppState = {
  profile: defaultProfile,
  manualFoods: [],
  items: [
    ["06061", "キャベツ"],
    ["06212", "にんじん"],
    ["11115", "豚肉"],
    ["12004", "鶏卵"],
  ].map(([foodId, displayName], index) => ({
    id: `item-${index}`,
    foodId,
    displayName,
    count: 1,
    usedUp: false,
  })),
};
// 各食材10単位では、先頭10173の追加後も不足が残り、残る2候補の順位も変わる。
const rotating: AppState = {
  ...initial,
  items: initial.items.map((item) => ({ ...item, count: 10 })),
};
const panel = (page: Page) =>
  page.getByRole("region", { name: "不足を補う候補" });
const revision = (page: Page) =>
  page.locator("main").getAttribute("data-analysis-revision");
async function seed(page: Page, state = initial) {
  await page.addInitScript((state) => {
    if (!sessionStorage.getItem("suggestions-seeded")) {
      localStorage.setItem(
        "weekmeal:state",
        JSON.stringify({ version: 1, ...state }),
      );
      sessionStorage.setItem("suggestions-seeded", "true");
    }
  }, state);
  await page.goto("/#/");
}
async function ready(page: Page) {
  await expect(panel(page)).toHaveAttribute(
    "data-candidates-revision",
    (await revision(page))!,
  );
}
const saved = (page: Page) =>
  page.evaluate(() => localStorage.getItem("weekmeal:state"));

// 架空の成分値は境界試験専用。製品データとして保存・配布しない。
function syntheticState(kind: "balanced" | "no-candidate"): AppState {
  const profile = { ...defaultProfile, staple: "none" as const };
  const reference = referenceFor(profile);
  const energy = kind === "balanced" ? 100 : 1e15;
  const nutrients = Object.fromEntries(
    nutrientDefinitions.map(({ key }) => [key, 0]),
  ) as NutrientsPer100g;
  for (const { key, rule } of balanceTargets) {
    if (rule.kind === "lower")
      nutrients[key] =
        (reference[rule.reference] * energy) / reference.energyKcal;
  }
  Object.assign(nutrients, {
    energyKcal: energy,
    proteinG: (energy * 0.2) / 4,
    fatG: (energy * 0.25) / 9,
    carbohydrateG: (energy * 0.55) / 4,
  });
  if (kind === "no-candidate") nutrients.vitaminCMg = 0;
  const manualFoods = [0, 1, 2].map((i) => ({
    id: `manual-test-${i}`,
    name: `試験食品${i}`,
    category: "手入力 / 野菜",
    refusePct: 0,
    nutrientsPer100g: { ...nutrients },
  }));
  return {
    profile,
    manualFoods,
    items: manualFoods.map((food) => ({
      id: `item-${food.id}`,
      foodId: food.id,
      displayName: food.name,
      count: 1,
      usedUp: false,
    })),
  };
}

test("TC-FR-BAL-06-06 TC-FR-NUT-06-04 候補表示では登録・判定・保存を変えず、押した1候補だけを登録する", async ({
  page,
}) => {
  await seed(page);
  const balance = page.getByRole("region", { name: "栄養バランスの判定" });
  const beforeBalance = await balance.innerText();
  const beforeSave = await saved(page);
  await ready(page);
  await expect(panel(page).getByRole("button")).toHaveCount(3);
  await expect(panel(page).getByRole("button").first()).toHaveAttribute(
    "data-food-id",
    "08013",
  );
  expect(await balance.innerText()).toBe(beforeBalance);
  expect(await saved(page)).toBe(beforeSave);
  const chosen = { foodId: "08013", displayName: "しいたけ（乾燥）" };
  await panel(page).locator(`[data-food-id="${chosen.foodId}"]`).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: `${chosen.displayName}を登録しました` }),
  ).toBeVisible();
  await expect(itemRow(page, chosen.displayName)).toHaveCount(1);
  await expect(itemRow(page, chosen.displayName)).toContainText("1");
  await expect(balance).not.toHaveText(beforeBalance);
  const expected = basketReducer(initial, {
    type: "register",
    id: "expected",
    foodId: chosen.foodId,
    displayName: chosen.displayName,
  });
  await expect
    .poll(async () => JSON.parse((await saved(page))!).items.length)
    .toBe(expected.items.length);
  const actual = JSON.parse((await saved(page))!) as AppState;
  expect(actual.items.map((item) => ({ ...item, id: "比較対象外" }))).toEqual(
    expected.items.map((item) => ({ ...item, id: "比較対象外" })),
  );
  await page.reload();
  await expect(itemRow(page, chosen.displayName)).toHaveCount(1);
});

test("TC-FR-BAL-06-08 同じ位置の連打で1件だけ登録し、固定枠と残る候補の順序を欄外移動まで保つ", async ({
  page,
}) => {
  await seed(page, rotating);
  await ready(page);
  const slots = panel(page).locator("li");
  const buttons = panel(page).locator("button[data-food-id]");
  const ids = () =>
    buttons.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-food-id")),
    );
  const beforeIds = await ids();
  expect(beforeIds).toEqual(["10173", "08028", "08013"]);
  const originalButtons = await buttons.elementHandles();
  const firstHeight = await slots
    .first()
    .evaluate((element) => element.getBoundingClientRect().height);
  const first = buttons.first();
  await first.scrollIntoViewIfNeeded();
  const box = (await first.boundingBox())!;
  const oldRevision = await revision(page);
  const listHeight = await panel(page)
    .locator("ul")
    .evaluate((element) => element.getBoundingClientRect().height);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
    clickCount: 2,
    delay: 10,
  });
  await expect(
    page.getByRole("heading", { name: "不足を補う候補" }),
  ).toBeFocused();
  await expect(
    panel(page).getByText(
      "候補欄の外へポインターを動かすと、更新した候補を表示します",
    ),
  ).toBeVisible();
  await expect(panel(page)).toHaveAttribute(
    "data-candidates-revision",
    oldRevision!,
  );
  for (const button of await panel(page)
    .getByRole("button", { includeHidden: true })
    .all())
    await expect(button).toBeDisabled();
  expect(await ids()).toEqual(beforeIds);
  // 食品番号 key によって同じ DOM と枠を保持し、消えた先頭だけを隠す。
  for (let i = 0; i < originalButtons.length; i++) {
    expect(
      await buttons
        .nth(i)
        .evaluate(
          (element, original) => element === original,
          originalButtons[i],
        ),
    ).toBe(true);
  }
  await expect(slots.first()).toHaveCSS("visibility", "hidden");
  expect(
    await slots
      .first()
      .evaluate((element) => element.getBoundingClientRect().height),
  ).toBe(firstHeight);
  await expect(slots.nth(1)).toBeVisible();
  await expect(slots.nth(2)).toBeVisible();
  // 再計算後、元の座標への連打でも空き枠へ次の候補を詰めない。
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
    clickCount: 2,
    delay: 250,
  });
  expect(await ids()).toEqual(beforeIds);
  expect(
    await panel(page)
      .locator("ul")
      .evaluate((element) => element.getBoundingClientRect().height),
  ).toBe(listHeight);
  expect(JSON.parse((await saved(page))!).items).toHaveLength(
    rotating.items.length + 1,
  );
  // DES-UI-42: PC のマウスを欄外へ移し、固定した並びを解放する。
  await page.mouse.move(0, 0);
  await ready(page);
  expect(await ids()).toEqual(["08001", "08013", "08028"]);
  await expect(buttons.first()).toBeEnabled();
});

test("TC-FR-BAL-06-08 再計算前後に通知と空き枠を押しても同じ見出しのフォーカスを保つ", async ({
  page,
}) => {
  await seed(page);
  await ready(page);
  const first = panel(page).getByRole("button").first();
  await first.scrollIntoViewIfNeeded();
  const box = (await first.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const heading = page.getByRole("heading", { name: "不足を補う候補" });
  const originalHeading = (await heading.elementHandle())!;
  const oldRevision = await revision(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.mouse.click(x, y);
  await expect(heading).toBeFocused();
  await expect(
    panel(page).getByText("候補を計算中", { exact: true }),
  ).toBeVisible();
  for (const button of await panel(page).getByRole("button").all())
    await expect(button).toBeDisabled();
  // clickCount: 2 はここでは2度目の down/up の属性。再計算との競合をなくす。
  await page.mouse.down({ clickCount: 2 });
  await page.mouse.up({ clickCount: 2 });
  await expect(heading).toBeFocused();
  // 元の座標の移動量は画面幅や判定欄の高さでも変わるため、通知自体も押す。
  const notice = panel(page).locator('p[role="status"]').last();
  await notice.click();
  await expect(heading).toBeFocused();
  await page.clock.runFor(100);
  await expect(
    panel(page).getByText(
      "候補欄の外へポインターを動かすと、更新した候補を表示します",
    ),
  ).toBeVisible();
  await expect(heading).toBeFocused();
  expect(
    await heading.evaluate(
      (element, original) => element === original,
      originalHeading,
    ),
  ).toBe(true);
  // 計算後も通知と消えた候補の空き枠で維持する。
  await notice.click();
  await expect(heading).toBeFocused();
  await panel(page)
    .locator("ul")
    .click({ position: { x: 8, y: 8 } });
  await expect(heading).toBeFocused();
  await expect(panel(page)).toHaveAttribute(
    "data-candidates-revision",
    oldRevision!,
  );
  expect(JSON.parse((await saved(page))!).items).toHaveLength(
    initial.items.length + 1,
  );
  await page.mouse.move(0, 0);
  await expect(panel(page)).toHaveCount(0);
});

test("TC-FR-BAL-06-08 キーボードで登録し、計算待ちの個数変更では最新revisionだけを反映する", async ({
  page,
}) => {
  const state = { ...initial, items: initial.items.slice(1) };
  await seed(page, state);
  await ready(page);
  // タイマーを止め、未実行の古い候補予約が残る間に次の操作をする。
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const row = itemRow(page, "にんじん");
  await row.getByRole("button", { name: "にんじんを 0.5 増やす" }).click();
  const previous = await revision(page);
  await row.getByRole("button", { name: "にんじんを 0.5 増やす" }).click();
  expect(await revision(page)).not.toBe(previous);
  await page.clock.runFor(100);
  await ready(page);
  await expect(row).toContainText("2 本");
  await page.mouse.move(0, 0);
  const selected = panel(page).getByRole("button").first();
  const foodId = (await selected.getAttribute("data-food-id"))!;
  const name = (await selected.locator("strong").textContent())!;
  const before = JSON.parse((await saved(page))!) as AppState;
  await selected.focus();
  await selected.press("Enter");
  await page.clock.runFor(100);
  await ready(page);
  await expect(
    page.getByRole("heading", { name: "不足を補う候補" }),
  ).toBeFocused();
  const expected = basketReducer(before, {
    type: "register",
    id: "expected",
    foodId,
    displayName: name,
  });
  expect(
    JSON.parse((await saved(page))!).items.map(
      (item: AppState["items"][number]) => ({ ...item, id: "比較対象外" }),
    ),
  ).toEqual(expected.items.map((item) => ({ ...item, id: "比較対象外" })));
});

test("TC-FR-BAL-06-07 候補なしを説明し、未判定・不足なしでは候補欄を出さない", async ({
  page,
}) => {
  const state = syntheticState("no-candidate");
  await seed(page, state);
  await ready(page);
  await expect(
    panel(page).getByText("今の条件で不足を減らせる候補がありません"),
  ).toBeVisible();
  for (const next of [
    syntheticState("balanced"),
    { ...initial, items: initial.items.slice(0, 2) },
  ]) {
    await page.evaluate(
      (next) =>
        localStorage.setItem(
          "weekmeal:state",
          JSON.stringify({ version: 1, ...next }),
        ),
      next,
    );
    await page.reload();
    await expect(panel(page)).toHaveCount(0);
  }
});

test("TC-FR-BAL-06-08 削除の取り消し表示中に候補を登録しても見出しへフォーカスする", async ({
  page,
}) => {
  await seed(page, rotating);
  await ready(page);
  await itemRow(page, "キャベツ")
    .getByRole("button", { name: "キャベツを削除" })
    .click();
  await expect(
    page.getByRole("button", { name: "元に戻す", exact: true }),
  ).toBeFocused();
  await ready(page);
  await panel(page).getByRole("button").first().click();
  await expect(
    page.getByRole("heading", { name: "不足を補う候補" }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "元に戻す", exact: true }),
  ).toHaveCount(0);
});
