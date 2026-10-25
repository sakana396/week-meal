import {
  maximumCount,
  minimumCount,
  type BasketAction,
  type BasketEntry,
} from "../../core/basket";
import { unitWeights } from "../../data/unitWeights";
import { formatCount } from "../format";

/**
 * 登録した食材 1 行（DES-UI-40）。個数の −/＋（0.5 刻み）、使い切った・戻す、削除。
 * 同じ食材名の行が 2 つあるときは、正式名称の短い説明（detail）を添える。
 */
export function ItemRow({
  item,
  detail,
  dispatch,
}: {
  item: BasketEntry;
  detail: string | null;
  dispatch: (action: BasketAction) => void;
}) {
  const weight = Object.hasOwn(unitWeights, item.displayName)
    ? unitWeights[item.displayName]
    : undefined;
  const unit = weight ? weight.unit : "つ（概算）";

  return (
    <li className="item-row" data-entry-id={item.id} data-used-up={item.usedUp}>
      <div className="item-name">
        <strong>{item.displayName}</strong>
        {detail && <small>{detail}</small>}
        {item.usedUp && <small>使い切った</small>}
      </div>
      <div
        aria-label={`${item.displayName}の個数`}
        className="item-count"
        role="group"
      >
        <button
          aria-label={`${item.displayName}を 0.5 減らす`}
          disabled={item.usedUp || item.count <= minimumCount}
          onClick={() => dispatch({ type: "decrement", id: item.id })}
          type="button"
        >
          −
        </button>
        <span>
          {formatCount(item.count)} {unit}
        </span>
        <button
          aria-label={`${item.displayName}を 0.5 増やす`}
          disabled={item.usedUp || item.count >= maximumCount}
          onClick={() => dispatch({ type: "increment", id: item.id })}
          type="button"
        >
          ＋
        </button>
      </div>
      <div className="item-actions">
        <button
          aria-label={
            item.usedUp
              ? `${item.displayName}を使い切った から戻す`
              : `${item.displayName}を使い切った`
          }
          onClick={() => dispatch({ type: "toggleUsedUp", id: item.id })}
          type="button"
        >
          {item.usedUp ? "戻す" : "使い切った"}
        </button>
        <button
          aria-label={`${item.displayName}を削除`}
          className="danger-button"
          onClick={() => dispatch({ type: "remove", id: item.id })}
          type="button"
        >
          削除
        </button>
      </div>
    </li>
  );
}
