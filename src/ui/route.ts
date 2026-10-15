import { useCallback, useEffect, useState } from "react";

/** 画面（DES-UI-20〜24） */
export type Route = "home" | "register" | "balance" | "settings" | "foods";

export const routeHashes: Record<Route, string> = {
  home: "#/",
  register: "#/register",
  balance: "#/balance",
  settings: "#/settings",
  foods: "#/foods",
};

/** URL のハッシュから画面を決める。知らないハッシュはホーム（P-01） */
export function routeFromHash(hash: string): Route {
  const found = (Object.keys(routeHashes) as Route[]).find(
    (route) => routeHashes[route] === hash,
  );
  return found ?? "home";
}

/**
 * ハッシュで画面を切り替える（P-01、DES-UI-10）。
 * ハッシュを書き換える（push）ので、ブラウザの「戻る」で前の画面に戻れる。
 */
export function useHashRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() =>
    routeFromHash(window.location.hash),
  );

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    if (window.location.hash !== routeHashes[next]) {
      window.location.hash = routeHashes[next];
    }
  }, []);

  return [route, navigate];
}
