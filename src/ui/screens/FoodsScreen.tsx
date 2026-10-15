import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeSearchText } from "../../core/catalog";
import {
  basicNutrientDefinitions,
  sourceLabel,
  vitaminMineralDefinitions,
} from "../../data/nutrients";
import { baseFoods } from "../foodData";
import { formatValue, nutrientPercent } from "../format";

const maxVisibleFoods = 80;

/**
 * 食品一覧（DES-UI-24、FR-UI-08）。食品データを検索し、選んだ食品の
 * 100g あたりの成分を同じ画面に出す。
 */
export function FoodsScreen() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return baseFoods;
    return baseFoods.filter((food) =>
      normalizeSearchText(`${food.id}${food.name}${food.category}`).includes(
        normalizedQuery,
      ),
    );
  }, [query]);
  const visible = filtered.slice(0, maxVisibleFoods);
  const selected = baseFoods.find((food) => food.id === selectedId) ?? null;
  const detailHeading = useRef<HTMLHeadingElement>(null);

  // 食品を選んだら成分の欄へ移り、見出しにフォーカスする（下の方の行を押しても変化が分かるように）
  useEffect(() => {
    if (!selectedId || !detailHeading.current) return;
    detailHeading.current.scrollIntoView({ block: "start" });
    detailHeading.current.focus();
  }, [selectedId]);

  return (
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
          placeholder="例: 卵、牛乳、さば"
        />
      </label>

      <div className="result-meta">
        <span>{filtered.length.toLocaleString("ja-JP")} 件</span>
        <span>表示 {visible.length.toLocaleString("ja-JP")} 件</span>
      </div>

      {selected && (
        <section className="section-stack" aria-label="食品の成分">
          <div className="section-heading">
            <h3 ref={detailHeading} tabIndex={-1}>
              {selected.name}
            </h3>
            <p>食品番号 {selected.id} / 可食部 100g あたり</p>
          </div>
          <h4>基本栄養素</h4>
          <div className="nutrient-chart">
            {basicNutrientDefinitions.map((definition) => {
              const value = selected.nutrientsPer100g[definition.key] ?? null;
              return (
                <div className="nutrient-row" key={definition.key}>
                  <div className="nutrient-label">
                    <span>{definition.label}</span>
                    <strong>{formatValue(value, definition.unit)}</strong>
                  </div>
                  <div className="bar-track" aria-hidden="true">
                    <span
                      className={`bar-fill tone-${definition.tone}`}
                      style={{
                        width: `${nutrientPercent(value, definition)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <h4>ビタミン・ミネラル</h4>
          <div className="micro-grid">
            {vitaminMineralDefinitions.map((definition) => {
              const value = selected.nutrientsPer100g[definition.key] ?? null;
              return (
                <article
                  className="micro-card"
                  data-status={value === null ? "unknown" : "ok"}
                  key={definition.key}
                >
                  <span>
                    {definition.group === "vitamin" ? "ビタミン" : "ミネラル"}
                  </span>
                  <strong>{definition.label}</strong>
                  <small>{formatValue(value, definition.unit)}</small>
                  <div className="mini-track" aria-hidden="true">
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
          <footer className="source-note">出典: {sourceLabel}</footer>
        </section>
      )}

      <div className="food-browser-list" aria-label="食品一覧">
        {visible.map((food) => (
          <button
            aria-pressed={food.id === selectedId}
            className="food-row"
            data-active={food.id === selectedId}
            key={food.id}
            onClick={() => setSelectedId(food.id)}
            type="button"
          >
            <span className="food-name">{food.name}</span>
            <span className="food-category">{food.category}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
