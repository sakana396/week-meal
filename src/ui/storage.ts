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

/** ブラウザの保存先と、書き込めるかどうか */
export type BrowserStore = { store: KeyValueStore | null; writable: boolean };

/**
 * localStorage を開く（DES-UI-13）。読めるかどうかと書き込めるかどうかを分けて調べ、
 * 容量がいっぱいで書き込めないときも、保存データの読み込みは試せるようにする。
 * プライベートモードなどで localStorage そのものが使えなければ store は null。
 */
export function openBrowserStore(): BrowserStore {
  let store: Storage;
  try {
    store = window.localStorage;
  } catch {
    return { store: null, writable: false };
  }
  try {
    const probe = "weekmeal:probe";
    store.setItem(probe, "1");
    store.removeItem(probe);
    return { store, writable: true };
  } catch {
    return { store, writable: false };
  }
}

/**
 * 起動時に保存データを読み込む（DES-UI-13）。
 * 読めなかったときは、書き出す前に元の文字列を退避する（新しい版のデータを消さないため）。
 * 退避できなかったときは、元のデータを上書きしないよう、書き出さない（available を false にする）。
 */
export function loadAppState(
  { store, writable }: BrowserStore,
  foodIds: ReadonlySet<string> = knownFoodIds,
): LoadResult {
  const unavailable = {
    state: initialAppState,
    issue: null,
    backedUp: false,
    available: false,
  };
  if (!store) return unavailable;
  let text: string | null;
  try {
    text = store.getItem(storageKey);
  } catch {
    return unavailable;
  }
  const { state, issue } = parseStoredState(text, foodIds);
  if (issue !== "corrupted" || text === null) {
    return { state, issue, backedUp: false, available: writable };
  }
  let backedUp = false;
  if (writable) {
    try {
      store.setItem(backupKey, text);
      backedUp = true;
    } catch {
      backedUp = false;
    }
  }
  return { state, issue, backedUp, available: writable && backedUp };
}

/** 状態を書き出す。書き出せなければ false（DES-UI-13） */
export function saveAppState(
  store: KeyValueStore | null,
  state: AppState,
): boolean {
  if (!store) return false;
  try {
    store.setItem(storageKey, serializeState(state));
    return true;
  } catch {
    return false;
  }
}
