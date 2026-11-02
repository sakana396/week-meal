import { expect, test, type Page } from "@playwright/test";
import { initialAppState } from "../src/core/basket";
import { itemRow } from "./helpers";

/** 確認済みの食材を保存値から読む（DES-RCP-05）。 */
async function savedItems(page: Page, shoppingId?: string) {
  return page.evaluate((id) => {
    const saved = JSON.parse(localStorage.getItem("weekmeal:state") ?? "{}");
    const shopping = id
      ? saved.shoppings?.find((entry: { id: string }) => entry.id === id)
      : saved.shoppings?.[0];
    return shopping?.items ?? [];
  }, shoppingId);
}

async function paste(page: Page, value: string) {
  await page.getByLabel("レシートの食材のテキスト").fill(value);
  await page.getByRole("button", { name: "読み取る" }).click();
}

test("TC-FR-RCP-01-03 登録画面からコピー・確認・一括登録し、外部へ送らない", async ({
  page,
  baseURL,
}) => {
  const origin = new URL(baseURL ?? "").origin;
  const transfers: string[] = [];
  page.on("request", (request) => {
    if (
      ["fetch", "xhr"].includes(request.resourceType()) ||
      new URL(request.url()).origin !== origin
    )
      transfers.push(request.url());
  });
  await page.goto("#/register");
  await page.getByRole("button", { name: "レシートから登録" }).click();
  await expect(page).toHaveURL(/#\/receipt$/);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "指示文をコピー" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "食材名,量",
  );
  await paste(page, "にんじん,2\n鶏卵,1\n未知の菓子,1");
  await expect(
    page.getByRole("heading", { name: "3. 登録内容を確認" }),
  ).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "登録しない物 1 件" }),
  ).toBeVisible();
  await expect(page.getByText("未知の菓子,1", { exact: true })).toBeVisible();
  const rows = page.locator(".receipt-review-row");
  await rows.first().getByRole("textbox", { name: "量" }).fill("3");
  await rows.nth(1).getByRole("checkbox").uncheck();
  await page.getByRole("button", { name: "1 件を登録" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(
    page.getByRole("status").filter({
      hasText: "レシートから 1 件を登録しました（登録しない物 1 件）",
    }),
  ).toBeVisible();
  await expect(
    itemRow(page, "にんじん").getByRole("group", { name: "にんじんの個数" }),
  ).toContainText("3");
  await expect(itemRow(page, "鶏卵")).toHaveCount(0);
  await expect.poll(() => savedItems(page)).toHaveLength(1);
  expect(transfers).toEqual([]);
});

test("TC-FR-RCP-01-04 買い物がないとき今日の買い物を作る", async ({ page }) => {
  await page.goto("#/receipt");
  await paste(page, "にんじん,1");
  await page.getByRole("button", { name: "1 件を登録" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(itemRow(page, "にんじん")).toHaveCount(1);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("weekmeal:state") ?? "{}").shoppings
            ?.length,
      ),
    )
    .toBe(1);
  const today = await page.evaluate(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("weekmeal:state") ?? "{}").shoppings[0]
          .date,
    ),
  ).toBe(today);
});

test("TC-FR-RCP-01-05 食材名を選び直し、一覧にない名前を拒む", async ({
  page,
}) => {
  await page.goto("#/receipt");
  await paste(page, "にんじん,1");
  const name = page
    .locator(".receipt-review-row")
    .getByRole("combobox", { name: "食材名" });
  await name.fill("存在しない食材");
  await expect(page.getByRole("button", { name: "1 件を登録" })).toBeDisabled();
  await name.fill("キャベツ");
  const quantity = page
    .locator(".receipt-review-row")
    .getByRole("textbox", { name: "量" });
  await quantity.fill("0");
  await expect(page.getByRole("button", { name: "1 件を登録" })).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("0.5 刻み");
  await expect(
    page
      .locator(".receipt-review-row")
      .getByRole("button", { name: "g", exact: true }),
  ).toBeDisabled();
  await quantity.fill("1");
  await page.getByRole("button", { name: "1 件を登録" }).click();
  await expect(itemRow(page, "キャベツ")).toHaveCount(1);
});

test("TC-FR-RCP-02-02 クリップボードがないとき指示文を選んで示す", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto("#/receipt");
  await page.getByRole("button", { name: "指示文をコピー" }).click();
  const fallback = page.getByRole("textbox", { name: "コピー用の指示文" });
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveJSProperty("readOnly", true);
  await expect(page.getByRole("status")).toContainText("長押ししてコピー");
  expect(
    await fallback.evaluate(
      (element) =>
        element instanceof HTMLTextAreaElement &&
        element.selectionStart === 0 &&
        element.selectionEnd === element.value.length,
    ),
  ).toBe(true);
});

test("TC-FR-RCP-01-03 前の買い物から開くとその買い物へ登録する", async ({
  page,
}) => {
  await page.goto("#/");
  await page.evaluate(
    (state) =>
      localStorage.setItem(
        "weekmeal:state",
        JSON.stringify({ version: 4, ...state }),
      ),
    {
      ...initialAppState,
      shoppings: [
        { id: "old", date: "2026-10-01", origin: "normal", items: [] },
        { id: "new", date: "2026-10-02", origin: "normal", items: [] },
      ],
    },
  );
  await page.reload();
  await page.goto("#/register?shopping=old");
  await page.getByRole("button", { name: "レシートから登録" }).click();
  await expect(page).toHaveURL(/#\/receipt\?shopping=old$/);
  await paste(page, "にんじん,1");
  await page.getByRole("button", { name: "1 件を登録" }).click();
  await expect(page).toHaveURL(/#\/history\/old$/);
  await expect(itemRow(page, "にんじん")).toHaveCount(1);
  await expect(
    page.getByRole("status").filter({
      hasText: "レシートから 1 件を登録しました",
    }),
  ).toBeVisible();
  await expect.poll(() => savedItems(page, "old")).toHaveLength(1);
  await expect.poll(() => savedItems(page, "new")).toHaveLength(0);
});

test("TC-FR-RCP-01-06 確認の一覧で単位を変えると量に焦点が移る", async ({
  page,
}) => {
  await page.goto("#/receipt");
  await paste(page, "にんじん,2");
  const row = page.locator(".receipt-review-row");
  await row.getByRole("button", { name: "g", exact: true }).click();
  const amount = row.getByRole("textbox", { name: "量" });
  await expect(amount).toBeFocused();
  await expect(amount).toHaveValue("300");
});

test("TC-FR-RCP-01-07 量の確認が必要な行には案内を示す", async ({ page }) => {
  await page.goto("#/receipt");
  await paste(page, "にんじん");
  const row = page.locator(".receipt-review-row");
  await expect(row.getByText("量を確かめてください")).toBeVisible();
  await expect(
    row.getByRole("textbox", { name: "量" }),
  ).toHaveAccessibleDescription("量を確かめてください");
});

test("TC-FR-RCP-01-08 全行が上限で止まっても理由を知らせる", async ({
  page,
}) => {
  await page.goto("#/");
  await page.evaluate(
    (state) =>
      localStorage.setItem(
        "weekmeal:state",
        JSON.stringify({ version: 4, ...state }),
      ),
    {
      ...initialAppState,
      shoppings: [
        {
          id: "full",
          date: "2026-11-03",
          origin: "normal",
          items: [
            {
              id: "carrot",
              foodId: "06212",
              displayName: "にんじん",
              quantity: { kind: "count", count: 999 },
            },
          ],
        },
      ],
    },
  );
  await page.reload();
  await page.goto("#/receipt?shopping=full");
  await paste(page, "にんじん,1");
  await page.getByRole("button", { name: "1 件を登録" }).click();
  await expect(
    page.getByRole("status").filter({
      hasText: "レシートから 0 件を登録しました（上限で止めた 1 件）",
    }),
  ).toBeVisible();
});
