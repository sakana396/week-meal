import { useMemo, useState } from "react";
import type { AppState, BasketAction } from "../../core/basket";
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
import { foodShelf, type FoodShelf } from "../../data/foodShelves";
import {
  basicNutrientDefinitions,
  nutrientDefinitions,
} from "../../data/nutrients";
import type { FoodItem, NutrientKey } from "../../types";
import { baseFoods } from "../foodData";
import { parseManualValue } from "../format";
import { localId } from "../ids";
import { registerMessage } from "../registerMessage";

const maxVisibleFoods = 80;

type RegisterCategory = "すべて" | FoodShelf;
type RegisterMode = "simple" | "detailed";

type ManualFoodForm = {
  name: string;
  category: FoodShelf;
  nutrientsPer100g: Record<NutrientKey, string>;
};

const registerCategories: RegisterCategory[] = [
  "すべて",
  ...registrableShelves,
];

// 米・パン・麺・調味料・油は登録の一覧に出さない（DES-UI-34、FR-ING-09）
const registrableFoods = baseFoods.filter(isRegistrable);

function emptyManualForm(): ManualFoodForm {
  return {
    name: "",
    category: "野菜",
    nutrientsPer100g: Object.fromEntries(
      nutrientDefinitions.map((definition) => [definition.key, ""]),
    ) as Record<NutrientKey, string>,
  };
}

/**
 * 食材登録（DES-UI-21, 30〜37）。食材名を押すと登録し、登録画面に留まって知らせる（P-09）。
 */
export function RegisterScreen({
  state,
  dispatch,
}: {
  state: AppState;
  dispatch: (action: BasketAction) => void;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<RegisterMode>("simple");
  const [category, setCategory] = useState<RegisterCategory>("すべて");
  const [manualForm, setManualForm] = useState<ManualFoodForm>(emptyManualForm);
  // 同じ文言が続いても読み上げ直し・表示し直すよう、連番を持つ
  const [message, setMessage] = useState({ text: "", seq: 0 });

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
      [...filteredFoods].sort((left, right) => {
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
    [filteredFoods, query],
  );

  const visibleGroups = groups.slice(0, maxVisibleFoods);
  const visibleDetailedFoods = detailedFoods.slice(0, maxVisibleFoods);
  const commonCount = visibleGroups.filter(
    (group) => group.supermarketPriority !== null,
  ).length;
  const total = mode === "simple" ? groups.length : detailedFoods.length;

  function register(action: BasketAction) {
    const text = registerMessage(state, action);
    dispatch(action);
    setMessage((current) => ({ text, seq: current.seq + 1 }));
  }

  function registerGroup(group: FoodGroup) {
    const food = representativeFood(group);
    register({
      type: "register",
      id: localId("item"),
      foodId: food.id,
      displayName: group.name,
    });
  }

  function registerFood(food: FoodItem) {
    const displayName = foodPresentation(food.name, food.category).name;
    register({
      type: "register",
      id: localId("item"),
      foodId: food.id,
      displayName,
    });
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
    const food: FoodItem = {
      id: localId("manual"),
      name,
      category: `手入力 / ${manualForm.category}`,
      refusePct: null,
      nutrientsPer100g: Object.fromEntries(
        nutrientDefinitions.map((definition) => [
          definition.key,
          parseManualValue(manualForm.nutrientsPer100g[definition.key]),
        ]),
      ) as FoodItem["nutrientsPer100g"],
    };
    register({
      type: "addManualFood",
      id: localId("item"),
      food,
      displayName: name,
    });
    setManualForm(emptyManualForm());
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
      </section>

      <p className="register-message" role="status" aria-live="polite">
        {message.text && <span key={message.seq}>{message.text}</span>}
      </p>

      <form className="section-stack" onSubmit={addManualFood}>
        <div className="section-heading">
          <h3>手入力で追加</h3>
          <p>一覧にない食材（成分は分かる分だけでよい）</p>
        </div>

        <label className="form-field">
          <span>食材名</span>
          <input
            required
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

        <label className="form-field">
          <span>棚</span>
          <select
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
        </label>

        <div className="nutrient-input-grid">
          {basicNutrientDefinitions.map((definition) => (
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
        <p className="balance-note">
          エネルギーを入れない食材は、栄養の判定には数えません。
        </p>

        <div className="form-actions">
          <button className="primary-button" type="submit">
            登録する
          </button>
          <button
            type="button"
            onClick={() => setManualForm(emptyManualForm())}
          >
            入力をクリア
          </button>
        </div>
      </form>
    </div>
  );
}
