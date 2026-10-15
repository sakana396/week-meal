import type { AnalysisResult } from "../../core/analyze";
import type { BalanceResult, DetailResult } from "../../core/balance";
import { highSufficiency, lowSufficiency } from "../../core/balance";
import type { Profile } from "../../core/profile";
import { extraReferenceBasis } from "../../data/dietaryReference";
import { nutrientLabel, stapleNote, statusLabels } from "../labels";
import type { Route } from "../route";

/** 棒の長さ（%）。充足率 150% を棒いっぱいとする */
function barWidth(sufficiency: number): number {
  return Math.min(100, Math.max(0, (sufficiency / 1.5) * 100));
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function coverageNote(coverage: number | null): string | null {
  return coverage !== null && coverage < 1
    ? `データのある食材はエネルギーの ${percent(coverage)}`
    : null;
}

/** 判定する 14 種の 1 行（DES-UI-22）。判定は色だけでなく文字でも示す（NFR-07） */
function JudgedRow({ result }: { result: BalanceResult }) {
  const isPfc = result.pfcPct !== null && result.pfcRange !== null;
  const value = isPfc
    ? `${result.pfcPct?.toFixed(1)}%（目標 ${result.pfcRange?.[0]}〜${result.pfcRange?.[1]}%）`
    : result.sufficiency !== null
      ? `充足率 ${percent(result.sufficiency)}`
      : "データなし";
  const width =
    isPfc && result.pfcRange
      ? Math.min(
          100,
          ((result.pfcPct ?? 0) / Math.max(result.pfcRange[1], 1)) * 75,
        )
      : result.sufficiency !== null
        ? barWidth(result.sufficiency)
        : 0;
  const note = coverageNote(result.coverage);
  return (
    <li className="detail-row" data-status={result.status}>
      <div className="detail-label">
        <strong>{nutrientLabel(result.key)}</strong>
        <span className="balance-status">{statusLabels[result.status]}</span>
      </div>
      <div className="detail-bar" aria-hidden="true">
        <span style={{ width: `${width}%` }} />
      </div>
      <small>
        {value}
        {note ? `・${note}` : ""}
      </small>
    </li>
  );
}

/** 判定しない栄養素の 1 行（DES-BAL-06）。充足率だけを出す */
function DetailRow({ result }: { result: DetailResult }) {
  const basis = extraReferenceBasis[result.key];
  const note = coverageNote(result.coverage);
  return (
    <li className="detail-row" data-status="info">
      <div className="detail-label">
        <strong>{basis.label}</strong>
      </div>
      <div className="detail-bar" aria-hidden="true">
        <span
          style={{
            width: `${result.sufficiency !== null ? barWidth(result.sufficiency) : 0}%`,
          }}
        />
      </div>
      <small>
        {result.sufficiency !== null
          ? `充足率 ${percent(result.sufficiency)}（${basis.basis}に対して）`
          : "データなし"}
        {note ? `・${note}` : ""}
      </small>
    </li>
  );
}

/**
 * 栄養詳細（DES-UI-22、FR-UI-05, 06）。判定する 14 種の充足率と判定、PFC 比率、
 * それ以外のビタミン・ミネラルの充足率（判定はしない）。
 */
export function BalanceDetailScreen({
  analysis,
  profile,
  navigate,
}: {
  analysis: AnalysisResult;
  profile: Profile;
  navigate: (route: Route) => void;
}) {
  return (
    <div className="screen-stack" aria-label="栄養詳細画面">
      <header className="screen-header">
        <div>
          <p className="food-id">栄養詳細</p>
          <h2>栄養素ごとの充足率</h2>
        </div>
      </header>

      {analysis.kind === "insufficient" ? (
        <section className="notice-panel">
          <h3>まだ判定できません</h3>
          <p>
            主食を除いて、エネルギーのデータがある食材を 3
            品目以上登録すると、栄養素ごとの充足率を出します（いま{" "}
            {analysis.itemCount} 品目）。
          </p>
          <button
            className="primary-button"
            onClick={() => navigate("register")}
            type="button"
          >
            食材を登録
          </button>
        </section>
      ) : (
        <>
          <p className="balance-note">
            買った食材の栄養を 1,000 kcal
            あたりに直し、日本人の食事摂取基準（2025年版）を同じく 1,000 kcal
            あたりに直した値と比べています。食べた量や摂取量ではありません（
            {stapleNote(profile)}）。 不足は充足率 {percent(lowSufficiency)}{" "}
            未満、食塩の過剰は {percent(highSufficiency)} 超です。
          </p>
          {analysis.pfc && (
            <section className="section-stack" aria-label="PFC 比率">
              <div className="section-heading">
                <h3>エネルギーの内訳（PFC 比率）</h3>
              </div>
              <p className="pfc-summary">
                たんぱく質 {analysis.pfc.proteinPct.toFixed(1)}%・脂質{" "}
                {analysis.pfc.fatPct.toFixed(1)}%・炭水化物{" "}
                {analysis.pfc.carbohydratePct.toFixed(1)}%
              </p>
            </section>
          )}
          <section className="section-stack" aria-label="判定する栄養素">
            <div className="section-heading">
              <h3>判定する栄養素（14 種）</h3>
            </div>
            <ul className="detail-list">
              {analysis.results.map((result) => (
                <JudgedRow key={result.key} result={result} />
              ))}
            </ul>
          </section>
          <section
            className="section-stack"
            aria-label="そのほかのビタミン・ミネラル"
          >
            <div className="section-heading">
              <h3>そのほかのビタミン・ミネラル</h3>
              <p>充足率の参考（判定はしません）</p>
            </div>
            <ul className="detail-list">
              {analysis.details.map((result) => (
                <DetailRow key={result.key} result={result} />
              ))}
            </ul>
          </section>
          <footer className="source-note">
            出典:
            日本食品標準成分表（八訂）増補2023年（文部科学省）、日本人の食事摂取基準（2025年版）（厚生労働省）
          </footer>
        </>
      )}
    </div>
  );
}
