import { useEffect, useMemo, useReducer, useState } from "react";
import { analyzeBasket } from "../core/analyze";
import { basketReducer, toRegisteredItems } from "../core/basket";
import { Navigation } from "./components/Navigation";
import { StorageNotice } from "./components/StorageNotice";
import { foodsById } from "./foodData";
import { useHashRoute } from "./route";
import { HomeScreen } from "./screens/HomeScreen";
import { PlaceholderScreen } from "./screens/PlaceholderScreen";
import { browserStore, loadAppState, saveAppState } from "./storage";
import "./App.css";

/**
 * 画面全体（DES-UI-10）。状態は useReducer（P-02）、画面はハッシュで切り替える（P-01）。
 * 起動時に保存データを読み込み、状態が変わるたびに書き出す（DES-UI-13）。
 */
export default function App() {
  const [store] = useState(browserStore);
  const [loaded] = useState(() => loadAppState(store));
  // dispatch は登録画面（#34）とホームの操作（#27）で使う
  const [state] = useReducer(basketReducer, loaded.state);
  const [route, navigate] = useHashRoute();
  const [saveFailed, setSaveFailed] = useState(!loaded.available);

  useEffect(() => {
    if (!loaded.available) return;
    const saved = saveAppState(store, state);
    if (saved) return;
    // 書き出しに失敗したとき（容量不足など）は、描画のあとで知らせる
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setSaveFailed(true);
    });
    return () => {
      active = false;
    };
  }, [loaded.available, store, state]);

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
          <PlaceholderScreen label="食材登録" title="食材を選ぶ" />
        )}
        {route === "balance" && (
          <PlaceholderScreen label="栄養詳細" title="栄養の割合と充足率" />
        )}
        {route === "settings" && (
          <PlaceholderScreen label="設定" title="主食と基準値の設定">
            <button onClick={() => navigate("foods")} type="button">
              食品一覧を見る
            </button>
          </PlaceholderScreen>
        )}
        {route === "foods" && (
          <PlaceholderScreen label="食品一覧" title="食品データベース" />
        )}
      </main>
    </div>
  );
}
