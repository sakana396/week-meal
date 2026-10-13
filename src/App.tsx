import { useMemo, useState } from "react";
import foodsJson from "./data/foods.json";
import {
  foodPresentation,
  groupFoods,
  normalizeSearchText,
  prioritizeSupermarketFoods,
  representativeFood,
  supermarketPriority,
  type FoodGroup,
} from "./core/catalog";
import {
  basicNutrientDefinitions,
  nutrientDefinitions,
  sourceLabel,
  vitaminMineralDefinitions,
} from "./data/nutrients";
import { foodShelf, foodShelves, type FoodShelf } from "./data/foodShelves";
import type { FoodItem, NutrientDefinition, NutrientKey } from "./types";
import "./App.css";

const baseFoods = foodsJson as FoodItem[];
const maxVisibleFoods = 80;

type Screen = "home" | "register" | "foods" | "detail";
type RegisterCategory = "すべて" | FoodShelf;
type RegisterMode = "simple" | "detailed";

type RegisteredFood = FoodItem & {
  amountG: number;
  officialName?: string;
};

type ManualFoodForm = {
  name: string;
  category: FoodShelf;
  nutrientsPer100g: Record<NutrientKey, string>;
};

type NutrientTarget = {
  key: NutrientKey;
  target: number;
};

const registerCategories: RegisterCategory[] = ["すべて", ...foodShelves];

function emptyManualNutrients() {
  return Object.fromEntries(
    nutrientDefinitions.map((definition) => [definition.key, ""]),
  ) as Record<NutrientKey, string>;
}

const initialManualForm: ManualFoodForm = {
  name: "",
  category: "野菜",
  nutrientsPer100g: emptyManualNutrients(),
};

const nutrientTargets: NutrientTarget[] = [
  { key: "energyKcal", target: 650 },
  { key: "proteinG", target: 20 },
  { key: "fatG", target: 18 },
  { key: "carbohydrateG", target: 85 },
  { key: "fiberG", target: 7 },
  { key: "saltEquivalentG", target: 2.5 },
];

function formatValue(value: number | null, unit: string) {
  if (value === null) {
    return "データなし";
  }

  if (unit === "kcal") {
    return `${Math.round(value).toLocaleString("ja-JP")} ${unit}`;
  }

  return `${value.toLocaleString("ja-JP", {
    maximumFractionDigits: 2,
  })} ${unit}`;
}

function nutrientPercent(value: number | null, definition: NutrientDefinition) {
  if (value === null || definition.maxValue <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (value / definition.maxValue) * 100));
}

function targetPercent(value: number | null, target: number) {
  if (value === null || target <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (value / target) * 100));
}

function nutrientStatus(value: number | null, target: number) {
  if (value === null) {
    return "unknown";
  }

  return value < target * 0.7 ? "low" : "ok";
}

function parseManualValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

function aggregateNutrients(items: RegisteredFood[]) {
  return Object.fromEntries(
    nutrientDefinitions.map((definition) => {
      let total = 0;
      let hasValue = false;

      for (const item of items) {
        const value = item.nutrientsPer100g[definition.key];
        if (value !== null && value !== undefined) {
          total += value * (item.amountG / 100);
          hasValue = true;
        }
      }

      return [definition.key, hasValue ? Math.round(total * 100) / 100 : null];
    }),
  ) as FoodItem["nutrientsPer100g"];
}

function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>("home");
  const [query, setQuery] = useState("");
  const [registerQuery, setRegisterQuery] = useState("");
  const [registerMode, setRegisterMode] = useState<RegisterMode>("simple");
  const [registerCategory, setRegisterCategory] =
    useState<RegisterCategory>("すべて");
  const [selectedFoodId, setSelectedFoodId] = useState(baseFoods[0]?.id ?? "");
  const [manualFoods, setManualFoods] = useState<RegisteredFood[]>([]);
  const [manualForm, setManualForm] =
    useState<ManualFoodForm>(initialManualForm);

  const filteredFoods = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
      return baseFoods;
    }

    return baseFoods.filter((food) => {
      const target = normalizeSearchText(
        `${food.id}${food.name}${food.category}`,
      );
      return target.includes(normalizedQuery);
    });
  }, [query]);

  const visibleFoods = filteredFoods.slice(0, maxVisibleFoods);
  const registerFoods = useMemo(() => {
    const normalizedQuery = normalizeSearchText(registerQuery);
    const categoryFoods =
      registerCategory === "すべて"
        ? baseFoods
        : baseFoods.filter((food) => foodShelf(food) === registerCategory);
    return normalizedQuery
      ? categoryFoods.filter((food) => {
          const presentation = foodPresentation(food.name, food.category);
          const target = normalizeSearchText(
            `${food.name}${presentation.name}${presentation.details}${food.category}`,
          );
          return target.includes(normalizedQuery);
        })
      : categoryFoods;
  }, [registerCategory, registerQuery]);

  const registerFoodGroups = useMemo(() => {
    const groups = groupFoods(registerFoods);
    const normalizedQuery = normalizeSearchText(registerQuery);
    return normalizedQuery ? groups : prioritizeSupermarketFoods(groups);
  }, [registerFoods, registerQuery]);
  const detailedRegisterFoods = useMemo(
    () =>
      [...registerFoods].sort((left, right) => {
        if (!registerQuery.trim()) {
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
    [registerFoods, registerQuery],
  );
  const visibleRegisterGroups = registerFoodGroups.slice(0, maxVisibleFoods);
  const visibleDetailedFoods = detailedRegisterFoods.slice(0, maxVisibleFoods);
  const visibleCommonFoodCount = visibleRegisterGroups.filter(
    (group) => group.supermarketPriority !== null,
  ).length;
  const selectedFood =
    manualFoods.find((food) => food.id === selectedFoodId) ??
    baseFoods.find((food) => food.id === selectedFoodId) ??
    visibleFoods[0] ??
    baseFoods[0];
  const registeredNutrients = useMemo(
    () => aggregateNutrients(manualFoods),
    [manualFoods],
  );

  const lowNutrients = nutrientTargets
    .map((target) => {
      const definition = nutrientDefinitions.find(
        (item) => item.key === target.key,
      );
      if (!definition) {
        return null;
      }

      const value = registeredNutrients[target.key] ?? null;
      return nutrientStatus(value, target.target) === "low"
        ? { definition, value, target: target.target }
        : null;
    })
    .filter(Boolean);

  function selectFood(foodId: string) {
    setSelectedFoodId(foodId);
  }

  function registerFood(selectedFood: FoodItem) {
    if (!selectedFood) {
      return;
    }

    const presentation = foodPresentation(
      selectedFood.name,
      selectedFood.category,
    );
    const registeredFood: RegisteredFood = {
      ...selectedFood,
      id: `registered-${selectedFood.id}-${crypto.randomUUID()}`,
      name: presentation.name,
      officialName: selectedFood.name,
      amountG: 100,
      category: `登録 / ${selectedFood.category}`,
    };

    setManualFoods((current) => [registeredFood, ...current]);
    setSelectedFoodId(registeredFood.id);
    setActiveScreen("home");
  }

  function registerExistingFood(group: FoodGroup) {
    const selectedFood = representativeFood(group);
    if (selectedFood) {
      registerFood(selectedFood);
    }
  }

  function updateManualNutrient(key: NutrientKey, value: string) {
    setManualForm((current) => ({
      ...current,
      nutrientsPer100g: {
        ...current.nutrientsPer100g,
        [key]: value,
      },
    }));
  }

  function addManualFood(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = manualForm.name.trim();
    if (!name) {
      return;
    }

    const food: FoodItem = {
      id: `manual-${crypto.randomUUID()}`,
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

    setManualFoods((current) => [{ ...food, amountG: 100 }, ...current]);
    setSelectedFoodId(food.id);
    setManualForm(initialManualForm);
    setActiveScreen("home");
  }

  if (!selectedFood) {
    return (
      <main className="empty-shell">
        <h1>weekmeal</h1>
        <p>食品データを読み込めませんでした。</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="画面ナビゲーション">
        <div className="app-title">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <h1>weekmeal</h1>
            <p>1週間の食事と栄養</p>
          </div>
        </div>

        <nav className="screen-nav" aria-label="主要画面">
          {[
            ["home", "ホーム"],
            ["register", "食材登録"],
            ["foods", "食品一覧"],
            ["detail", "栄養詳細"],
          ].map(([screen, label]) => (
            <button
              className="nav-button"
              data-active={activeScreen === screen}
              key={screen}
              onClick={() => setActiveScreen(screen as Screen)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="content-panel">
        {activeScreen === "home" && (
          <div className="screen-stack" aria-label="ホーム画面">
            <header className="screen-header">
              <div>
                <p className="food-id">ホーム</p>
                <h2>登録食材の栄養サマリ</h2>
              </div>
              <span className="category-pill">
                登録 {manualFoods.length.toLocaleString("ja-JP")} 件
              </span>
            </header>

            {manualFoods.length === 0 ? (
              <section className="notice-panel">
                <h3>登録食材がありません</h3>
                <p>食材登録画面で食材を押すと、栄養サマリに反映されます。</p>
              </section>
            ) : (
              <div className="registered-list" aria-label="登録食材">
                {manualFoods.map((food) => (
                  <button
                    className="food-row"
                    key={food.id}
                    onClick={() => {
                      selectFood(food.id);
                      setActiveScreen("detail");
                    }}
                    type="button"
                  >
                    <span className="food-name">{food.name}</span>
                    <span className="food-category">
                      {food.officialName && food.officialName !== food.name
                        ? food.officialName
                        : food.category}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="summary-grid" aria-label="登録食材の栄養サマリ">
              {nutrientTargets.map((target) => {
                const definition = nutrientDefinitions.find(
                  (item) => item.key === target.key,
                );
                if (!definition) {
                  return null;
                }

                const value = registeredNutrients[target.key] ?? null;
                const status = nutrientStatus(value, target.target);
                return (
                  <article
                    className="summary-card"
                    data-status={status}
                    key={target.key}
                  >
                    <span>{definition.label}</span>
                    <strong>{formatValue(value, definition.unit)}</strong>
                    <div className="mini-track">
                      <span
                        style={{
                          width: `${targetPercent(value, target.target)}%`,
                        }}
                      />
                    </div>
                    <small>
                      目安 {formatValue(target.target, definition.unit)}
                    </small>
                  </article>
                );
              })}
            </div>

            <section className="action-grid" aria-label="画面遷移">
              <button type="button" onClick={() => setActiveScreen("register")}>
                食材を登録
              </button>
              <button type="button" onClick={() => setActiveScreen("foods")}>
                食品一覧を見る
              </button>
              <button type="button" onClick={() => setActiveScreen("detail")}>
                選択中の詳細を見る
              </button>
            </section>

            <section
              className="notice-panel"
              data-alert={lowNutrients.length > 0}
            >
              <h3>足りないところ</h3>
              {lowNutrients.length > 0 ? (
                <div className="shortfall-list">
                  {lowNutrients.map((item) =>
                    item ? (
                      <span key={item.definition.key}>
                        {item.definition.label}:{" "}
                        {formatValue(item.value, item.definition.unit)}
                      </span>
                    ) : null,
                  )}
                </div>
              ) : (
                <p>基本栄養素は目安に近い状態です。</p>
              )}
            </section>
          </div>
        )}

        {activeScreen === "foods" && (
          <div className="screen-stack" aria-label="食品一覧画面">
            <header className="screen-header">
              <div>
                <p className="food-id">食品一覧</p>
                <h2>食品データベース</h2>
              </div>
              <span className="category-pill">文科省データ / 100g</span>
            </header>

            <label className="search-field">
              <span>食品検索</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="例: ごはん、卵、牛乳"
              />
            </label>

            <div className="result-meta">
              <span>{filteredFoods.length.toLocaleString("ja-JP")} 件</span>
              <span>表示 {visibleFoods.length.toLocaleString("ja-JP")} 件</span>
            </div>

            <div
              className="food-browser-list"
              role="listbox"
              aria-label="食品一覧"
            >
              {visibleFoods.map((food) => (
                <button
                  className="food-row"
                  data-active={food.id === selectedFood.id}
                  key={food.id}
                  onClick={() => {
                    selectFood(food.id);
                    setActiveScreen("detail");
                  }}
                  role="option"
                  aria-selected={food.id === selectedFood.id}
                  type="button"
                >
                  <span className="food-name">{food.name}</span>
                  <span className="food-category">{food.category}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeScreen === "register" && (
          <div className="screen-stack" aria-label="食材登録画面">
            <header className="screen-header">
              <div>
                <p className="food-id">食材登録</p>
                <h2>食材を選ぶ</h2>
              </div>
              <span className="category-pill">文科省データ / 100g</span>
            </header>

            <section className="register-mode-panel" aria-label="入力モード">
              <div>
                <strong>入力モード</strong>
                <span>
                  {registerMode === "simple"
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
                  aria-pressed={registerMode === "simple"}
                  data-active={registerMode === "simple"}
                  onClick={() => setRegisterMode("simple")}
                  type="button"
                >
                  簡易
                </button>
                <button
                  aria-pressed={registerMode === "detailed"}
                  data-active={registerMode === "detailed"}
                  onClick={() => setRegisterMode("detailed")}
                  type="button"
                >
                  詳細
                </button>
              </div>
            </section>

            <div className="category-picker" aria-label="スーパーの棚を選択">
              {registerCategories.map((category) => (
                <button
                  data-active={registerCategory === category}
                  key={category}
                  onClick={() => {
                    setRegisterCategory(category);
                    if (category !== "すべて") {
                      setManualForm((current) => ({ ...current, category }));
                    }
                  }}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>

            <section className="section-stack">
              <div className="section-heading">
                <h3>1. 食材を検索</h3>
                <p>
                  {(registerMode === "simple"
                    ? registerFoodGroups.length
                    : detailedRegisterFoods.length
                  ).toLocaleString("ja-JP")}{" "}
                  種類
                  {(registerMode === "simple"
                    ? registerFoodGroups.length
                    : detailedRegisterFoods.length) > maxVisibleFoods
                    ? ` / 先頭${maxVisibleFoods}件を表示`
                    : ""}
                </p>
              </div>

              {!registerQuery.trim() && registerMode === "simple" && (
                <p className="priority-note">
                  スーパーで見つけやすい食材を先に表示しています
                  {visibleCommonFoodCount > 0
                    ? `（優先表示 ${visibleCommonFoodCount}種類）`
                    : ""}
                </p>
              )}

              {registerMode === "detailed" && (
                <p className="priority-note">
                  正式名称・状態・食品番号を確認して、使うデータを直接選べます
                </p>
              )}

              <label className="search-field">
                <span>食材名</span>
                <input
                  type="search"
                  value={registerQuery}
                  onChange={(event) => setRegisterQuery(event.target.value)}
                  placeholder="例: 玉ねぎ、じゃがいも、鶏肉"
                />
              </label>

              {registerMode === "simple" && visibleRegisterGroups.length > 0 ? (
                <div className="ingredient-name-list" aria-label="食材名一覧">
                  {visibleRegisterGroups.map((group) => (
                    <button
                      className="ingredient-name-button"
                      key={group.key}
                      onClick={() => registerExistingFood(group)}
                      type="button"
                    >
                      <span className="ingredient-title">
                        <strong>{group.name}</strong>
                        {group.supermarketPriority !== null &&
                          !registerQuery.trim() && (
                            <span className="common-food-badge">よくある</span>
                          )}
                      </span>
                      <small>タップして登録</small>
                    </button>
                  ))}
                </div>
              ) : registerMode === "detailed" &&
                visibleDetailedFoods.length > 0 ? (
                <div
                  className="ingredient-name-list"
                  aria-label="文科省食品データ一覧"
                >
                  {visibleDetailedFoods.map((food) => {
                    const presentation = foodPresentation(
                      food.name,
                      food.category,
                    );
                    const isCommon =
                      supermarketPriority(presentation.name) !== null;
                    return (
                      <button
                        className="ingredient-name-button detailed-food-button"
                        key={food.id}
                        onClick={() => registerFood(food)}
                        type="button"
                      >
                        <span className="ingredient-title">
                          <strong>{presentation.name}</strong>
                          {isCommon && !registerQuery.trim() && (
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
                  <span>検索語やカテゴリを変えてください。</span>
                </div>
              )}
            </section>

            <form className="section-stack" onSubmit={addManualFood}>
              <div className="section-heading">
                <h3>手入力で追加</h3>
                <p>一覧にない食材</p>
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
                <span>カテゴリ</span>
                <select
                  value={manualForm.category}
                  onChange={(event) =>
                    setManualForm((current) => ({
                      ...current,
                      category: event.target.value as FoodShelf,
                    }))
                  }
                >
                  {foodShelves.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <div className="nutrient-input-grid">
                {basicNutrientDefinitions.map((definition) => (
                  <label className="form-field" key={definition.key}>
                    <span>
                      {definition.label}（{definition.unit}）
                    </span>
                    <input
                      inputMode="decimal"
                      min="0"
                      onChange={(event) =>
                        updateManualNutrient(definition.key, event.target.value)
                      }
                      placeholder="未入力ならデータなし"
                      step="any"
                      type="number"
                      value={manualForm.nutrientsPer100g[definition.key]}
                    />
                  </label>
                ))}
              </div>

              <div className="form-actions">
                <button className="primary-button" type="submit">
                  登録してホームへ
                </button>
                <button
                  type="button"
                  onClick={() => setManualForm(initialManualForm)}
                >
                  入力をクリア
                </button>
              </div>
            </form>
          </div>
        )}

        {activeScreen === "detail" && (
          <div className="screen-stack" aria-label="栄養詳細画面">
            <header className="screen-header">
              <div>
                <p className="food-id">{selectedFood.id}</p>
                <h2>{selectedFood.name}</h2>
              </div>
              <span className="category-pill">{selectedFood.category}</span>
            </header>

            <section className="section-stack">
              <div className="section-heading">
                <h3>基本栄養素</h3>
                <p>可食部100gあたり</p>
              </div>
              <div className="nutrient-chart" aria-label="基本栄養素">
                {basicNutrientDefinitions.map((definition) => {
                  const target = nutrientTargets.find(
                    (item) => item.key === definition.key,
                  );
                  const value =
                    selectedFood.nutrientsPer100g[definition.key] ?? null;
                  const width = nutrientPercent(value, definition);
                  const status = target
                    ? nutrientStatus(value, target.target)
                    : "unknown";

                  return (
                    <div
                      className="nutrient-row"
                      data-status={status}
                      key={definition.key}
                    >
                      <div className="nutrient-label">
                        <span>{definition.label}</span>
                        <strong>{formatValue(value, definition.unit)}</strong>
                      </div>
                      <div
                        className="bar-track"
                        aria-label={`${definition.label}: ${formatValue(
                          value,
                          definition.unit,
                        )}`}
                      >
                        <span
                          className={`bar-fill tone-${definition.tone}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="status-badge">
                        {status === "low"
                          ? "不足気味"
                          : status === "ok"
                            ? "目安内"
                            : "未入力"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="section-stack">
              <div className="section-heading">
                <h3>ビタミン・ミネラル</h3>
                <p>可食部100gあたり</p>
              </div>
              <div className="micro-grid">
                {vitaminMineralDefinitions.map((definition) => {
                  const value =
                    selectedFood.nutrientsPer100g[definition.key] ?? null;
                  return (
                    <article
                      className="micro-card"
                      data-status={value === null ? "unknown" : "ok"}
                      key={definition.key}
                    >
                      <span>
                        {definition.group === "vitamin"
                          ? "ビタミン"
                          : "ミネラル"}
                      </span>
                      <strong>{definition.label}</strong>
                      <small>{formatValue(value, definition.unit)}</small>
                      <div className="mini-track">
                        <span
                          style={{
                            width: `${nutrientPercent(value, definition)}%`,
                          }}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <footer className="source-note">
              出典: {sourceLabel}（可食部100g当たり）
            </footer>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
