import { expect, test } from "@playwright/test";
import { itemRow, openTab, registerFood } from "./helpers";

test("TC-FR-SYS-03-01 配信パスで読み込み、登録と設定を保存し、データを送信しない", async ({
  page,
  baseURL,
}) => {
  const appOrigin = new URL(baseURL ?? "").origin;
  const dataRequests: string[] = [];
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== appOrigin) {
      externalRequests.push(request.url());
    }
    if (["fetch", "xhr"].includes(request.resourceType())) {
      dataRequests.push(request.url());
    }
  });

  await page.goto("#/");
  await expect(page).toHaveURL(/\/week-meal\/#\/$/);

  const assetPaths = await page
    .locator("script[src], link[rel='stylesheet'][href]")
    .evaluateAll((elements) =>
      elements.map(
        (element) =>
          new URL(
            element instanceof HTMLScriptElement
              ? element.src
              : (element as HTMLLinkElement).href,
          ).pathname,
      ),
    );
  expect(assetPaths.length).toBeGreaterThanOrEqual(1);
  expect(
    assetPaths.filter((path) => path.endsWith(".js")).length,
  ).toBeGreaterThanOrEqual(1);
  expect(
    assetPaths.filter((path) => path.endsWith(".css")).length,
  ).toBeGreaterThanOrEqual(1);
  expect(
    assetPaths.every((path) => path.startsWith("/week-meal/assets/")),
  ).toBe(true);
  for (const path of assetPaths) {
    const response = await page.request.get(
      new URL(path, page.url()).toString(),
    );
    expect(response.ok()).toBe(true);
  }

  await openTab(page, "登録");
  for (const name of ["キャベツ", "にんじん", "豚肉"]) {
    await registerFood(page, name);
  }
  await openTab(page, "設定");
  await page
    .getByRole("group", { name: "主食" })
    .getByRole("button", { name: "パン" })
    .click();
  await openTab(page, "ホーム");
  await expect(itemRow(page, "キャベツ")).toHaveCount(1);
  await expect(
    page
      .getByRole("region", { name: "栄養バランスの判定" })
      .getByRole("heading", {
        name: /偏りがあります|目立った偏りはありません/,
      }),
  ).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/week-meal\/#\/$/);
  await expect(itemRow(page, "キャベツ")).toHaveCount(1);
  await openTab(page, "設定");
  await expect(
    page
      .getByRole("group", { name: "主食" })
      .getByRole("button", { name: "パン" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(dataRequests).toEqual([]);
  expect(externalRequests).toEqual([]);
});
