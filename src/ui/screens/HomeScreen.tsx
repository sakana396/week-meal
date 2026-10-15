import type { AnalysisResult } from "../../core/analyze";
import type { AppState, BasketAction } from "../../core/basket";
import { foodPresentation } from "../../core/catalog";
import type { FoodItem } from "../../types";
import { BalancePanel } from "../components/BalancePanel";
import { ItemRow } from "../components/ItemRow";
import type { Route } from "../route";

/**
 * ホーム（DES-UI-20, 40, 41）。判定と、登録した食材の一覧（使い切った行は下にまとめる）。
 */
export function HomeScreen({
  state,
  analysis,
  dispatch,
  navigate,
  findFood,
  notice,
}: {
  state: AppState;
  analysis: AnalysisResult;
  dispatch: (action: BasketAction) => void;
  navigate: (route: Route) => void;
  findFood: (foodId: string) => FoodItem | undefined;
  notice: React.ReactNode;
}) {
  const nameCounts = new Map<string, number>();
  for (const item of state.items) {
    nameCounts.set(
      item.displayName,
      (nameCounts.get(item.displayName) ?? 0) + 1,
    );
  }
  const detailOf = (foodId: string, displayName: string) => {
    if ((nameCounts.get(displayName) ?? 0) < 2) return null;
    const food = findFood(foodId);
    if (!food) return null;
    if (food.id.startsWith("manual-")) return "手入力";
    return foodPresentation(food.name, food.category).details || food.name;
  };
  const ordered = [
    ...state.items.filter((item) => !item.usedUp),
    ...state.items.filter((item) => item.usedUp),
  ];

  return (
    <div className="screen-stack" aria-label="ホーム画面">
      <header className="screen-header">
        <div>
          <p className="food-id">ホーム</p>
          <h2>買った食材の栄養バランス</h2>
        </div>
        <button
          className="primary-button"
          onClick={() => navigate("register")}
          type="button"
        >
          食材を登録
        </button>
      </header>
      {notice}
      <BalancePanel analysis={analysis} profile={state.profile} />
      {analysis.kind === "judged" && (
        <button
          className="link-button"
          onClick={() => navigate("balance")}
          type="button"
        >
          栄養素ごとの充足率を見る
        </button>
      )}
      <section className="section-stack" aria-label="登録した食材">
        <div className="section-heading">
          <h3>登録した食材</h3>
          <p>
            {state.items.filter((item) => !item.usedUp).length}{" "}
            件（使い切ったものを除く）
          </p>
        </div>
        {ordered.length === 0 ? (
          <div className="empty-result">
            <strong>登録した食材がありません</strong>
            <span>
              「食材を登録」から、買った食材を押して登録してください。
            </span>
          </div>
        ) : (
          <ul className="item-list">
            {ordered.map((item) => (
              <ItemRow
                detail={detailOf(item.foodId, item.displayName)}
                dispatch={dispatch}
                item={item}
                key={item.id}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
