import type { AnalysisResult } from "../../core/analyze";
import type { BalanceResult, DetailResult } from "../../core/balance";
import {
  balanceTargets,
  highSufficiency,
  lowSufficiency,
} from "../../core/balance";
import type { Profile } from "../../core/profile";
import { extraReferenceBasis } from "../../data/dietaryReference";
import { NoDataNote } from "../components/BalancePanel";
import { nutrientLabel, stapleNote, statusLabels } from "../labels";
import type { Route } from "../route";

/** 充足率の棒の目盛り: 150% を棒いっぱいとする */
const sufficiencyScale = 1.5;

/** 充足率の棒の長さ（%） */
function barWidth(sufficiency: number): number {
  return Math.min(100, Math.max(0, (sufficiency / sufficiencyScale) * 100));
}

/**
 * 充足率の棒。基準値（100%）と、判定の境目（下限の規則は 70%、上限の規則は 130%）に目印を置く
 */
function SufficiencyBar({
  sufficiency,
  upper = false,
}: {
  sufficiency: number | null;
  upper?: boolean;
}) {
  const boundary = upper ? highSufficiency : lowSufficiency;
  return (
    <div className="detail-bar" aria-hidden="true">
      <span
        className="detail-fill"
        style={{
          width: `${sufficiency !== null ? barWidth(sufficiency) : 0}%`,
        }}
      />
      <span
        className="detail-mark"
        style={{ left: `${barWidth(boundary)}%` }}
      />
      <span
        className="detail-mark detail-mark-main"
        style={{ left: `${barWidth(1)}%` }}
      />
    </div>
  );
}

/** PFC の棒。エネルギーの 0〜100% を目盛りにし、目標の範囲を帯、値の位置を目印で示す */
function PfcBar({ pct, range }: { pct: number; range: [number, number] }) {
  return (
    <div className="detail-bar" aria-hidden="true">
      <span
        className="detail-band"
        style={{ left: `${range[0]}%`, width: `${range[1] - range[0]}%` }}
      />
      <span
        className="detail-value"
        style={{ left: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
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
  const note = coverageNote(result.coverage);
  return (
    <li className="detail-row" data-status={result.status}>
      <div className="detail-label">
        <strong>{nutrientLabel(result.key)}</strong>
        <span className="balance-status">{statusLabels[result.status]}</span>
      </div>
      {isPfc && result.pfcRange && result.pfcPct !== null ? (
        <PfcBar pct={result.pfcPct} range={result.pfcRange} />
      ) : (
        <SufficiencyBar
          sufficiency={result.sufficiency}
          upper={balanceTargets.some(
            (target) =>
              target.key === result.key && target.rule.kind === "upper",
          )}
        />
      )}
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
      <SufficiencyBar sufficiency={result.sufficiency} />
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
            {analysis.reason === "noEnergy"
              ? "登録した食材のエネルギーの合計が 0 のため、栄養の割合を計算できません。"
              : `主食を除いて、エネルギーのデータがある食材を 3 品目以上登録すると、栄養素ごとの充足率を出します（いま ${analysis.itemCount} 品目）。`}
          </p>
          <NoDataNote names={analysis.noDataItems} />
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
            買った食材の傾向です。食べた量や摂取量ではありません（
            {stapleNote(profile)}）。買った食材の栄養を 1,000 kcal
            あたりに直し、日本人の食事摂取基準（2025年版）を同じく 1,000 kcal
            あたりに直した値と比べています。充足率が {percent(lowSufficiency)}{" "}
            未満なら不足、食塩は {percent(highSufficiency)}{" "}
            超なら過剰、たんぱく質・脂質・炭水化物はエネルギーに占める割合が目標の範囲の外なら不足・過剰です。
          </p>
          <NoDataNote names={analysis.noDataItems} />
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
