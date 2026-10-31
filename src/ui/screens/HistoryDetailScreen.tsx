import { useState } from "react";
import type { AnalysisResult } from "../../core/analyze";
import { validShoppingDate, type Shopping } from "../../core/basket";
import type { Profile } from "../../core/profile";
import { BalancePanel } from "../components/BalancePanel";
import type { Route } from "../route";

/** 作成後の買い物詳細の最小表示（DES-UI-46）。 */
export function HistoryDetailScreen({
  shopping,
  analysis,
  profile,
  navigate,
  notice,
  onDateChange,
}: {
  shopping: Shopping;
  analysis: AnalysisResult;
  profile: Profile;
  navigate: (route: Route, shoppingId?: string) => void;
  notice: string;
  onDateChange: (shoppingId: string, date: string) => void;
}) {
  const [date, setDate] = useState(shopping.date);
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
      <section className="section-stack" aria-label="登録した食材">
        <h3>登録した食材</h3>
        {shopping.items.length === 0 ? (
          <p>登録した食材がありません</p>
        ) : (
          <ul className="item-list">
            {shopping.items.map((item) => (
              <li key={item.id} className="item-row">
                {item.displayName}（{item.count} 個）
              </li>
            ))}
          </ul>
        )}
      </section>
      <button
        type="button"
        className="primary-button"
        onClick={() => navigate("register", shopping.id)}
      >
        この買い物に食材を登録
      </button>
      <button
        type="button"
        className="link-button"
        onClick={() => navigate("home")}
      >
        ホームへ戻る
      </button>
    </div>
  );
}
