import { ageGroups } from "../data/dietaryReference";
import { nutrientDefinitions } from "../data/nutrients";
import type { NutrientsPer100g } from "../types";
import {
  initialAppState,
  maximumCount,
  minimumCount,
  type AppState,
  validShoppingDate,
  type BasketEntry,
  type Shopping,
} from "./basket";
import type { ManualFood } from "./manualFoods";
import { defaultProfile, type Profile } from "./profile";

/** 保存データの版（DES-STO-07、ADR-0004）。形を変えたら上げ、migrations に移行を足す */
export const storageVersion = 3;

/** 手入力の食品の ID の接頭辞（DES-BSK-08） */
export const manualFoodIdPrefix = "manual-";

/** 読み込みで起きた問題（DES-STO-02） */
export type StorageIssue =
  null | "corrupted" | { droppedItems: number; profileReset: boolean };

/** 移行の途中の保存データ */
export type StoredState = { version: number } & Record<string, unknown>;

/** 版 2 の移行先は画面が用意する（DES-STO-10）。 */
export type MigrationContext = {
  date: string;
  shoppingIds: { usedUp: string; normal: string };
};
export type Migrations = Record<
  number,
  (stored: StoredState, context?: MigrationContext) => StoredState
>;
const migrations: Migrations = { 1: migrateV1ToV2, 2: migrateV2ToV3 };

/** 版 1 の台帳・登録行・設定を保つ（DES-STO-08）。 */
export function migrateV1ToV2(stored: StoredState): StoredState {
  return { ...stored, version: 2 };
}

/** 使い切った行を別の買い物へ分ける（DES-STO-10）。 */
export function migrateV2ToV3(
  stored: StoredState,
  context?: MigrationContext,
): StoredState {
  if (
    !context ||
    !validShoppingDate(context.date) ||
    !context.shoppingIds.usedUp ||
    !context.shoppingIds.normal ||
    context.shoppingIds.usedUp === context.shoppingIds.normal ||
    !Array.isArray(stored.items)
  ) {
    return stored;
  }
  const active = stored.items
    .filter((value) => !isRecord(value) || value.usedUp !== true)
    .map(stripUsedUp);
  const used = stored.items
    .filter((value) => isRecord(value) && value.usedUp === true)
    .map(stripUsedUp);
  const shoppings: Shopping[] = [];
  if (used.length > 0)
    shoppings.push({
      id: context.shoppingIds.usedUp,
      date: context.date,
      origin: "usedUpMigration",
      items: used as BasketEntry[],
    });
  if (active.length > 0 || used.length > 0)
    shoppings.push({
      id: context.shoppingIds.normal,
      date: context.date,
      origin: "normal",
      items: active as BasketEntry[],
    });
  return {
    version: 3,
    shoppings,
    manualFoods: stored.manualFoods,
    profile: stored.profile,
  };
}

function stripUsedUp(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const { id, foodId, displayName, count } = value;
  return { id, foodId, displayName, count };
}

/** 版 3 の JSON に直す（DES-STO-10、12）。 */
export function serializeState(state: AppState): string {
  return JSON.stringify({
    version: storageVersion,
    shoppings: state.shoppings,
    manualFoods: state.manualFoods,
    profile: state.profile,
  });
}

/**
 * 保存データを今の版まで 1 つずつ移行する（DES-STO-07、10）。
 * 移行の関数がない、例外を出す、版が上がらない・今の版を飛び越えるときは null を返す。
 */
export function migrateStored(
  stored: StoredState,
  table: Migrations,
  targetVersion: number,
  context?: MigrationContext,
): StoredState | null {
  let current = stored;
  while (current.version < targetVersion) {
    const migrate = table[current.version];
    if (!migrate) return null;
    let next: StoredState;
    try {
      next = migrate(current, context);
    } catch {
      return null;
    }
    if (
      !isRecord(next) ||
      typeof next.version !== "number" ||
      next.version !== current.version + 1 ||
      next.version > targetVersion
    )
      return null;
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

/** 行を検査し、余計なキーを落とす（DES-STO-11）。 */
function parseEntry(
  value: unknown,
  usableFoodIds: ReadonlySet<string>,
): BasketEntry | null {
  if (!isRecord(value)) return null;
  const { id, foodId, displayName, count } = value;
  return isNonEmptyString(id) &&
    typeof foodId === "string" &&
    usableFoodIds.has(foodId) &&
    isNonEmptyString(displayName) &&
    typeof count === "number" &&
    Number.isInteger(count * 2) &&
    count >= minimumCount &&
    count <= maximumCount
    ? { id, foodId, displayName, count }
    : null;
}

/** 保存データを検査し、読み込める行だけ残す（DES-STO-10、11）。 */
export function parseStoredState(
  text: string | null,
  knownFoodIds: ReadonlySet<string>,
  table: Migrations = migrations,
  targetVersion: number = storageVersion,
  context?: MigrationContext,
): { state: AppState; issue: StorageIssue; migrated: boolean } {
  const corrupted = {
    state: initialAppState,
    issue: "corrupted" as const,
    migrated: false,
  };
  if (text === null)
    return { state: initialAppState, issue: null, migrated: false };
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
  )
    return corrupted;
  const migrated = parsed.version < targetVersion;
  const stored = migrateStored(
    parsed as StoredState,
    table,
    targetVersion,
    context,
  );
  if (!stored || !Array.isArray(stored.shoppings)) return corrupted;
  const manualById = new Map<string, ManualFood>();
  const rawManualFoods = Array.isArray(stored.manualFoods)
    ? stored.manualFoods
    : [];
  for (const value of rawManualFoods) {
    const food = parseManualFood(value, knownFoodIds);
    if (food && !manualById.has(food.id)) manualById.set(food.id, food);
  }
  const usableIds = new Set([...knownFoodIds, ...manualById.keys()]);
  const shoppingIds = new Set<string>();
  const entryIds = new Set<string>();
  const shoppings: Shopping[] = [];
  let droppedItems = 0;
  for (const value of stored.shoppings) {
    if (
      !isRecord(value) ||
      !isNonEmptyString(value.id) ||
      typeof value.date !== "string" ||
      !validShoppingDate(value.date) ||
      (value.origin !== "normal" && value.origin !== "usedUpMigration") ||
      !Array.isArray(value.items)
    ) {
      droppedItems +=
        isRecord(value) && Array.isArray(value.items)
          ? Math.max(1, value.items.length)
          : 1;
      continue;
    }
    if (shoppingIds.has(value.id)) {
      droppedItems += value.items.length;
      continue;
    }
    shoppingIds.add(value.id);
    const items: BasketEntry[] = [];
    for (const raw of value.items) {
      const entry = parseEntry(raw, usableIds);
      if (!entry || entryIds.has(entry.id)) {
        droppedItems++;
        continue;
      }
      entryIds.add(entry.id);
      items.push(entry);
    }
    shoppings.push({
      id: value.id,
      date: value.date,
      origin: value.origin,
      items,
    });
  }
  const profile = parseProfile(stored.profile);
  const issue: StorageIssue =
    droppedItems > 0 || !profile
      ? { droppedItems, profileReset: !profile }
      : null;
  return {
    state: {
      shoppings,
      manualFoods: [...manualById.values()],
      profile: profile ?? defaultProfile,
    },
    issue,
    migrated,
  };
}
