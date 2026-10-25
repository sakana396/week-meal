import { useLayoutEffect, useRef } from "react";
import type {
  BasketSessionAction,
  PendingRemoval,
} from "../../core/basketSession";
import type { AnalysisResult } from "../../core/analyze";
import type { AppState } from "../../core/basket";
import { foodPresentation } from "../../core/catalog";
import type { FoodItem } from "../../types";
import { BalancePanel } from "../components/BalancePanel";
import { SupplementSuggestions } from "../components/SupplementSuggestions";
import { ItemRow } from "../components/ItemRow";
import type { Route } from "../route";

/**
 * ホーム（DES-UI-20, 40, 41）。判定と、登録した食材の一覧（使い切った行は下にまとめる）。
 */
export function HomeScreen({
  state,
  analysis,
  revision,
  dispatch,
  navigate,
  findFood,
  notice,
  pendingRemoval,
}: {
  state: AppState;
  analysis: AnalysisResult;
  revision: number;
  dispatch: (action: BasketSessionAction) => void;
  navigate: (route: Route) => void;
  findFood: (foodId: string) => FoodItem | undefined;
  notice: React.ReactNode;
  pendingRemoval: PendingRemoval | null;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const previousRemoval = useRef<PendingRemoval | null>(pendingRemoval);

  // 削除後は取り消しへ、復元時だけ戻った行へ移す（DES-UI-45）。
  // 初回表示に残る取り消しは新たな削除ではないため、画面移動のフォーカスを保つ。
  // 候補登録で取り消しが失効した場合は、候補見出しのフォーカスを保つ。
  useLayoutEffect(() => {
    const previous = previousRemoval.current;
    if (pendingRemoval && pendingRemoval !== previous) {
      undoRef.current?.focus();
    } else if (!pendingRemoval && previous) {
      const row = Array.from(listRef.current?.children ?? []).find(
        (element) =>
          element.getAttribute("data-entry-id") === previous.entry.id,
      );
      row?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    }
    previousRemoval.current = pendingRemoval;
  }, [pendingRemoval]);

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
      <SupplementSuggestions
        state={state}
        analysis={analysis}
        revision={revision}
        dispatch={dispatch}
      />
      {analysis.kind === "judged" && (
        <button
          className="link-button"
          onClick={() => navigate("balance")}
          type="button"
        >
          栄養素ごとの充足率を見る
        </button>
      )}
      {pendingRemoval && (
        <div className="section-stack">
          <p id="removal-message" role="status">
            {pendingRemoval.entry.displayName}を削除しました
          </p>
          <button
            className="link-button"
            ref={undoRef}
            aria-describedby="removal-message"
            onClick={() => dispatch({ type: "undoRemove" })}
            type="button"
          >
            元に戻す
          </button>
        </div>
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
          <ul className="item-list" ref={listRef}>
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
