import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import type { AnalysisResult } from "../../core/analyze";
import { validShoppingDate, type Shopping } from "../../core/basket";
import type {
  BasketSessionAction,
  PendingRemoval,
} from "../../core/basketSession";
import { foodPresentation } from "../../core/catalog";
import type { Profile } from "../../core/profile";
import type { FoodItem } from "../../types";
import { BalancePanel } from "../components/BalancePanel";
import { ItemRow } from "../components/ItemRow";
import type { Route } from "../route";

/** 前の買い物の編集と削除確認（DES-UI-47、48）。 */
export function HistoryDetailScreen({
  shopping,
  analysis,
  profile,
  navigate,
  notice,
  onDateChange,
  dispatch,
  findFood,
  pendingRemoval,
  onRemoveShopping,
}: {
  shopping: Shopping;
  analysis: AnalysisResult;
  profile: Profile;
  navigate: (route: Route, shoppingId?: string) => void;
  notice: string;
  onDateChange: (shoppingId: string, date: string) => void;
  dispatch: (action: BasketSessionAction) => void;
  findFood: (foodId: string) => FoodItem | undefined;
  pendingRemoval: PendingRemoval | null;
  onRemoveShopping: (shoppingId: string) => void;
}) {
  const [date, setDate] = useState(shopping.date);
  const [confirming, setConfirming] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const previousRemoval = useRef<PendingRemoval | null>(pendingRemoval);
  const removeRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const previous = previousRemoval.current;
    if (
      pendingRemoval?.shoppingId === shopping.id &&
      pendingRemoval !== previous
    ) {
      undoRef.current?.focus();
    } else if (!pendingRemoval && previous?.shoppingId === shopping.id) {
      const row = Array.from(listRef.current?.children ?? []).find(
        (element) =>
          element.getAttribute("data-entry-id") === previous.entry.id,
      );
      row?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    }
    previousRemoval.current = pendingRemoval;
  }, [pendingRemoval, shopping.id]);
  useLayoutEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);
  const closeDialog = () => {
    setConfirming(false);
    requestAnimationFrame(() => removeRef.current?.focus());
  };
  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
    }
    if (event.key !== "Tab") return;
    const buttons =
      dialogRef.current?.querySelectorAll<HTMLButtonElement>("button");
    if (!buttons?.length) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (!dialogRef.current?.contains(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  };
  const nameCounts = new Map<string, number>();
  for (const item of shopping.items)
    nameCounts.set(
      item.displayName,
      (nameCounts.get(item.displayName) ?? 0) + 1,
    );
  const detailOf = (foodId: string, displayName: string) => {
    if ((nameCounts.get(displayName) ?? 0) < 2) return null;
    const food = findFood(foodId);
    if (!food) return null;
    if (food.id.startsWith("manual-")) return "手入力";
    return foodPresentation(food.name, food.category).details || food.name;
  };
  return (
    <div className="screen-stack" aria-label="買い物詳細画面">
      <header className="screen-header">
        <div>
          <p className="food-id">買い物詳細</p>
          <h2>{shopping.date} の買い物</h2>
        </div>
      </header>
      {notice && <p role="status">{notice}</p>}
      <label className="form-field shopping-date-field">
        買い物の日付{" "}
        <input
          aria-label="買い物の日付"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="primary-button"
        disabled={!validShoppingDate(date)}
        onClick={() => onDateChange(shopping.id, date)}
      >
        日付を保存
      </button>
      <BalancePanel analysis={analysis} profile={profile} />
      <button
        type="button"
        className="link-button"
        onClick={() => navigate("balance", shopping.id)}
      >
        栄養素ごとの充足率を見る
      </button>
      <section className="section-stack" aria-label="登録した食材">
        <h3>登録した食材</h3>
        {shopping.items.length === 0 ? (
          <p>登録した食材がありません</p>
        ) : (
          <ul className="item-list" ref={listRef}>
            {shopping.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                shoppingId={shopping.id}
                detail={detailOf(item.foodId, item.displayName)}
                dispatch={dispatch}
              />
            ))}
          </ul>
        )}
      </section>
      {pendingRemoval?.shoppingId === shopping.id && (
        <div className="section-stack">
          <p id="history-removal-message" role="status">
            {pendingRemoval.entry.displayName}を削除しました
          </p>
          <button
            className="link-button"
            ref={undoRef}
            aria-describedby="history-removal-message"
            type="button"
            onClick={() => dispatch({ type: "undoRemove" })}
          >
            元に戻す
          </button>
        </div>
      )}
      <button
        type="button"
        className="primary-button"
        onClick={() => navigate("register", shopping.id)}
      >
        この買い物に食材を登録
      </button>
      <button
        type="button"
        className="danger-button link-button"
        ref={removeRef}
        onClick={() => setConfirming(true)}
      >
        この買い物を削除
      </button>
      <button
        type="button"
        className="link-button"
        onClick={() => navigate("history")}
      >
        履歴へ戻る
      </button>
      <button
        type="button"
        className="link-button"
        onClick={() => navigate("home")}
      >
        ホームへ戻る
      </button>
      {confirming && (
        <div
          className="dialog-backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) event.preventDefault();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget)
              cancelRef.current?.focus();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shopping-delete-title"
            aria-describedby="shopping-delete-description"
            className="confirm-dialog"
            onKeyDown={trapFocus}
          >
            <h3 id="shopping-delete-title">買い物を削除しますか？</h3>
            <p id="shopping-delete-description">
              {shopping.date} の買い物（{shopping.items.length}{" "}
              件）を削除します。
            </p>
            <div className="form-actions">
              <button type="button" ref={cancelRef} onClick={closeDialog}>
                キャンセル
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => onRemoveShopping(shopping.id)}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
