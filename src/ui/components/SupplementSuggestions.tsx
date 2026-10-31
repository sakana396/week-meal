import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AnalysisResult } from "../../core/analyze";
import {
  latestShopping,
  type AppState,
  type BasketAction,
} from "../../core/basket";
import {
  supplementCandidates,
  suggestSupplements,
  type SupplementSuggestion,
} from "../../core/suggestions";
import { unitWeights } from "../../data/unitWeights";
import { baseFoods, foodsById } from "../foodData";
import { localId } from "../ids";
import { nutrientLabel } from "../labels";
import { registerMessage } from "../registerMessage";
import { scheduleSuggestions } from "../scheduleSuggestions";

// 静的な候補集合はホームの再表示・状態変更で作り直さない（DES-SUG-01）。
const candidateStart = performance.now();
const candidates = supplementCandidates(baseFoods);
// UI 側だけで初期生成と差分計算を分けて記録する（DES-PER-01）。
performance.measure("weekmeal:candidate-initialization", {
  start: candidateStart,
  end: performance.now(),
  detail: { count: candidates.length },
});
type CandidateView = { revision: number; suggestions: SupplementSuggestion[] };

/** ホームで候補を提示し、安全に1単位登録する（DES-UI-42）。 */
export function SupplementSuggestions({
  state,
  analysis,
  revision,
  dispatch,
}: {
  state: AppState;
  analysis: AnalysisResult;
  revision: number;
  dispatch: (action: BasketAction) => void;
}) {
  const [view, setView] = useState<CandidateView>({
    revision: -1,
    suggestions: [],
  });
  const [ready, setReady] = useState<CandidateView | null>(null);
  const [locked, setLocked] = useState(false);
  const [height, setHeight] = useState<number>();
  const [message, setMessage] = useState({ text: "", seq: 0 });
  const heading = useRef<HTMLHeadingElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const section = useRef<HTMLElement>(null);
  const pointerInside = useRef(false);
  const interactionLocked = useRef(false);
  const pending = useRef<CandidateView | null>(null);
  const committedRevision = useRef(revision);
  const registrationRevision = useRef<number | null>(null);
  const registrationPoint = useRef<{ x: number; y: number } | null>(null);
  const hasLow =
    analysis.kind === "judged" &&
    analysis.results.some((result) => result.status === "low");
  const calculating = view.revision !== revision;

  // passive effect より先に新しい commit を記録し、旧予約の結果を排除する。
  useLayoutEffect(() => {
    committedRevision.current = revision;
  }, [revision]);

  // ボタンの無効化を DOM に反映してから、再計算を待たずに移す（DES-UI-42）。
  useLayoutEffect(() => {
    if (!locked) return;
    heading.current?.focus({ preventScroll: true });
  }, [locked]);

  // 登録で状態が変わらない場合も、次の計算結果を待たず固定を解く（DES-UI-42）。
  useLayoutEffect(() => {
    if (!locked || registrationRevision.current !== revision) return;
    interactionLocked.current = false;
    setLocked(false);
    setHeight(undefined);
  }, [locked, revision]);

  // 再配置で pointerleave が発生しても固定を解かない。実際の欄外移動で解く。
  useEffect(() => {
    if (!locked) return;
    const onPointerMove = (event: PointerEvent) => {
      const point = registrationPoint.current;
      if (point && event.clientX === point.x && event.clientY === point.y)
        return;
      if (!section.current?.contains(event.target as Node)) {
        pointerInside.current = false;
        registrationPoint.current = null;
        publish(pending.current);
      }
    };
    const atRegistrationPoint = (event: MouseEvent) => {
      const point = registrationPoint.current;
      return Boolean(
        point &&
        Math.abs(event.clientX - point.x) < 2 &&
        Math.abs(event.clientY - point.y) < 2,
      );
    };
    const guardRepeat = (event: MouseEvent) => {
      if (!atRegistrationPoint(event)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerdown", guardRepeat, true);
    document.addEventListener("mousedown", guardRepeat, true);
    document.addEventListener("click", guardRepeat, true);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerdown", guardRepeat, true);
      document.removeEventListener("mousedown", guardRepeat, true);
      document.removeEventListener("click", guardRepeat, true);
    };
  }, [locked]);

  function publish(next: CandidateView | null) {
    if (!next || next.revision !== committedRevision.current) return;
    const buttonFocused = Boolean(
      section.current?.querySelector("button:focus"),
    );
    if (interactionLocked.current && (pointerInside.current || buttonFocused))
      return;
    interactionLocked.current = false;
    pending.current = null;
    setLocked(false);
    setHeight(undefined);
    setView(next);
  }

  useEffect(() => {
    pending.current = null;
    return scheduleSuggestions(() => {
      if (committedRevision.current !== revision) return;
      const start = performance.now();
      const suggestions = hasLow
        ? suggestSupplements(state, foodsById, candidates)
        : [];
      performance.clearMeasures("weekmeal:candidate-calculation");
      performance.measure("weekmeal:candidate-calculation", {
        start,
        end: performance.now(),
        detail: { revision, count: candidates.length },
      });
      if (committedRevision.current !== revision) return;
      const next = { revision, suggestions };
      setReady(next);
      pending.current = next;
      publish(next);
    });
  }, [state, revision, hasLow]);

  function register(suggestion: SupplementSuggestion) {
    if (interactionLocked.current || calculating) return;
    // React の再描画を待たず、同じ位置への連続イベントも止める。
    registrationRevision.current = revision;
    interactionLocked.current = true;
    pending.current = null;
    setLocked(true);
    setHeight(list.current?.getBoundingClientRect().height);
    const shopping = latestShopping(state.shoppings);
    if (!shopping) return;
    const action: BasketAction = {
      shoppingId: shopping.id,
      type: "register",
      id: localId("item"),
      foodId: suggestion.foodId,
      displayName: suggestion.displayName,
    };
    setMessage((current) => ({
      text: registerMessage(state, action),
      seq: current.seq + 1,
    }));
    dispatch(action);
    heading.current?.focus({ preventScroll: true });
  }

  if (!hasLow && !locked)
    return message.text ? (
      <p role="status" key={message.seq}>
        {message.text}
      </p>
    ) : null;
  return (
    <section
      className="section-stack supplement-panel"
      aria-labelledby="supplement-heading"
      data-candidates-revision={view.revision}
      aria-busy={ready?.revision !== revision}
      ref={section}
      onPointerDownCapture={(event) => {
        if (
          !interactionLocked.current &&
          event.target instanceof Element &&
          event.target.closest("button[data-food-id]")
        )
          registrationPoint.current = { x: event.clientX, y: event.clientY };
        // 登録通知の挿入で同じ座標がリスト外になっても、見出しから離さない。
        if (interactionLocked.current) event.preventDefault();
      }}
      onMouseDownCapture={(event) => {
        // 互換マウスイベントでもフォーカス解除・連打による選択を防ぐ（DES-UI-42）。
        if (interactionLocked.current) event.preventDefault();
      }}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") pointerInside.current = true;
      }}
      onPointerLeave={() => {
        if (!interactionLocked.current) pointerInside.current = false;
      }}
      onBlur={(event) => {
        if (
          !(event.relatedTarget instanceof HTMLButtonElement) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          queueMicrotask(() => publish(pending.current));
      }}
    >
      <h3 id="supplement-heading" ref={heading} tabIndex={-1}>
        不足を補う候補
      </h3>
      <p className="balance-note" aria-live="off">
        {ready?.revision !== revision
          ? "候補を計算中"
          : locked
            ? "候補欄の外へポインターを動かすと、更新した候補を表示します"
            : "押すと1単位登録します"}
      </p>
      {message.text && (
        <p role="status" key={message.seq}>
          {message.text}
        </p>
      )}
      <ul className="supplement-list" ref={list} style={{ minHeight: height }}>
        {view.suggestions.map((suggestion) => (
          <li
            key={suggestion.foodId}
            style={{
              visibility:
                locked &&
                ready?.revision === revision &&
                !ready.suggestions.some(
                  (next) => next.foodId === suggestion.foodId,
                )
                  ? "hidden"
                  : undefined,
            }}
          >
            <SuggestionButton
              suggestion={suggestion}
              disabled={calculating || locked}
              onRegister={() => register(suggestion)}
            />
          </li>
        ))}
      </ul>
      {!calculating && !locked && view.suggestions.length === 0 && (
        <p>今の条件で不足を減らせる候補がありません</p>
      )}
    </section>
  );
}

/** 候補の単位・改善する不足・注意を文字で伝える（DES-UI-42）。 */
export function SuggestionButton({
  suggestion,
  disabled,
  onRegister,
}: {
  suggestion: SupplementSuggestion;
  disabled: boolean;
  onRegister: () => void;
}) {
  const weight = Object.hasOwn(unitWeights, suggestion.displayName)
    ? unitWeights[suggestion.displayName]
    : undefined;
  const names = (keys: SupplementSuggestion["improvedKeys"]) =>
    keys.map(nutrientLabel).join("・");
  return (
    <button
      type="button"
      className="supplement-button"
      disabled={disabled}
      onClick={onRegister}
      data-food-id={suggestion.foodId}
    >
      <strong>{suggestion.displayName}</strong>
      <span>1 {weight?.unit ?? "つ"}</span>
      <span>補う不足：{names(suggestion.improvedKeys)}</span>
      {suggestion.approximate && <span>1 つ 100g の概算</span>}
      {suggestion.newHighKeys.length > 0 && (
        <span>新しい過剰：{names(suggestion.newHighKeys)}</span>
      )}
      {suggestion.newLowKeys.length > 0 && (
        <span>新しい不足：{names(suggestion.newLowKeys)}</span>
      )}
      {suggestion.worsenedHighKeys.length > 0 && (
        <span>過剰がさらに増える：{names(suggestion.worsenedHighKeys)}</span>
      )}
    </button>
  );
}
