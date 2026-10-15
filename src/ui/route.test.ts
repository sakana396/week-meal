import { describe, expect, it } from "vitest";
import { routeFromHash, routeHashes } from "./route";

describe("routeFromHash（P-01、DES-UI-10）", () => {
  it.each(Object.entries(routeHashes))(
    "TC-FR-UI-02-01 %s のハッシュ %s から画面を決める",
    (route, hash) => {
      expect(routeFromHash(hash)).toBe(route);
    },
  );

  it.each([
    ["TC-FR-UI-02-02 ハッシュがなければホーム（境界）", ""],
    ["TC-FR-UI-02-03 知らないハッシュはホーム（異常）", "#/unknown"],
  ])("%s", (_title, hash) => {
    expect(routeFromHash(hash)).toBe("home");
  });
});
