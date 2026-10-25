import { ageGroups } from "../data/dietaryReference";
import { nutrientDefinitions } from "../data/nutrients";
import type { NutrientsPer100g } from "../types";
import {
  initialAppState,
  maximumCount,
  minimumCount,
  type AppState,
  type BasketEntry,
} from "./basket";
import type { ManualFood } from "./manualFoods";
import { defaultProfile, type Profile } from "./profile";

/** 保存データの版（DES-STO-07、ADR-0004）。形を変えたら上げ、migrations に移行を足す */
export const storageVersion = 2;

/** 手入力の食品の ID の接頭辞（DES-BSK-08） */
export const manualFoodIdPrefix = "manual-";

/** 読み込みで起きた問題（DES-STO-02） */
export type StorageIssue =
  null | "corrupted" | { droppedItems: number; profileReset: boolean };

/** 移行の途中の保存データ */
export type StoredState = { version: number } & Record<string, unknown>;

export type Migrations = Record<number, (stored: StoredState) => StoredState>;

/**
 * 旧い版を 1 つ新しい版に直す関数（DES-STO-07、NFR-13）。
 * キーは移行前の版。
 */
const migrations: Migrations = { 1: migrateV1ToV2 };

/** 版 1 の全台帳・登録行・設定を保ち、移行後に通常の検査へ渡す（DES-STO-08）。 */
export function migrateV1ToV2(stored: StoredState): StoredState {
  return { ...stored, version: 2 };
}

/** 状態を保存用の JSON 文字列にする（DES-STO-01、FR-SYS-01） */
export function serializeState(state: AppState): string {
  return JSON.stringify({
    version: storageVersion,
    items: state.items,
    manualFoods: state.manualFoods,
    profile: state.profile,
  });
}

/**
 * 保存データを今の版まで 1 つずつ移行する（DES-STO-07）。
 * 移行の関数がない、例外を出す、版が上がらない・今の版を飛び越えるときは null を返す。
 */
export function migrateStored(
  stored: StoredState,
  table: Migrations,
  targetVersion: number,
): StoredState | null {
  let current = stored;
  while (current.version < targetVersion) {
    const migrate = table[current.version];
    if (!migrate) return null;
    let next: StoredState;
    try {
      next = migrate(current);
    } catch {
      // 移行の関数が想定外の形のデータで失敗したときは、読めなかったものとして扱う
      return null;
    }
    if (
      !isRecord(next) ||
      typeof next.version !== "number" ||
      !(next.version > current.version) ||
      next.version > targetVersion
    ) {
      return null;
    }
    current = next;
  }
  return current;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** 設定を検査し、4 項目だけで作り直す（DES-STO-06） */
function parseProfile(value: unknown): Profile | null {
  if (!isRecord(value)) return null;
  const { sex, ageGroup, staple, portion } = value;
  if (
    (sex === "male" || sex === "female" || sex === "unspecified") &&
    ageGroups.includes(ageGroup as Profile["ageGroup"]) &&
    (staple === "rice" ||
      staple === "bread" ||
      staple === "noodle" ||
      staple === "none") &&
    (portion === "small" || portion === "medium" || portion === "large")
  ) {
    return { sex, ageGroup: ageGroup as Profile["ageGroup"], staple, portion };
  }
  return null;
}

/** 手入力の食品を検査し、検査した項目だけで作り直す（DES-STO-05） */
function parseManualFood(
  value: unknown,
  knownFoodIds: ReadonlySet<string>,
): ManualFood | null {
  if (!isRecord(value)) return null;
  const { id, name, category, refusePct, nutrientsPer100g } = value;
  if (
    !isNonEmptyString(id) ||
    !id.startsWith(manualFoodIdPrefix) ||
    knownFoodIds.has(id) ||
    typeof name !== "string" ||
    typeof category !== "string"
  ) {
    return null;
  }
  const refuseOk =
    refusePct === null ||
    (typeof refusePct === "number" &&
      Number.isFinite(refusePct) &&
      refusePct >= 0 &&
      refusePct <= 100);
  if (!refuseOk || !isRecord(nutrientsPer100g)) return null;

  const nutrients: Partial<NutrientsPer100g> = {};
  for (const { key } of nutrientDefinitions) {
    const nutrient = nutrientsPer100g[key];
    if (nutrient === null || nutrient === undefined) {
      nutrients[key] = null;
    } else if (
      typeof nutrient === "number" &&
      Number.isFinite(nutrient) &&
      nutrient >= 0
    ) {
      nutrients[key] = nutrient;
    } else {
      return null;
    }
  }
  return {
    id,
    name,
    category,
    refusePct: refusePct as number | null,
    nutrientsPer100g: nutrients as NutrientsPer100g,
    ...(isNonEmptyString(value.sourceFoodId)
      ? { sourceFoodId: value.sourceFoodId }
      : {}),
  };
}

/** 行を検査し、作り直す（DES-STO-04） */
function parseEntry(
  value: unknown,
  usableFoodIds: ReadonlySet<string>,
): BasketEntry | null {
  if (!isRecord(value)) return null;
  const { id, foodId, displayName, count, usedUp } = value;
  const ok =
    isNonEmptyString(id) &&
    typeof foodId === "string" &&
    usableFoodIds.has(foodId) &&
    isNonEmptyString(displayName) &&
    typeof count === "number" &&
    Number.isInteger(count * 2) &&
    count >= minimumCount &&
    count <= maximumCount &&
    typeof usedUp === "boolean";
  return ok ? { id, foodId, displayName, count, usedUp } : null;
}

/**
 * 保存データを読み込む（DES-STO-02〜07、NFR-12, 13）。
 * - 保存データがなければ初期状態（問題なし）
 * - JSON として読めない・形が違う・版がない／新しすぎる／移行できないときは、初期状態と "corrupted"
 * - 形のおかしい行、使える食品のない行、ID が重複した行は捨て、捨てた件数を返す
 * - 手入力の食品は形を確かめ、おかしいものは捨て、未参照でも覚えた食品として残す（DES-STO-08）
 * - 設定の形が違う・ないときは初期値にし、profileReset で知らせる
 */
export function parseStoredState(
  text: string | null,
  knownFoodIds: ReadonlySet<string>,
  table: Migrations = migrations,
  targetVersion: number = storageVersion,
): { state: AppState; issue: StorageIssue } {
  const corrupted = { state: initialAppState, issue: "corrupted" as const };
  if (text === null) return { state: initialAppState, issue: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return corrupted;
  }
  if (
    !isRecord(parsed) ||
    typeof parsed.version !== "number" ||
    !Number.isInteger(parsed.version) ||
    parsed.version < 1 ||
    parsed.version > targetVersion
  ) {
    return corrupted;
  }

  const stored = migrateStored(parsed as StoredState, table, targetVersion);
  if (!stored || !Array.isArray(stored.items)) return corrupted;

  const rawManualFoods = Array.isArray(stored.manualFoods)
    ? stored.manualFoods
    : [];
  const manualById = new Map<string, ManualFood>();
  for (const value of rawManualFoods) {
    const food = parseManualFood(value, knownFoodIds);
    if (food && !manualById.has(food.id)) manualById.set(food.id, food);
  }
  const usableIds = new Set([...knownFoodIds, ...manualById.keys()]);

  const seenIds = new Set<string>();
  const items: BasketEntry[] = [];
  for (const value of stored.items) {
    const entry = parseEntry(value, usableIds);
    if (!entry || seenIds.has(entry.id)) continue;
    seenIds.add(entry.id);
    items.push(entry);
  }
  const manualFoods = [...manualById.values()];

  const profile = parseProfile(stored.profile);
  const droppedItems = stored.items.length - items.length;
  const issue: StorageIssue =
    droppedItems > 0 || !profile
      ? { droppedItems, profileReset: !profile }
      : null;

  return {
    state: { items, manualFoods, profile: profile ?? defaultProfile },
    issue,
  };
}
