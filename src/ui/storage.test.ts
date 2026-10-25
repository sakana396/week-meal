import { describe, expect, it } from "vitest";
import { basketReducer, initialAppState } from "../core/basket";
import { serializeState } from "../core/storage";
import {
  backupKey,
  loadAppState,
  saveAppState,
  storageKey,
  type KeyValueStore,
} from "./storage";

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const known = new Set(["06212"]);
const saved = basketReducer(initialAppState, {
  type: "register",
  id: "r1",
  foodId: "06212",
  displayName: "にんじん",
});

describe("loadAppState・saveAppState（DES-UI-13）", () => {
  it("TC-FR-SYS-01-05 書き出した状態を、次に開いたときに読み込める", () => {
    const store = memoryStore();
    expect(saveAppState(store, saved)).toBe(true);
    expect(loadAppState({ store, writable: true }, known)).toEqual({
      state: saved,
      issue: null,
      backedUp: false,
      available: true,
    });
  });

  it("TC-NFR-12-29 読めない保存データは、書き出す前に退避する", () => {
    const store = memoryStore({ [storageKey]: "{壊れた" });
    const result = loadAppState({ store, writable: true }, known);
    expect(result).toMatchObject({
      state: initialAppState,
      issue: "corrupted",
      backedUp: true,
      available: true,
    });
    expect(store.data[backupKey]).toBe("{壊れた");
  });

  it("TC-NFR-12-30 新しすぎる版の保存データも退避して残す（境界）", () => {
    const newer = JSON.stringify({
      ...JSON.parse(serializeState(saved)),
      version: 99,
    });
    const store = memoryStore({ [storageKey]: newer });
    loadAppState({ store, writable: true }, known);
    expect(store.data[backupKey]).toBe(newer);
  });

  it("TC-FR-SYS-01-06 localStorage が使えないときは、初期状態で保存せずに動く（異常）", () => {
    expect(loadAppState({ store: null, writable: false }, known)).toEqual({
      state: initialAppState,
      issue: null,
      backedUp: false,
      available: false,
    });
    expect(saveAppState(null, saved)).toBe(false);
  });

  it("TC-FR-SYS-01-07 書き出しで例外が出たら false を返す（容量不足など。異常）", () => {
    const full: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(saveAppState(full, saved)).toBe(false);
  });

  it("TC-FR-SYS-01-08 読み込みで例外が出たら、保存できないものとして動く（異常）", () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => undefined,
    };
    expect(
      loadAppState({ store: broken, writable: true }, known),
    ).toMatchObject({
      available: false,
      issue: null,
    });
  });

  it("TC-NFR-12-31 読めない保存データを退避できなければ、元のデータを上書きしないよう書き出さない（異常）", () => {
    const data: Record<string, string> = { [storageKey]: "{壊れた" };
    const noBackup: KeyValueStore = {
      getItem: (key) => data[key] ?? null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const result = loadAppState({ store: noBackup, writable: true }, known);
    expect(result).toMatchObject({
      issue: "corrupted",
      backedUp: false,
      available: false,
    });
    expect(data[storageKey]).toBe("{壊れた");
  });

  it("TC-FR-SYS-01-09 書き込めない（容量がいっぱい）ときも、保存データは読み込む（境界）", () => {
    const store = memoryStore({ [storageKey]: serializeState(saved) });
    expect(loadAppState({ store, writable: false }, known)).toEqual({
      state: saved,
      issue: null,
      backedUp: false,
      available: false,
    });
  });
});

it.each([
  { version: 99, items: [] },
  { version: 1, items: "不正" },
  { version: 2, items: "不正" },
])("TC-NFR-13-14 全体不正な保存データは原文のまま退避する（%j）", (stored) => {
  const text = JSON.stringify(stored);
  const store = memoryStore({ [storageKey]: text });
  expect(loadAppState({ store, writable: true }, known)).toMatchObject({
    state: initialAppState,
    issue: "corrupted",
    available: true,
    backedUp: true,
  });
  expect(store.data[backupKey]).toBe(text);
  expect(store.data[storageKey]).toBe(text);
});
