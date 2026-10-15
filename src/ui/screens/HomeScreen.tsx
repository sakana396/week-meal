import type { AnalysisResult } from "../../core/analyze";
import type { AppState } from "../../core/basket";
import { BalancePanel } from "../components/BalancePanel";
import type { Route } from "../route";

/**
 * ホーム（DES-UI-20）。#26 では判定と登録した食材の名前だけを出す。
 * 登録した食材の一覧の操作（個数・使い切った・削除）は #27 で作る。
 */
export function HomeScreen({
  state,
  analysis,
  navigate,
  notice,
}: {
  state: AppState;
  analysis: AnalysisResult;
  navigate: (route: Route) => void;
  notice: React.ReactNode;
}) {
  return (
    <div className="screen-stack" aria-label="ホーム画面">
      <header className="screen-header">
        <div>
          <p className="food-id">ホーム</p>
          <h2>買った食材の栄養バランス</h2>
        </div>
      </header>
      {notice}
      <BalancePanel analysis={analysis} profile={state.profile} />
      {state.items.length === 0 ? (
        <section className="notice-panel">
          <h3>登録した食材がありません</h3>
          <p>食材登録画面で食材を押すと、栄養バランスの判定に反映されます。</p>
        </section>
      ) : (
        <ul className="registered-list" aria-label="登録した食材">
          {state.items.map((item) => (
            <li className="food-row" data-used-up={item.usedUp} key={item.id}>
              <span className="food-name">{item.displayName}</span>
              <span className="food-category">× {item.count}</span>
            </li>
          ))}
        </ul>
      )}
      <button
        className="primary-button"
        onClick={() => navigate("register")}
        type="button"
      >
        食材を登録
      </button>
    </div>
  );
}
