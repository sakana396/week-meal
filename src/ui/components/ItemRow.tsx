import { memo } from "react";
import {
  maximumCount,
  minimumCount,
  type BasketAction,
  type BasketEntry,
} from "../../core/basket";
import { unitWeights } from "../../data/unitWeights";
import { formatCount } from "../format";

/**
 * 登録した食材 1 行（DES-UI-40、DES-PER-05）。個数の −/＋（0.5 刻み）と削除。
 * 同じ食材名の行が 2 つあるときは、正式名称の短い説明（detail）を添える。
 */
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
  const weight = Object.hasOwn(unitWeights, item.displayName)
    ? unitWeights[item.displayName]
    : undefined;
  const unit = weight ? weight.unit : "つ（概算）";

  return (
    <li className="item-row" data-entry-id={item.id}>
      <div className="item-name">
        <strong>{item.displayName}</strong>
        {detail && <small>{detail}</small>}
      </div>
      <div
        aria-label={`${item.displayName}の個数`}
        className="item-count"
        role="group"
      >
        <button
          aria-label={`${item.displayName}を 0.5 減らす`}
          disabled={
            item.quantity.kind !== "count" ||
            item.quantity.count <= minimumCount
          }
          onClick={() =>
            dispatch({ type: "decrement", shoppingId, id: item.id })
          }
          type="button"
        >
          −
        </button>
        <span>
          {item.quantity.kind === "count"
            ? `${formatCount(item.quantity.count)} ${unit}`
            : `${item.quantity.grams / (item.quantity.unit === "kg" ? 1000 : 1)} ${item.quantity.unit}`}
        </span>
        <button
          aria-label={`${item.displayName}を 0.5 増やす`}
          disabled={
            item.quantity.kind !== "count" ||
            item.quantity.count >= maximumCount
          }
          onClick={() =>
            dispatch({ type: "increment", shoppingId, id: item.id })
          }
          type="button"
        >
          ＋
        </button>
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
