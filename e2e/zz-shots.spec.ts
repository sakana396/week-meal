import { test } from "@playwright/test";
test("shots", async ({ page }, info) => {
  const p = info.project.name;
  await page.goto("/#/register");
  for (const n of ["キャベツ", "にんじん", "豚肉", "鶏卵"]) {
    await page.getByRole("button", { name: new RegExp("^" + n) }).first().click();
  }
  await page.screenshot({ path: "/tmp/claude-1000/-home-sakana-orca-workspaces-week-meal-main/c120643a-6166-4ed0-bd63-0744993587cd/scratchpad/shots/" + p + "-register.png", fullPage: false });
  await page.goto("/#/");
  await page.screenshot({ path: "/tmp/claude-1000/-home-sakana-orca-workspaces-week-meal-main/c120643a-6166-4ed0-bd63-0744993587cd/scratchpad/shots/" + p + "-home.png", fullPage: true });
  await page.goto("/#/balance");
  await page.screenshot({ path: "/tmp/claude-1000/-home-sakana-orca-workspaces-week-meal-main/c120643a-6166-4ed0-bd63-0744993587cd/scratchpad/shots/" + p + "-balance.png", fullPage: true });
  await page.goto("/#/settings");
  await page.screenshot({ path: "/tmp/claude-1000/-home-sakana-orca-workspaces-week-meal-main/c120643a-6166-4ed0-bd63-0744993587cd/scratchpad/shots/" + p + "-settings.png", fullPage: true });
});
