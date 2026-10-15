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
    expect(loadAppState(store, known)).toEqual({
      state: saved,
      issue: null,
      backedUp: false,
      available: true,
    });
  });

  it("TC-NFR-12-29 読めない保存データは、書き出す前に退避する", () => {
    const store = memoryStore({ [storageKey]: "{壊れた" });
    const result = loadAppState(store, known);
    expect(result).toMatchObject({
      state: initialAppState,
      issue: "corrupted",
      backedUp: true,
    });
    expect(store.data[backupKey]).toBe("{壊れた");
  });

  it("TC-NFR-12-30 新しすぎる版の保存データも退避して残す（境界）", () => {
    const newer = JSON.stringify({
      ...JSON.parse(serializeState(saved)),
      version: 99,
    });
    const store = memoryStore({ [storageKey]: newer });
    loadAppState(store, known);
    expect(store.data[backupKey]).toBe(newer);
  });

  it("TC-FR-SYS-01-06 localStorage が使えないときは、初期状態で保存せずに動く（異常）", () => {
    expect(loadAppState(null, known)).toEqual({
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
    expect(loadAppState(broken, known)).toMatchObject({
      available: false,
      issue: null,
    });
  });
});
