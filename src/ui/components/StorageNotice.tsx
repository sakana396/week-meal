import type { StorageIssue } from "../../core/storage";

/** 保存データの読み込み・書き出しで起きた問題を知らせる（DES-UI-13、NFR-12） */
export function StorageNotice({
  issue,
  backedUp,
  available,
  saveFailed,
}: {
  issue: StorageIssue;
  backedUp: boolean;
  /** 起動時に、保存できる状態だったか */
  available: boolean;
  /** 起動後の書き出しに失敗したか */
  saveFailed: boolean;
}) {
  const messages: string[] = [];
  if (issue === "corrupted") {
    messages.push(
      backedUp
        ? "保存データを読めなかったので、初期状態で始めました（元のデータは別の場所に退避しました）。"
        : "保存データを読めず、退避もできませんでした。元のデータを消さないよう、この画面での変更は保存しません。",
    );
  } else if (issue) {
    if (issue.droppedItems > 0) {
      messages.push(
        `保存データのうち、読み込めなかった食材が ${issue.droppedItems} 件ありました。`,
      );
    }
    if (issue.profileReset) {
      messages.push("設定を読み込めなかったので、初期値に戻しました。");
    }
  }
  if (!available && issue !== "corrupted") {
    messages.push(
      "このブラウザでは保存できません（プライベートモードや容量不足など）。ページを閉じると登録した食材は消えます。",
    );
  } else if (available && saveFailed) {
    messages.push(
      "登録した食材を保存できませんでした。ページを閉じると、保存できなかった変更は消えます。",
    );
  }
  if (messages.length === 0) return null;

  return (
    <section className="notice-panel" data-alert="true" role="status">
      {messages.map((message) => (
        <p key={message}>{message}</p>
      ))}
    </section>
  );
}
