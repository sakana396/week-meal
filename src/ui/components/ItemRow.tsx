import { memo, useRef, useState } from "react";
import {
  maximumCount,
  minimumCount,
  type BasketAction,
  type BasketEntry,
} from "../../core/basket";
import {
  convertQuantity,
  unitWeightFor,
  type Quantity,
} from "../../core/quantity";
import { formatCount } from "../format";
import { weightHintText } from "../weightHint";

/** 重さの欄へ表示する数値（DES-UI-49）。 */
function weightText(quantity: Quantity): string {
  return quantity.kind === "weight"
    ? String(quantity.grams / (quantity.unit === "kg" ? 1000 : 1))
    : "";
}

/** 保存値が変わったとき入力中の表示を区別する（DES-UI-49）。 */
function quantityKey(quantity: Quantity): string {
  return quantity.kind === "count"
    ? `count:${quantity.count}`
    : `weight:${quantity.unit}:${quantity.grams}`;
}

/** 重さの入力を整数の g に直す（DES-QTY-03、DES-UI-49）。 */
function parseWeight(
  value: string,
  unit: "g" | "kg",
): { grams: number } | { error: string } {
  const input = value.trim();
  if (
    !/^(?:\d+|\d+\.\d{1,3})$/.test(input) ||
    (unit === "g" && !/^\d+$/.test(input))
  )
    return {
      error:
        unit === "g"
          ? "g は整数で入力してください"
          : "kg は小数第 3 位までで入力してください",
    };
  const grams = Math.round(Number(input) * (unit === "kg" ? 1000 : 1));
  if (!Number.isInteger(grams) || grams < 1 || grams > 100000)
    return { error: "重さは 1 g から 100,000 g までで入力してください" };
  return { grams };
}

/** 登録した食材 1 行の量・目安重量・削除（DES-UI-40、49、DES-QTY-07、DES-PER-05）。 */
export const ItemRow = memo(function ItemRow({
  item,
  shoppingId,
  detail,
  dispatch,
}: {
  item: BasketEntry;
  shoppingId: string;
  detail: string | null;
  dispatch: (action: BasketAction) => void;
}) {
  const weight = unitWeightFor(item.foodId, item.displayName);
  const unit = weight ? weight.unit : "つ（概算）";
  const hint = weightHintText(weight);
  const selected =
    item.quantity.kind === "count" ? "count" : item.quantity.unit;
  const currentQuantityKey = quantityKey(item.quantity);
  const [draftState, setDraftState] = useState(() => ({
    key: currentQuantityKey,
    value: weightText(item.quantity),
  }));
  const draft =
    draftState.key === currentQuantityKey
      ? draftState.value
      : weightText(item.quantity);
  const [error, setError] = useState("");
  const errorId = `weight-error-${item.id}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const countFocusRef = useRef<HTMLButtonElement>(null);
  const decrementFocusRef = useRef<HTMLButtonElement>(null);
  const changeUnit = (to: "count" | "g" | "kg") => {
    if (to === selected) return;
    let source = item.quantity;
    if (source.kind === "weight") {
      const result = parseWeight(draft, source.unit);
      if ("error" in result) {
        setError(result.error);
        inputRef.current?.focus();
        return;
      }
      source = { ...source, grams: result.grams };
    }
    const quantity = convertQuantity(source, to, weight);
    dispatch({ type: "setQuantity", shoppingId, id: item.id, quantity });
    setDraftState({ key: quantityKey(quantity), value: weightText(quantity) });
    setError("");
    requestAnimationFrame(() => {
      if (to === "count") {
        (quantity.kind === "count" && quantity.count >= maximumCount
          ? decrementFocusRef.current
          : countFocusRef.current
        )?.focus();
      } else inputRef.current?.focus();
    });
  };
  const commitWeight = () => {
    if (item.quantity.kind !== "weight") return;
    const result = parseWeight(draft, item.quantity.unit);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setError("");
    setDraftState({
      key: quantityKey({ ...item.quantity, grams: result.grams }),
      value: String(result.grams / (item.quantity.unit === "kg" ? 1000 : 1)),
    });
    if (result.grams === item.quantity.grams) return;
    dispatch({
      type: "setQuantity",
      shoppingId,
      id: item.id,
      quantity: {
        kind: "weight",
        grams: result.grams,
        unit: item.quantity.unit,
      },
    });
  };

  return (
    <li className="item-row" data-entry-id={item.id}>
      <div className="item-name">
        <strong>{item.displayName}</strong>
        {detail && <small>{detail}</small>}
      </div>
      <div className="item-quantity">
        <div
          className="item-unit-toggle"
          role="group"
          aria-label={`${item.displayName}の量の単位`}
        >
          {(["count", "g", "kg"] as const).map((to) => (
            <button
              key={to}
              type="button"
              aria-label={`${item.displayName}を ${to === "count" ? "個" : to} に切り替える`}
              aria-pressed={selected === to}
              onClick={() => changeUnit(to)}
            >
              {to === "count" ? "個" : to}
            </button>
          ))}
        </div>
        {item.quantity.kind === "count" ? (
          <>
            <div
              aria-label={`${item.displayName}の個数`}
              className="item-count"
              role="group"
            >
              <button
                ref={decrementFocusRef}
                aria-label={`${item.displayName}を 0.5 減らす`}
                disabled={item.quantity.count <= minimumCount}
                onClick={() =>
                  dispatch({ type: "decrement", shoppingId, id: item.id })
                }
                type="button"
              >
                −
              </button>
              <span>{`${formatCount(item.quantity.count)} ${unit}`}</span>
              <button
                ref={countFocusRef}
                aria-label={`${item.displayName}を 0.5 増やす`}
                disabled={item.quantity.count >= maximumCount}
                onClick={() =>
                  dispatch({ type: "increment", shoppingId, id: item.id })
                }
                type="button"
              >
                ＋
              </button>
            </div>
            <small className="item-weight-hint">{hint}</small>
          </>
        ) : (
          <div className="item-weight-field">
            <label>
              {item.displayName}の重さ
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={draft}
                aria-invalid={error ? "true" : undefined}
                aria-describedby={error ? errorId : undefined}
                onChange={(event) => {
                  setDraftState({
                    key: currentQuantityKey,
                    value: event.target.value,
                  });
                  setError("");
                }}
                onBlur={commitWeight}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
            </label>
            <span>{item.quantity.unit}</span>
            {error && (
              <small id={errorId} role="alert">
                {error}
              </small>
            )}
          </div>
        )}
      </div>
      <div className="item-actions">
        <button
          aria-label={`${item.displayName}を削除`}
          className="danger-button"
          onClick={() => dispatch({ type: "remove", shoppingId, id: item.id })}
          type="button"
        >
          削除
        </button>
      </div>
    </li>
  );
});
