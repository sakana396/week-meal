import { initialAppState, type AppState } from "../core/basket";
import {
  parseStoredState,
  serializeState,
  type StorageIssue,
  type MigrationContext,
} from "../core/storage";
import { knownFoodIds } from "./foodData";
import { localId } from "./ids";
import { localDate } from "./localDate";

/** 保存先のキー（ADR-0004） */
export const storageKey = "weekmeal:state";
/** 読めなかった保存データの退避先（DES-STO、ADR-0004） */
export const backupKey = "weekmeal:state:backup";
/** 移行・一部破棄した保存原文の退避先（DES-STO-10、11）。 */
export const backupMigrationKey = "weekmeal:state:backup-migration";

/** localStorage のうち、使う操作だけ */
export type KeyValueStore = Pick<Storage, "getItem" | "setItem">;

export type LoadResult = {
  state: AppState;
  issue: StorageIssue;
  /** 破損・移行・一部破棄した保存原文を退避したか */
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
 * 破損・移行・一部破棄のときは、書き出す前に元の文字列を退避する（元のデータを消さないため）。
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
  const context: MigrationContext = {
    date: localDate(),
    shoppingIds: { usedUp: localId("shopping"), normal: localId("shopping") },
  };
  const { state, issue, migrated } = parseStoredState(
    text,
    foodIds,
    undefined,
    undefined,
    context,
  );
  if (issue === null && !migrated) {
    return { state, issue, backedUp: false, available: writable };
  }
  let backedUp = false;
  if (writable && text !== null) {
    try {
      store.setItem(
        issue === "corrupted" ? backupKey : backupMigrationKey,
        text,
      );
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
