import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { BasketEntry } from "../../core/basket";
import { ItemRow } from "./ItemRow";

it.each([
  [{ kind: "count", count: 2 }, ">2 つ（概算）</span>"],
  [{ kind: "weight", grams: 2000, unit: "kg" }, ">2 kg</span>"],
] as const)(
  "TC-NFR-03-05 行の再描画抑制後も量と操作を表示する %s",
  (quantity, visibleQuantity) => {
    const item: BasketEntry = {
      id: "item-1",
      foodId: "manual-1",
      displayName: "試料",
      quantity,
    };
    const html = renderToStaticMarkup(
      <ItemRow
        item={item}
        shoppingId="shopping-1"
        detail="手入力"
        dispatch={vi.fn()}
      />,
    );
    expect(html).toContain("試料");
    expect(html).toContain("手入力");
    expect(html).toContain(visibleQuantity);
    expect(html).not.toContain("item-details");
  },
);

it.each([
  ["06061", "キャベツ"],
  ["manual-1", "試料"],
] as const)(
  "TC-NFR-03-05 閉じた行の操作の名前を保つ %s",
  (foodId, displayName) => {
    const item: BasketEntry = {
      id: "item-1",
      foodId,
      displayName,
      quantity: { kind: "count", count: 2 },
    };
    const html = renderToStaticMarkup(
      <ItemRow
        item={item}
        shoppingId="shopping-1"
        detail={null}
        dispatch={vi.fn()}
      />,
    );
    expect(html).toContain(`${displayName}を 0.5 増やす`);
    expect(html).not.toContain("item-details");
    expect(html).toContain('class="item-row"');
  },
);
