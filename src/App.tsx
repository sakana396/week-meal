import { useMemo, useState } from "react";
import foodsJson from "./data/foods.json";
import { nutrientDefinitions, sourceLabel } from "./data/nutrients";
import type { FoodItem, NutrientDefinition } from "./types";
import "./App.css";

const foods = foodsJson as FoodItem[];
const maxVisibleFoods = 80;

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

function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase("ja-JP")
    .replace(/\s+/g, "")
    .replace(/　/g, "");
}

function nutrientPercent(value: number | null, definition: NutrientDefinition) {
  if (value === null || definition.maxValue <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (value / definition.maxValue) * 100));
}

function App() {
  const [query, setQuery] = useState("");
  const [selectedFoodId, setSelectedFoodId] = useState(foods[0]?.id ?? "");

  const filteredFoods = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
      return foods;
    }

    return foods.filter((food) => {
      const target = normalizeSearchText(`${food.id}${food.name}${food.category}`);
      return target.includes(normalizedQuery);
    });
  }, [query]);

  const visibleFoods = filteredFoods.slice(0, maxVisibleFoods);
  const selectedFood =
    filteredFoods.find((food) => food.id === selectedFoodId) ??
    visibleFoods[0] ??
    foods.find((food) => food.id === selectedFoodId) ??
    foods[0];

  return (
    <main className="app-shell">
      <section className="browser-panel" aria-label="食品検索">
        <div className="app-title">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <h1>weekmeal</h1>
            <p>食品成分 / 100g</p>
          </div>
        </div>

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

        <div className="food-list" role="listbox" aria-label="食品一覧">
          {visibleFoods.map((food) => (
            <button
              className="food-row"
              data-active={food.id === selectedFood.id}
              key={food.id}
              onClick={() => setSelectedFoodId(food.id)}
              role="option"
              aria-selected={food.id === selectedFood.id}
            >
              <span className="food-name">{food.name}</span>
              <span className="food-category">{food.category}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="detail-panel" aria-label="栄養表示">
        <div className="detail-header">
          <div>
            <p className="food-id">{selectedFood.id}</p>
            <h2>{selectedFood.name}</h2>
          </div>
          <span className="category-pill">{selectedFood.category}</span>
        </div>

        <div className="nutrient-chart" aria-label="主要栄養素">
          {nutrientDefinitions.map((definition) => {
            const value = selectedFood.nutrientsPer100g[definition.key];
            const width = nutrientPercent(value, definition);

            return (
              <div className="nutrient-row" key={definition.key}>
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
              </div>
            );
          })}
        </div>

        <footer className="source-note">
          出典: {sourceLabel}（可食部100g当たり）
        </footer>
      </section>
    </main>
  );
}

export default App;
