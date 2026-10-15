import type { Route } from "../route";

const items: Array<[Route, string]> = [
  ["home", "ホーム"],
  ["register", "登録"],
  ["balance", "詳細"],
  ["settings", "設定"],
];

/**
 * 画面の切り替え（P-06）。スマートフォン幅では画面下のタブ、PC 幅では左のサイドバー。
 * 食品一覧は設定画面から開くので、ここでは設定を選んだ状態にする。
 */
export function Navigation({
  route,
  navigate,
}: {
  route: Route;
  navigate: (route: Route) => void;
}) {
  const active = route === "foods" ? "settings" : route;
  return (
    <aside className="sidebar">
      <div className="app-title">
        <span className="brand-mark" aria-hidden="true" />
        <div>
          <h1>weekmeal</h1>
          <p>買った食材の栄養バランス</p>
        </div>
      </div>
      <nav className="screen-nav" aria-label="主要画面">
        {items.map(([target, label]) => (
          <button
            aria-current={active === target ? "page" : undefined}
            className="nav-button"
            data-active={active === target}
            key={target}
            onClick={() => navigate(target)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
