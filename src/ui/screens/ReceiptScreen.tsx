import { useMemo, useRef, useState } from "react";
import {
  latestShopping,
  planRegisterMany,
  type AppState,
  type BasketAction,
  type BasketEntry,
} from "../../core/basket";
import {
  groupFoods,
  isRegistrable,
  normalizeSearchText,
  representativeFood,
} from "../../core/catalog";
import {
  parseReceiptText,
  receiptPrompt,
  type ReceiptCandidate,
} from "../../core/receipt";
import {
  convertQuantity,
  unitWeightFor,
  type Quantity,
} from "../../core/quantity";
import { baseFoods } from "../foodData";
import { localDate } from "../localDate";
import { localId } from "../ids";
import type { Route } from "../route";

type ReviewRow = ReceiptCandidate & {
  enabled: boolean;
  nameDraft: string;
  amountDraft: string;
  unit: "count" | "g" | "kg";
};

/** 確認欄に量を表示する（DES-RCP-04、DES-UI-49）。 */
function amountText(quantity: Quantity): string {
  return quantity.kind === "count"
    ? String(quantity.count)
    : String(quantity.grams / (quantity.unit === "kg" ? 1000 : 1));
}

/** 確認欄の量を検証する（DES-RCP-04、DES-QTY-03）。 */
function readAmount(
  row: ReviewRow,
): { quantity: Quantity } | { error: string } {
  const value = row.amountDraft.trim();
  if (row.unit === "count") {
    const count = Number(value);
    return /^\d+(?:\.\d+)?$/.test(value) &&
      count >= 0.5 &&
      count <= 999 &&
      Number.isInteger(count * 2)
      ? { quantity: { kind: "count", count } }
      : { error: "個数は 0.5 刻みで 0.5 から 999 まで入力してください" };
  }
  if (
    !/^(?:\d+|\d+\.\d{1,3})$/.test(value) ||
    (row.unit === "g" && !/^\d+$/.test(value))
  )
    return {
      error:
        row.unit === "g"
          ? "g は整数で入力してください"
          : "kg は小数第 3 位までで入力してください",
    };
  const grams = Number(value) * (row.unit === "kg" ? 1000 : 1);
  return Number.isInteger(grams) && grams >= 1 && grams <= 100000
    ? { quantity: { kind: "weight", grams, unit: row.unit } }
    : { error: "重さは 1 g から 100,000 g までで入力してください" };
}

/** レシートの指示文・貼り付け・確認・一括登録（DES-RCP-01、04、DES-UI-49）。 */
export function ReceiptScreen({
  state,
  shoppingId,
  dispatch,
  navigate,
  onRegistered,
}: {
  state: AppState;
  shoppingId: string | null;
  dispatch: (action: BasketAction) => void;
  navigate: (route: Route, shoppingId?: string) => void;
  onRegistered: (
    text: string,
    route: "home" | "historyDetail",
    shoppingId?: string,
  ) => void;
}) {
  const catalog = useMemo(
    () => ({
      foods: groupFoods(baseFoods.filter(isRegistrable)).map((group) => ({
        displayName: group.name,
        foodId: representativeFood(group).id,
      })),
      manualFoods: state.manualFoods.map((food) => ({
        displayName: food.name,
        foodId: food.id,
      })),
    }),
    [state.manualFoods],
  );
  const names = useMemo(
    () => [...catalog.foods, ...catalog.manualFoods],
    [catalog],
  );
  const prompt = useMemo(
    () => receiptPrompt(names.map((food) => food.displayName)),
    [names],
  );
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [unmatched, setUnmatched] = useState<{ line: number; text: string }[]>(
    [],
  );
  const [read, setRead] = useState(false);
  const [copyFallback, setCopyFallback] = useState(false);
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const amountRefs = useRef(new Map<number, HTMLInputElement>());
  const target = state.shoppings.find((shopping) => shopping.id === shoppingId);
  const exactName = (value: string) =>
    names.find(
      (entry) =>
        normalizeSearchText(entry.displayName.normalize("NFKC")) ===
        normalizeSearchText(value.normalize("NFKC")),
    );
  const errors = rows.map((row) => {
    if (!row.enabled) return "";
    if (!exactName(row.nameDraft)) return "一覧の食材名を選んでください";
    const amount = readAmount(row);
    return "error" in amount ? amount.error : "";
  });
  const selectedCount = rows.filter((row) => row.enabled).length;
  const update = (index: number, changes: Partial<ReviewRow>) =>
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...changes } : row)),
    );

  async function copyPrompt() {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(prompt);
      setCopyFallback(false);
    } catch {
      setCopyFallback(true);
      requestAnimationFrame(() => fallbackRef.current?.select());
    }
  }

  function parse() {
    const result = parseReceiptText(text, catalog);
    setRows(
      result.candidates.map((candidate) => ({
        ...candidate,
        enabled: true,
        nameDraft: candidate.displayName,
        amountDraft: amountText(candidate.quantity),
        unit:
          candidate.quantity.kind === "count"
            ? "count"
            : candidate.quantity.unit,
      })),
    );
    setUnmatched(result.unmatched);
    setRead(true);
    requestAnimationFrame(() => reviewHeadingRef.current?.focus());
  }

  function register() {
    if (!selectedCount || errors.some(Boolean)) return;
    const id = target?.id ?? localId("shopping");
    const date = target?.date ?? localDate();
    const initialShopping = target ? undefined : { id, date };
    const entries: BasketEntry[] = [];
    for (const row of rows) {
      if (!row.enabled) continue;
      const food = exactName(row.nameDraft);
      const amount = readAmount(row);
      if (!food || "error" in amount) return;
      entries.push({
        id: localId("item"),
        foodId: food.foodId,
        displayName: food.displayName,
        quantity: amount.quantity,
      });
    }
    const shopping = target ?? {
      id,
      date,
      origin: "normal" as const,
      items: [],
    };
    const planned = planRegisterMany(
      shopping,
      entries,
      target ? state.shoppings : [shopping],
    );
    if (planned.registeredCount > 0)
      dispatch({
        type: "registerMany",
        shoppingId: id,
        entries,
        initialShopping,
      });
    const latest = latestShopping(
      target ? state.shoppings : [...state.shoppings, shopping],
    );
    const destination = latest?.id === id ? "home" : "historyDetail";
    const suffix = [
      unmatched.length ? `登録しない物 ${unmatched.length} 件` : "",
      planned.clampedCount ? `上限で止めた ${planned.clampedCount} 件` : "",
    ].filter(Boolean);
    onRegistered(
      `レシートから ${planned.registeredCount} 件を登録しました${suffix.length ? `（${suffix.join("、")}）` : ""}`,
      destination,
      destination === "historyDetail" ? id : undefined,
    );
    navigate(destination, destination === "historyDetail" ? id : undefined);
  }

  return (
    <div className="screen-stack" aria-label="レシートから登録画面">
      <header className="screen-header">
        <div>
          <p className="food-id">レシートから登録</p>
          <h2>レシートの食材を貼り付ける</h2>
        </div>
      </header>
      <p>登録先：{target?.date ?? "最初の登録で今日の買い物を作成"}</p>
      <button
        className="link-button"
        type="button"
        onClick={() => navigate("register", shoppingId ?? undefined)}
      >
        登録画面へ戻る
      </button>
      <section
        className="notice-panel"
        aria-labelledby="receipt-prompt-heading"
      >
        <h3 id="receipt-prompt-heading">1. 外部の AI に渡す指示文</h3>
        <p>
          レシートの画像と次の指示文を、ご自身で開いた外部の AI
          のページに渡してください。このアプリからは送信しません。
        </p>
        <button
          className="primary-button"
          type="button"
          onClick={() => void copyPrompt()}
        >
          指示文をコピー
        </button>
        <pre
          className="receipt-prompt"
          tabIndex={0}
          aria-label="外部の AI に渡す指示文"
        >
          {prompt}
        </pre>
        {copyFallback && (
          <>
            <p role="status">
              コピーできませんでした。下の文章を長押ししてコピーしてください。
            </p>
            <textarea
              ref={fallbackRef}
              readOnly
              value={prompt}
              aria-label="コピー用の指示文"
              rows={8}
            />
          </>
        )}
      </section>
      <section className="notice-panel" aria-labelledby="receipt-paste-heading">
        <h3 id="receipt-paste-heading">2. テキストを貼り付ける</h3>
        <label className="form-field">
          レシートの食材のテキスト
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
          />
        </label>
        <button
          className="primary-button"
          type="button"
          onClick={parse}
          disabled={!text.trim()}
        >
          読み取る
        </button>
      </section>
      {read && (
        <section
          className="notice-panel"
          aria-labelledby="receipt-review-heading"
        >
          <h3 id="receipt-review-heading" ref={reviewHeadingRef} tabIndex={-1}>
            3. 登録内容を確認
          </h3>
          {rows.length === 0 && <p>登録できる食材は見つかりませんでした。</p>}
          <ul className="receipt-review-list">
            {rows.map((row, index) => (
              <li className="receipt-review-row" key={`${row.line}-${index}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(event) =>
                      update(index, { enabled: event.target.checked })
                    }
                  />
                  {row.line} 行目を登録する
                </label>
                <label className="form-field">
                  食材名
                  <input
                    list="receipt-names"
                    value={row.nameDraft}
                    onChange={(event) =>
                      update(index, { nameDraft: event.target.value })
                    }
                    aria-invalid={Boolean(
                      errors[index] && !exactName(row.nameDraft),
                    )}
                    aria-describedby={
                      errors[index] && !exactName(row.nameDraft)
                        ? `receipt-error-${index}`
                        : undefined
                    }
                  />
                </label>
                <div className="receipt-quantity">
                  <div
                    role="group"
                    aria-label={`${row.line} 行目の量の単位`}
                    className="item-unit-toggle"
                  >
                    {(["count", "g", "kg"] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        aria-pressed={row.unit === unit}
                        disabled={
                          "error" in readAmount(row) && row.unit !== unit
                        }
                        onClick={() => {
                          if (row.unit === unit) return;
                          const current = readAmount(row);
                          if ("error" in current) return;
                          const quantity = convertQuantity(
                            current.quantity,
                            unit,
                            unitWeightFor(
                              exactName(row.nameDraft)?.foodId ?? row.foodId,
                              exactName(row.nameDraft)?.displayName ??
                                row.displayName,
                            ),
                          );
                          update(index, {
                            unit,
                            amountDraft: amountText(quantity),
                          });
                          requestAnimationFrame(() =>
                            amountRefs.current.get(index)?.focus(),
                          );
                        }}
                      >
                        {unit === "count" ? "個" : unit}
                      </button>
                    ))}
                  </div>
                  <label className="form-field">
                    量
                    <input
                      ref={(element) => {
                        if (element) amountRefs.current.set(index, element);
                        else amountRefs.current.delete(index);
                      }}
                      inputMode="decimal"
                      value={row.amountDraft}
                      onChange={(event) =>
                        update(index, { amountDraft: event.target.value })
                      }
                      aria-invalid={Boolean(
                        errors[index] && exactName(row.nameDraft),
                      )}
                      aria-describedby={
                        [
                          row.needsCheck ? `receipt-check-${index}` : "",
                          errors[index] && exactName(row.nameDraft)
                            ? `receipt-error-${index}`
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                    />
                  </label>
                </div>
                {row.needsCheck && (
                  <p id={`receipt-check-${index}`}>量を確かめてください</p>
                )}
                {errors[index] && (
                  <p id={`receipt-error-${index}`} role="alert">
                    {errors[index]}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <datalist id="receipt-names">
            {names.map((entry) => (
              <option
                key={`${entry.foodId}-${entry.displayName}`}
                value={entry.displayName}
              />
            ))}
          </datalist>
          {unmatched.length > 0 && (
            <div className="receipt-unmatched">
              <h4>登録しない物 {unmatched.length} 件</h4>
              <ul>
                {unmatched.map((item) => (
                  <li key={item.line}>{item.text}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            className="primary-button"
            type="button"
            disabled={selectedCount === 0 || errors.some(Boolean)}
            onClick={register}
          >
            {selectedCount} 件を登録
          </button>
        </section>
      )}
    </div>
  );
}
