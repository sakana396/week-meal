import { describe, expect, it } from "vitest";
import { routeFromHash, routeHashes } from "./route";

describe("routeFromHash（DES-UI-10）", () => {
  it.each(
    Object.entries(routeHashes).filter(([route]) => route !== "historyDetail"),
  )("TC-FR-UI-02-01 %s のハッシュ %s から画面を決める", (route, hash) => {
    expect(routeFromHash(hash)).toEqual({
      route,
      shoppingId: null,
      invalidShopping: false,
    });
  });

  it.each([
    ["TC-FR-UI-02-02 ハッシュがなければホーム（境界）", ""],
    ["TC-FR-UI-02-03 知らないハッシュはホーム（異常）", "#/unknown"],
  ])("%s", (_title, hash) => {
    expect(routeFromHash(hash)).toEqual({
      route: "home",
      shoppingId: null,
      invalidShopping: false,
    });
  });

  it.each([
    ["#/register?shopping=shopping-1", "register", "shopping-1"],
    ["#/history/shopping-1", "historyDetail", "shopping-1"],
    ["#/register?shopping=shopping%20one", "register", "shopping one"],
    ["#/history/shopping%20one", "historyDetail", "shopping one"],
  ])("TC-FR-UI-02-04 %s の買い物 ID を解析する", (hash, route, shoppingId) => {
    expect(routeFromHash(hash)).toEqual({
      route,
      shoppingId,
      invalidShopping: false,
    });
  });

  it.each([
    "#/register?shopping=",
    "#/register?shopping=a&shopping=b",
    "#/history/",
    "#/history/%ZZ",
    "#/history/a%2Fb",
  ])("TC-FR-UI-02-04 不正な対象 %s を検出する", (hash) => {
    expect(routeFromHash(hash).invalidShopping).toBe(true);
  });
});
