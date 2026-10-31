import { useCallback, useEffect, useState } from "react";

/** 画面（DES-UI-10、46）。 */
export type Route =
  | "home"
  | "register"
  | "balance"
  | "settings"
  | "foods"
  | "history"
  | "historyDetail";
/** ハッシュ中の対象 ID（DES-UI-10、21）。 */
export type RouteLocation = {
  route: Route;
  shoppingId: string | null;
  invalidShopping: boolean;
};

export const routeHashes: Record<Route, string> = {
  home: "#/",
  register: "#/register",
  balance: "#/balance",
  settings: "#/settings",
  foods: "#/foods",
  history: "#/history",
  historyDetail: "#/history/",
};

/** 経路と買い物 ID を解析する（DES-UI-10、21、46）。 */
export function routeFromHash(hash: string): RouteLocation {
  const [path, query = ""] = hash.split("?", 2);
  if (path.startsWith("#/history/")) {
    const id = path.slice("#/history/".length);
    const valid = !!id && !id.includes("/") && !query;
    return {
      route: "historyDetail",
      shoppingId: valid ? id : null,
      invalidShopping: !valid,
    };
  }
  if (path === "#/register" || path === "#/balance") {
    const params = new URLSearchParams(query);
    const ids = params.getAll("shopping");
    const valid = ids.length === 0 || (ids.length === 1 && !!ids[0]);
    return {
      route: path === "#/register" ? "register" : "balance",
      shoppingId: valid ? (ids[0] ?? null) : null,
      invalidShopping: !valid,
    };
  }
  const found = (Object.keys(routeHashes) as Route[]).find(
    (route) => route !== "historyDetail" && routeHashes[route] === hash,
  );
  return { route: found ?? "home", shoppingId: null, invalidShopping: false };
}

/** ハッシュで画面を切り替える（DES-UI-10）。 */
export function useHashRoute(): [
  RouteLocation,
  (route: Route, shoppingId?: string) => void,
] {
  const [location, setLocation] = useState<RouteLocation>(() =>
    routeFromHash(window.location.hash),
  );
  useEffect(() => {
    const onHashChange = () => setLocation(routeFromHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const navigate = useCallback((next: Route, shoppingId?: string) => {
    const hash =
      next === "historyDetail"
        ? `${routeHashes.historyDetail}${encodeURIComponent(shoppingId ?? "")}`
        : shoppingId
          ? `${routeHashes[next]}?shopping=${encodeURIComponent(shoppingId)}`
          : routeHashes[next];
    if (window.location.hash !== hash) window.location.hash = hash;
  }, []);
  return [location, navigate];
}
