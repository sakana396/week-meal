import type { AnalysisResult } from "../../core/analyze";
import type { Profile } from "../../core/profile";
import { nutrientLabel, stapleNote, statusLabels } from "../labels";

/**
 * 偏りの判定結果を出す（DES-UI-01, 41、FR-UI-01, 07、NFR-07）。
 * 不足・過剰は色だけでなく文字でも示す。
 */
export function BalancePanel({
  analysis,
  profile,
}: {
  analysis: AnalysisResult;
  profile: Profile;
}) {
  if (analysis.kind === "insufficient" && analysis.reason === "noEnergy") {
    return (
      <section className="notice-panel" aria-label="栄養バランスの判定">
        <h3>判定できません</h3>
        <p>
          登録した食材のエネルギーの合計が 0
          のため、栄養の割合を計算できません。
        </p>
        <NoDataNote names={analysis.noDataItems} />
      </section>
    );
  }

  if (analysis.kind === "insufficient") {
    return (
      <section className="notice-panel" aria-label="栄養バランスの判定">
        <h3>判定にはあと少し食材が必要です</h3>
        <p>
          主食を除いて 3 品目以上登録すると、栄養の偏りを判定します（いま{" "}
          {analysis.itemCount} 品目）。
        </p>
        <NoDataNote names={analysis.noDataItems} />
      </section>
    );
  }

  const flagged = analysis.results.filter(
    (result) => result.status === "low" || result.status === "high",
  );
  const unknown = analysis.results.filter(
    (result) => result.status === "unknown",
  );
  const partial = analysis.results.filter(
    (result) =>
      result.status !== "unknown" &&
      result.coverage !== null &&
      result.coverage < 1,
  );

  return (
    <section
      className="notice-panel"
      data-alert={flagged.length > 0}
      aria-label="栄養バランスの判定"
    >
      <h3>
        {flagged.length > 0
          ? "偏りがあります"
          : unknown.length > 0
            ? "判定できた栄養素には、目立った偏りはありません"
            : "目立った偏りはありません"}
      </h3>
      {flagged.length > 0 && (
        <ul className="balance-list">
          {flagged.map((result) => (
            <li key={result.key} data-status={result.status}>
              <span className="balance-status">
                {statusLabels[result.status]}
              </span>
              {nutrientLabel(result.key)}
            </li>
          ))}
        </ul>
      )}
      <p className="balance-note">
        買った食材の傾向です。食べた量や摂取量ではありません（
        {stapleNote(profile)}）。
      </p>
      {analysis.approximateItems.length > 0 && (
        <p className="balance-note">
          {analysis.approximateItems.join("・")} は 1 つ 100g
          の概算で数えています。
        </p>
      )}
      <NoDataNote names={analysis.noDataItems} />
      {partial.length > 0 && (
        <p className="balance-note">
          一部の食材に
          {partial.map((result) => nutrientLabel(result.key)).join("・")}
          のデータがないため、データのある食材だけで判定しています。
        </p>
      )}
      {unknown.length > 0 && (
        <p className="balance-note">
          {unknown.map((result) => nutrientLabel(result.key)).join("・")}{" "}
          はデータがなく判定できません。
        </p>
      )}
    </section>
  );
}

/** エネルギーのデータがなく、判定に数えなかった食材（DES-ANL-03、DES-UI-35） */
export function NoDataNote({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <p className="balance-note">
      {names.join("・")} はエネルギーのデータがないので、判定に数えていません。
    </p>
  );
}
