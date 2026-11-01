import { useEffect, useRef } from "react";
import { latestShopping, type Shopping } from "../../core/basket";
import type { Route } from "../route";

/** 買い物を日付と作成順の降順で並べた履歴（DES-UI-47）。 */
export function HistoryScreen({
  shoppings,
  navigate,
  notice,
}: {
  shoppings: readonly Shopping[];
  navigate: (route: Route, shoppingId?: string) => void;
  notice: string;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const latest = latestShopping(shoppings);
  const ordered = shoppings
    .map((shopping, index) => ({ shopping, index }))
    .sort(
      (left, right) =>
        right.shopping.date.localeCompare(left.shopping.date) ||
        right.index - left.index,
    );
  useEffect(() => {
    if (notice.includes("削除しました")) headingRef.current?.focus();
  }, [notice]);
  return (
    <div className="screen-stack" aria-label="買い物の履歴画面">
      <h2 ref={headingRef} tabIndex={-1}>
        買い物の履歴
      </h2>
      {notice && <p role="status">{notice}</p>}
      {ordered.length === 0 ? (
        <p>買い物がありません</p>
      ) : (
        <ul className="history-list">
          {ordered.map(({ shopping }) => (
            <li key={shopping.id}>
              <button
                className="history-button"
                type="button"
                onClick={() => navigate("historyDetail", shopping.id)}
              >
                <strong>{shopping.date} の買い物</strong>
                <span>
                  {shopping.items.length} 件
                  {latest?.id === shopping.id ? "・最新" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        className="link-button"
        type="button"
        onClick={() => navigate("home")}
      >
        ホームへ戻る
      </button>
    </div>
  );
}
