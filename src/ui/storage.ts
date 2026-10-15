import { initialAppState, type AppState } from "../core/basket";
import {
  parseStoredState,
  serializeState,
  type StorageIssue,
} from "../core/storage";
import { knownFoodIds } from "./foodData";

/** 保存先のキー（ADR-0004） */
export const storageKey = "weekmeal:state";
/** 読めなかった保存データの退避先（DES-STO、ADR-0004） */
export const backupKey = "weekmeal:state:backup";

/** localStorage のうち、使う操作だけ */
export type KeyValueStore = Pick<Storage, "getItem" | "setItem">;

export type LoadResult = {
  state: AppState;
  issue: StorageIssue;
  /** 読めなかった保存データを退避したか */
  backedUp: boolean;
  /** 保存できるか（localStorage が使えるか） */
  available: boolean;
};

/** localStorage が使えれば返す。プライベートモードなどで使えなければ null（DES-UI-13） */
export function browserStore(): KeyValueStore | null {
  try {
    const store = window.localStorage;
    const probe = "weekmeal:probe";
    store.setItem(probe, "1");
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

/**
 * 起動時に保存データを読み込む（DES-UI-13）。
 * 読めなかったときは、書き出す前に元の文字列を退避する（新しい版のデータを消さないため）。
 */
export function loadAppState(
  store: KeyValueStore | null,
  foodIds: ReadonlySet<string> = knownFoodIds,
): LoadResult {
  if (!store) {
    return { state: initialAppState, issue: null, backedUp: false, available: false };
  }
  let text: string | null;
  try {
    text = store.getItem(storageKey);
  } catch {
    return { state: initialAppState, issue: null, backedUp: false, available: false };
  }
  const { state, issue } = parseStoredState(text, foodIds);
  let backedUp = false;
  if (issue === "corrupted" && text !== null) {
    try {
      store.setItem(backupKey, text);
      backedUp = true;
    } catch {
      backedUp = false;
    }
  }
  return { state, issue, backedUp, available: true };
}

/** 状態を書き出す。書き出せなければ false（DES-UI-13） */
export function saveAppState(store: KeyValueStore | null, state: AppState): boolean {
  if (!store) return false;
  try {
    store.setItem(storageKey, serializeState(state));
    return true;
  } catch {
    return false;
  }
}
