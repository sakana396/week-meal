import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { latestShopping, basketReducer } from "../core/basket";
import { analyzeShopping } from "../core/shoppingAnalysis";
import {
  basketSessionReducer,
  type BasketSessionState,
  type BasketSessionAction,
} from "../core/basketSession";
import { Navigation } from "./components/Navigation";
import { StorageNotice } from "./components/StorageNotice";
import { foodsById } from "./foodData";
import { useHashRoute } from "./route";
import { localId } from "./ids";
import { localDate } from "./localDate";
import { HistoryDetailScreen } from "./screens/HistoryDetailScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { BalanceDetailScreen } from "./screens/BalanceDetailScreen";
import { FoodsScreen } from "./screens/FoodsScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { loadAppState, openBrowserStore, saveAppState } from "./storage";
import "./App.css";

/** 状態と候補予約を対応付ける revision（DES-UI-42）。 */
function revisionReducer(
  current: { session: BasketSessionState; revision: number },
  action: BasketSessionAction,
) {
  const session = basketSessionReducer(current.session, action);
  return session === current.session
    ? current
    : {
        session,
        revision:
          current.revision +
          (session.appState === current.session.appState ? 0 : 1),
      };
}

/**
 * 画面全体（DES-UI-10）。状態は useReducer（P-02）、画面はハッシュで切り替える（P-01）。
 * 起動時に保存データを読み込み、状態が変わるたびに書き出す（DES-UI-13）。
 * 削除の取り消しはセッション内に保持し、保存・分析には appState だけを渡す（DES-BSK-09）。
 */
export default function App() {
  const [browser] = useState(openBrowserStore);
  const [loaded] = useState(() => loadAppState(browser));
  const [{ session, revision }, dispatch] = useReducer(revisionReducer, {
    session: { appState: loaded.state, pendingRemoval: null },
    revision: 0,
  });
  const state = session.appState;
  const [location, navigate] = useHashRoute();
  const { route, shoppingId, invalidShopping } = location;
  const [routeNotice, setRouteNotice] = useState("");
  const previousRoute = useRef(location);
  useEffect(() => {
    if (previousRoute.current !== location)
      dispatch({ type: "clearPendingRemoval" });
    previousRoute.current = location;
  }, [location]);
  useEffect(() => {
    if (
      route !== "register" ||
      shoppingId ||
      state.shoppings.length === 0 ||
      invalidShopping
    )
      return;
    const latest = latestShopping(state.shoppings);
    if (latest) navigate("register", latest.id);
  }, [route, shoppingId, state.shoppings, invalidShopping, navigate]);
  useEffect(() => {
    if (
      !invalidShopping &&
      !(
        shoppingId &&
        !state.shoppings.some((shopping) => shopping.id === shoppingId)
      )
    )
      return;
    queueMicrotask(() => {
      setRouteNotice("指定した買い物が見つかりません");
      navigate("history");
    });
  }, [invalidShopping, shoppingId, state.shoppings, navigate]);
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
    () => analyzeShopping(latestShopping(state.shoppings), state, foodsById),
    [state],
  );

  /** 買い物を空で作り、その詳細へ移る（DES-UI-46）。 */
  function createShopping() {
    const id = localId("shopping");
    const date = localDate();
    const next = basketReducer(state, { type: "createShopping", id, date });
    if (next === state) return;
    const latest = latestShopping(next.shoppings);
    setRouteNotice(
      latest?.id === id
        ? "ホームの対象が新しい買い物に変わりました"
        : "この買い物は最新ではありません",
    );
    dispatch({ type: "createShopping", id, date });
    navigate("historyDetail", id);
  }

  /** 日付保存で最新の対象が変わることを知らせる（DES-UI-46）。 */
  function changeShoppingDate(id: string, date: string) {
    const before = latestShopping(state.shoppings)?.id;
    const next = basketReducer(state, {
      type: "setShoppingDate",
      shoppingId: id,
      date,
    });
    if (next === state) return;
    dispatch({ type: "setShoppingDate", shoppingId: id, date });
    setRouteNotice(
      before !== latestShopping(next.shoppings)?.id
        ? "ホームの対象が変わりました"
        : "買い物の日付を変更しました",
    );
  }

  const selectedShopping = state.shoppings.find(
    (shopping) => shopping.id === shoppingId,
  );
  const selectedAnalysis = selectedShopping
    ? analyzeShopping(selectedShopping, state, foodsById)
    : analysis;
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
      <Navigation
        navigate={(next) =>
          navigate(
            next,
            next === "register"
              ? latestShopping(state.shoppings)?.id
              : undefined,
          )
        }
        route={route}
      />
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
            pendingRemoval={session.pendingRemoval}
            onCreateShopping={createShopping}
            onDateChange={changeShoppingDate}
            routeNotice={routeNotice}
          />
        )}
        {route === "register" && (
          <RegisterScreen
            dispatch={dispatch}
            state={state}
            shoppingId={shoppingId}
            navigate={navigate}
          />
        )}
        {route === "history" && (
          <div className="screen-stack">
            <h2>買い物の履歴</h2>
            {routeNotice && <p role="status">{routeNotice}</p>}
            <button type="button" onClick={() => navigate("home")}>
              ホームへ戻る
            </button>
          </div>
        )}
        {route === "historyDetail" && selectedShopping && (
          <HistoryDetailScreen
            key={selectedShopping.id}
            shopping={selectedShopping}
            analysis={selectedAnalysis}
            profile={state.profile}
            navigate={navigate}
            notice={routeNotice}
            onDateChange={changeShoppingDate}
          />
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
