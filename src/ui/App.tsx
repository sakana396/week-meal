import { useEffect, useMemo, useReducer, useState } from "react";
import { analyzeBasket } from "../core/analyze";
import { basketReducer, toRegisteredItems } from "../core/basket";
import { Navigation } from "./components/Navigation";
import { StorageNotice } from "./components/StorageNotice";
import { foodsById } from "./foodData";
import { useHashRoute } from "./route";
import { HomeScreen } from "./screens/HomeScreen";
import { FoodsScreen } from "./screens/FoodsScreen";
import { PlaceholderScreen } from "./screens/PlaceholderScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { loadAppState, openBrowserStore, saveAppState } from "./storage";
import "./App.css";

/**
 * 画面全体（DES-UI-10）。状態は useReducer（P-02）、画面はハッシュで切り替える（P-01）。
 * 起動時に保存データを読み込み、状態が変わるたびに書き出す（DES-UI-13）。
 */
export default function App() {
  const [browser] = useState(openBrowserStore);
  const [loaded] = useState(() => loadAppState(browser));
  const [state, dispatch] = useReducer(basketReducer, loaded.state);
  const [route, navigate] = useHashRoute();
  const [saveFailed, setSaveFailed] = useState(!loaded.available);

  useEffect(() => {
    if (!loaded.available) return;
    const saved = saveAppState(browser.store, state);
    // 書き出しの結果を、描画のあとで知らせる。effect の中で同期的に setState すると
    // 描画が連鎖するため（react-hooks の set-state-in-effect 規則）、microtask に回す
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setSaveFailed(!saved);
    });
    return () => {
      active = false;
    };
  }, [loaded.available, browser, state]);

  const analysis = useMemo(
    () => analyzeBasket(toRegisteredItems(state, foodsById), state.profile),
    [state],
  );

  const notice = (
    <StorageNotice
      backedUp={loaded.backedUp}
      issue={loaded.issue}
      saveFailed={saveFailed}
    />
  );

  return (
    <div className="app-shell">
      <Navigation navigate={navigate} route={route} />
      <main className="content-panel">
        {route === "home" && (
          <HomeScreen
            analysis={analysis}
            navigate={navigate}
            notice={notice}
            state={state}
          />
        )}
        {route === "register" && (
          <RegisterScreen dispatch={dispatch} state={state} />
        )}
        {route === "balance" && (
          <PlaceholderScreen label="栄養詳細" title="栄養の割合と充足率" />
        )}
        {route === "settings" && (
          <PlaceholderScreen label="設定" title="主食と基準値の設定">
            <button
              className="primary-button"
              onClick={() => navigate("foods")}
              type="button"
            >
              食品一覧を見る
            </button>
          </PlaceholderScreen>
        )}
        {route === "foods" && <FoodsScreen />}
      </main>
    </div>
  );
}
