import { useEffect, useMemo, useReducer, useState } from "react";
import { analyzeBasket } from "../core/analyze";
import {
  basketReducer,
  toRegisteredItems,
  type AppState,
  type BasketAction,
} from "../core/basket";
import { Navigation } from "./components/Navigation";
import { StorageNotice } from "./components/StorageNotice";
import { foodsById } from "./foodData";
import { useHashRoute } from "./route";
import { HomeScreen } from "./screens/HomeScreen";
import { BalanceDetailScreen } from "./screens/BalanceDetailScreen";
import { FoodsScreen } from "./screens/FoodsScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { loadAppState, openBrowserStore, saveAppState } from "./storage";
import "./App.css";

/** 状態と候補予約を対応付ける revision（DES-UI-42）。 */
function revisionReducer(
  current: { state: AppState; revision: number },
  action: BasketAction,
) {
  const state = basketReducer(current.state, action);
  return state === current.state
    ? current
    : { state, revision: current.revision + 1 };
}

/**
 * 画面全体（DES-UI-10）。状態は useReducer（P-02）、画面はハッシュで切り替える（P-01）。
 * 起動時に保存データを読み込み、状態が変わるたびに書き出す（DES-UI-13）。
 */
export default function App() {
  const [browser] = useState(openBrowserStore);
  const [loaded] = useState(() => loadAppState(browser));
  const [{ state, revision }, dispatch] = useReducer(revisionReducer, {
    state: loaded.state,
    revision: 0,
  });
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

  const findFood = (foodId: string) =>
    foodsById.get(foodId) ??
    state.manualFoods.find((food) => food.id === foodId);

  const analysis = useMemo(
    () => analyzeBasket(toRegisteredItems(state, foodsById), state.profile),
    [state],
  );

  const notice = (
    <StorageNotice
      available={loaded.available}
      backedUp={loaded.backedUp}
      issue={loaded.issue}
      saveFailed={saveFailed}
    />
  );

  return (
    <div className="app-shell">
      <Navigation navigate={navigate} route={route} />
      <main className="content-panel" data-analysis-revision={revision}>
        {route === "home" && (
          <HomeScreen
            analysis={analysis}
            revision={revision}
            dispatch={dispatch}
            findFood={findFood}
            navigate={navigate}
            notice={notice}
            state={state}
          />
        )}
        {route === "register" && (
          <RegisterScreen dispatch={dispatch} state={state} />
        )}
        {route === "balance" && (
          <BalanceDetailScreen
            analysis={analysis}
            navigate={navigate}
            profile={state.profile}
          />
        )}
        {route === "settings" && (
          <SettingsScreen
            dispatch={dispatch}
            navigate={navigate}
            profile={state.profile}
          />
        )}
        {route === "foods" && <FoodsScreen />}
      </main>
    </div>
  );
}
