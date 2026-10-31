import { useEffect, useMemo, useRef, useState } from "react";
import {
  latestShopping,
  type AppState,
  type BasketAction,
} from "../../core/basket";
import {
  foodPresentation,
  groupFoods,
  isRegistrable,
  normalizeSearchText,
  prioritizeSupermarketFoods,
  registrableShelves,
  representativeFood,
  supermarketPriority,
  type FoodGroup,
} from "../../core/catalog";
import {
  manualDraftFrom,
  manualFoodShelf,
  type ManualFood,
} from "../../core/manualFoods";
import { foodShelf, type FoodShelf } from "../../data/foodShelves";
import { nutrientDefinitions } from "../../data/nutrients";
import type { FoodItem, NutrientKey } from "../../types";
import { baseFoods } from "../foodData";
import { parseManualValue } from "../format";
import { localId } from "../ids";
import { localDate } from "../localDate";
import { registerMessage } from "../registerMessage";
import type { Route } from "../route";

const maxVisibleFoods = 80;

type RegisterCategory = "すべて" | FoodShelf;
type RegisterMode = "simple" | "detailed";

type ManualFoodForm = {
  name: string;
  category: FoodShelf;
  nutrientsPer100g: Record<NutrientKey, string>;
  sourceFoodId?: string;
};

const registerCategories: RegisterCategory[] = [
  "すべて",
  ...registrableShelves,
];

// 米・パン・麺・調味料・油は登録の一覧に出さない（DES-UI-34、FR-ING-09）
const registrableFoods = baseFoods.filter(isRegistrable);

/** 手入力を初期化する（DES-UI-43）。 */
function emptyManualForm(): ManualFoodForm {
  return {
    name: "",
    category: "野菜",
    nutrientsPer100g: Object.fromEntries(
      nutrientDefinitions.map((definition) => [definition.key, ""]),
    ) as Record<NutrientKey, string>,
  };
}

/** 保存された番号を来歴として表示する（DES-UI-44、DES-STO-08）。 */
function draftSourceLabel(sourceFoodId: string): string {
  const source = baseFoods.find((food) => food.id === sourceFoodId);
  return source
    ? `下書き元: ${source.name}（食品番号 ${sourceFoodId}）。登録値は手入力`
    : `下書き元: 食品番号 ${sourceFoodId}（現在の食品データにはありません）。登録値は手入力`;
}

/**
 * 食材登録（DES-UI-21, 30〜37）。食材名を押すと登録し、登録画面に留まって知らせる（P-09）。
 */
export function RegisterScreen({
  state,
  dispatch,
  shoppingId,
  navigate,
  replaceRoute,
}: {
  state: AppState;
  shoppingId: string | null;
  navigate: (route: Route, shoppingId?: string) => void;
  replaceRoute: (route: Route, shoppingId?: string) => void;
  dispatch: (action: BasketAction) => void;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<RegisterMode>("simple");
  const [category, setCategory] = useState<RegisterCategory>("すべて");
  const [manualForm, setManualForm] = useState<ManualFoodForm>(emptyManualForm);
  const [nutrientsOpen, setNutrientsOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState("");
  const manualNameRef = useRef<HTMLInputElement>(null);
  const draftFoods = useMemo(() => {
    const normalized = normalizeSearchText(draftQuery);
    return normalized
      ? baseFoods.filter(
          (food) =>
            normalizeSearchText(food.name).includes(normalized) ||
            normalizeSearchText(food.id).includes(normalized),
        )
      : [];
  }, [draftQuery]);
  // 同じ文言が続いても読み上げ直し・表示し直すよう、連番を持つ
  const [message, setMessage] = useState({ text: "", seq: 0 });

  // お知らせは 4 秒で消す（一覧のボタンの文字を覆い続けないように）
  useEffect(() => {
    if (!message.text) return;
    const timer = window.setTimeout(
      () =>
        setMessage((current) =>
          current.seq === message.seq ? { ...current, text: "" } : current,
        ),
      4000,
    );
    return () => window.clearTimeout(timer);
  }, [message]);

  const filteredFoods = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    const categoryFoods =
      category === "すべて"
        ? registrableFoods
        : registrableFoods.filter((food) => foodShelf(food) === category);
    return normalizedQuery
      ? categoryFoods.filter((food) => {
          const presentation = foodPresentation(food.name, food.category);
          const target = normalizeSearchText(
            `${food.name}${presentation.name}${presentation.details}${food.category}`,
          );
          return target.includes(normalizedQuery);
        })
      : categoryFoods;
  }, [category, query]);

  const groups = useMemo(() => {
    const grouped = groupFoods(filteredFoods);
    return normalizeSearchText(query)
      ? grouped
      : prioritizeSupermarketFoods(grouped);
  }, [filteredFoods, query]);

  const detailedFoods = useMemo(
    () =>
      // 簡易モードでは詳細用の並べ替えを行わない（DES-UI-30, 31, 33）。
      mode === "simple"
        ? []
        : [...filteredFoods].sort((left, right) => {
            if (!query.trim()) {
              const leftPriority = supermarketPriority(
                foodPresentation(left.name, left.category).name,
              );
              const rightPriority = supermarketPriority(
                foodPresentation(right.name, right.category).name,
              );
              if (leftPriority !== null || rightPriority !== null) {
                if (leftPriority === null) return 1;
                if (rightPriority === null) return -1;
                if (leftPriority !== rightPriority)
                  return leftPriority - rightPriority;
              }
            }
            return left.name.localeCompare(right.name, "ja-JP");
          }),
    [filteredFoods, query, mode],
  );

  // 台帳は新しい順のまま全件を対象とし、通常食品の表示上限に含めない（DES-UI-43）。
  const rememberedFoods = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    const counts = new Map<string, number>();
    const totals = new Map<string, number>();
    const keyFor = (food: FoodItem) =>
      JSON.stringify([food.name, manualFoodShelf(food) ?? "その他"]);
    for (const food of state.manualFoods) {
      const key = keyFor(food);
      totals.set(key, (totals.get(key) ?? 0) + 1);
    }
    // 番号は古い保存順で付け、表示は新しい順に戻す（DES-MAN-01、DES-UI-43）。
    return [...state.manualFoods]
      .reverse()
      .map((food) => {
        const key = keyFor(food);
        const number = (counts.get(key) ?? 0) + 1;
        counts.set(key, number);
        return {
          food,
          shelf: manualFoodShelf(food) ?? "その他",
          number: (totals.get(key) ?? 0) > 1 ? number : null,
        };
      })
      .reverse()
      .filter(
        ({ food, shelf }) =>
          (category === "すべて" || shelf === category) &&
          normalizeSearchText(food.name).includes(normalizedQuery),
      );
  }, [state.manualFoods, category, query]);

  const visibleDraftFoods = draftFoods.slice(0, maxVisibleFoods);
  const visibleGroups = groups.slice(0, maxVisibleFoods);
  const visibleDetailedFoods = detailedFoods.slice(0, maxVisibleFoods);
  const commonCount = visibleGroups.filter(
    (group) => group.supermarketPriority !== null,
  ).length;
  const total = mode === "simple" ? groups.length : detailedFoods.length;

  function register(
    action: Extract<BasketAction, { type: "register" | "addManualFood" }>,
  ) {
    const initialShopping =
      shoppingId === null && state.shoppings.length === 0
        ? { id: localId("shopping"), date: localDate() }
        : undefined;
    const targeted = {
      ...action,
      shoppingId: shoppingId ?? initialShopping?.id ?? "",
      initialShopping,
    };
    const text = registerMessage(state, targeted);
    dispatch(targeted);
    if (initialShopping) replaceRoute("register", initialShopping.id);
    setMessage((current) => ({ text, seq: current.seq + 1 }));
  }

  function registerGroup(group: FoodGroup) {
    const food = representativeFood(group);
    register({
      type: "register",
      shoppingId: "",
      id: localId("item"),
      foodId: food.id,
      displayName: group.name,
    });
  }

  function registerFood(food: FoodItem) {
    const displayName = foodPresentation(food.name, food.category).name;
    register({
      type: "register",
      shoppingId: "",
      id: localId("item"),
      foodId: food.id,
      displayName,
    });
  }

  /** 明示選択した食品で全成分欄と来歴を置き換える（DES-MAN-02、DES-UI-44）。 */
  function applyManualDraft(food: FoodItem) {
    const draft = manualDraftFrom(food);
    setManualForm((current) => ({
      ...current,
      sourceFoodId: draft.sourceFoodId,
      nutrientsPer100g: Object.fromEntries(
        nutrientDefinitions.map(({ key }) => [
          key,
          draft.nutrientsPer100g[key]?.toString() ?? "",
        ]),
      ) as ManualFoodForm["nutrientsPer100g"],
    }));
  }

  /** 登録成功・クリアで開閉と検索も初期化する（DES-UI-43、44）。 */
  function clearManualForm() {
    setManualForm(emptyManualForm());
    setNutrientsOpen(false);
    setDraftQuery("");
  }

  function addManualFood(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = manualForm.name.trim();
    if (!name) {
      setMessage((current) => ({
        text: "食材名を入れてください",
        seq: current.seq + 1,
      }));
      return;
    }
    const food: ManualFood = {
      id: localId("manual"),
      name,
      category: `手入力 / ${manualForm.category}`,
      refusePct: null,
      ...(manualForm.sourceFoodId
        ? { sourceFoodId: manualForm.sourceFoodId }
        : {}),
      nutrientsPer100g: Object.fromEntries(
        nutrientDefinitions.map((definition) => [
          definition.key,
          parseManualValue(manualForm.nutrientsPer100g[definition.key]),
        ]),
      ) as FoodItem["nutrientsPer100g"],
    };
    register({
      type: "addManualFood",
      shoppingId: "",
      id: localId("item"),
      food,
      displayName: name,
    });
    clearManualForm();
  }

  return (
    <div className="screen-stack" aria-label="食材登録画面">
      <header className="screen-header">
        <div>
          <p className="food-id">食材登録</p>
          <h2>買った食材を選ぶ</h2>
        </div>
        <span className="category-pill">押すと 1 つ登録</span>
      </header>

      <p>
        登録先：
        {state.shoppings.find((shopping) => shopping.id === shoppingId)?.date ??
          "最初の登録で今日の買い物を作成"}
      </p>
      {shoppingId && (
        <button
          className="link-button"
          type="button"
          onClick={() =>
            navigate(
              shoppingId === latestShopping(state.shoppings)?.id
                ? "home"
                : "historyDetail",
              shoppingId === latestShopping(state.shoppings)?.id
                ? undefined
                : shoppingId,
            )
          }
        >
          {shoppingId === latestShopping(state.shoppings)?.id
            ? "ホームへ戻る"
            : "買い物へ戻る"}
        </button>
      )}

      <section className="register-mode-panel" aria-label="入力モード">
        <div>
          <strong>入力モード</strong>
          <span>
            {mode === "simple"
              ? "一般的な食材名から、すぐに登録します"
              : "文科省データを食品番号ごとに選びます"}
          </span>
        </div>
        <div
          className="register-mode-switch"
          role="group"
          aria-label="入力モード選択"
        >
          <button
            aria-pressed={mode === "simple"}
            data-active={mode === "simple"}
            onClick={() => setMode("simple")}
            type="button"
          >
            簡易
          </button>
          <button
            aria-pressed={mode === "detailed"}
            data-active={mode === "detailed"}
            onClick={() => setMode("detailed")}
            type="button"
          >
            詳細
          </button>
        </div>
      </section>

      <div
        className="category-picker"
        role="group"
        aria-label="スーパーの棚を選択"
      >
        {registerCategories.map((shelf) => (
          <button
            aria-pressed={category === shelf}
            data-active={category === shelf}
            key={shelf}
            onClick={() => {
              setCategory(shelf);
              if (shelf !== "すべて") {
                setManualForm((current) => ({ ...current, category: shelf }));
              }
            }}
            type="button"
          >
            {shelf}
          </button>
        ))}
      </div>

      <section className="section-stack">
        <div className="section-heading">
          <h3>食材を探す</h3>
          <p>
            {total.toLocaleString("ja-JP")} 種類
            {total > maxVisibleFoods ? ` / 先頭${maxVisibleFoods}件を表示` : ""}
          </p>
        </div>

        {!query.trim() && mode === "simple" && (
          <p className="priority-note">
            スーパーで見つけやすい食材を先に表示しています
            {commonCount > 0 ? `（優先表示 ${commonCount}種類）` : ""}
          </p>
        )}
        {mode === "detailed" && (
          <p className="priority-note">
            正式名称・状態・食品番号を確認して、使うデータを直接選べます
          </p>
        )}

        <label className="search-field">
          <span>食材名</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例: 玉ねぎ、じゃがいも、鶏肉"
          />
        </label>

        {mode === "simple" && visibleGroups.length > 0 ? (
          <div className="ingredient-name-list" aria-label="食材名一覧">
            {visibleGroups.map((group) => (
              <button
                className="ingredient-name-button"
                key={group.key}
                onClick={() => registerGroup(group)}
                type="button"
              >
                <span className="ingredient-title">
                  <strong>{group.name}</strong>
                  {group.supermarketPriority !== null && !query.trim() && (
                    <span className="common-food-badge">よくある</span>
                  )}
                </span>
                <small>タップして登録</small>
              </button>
            ))}
          </div>
        ) : mode === "detailed" && visibleDetailedFoods.length > 0 ? (
          <div
            className="ingredient-name-list"
            aria-label="文科省食品データ一覧"
          >
            {visibleDetailedFoods.map((food) => {
              const presentation = foodPresentation(food.name, food.category);
              const isCommon = supermarketPriority(presentation.name) !== null;
              return (
                <button
                  className="ingredient-name-button detailed-food-button"
                  key={food.id}
                  onClick={() => registerFood(food)}
                  type="button"
                >
                  <span className="ingredient-title">
                    <strong>{presentation.name}</strong>
                    {isCommon && !query.trim() && (
                      <span className="common-food-badge">よくある</span>
                    )}
                  </span>
                  <span>{food.name}</span>
                  <small>
                    食品番号 {food.id} / {food.category}
                  </small>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty-result">
            <strong>該当する食材がありません</strong>
            <span>検索語や棚を変えるか、下の手入力で追加してください。</span>
          </div>
        )}
        {query.trim() !== "" && total === 0 && rememberedFoods.length === 0 && (
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setManualForm((current) => ({ ...current, name: query.trim() }));
              manualNameRef.current?.focus();
            }}
          >
            この名前で手入力
          </button>
        )}
      </section>

      {rememberedFoods.length > 0 && (
        <section className="section-stack" aria-label="覚えた食材">
          <div className="section-heading">
            <h3>覚えた食材</h3>
            <p>{rememberedFoods.length} 種類</p>
          </div>
          <div className="ingredient-name-list">
            {rememberedFoods.map(({ food, shelf, number }) => (
              <button
                className="ingredient-name-button"
                key={food.id}
                disabled={!food.name.trim()}
                type="button"
                onClick={() =>
                  register({
                    type: "register",
                    shoppingId: "",
                    id: localId("item"),
                    foodId: food.id,
                    displayName: food.name,
                  })
                }
              >
                <strong>
                  {food.name.trim() ? food.name : "（名前なし）"}
                  {number !== null ? `（${number}）` : ""}
                </strong>
                <small>手入力 / {shelf}</small>
                {food.sourceFoodId && (
                  <small>{draftSourceLabel(food.sourceFoodId)}</small>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      <form className="section-stack" onSubmit={addManualFood}>
        <div className="section-heading">
          <h3>手入力で追加</h3>
          <p>一覧にない食材（成分は分かる分だけでよい）</p>
        </div>

        <label className="form-field">
          <span>食材名</span>
          <input
            required
            ref={manualNameRef}
            value={manualForm.name}
            onChange={(event) =>
              setManualForm((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            placeholder="例: 自家製スープ"
          />
        </label>

        <div className="form-field">
          <label htmlFor="manual-food-shelf">棚</label>
          <select
            id="manual-food-shelf"
            value={manualForm.category}
            onChange={(event) =>
              setManualForm((current) => ({
                ...current,
                category: event.target.value as FoodShelf,
              }))
            }
          >
            {registrableShelves.map((shelf) => (
              <option key={shelf} value={shelf}>
                {shelf}
              </option>
            ))}
          </select>
        </div>

        <details
          className="manual-nutrients"
          open={nutrientsOpen}
          onToggle={(event) => setNutrientsOpen(event.currentTarget.open)}
        >
          <summary>成分を入力・似た食品から下書き（任意）</summary>
          <div className="section-stack">
            <label className="search-field">
              <span>似た食品を探す</span>
              <input
                type="search"
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="正式名称・食品番号で検索"
              />
            </label>
            {draftQuery.trim() && (
              <div
                className="ingredient-name-list manual-draft-results"
                role="group"
                aria-label="下書き元の食品一覧"
              >
                {visibleDraftFoods.map((food) => (
                  <button
                    type="button"
                    className="ingredient-name-button"
                    key={food.id}
                    onClick={() => applyManualDraft(food)}
                  >
                    <strong>{food.name}</strong>
                    <small>食品番号 {food.id}</small>
                    <span>この食品の成分で下書きを置き換える</span>
                  </button>
                ))}
                {draftFoods.length > maxVisibleFoods && (
                  <p>さらに絞り込んでください</p>
                )}
                {draftFoods.length === 0 && <p>該当する食品がありません</p>}
              </div>
            )}
            <div className="nutrient-input-grid">
              {nutrientDefinitions.map((definition) => (
                <label className="form-field" key={definition.key}>
                  <span>
                    {definition.label}（{definition.unit} / 100g）
                  </span>
                  <input
                    inputMode="decimal"
                    min="0"
                    onChange={(event) =>
                      setManualForm((current) => ({
                        ...current,
                        nutrientsPer100g: {
                          ...current.nutrientsPer100g,
                          [definition.key]: event.target.value,
                        },
                      }))
                    }
                    placeholder="未入力ならデータなし"
                    step="any"
                    type="number"
                    value={manualForm.nutrientsPer100g[definition.key]}
                  />
                </label>
              ))}
            </div>
          </div>
        </details>
        {manualForm.sourceFoodId && (
          <p className="balance-note">
            {draftSourceLabel(manualForm.sourceFoodId)}
          </p>
        )}
        <p className="balance-note">
          エネルギーを入れない食材は、栄養の判定には数えません。
        </p>

        <div className="form-actions">
          <button className="primary-button" type="submit">
            登録する
          </button>
          <button type="button" onClick={clearManualForm}>
            入力をクリア
          </button>
        </div>
      </form>

      {/* 画面の最後に置き、一覧と手入力のどちらをスクロールしていても画面の下に見えるようにする */}
      <p className="register-message" role="status" aria-live="polite">
        {message.text && <span key={message.seq}>{message.text}</span>}
      </p>
    </div>
  );
}
