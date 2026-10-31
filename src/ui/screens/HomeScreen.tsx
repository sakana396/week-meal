import { useLayoutEffect, useRef, useState } from "react";
import type {
  BasketSessionAction,
  PendingRemoval,
} from "../../core/basketSession";
import type { AnalysisResult } from "../../core/analyze";
import {
  latestShopping,
  validShoppingDate,
  type AppState,
} from "../../core/basket";
import { foodPresentation } from "../../core/catalog";
import type { FoodItem } from "../../types";
import { BalancePanel } from "../components/BalancePanel";
import { SupplementSuggestions } from "../components/SupplementSuggestions";
import { ItemRow } from "../components/ItemRow";
import type { Route } from "../route";

/**
 * ホーム（DES-SHP-03、DES-UI-20, 40, 41）。最新の買い物の判定と食材一覧。
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
  onCreateShopping,
  onDateChange,
  routeNotice,
}: {
  state: AppState;
  analysis: AnalysisResult;
  revision: number;
  dispatch: (action: BasketSessionAction) => void;
  navigate: (route: Route, shoppingId?: string) => void;
  findFood: (foodId: string) => FoodItem | undefined;
  notice: React.ReactNode;
  pendingRemoval: PendingRemoval | null;
  onCreateShopping: () => void;
  onDateChange: (shoppingId: string, date: string) => void;
  routeNotice: string;
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

  const shopping = latestShopping(state.shoppings);
  const [dateDraft, setDateDraft] = useState<{
    id: string;
    date: string;
  } | null>(null);
  const date =
    dateDraft && dateDraft.id === shopping?.id
      ? dateDraft.date
      : (shopping?.date ?? "");
  const items = shopping?.items ?? [];
  const nameCounts = new Map<string, number>();
  for (const item of items) {
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
  const ordered = items;

  return (
    <div className="screen-stack" aria-label="ホーム画面">
      <header className="screen-header">
        <div>
          <p className="food-id">ホーム</p>
          <h2>買った食材の栄養バランス</h2>
        </div>
        <button
          className="primary-button"
          onClick={() => navigate("register", shopping?.id)}
          type="button"
        >
          食材を登録
        </button>
      </header>
      {notice}
      {routeNotice && <p role="status">{routeNotice}</p>}
      <button
        className="primary-button"
        type="button"
        onClick={onCreateShopping}
      >
        新しい買い物
      </button>
      <button
        className="link-button"
        type="button"
        onClick={() => navigate("history")}
      >
        履歴
      </button>
      {shopping && (
        <div className="section-stack" key={shopping.id}>
          <label className="form-field shopping-date-field">
            買い物の日付{" "}
            <input
              aria-label="買い物の日付"
              type="date"
              value={date}
              onChange={(event) =>
                setDateDraft({ id: shopping.id, date: event.target.value })
              }
            />
          </label>
          <button
            className="primary-button"
            type="button"
            disabled={!validShoppingDate(date)}
            onClick={() => onDateChange(shopping.id, date)}
          >
            日付を保存
          </button>
        </div>
      )}
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
      <section className="section-stack" aria-label="登録した食材">
        <div className="section-heading">
          <h3>登録した食材</h3>
          <p>{items.length} 件</p>
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
                shoppingId={shopping?.id ?? ""}
                key={item.id}
              />
            ))}
          </ul>
        )}
      </section>
      {pendingRemoval && pendingRemoval.shoppingId === shopping?.id && (
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
    </div>
  );
}
