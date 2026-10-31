import { describe, expect, it } from "vitest";
import { basketReducer, initialAppState } from "./basket";
import { basketSessionReducer, type BasketSessionState } from "./basketSession";

const base = basketReducer(
  basketReducer(initialAppState, {
    type: "createShopping",
    id: "a",
    date: "2026-10-31",
  }),
  {
    type: "register",
    shoppingId: "a",
    id: "r",
    foodId: "06212",
    displayName: "にんじん",
  },
);
const session: BasketSessionState = { appState: base, pendingRemoval: null };

describe("行の取り消し（DES-SHP-02）", () => {
  it("TC-FR-ING-14-01 削除した位置へ行だけを戻す", () => {
    const removed = basketSessionReducer(session, {
      type: "remove",
      shoppingId: "a",
      id: "r",
    });
    expect(removed.pendingRemoval).toMatchObject({ shoppingId: "a", index: 0 });
    expect(
      basketSessionReducer(removed, { type: "undoRemove" }).appState,
    ).toEqual(base);
  });
  it("TC-FR-ING-20-02 買い物が消えたら復元しない", () => {
    const removed = basketSessionReducer(session, {
      type: "remove",
      shoppingId: "a",
      id: "r",
    });
    const deleted = basketSessionReducer(removed, {
      type: "removeShopping",
      shoppingId: "a",
    });
    expect(deleted.pendingRemoval).toBeNull();
    expect(basketSessionReducer(deleted, { type: "undoRemove" })).toBe(deleted);
  });
  it("TC-FR-ING-14-03 画面移動時に取り消し情報だけを消す", () => {
    const removed = basketSessionReducer(session, {
      type: "remove",
      shoppingId: "a",
      id: "r",
    });
    const cleared = basketSessionReducer(removed, {
      type: "clearPendingRemoval",
    });
    expect(cleared.pendingRemoval).toBeNull();
    expect(cleared.appState).toBe(removed.appState);
  });
  it("TC-FR-ING-14-03 同じ買い物の個数変更でも取り消しを消す", () => {
    const withTwo = basketReducer(base, {
      type: "register",
      shoppingId: "a",
      id: "x",
      foodId: "06061",
      displayName: "キャベツ",
    });
    const removed = basketSessionReducer(
      { appState: withTwo, pendingRemoval: null },
      { type: "remove", shoppingId: "a", id: "r" },
    );
    expect(
      basketSessionReducer(removed, {
        type: "increment",
        shoppingId: "a",
        id: "x",
      }).pendingRemoval,
    ).toBeNull();
  });
  it("TC-FR-ING-14-02 別の買い物の編集で取り消しを消す", () => {
    const withOther = {
      ...base,
      shoppings: [
        ...base.shoppings,
        { id: "b", date: "2026-10-31", origin: "normal" as const, items: [] },
      ],
    };
    const removed = basketSessionReducer(
      { appState: withOther, pendingRemoval: null },
      { type: "remove", shoppingId: "a", id: "r" },
    );
    const edited = basketSessionReducer(removed, {
      type: "register",
      shoppingId: "b",
      id: "x",
      foodId: "06212",
      displayName: "にんじん",
    });
    expect(edited.pendingRemoval).toBeNull();
  });
});
