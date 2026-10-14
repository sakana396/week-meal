import { ageGroups } from "../data/dietaryReference";
import { nutrientDefinitions } from "../data/nutrients";
import type { FoodItem } from "../types";
import {
  initialAppState,
  minimumCount,
  type AppState,
  type BasketEntry,
} from "./basket";
import { defaultProfile, type Profile } from "./profile";

/** 保存データの版（DES-STO-04、ADR-0004）。形を変えたら上げ、migrations に移行を足す */
export const storageVersion = 1;

/** 読み込みで起きた問題（DES-STO-02） */
export type StorageIssue =
  null | "corrupted" | { droppedItems: number; profileReset: boolean };

type StoredState = {
  version: number;
  items: unknown;
  manualFoods?: unknown;
  profile?: unknown;
};

/**
 * 旧い版を 1 つ新しい版に直す関数（DES-STO-04、NFR-13）。
 * キーは移行前の版。版 1 が最初の版なので、今は空。
 */
const migrations: Record<number, (stored: StoredState) => StoredState> = {};

/** 状態を保存用の JSON 文字列にする（DES-STO-01、FR-SYS-01） */
export function serializeState(state: AppState): string {
  return JSON.stringify({
    version: storageVersion,
    items: state.items,
    manualFoods: state.manualFoods,
    profile: state.profile,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseProfile(value: unknown): Profile | null {
  if (!isRecord(value)) return null;
  const { sex, ageGroup, staple, portion } = value;
  const ok =
    (sex === "male" || sex === "female" || sex === "unspecified") &&
    ageGroups.includes(ageGroup as Profile["ageGroup"]) &&
    (staple === "rice" ||
      staple === "bread" ||
      staple === "noodle" ||
      staple === "none") &&
    (portion === "small" || portion === "medium" || portion === "large");
  return ok ? (value as Profile) : null;
}

function parseManualFood(value: unknown): FoodItem | null {
  if (!isRecord(value)) return null;
  const { id, name, category, refusePct, nutrientsPer100g } = value;
  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof category !== "string"
  ) {
    return null;
  }
  if (refusePct !== null && typeof refusePct !== "number") return null;
  if (!isRecord(nutrientsPer100g)) return null;
  const nutrientsOk = nutrientDefinitions.every(({ key }) => {
    const nutrient = nutrientsPer100g[key];
    return (
      nutrient === null || nutrient === undefined || Number.isFinite(nutrient)
    );
  });
  return nutrientsOk ? (value as FoodItem) : null;
}

function parseEntry(
  value: unknown,
  knownFoodIds: ReadonlySet<string>,
): BasketEntry | null {
  if (!isRecord(value)) return null;
  const { id, foodId, displayName, count, usedUp } = value;
  const ok =
    typeof id === "string" &&
    typeof foodId === "string" &&
    knownFoodIds.has(foodId) &&
    typeof displayName === "string" &&
    typeof count === "number" &&
    Number.isFinite(count) &&
    count >= minimumCount &&
    typeof usedUp === "boolean";
  return ok ? { id, foodId, displayName, count, usedUp } : null;
}

/**
 * 保存データを読み込む（DES-STO-02〜04、NFR-12, 13）。
 * - 保存データがなければ初期状態（問題なし）
 * - JSON として読めない・形が違う・版が新しすぎるときは、初期状態と "corrupted"
 * - 形のおかしい行や、食品データにも手入力にもない食品の行は捨て、捨てた件数を返す
 * - 設定の形が違うときは初期値にする
 */
export function parseStoredState(
  text: string | null,
  knownFoodIds: ReadonlySet<string>,
): { state: AppState; issue: StorageIssue } {
  if (text === null) return { state: initialAppState, issue: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { state: initialAppState, issue: "corrupted" };
  }
  if (
    !isRecord(parsed) ||
    typeof parsed.version !== "number" ||
    !Number.isInteger(parsed.version) ||
    parsed.version < 1 ||
    parsed.version > storageVersion
  ) {
    return { state: initialAppState, issue: "corrupted" };
  }

  let stored = parsed as StoredState;
  while (stored.version < storageVersion) {
    const migrate = migrations[stored.version];
    if (!migrate) return { state: initialAppState, issue: "corrupted" };
    stored = migrate(stored);
  }
  if (!Array.isArray(stored.items)) {
    return { state: initialAppState, issue: "corrupted" };
  }

  const rawManualFoods = Array.isArray(stored.manualFoods)
    ? stored.manualFoods
    : [];
  const manualFoods = rawManualFoods.flatMap((value) => {
    const food = parseManualFood(value);
    return food ? [food] : [];
  });
  const usableIds = new Set([
    ...knownFoodIds,
    ...manualFoods.map((food) => food.id),
  ]);

  const seenIds = new Set<string>();
  const items = stored.items.flatMap((value) => {
    const entry = parseEntry(value, usableIds);
    if (!entry || seenIds.has(entry.id)) return [];
    seenIds.add(entry.id);
    return [entry];
  });

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
