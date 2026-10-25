# トレーサビリティマトリクス

- 文書 ID: TRC-001
- 対象: 反復 1（IT01）・反復 2（IT02）の範囲。反復ごとに行を追加する

要求から設計・テスト・実装までの対応を表す。実装の担当者（エージェントを含む）は、自分が担当した要求の行だけを更新する。

| 要求 | Issue | 設計 | テストケース | 実装 | 状態 |
|---|---|---|---|---|---|
| FR-ING-03 | #3 | DES-CAT-06 | TC-FR-ING-03-01〜03 | src/core/catalog.ts | 実装済み（検索の正規化） |
| FR-ING-04 | #3, #46, #59 | DES-CAT-04, DES-CAT-06, DES-FDB-04 | TC-FR-ING-04-01〜05（04 は順位取得とデータ重複検査） | src/core/catalog.ts（並び順）, src/data/integrity.test.ts（順位表の重複）, src/ui/screens/RegisterScreen.tsx（検索結果） | 実装済み（単体。画面の優先表示は IT02 の行を参照） |
| FR-ING-05 | #3, #59 | DES-CAT-01〜03, DES-FDB-04 | TC-FR-ING-05-01〜10, TC-NFR-11-08 | src/core/catalog.ts（まとめ・代表食品）, src/data/foodDisplayNames.ts（代表食品の指定）, src/ui/screens/RegisterScreen.tsx（押して登録） | 実装済み（ゆではるさめの代表を明示。画面は IT02 の登録 E2E） |
| FR-ING-06 | #3, #5 | DES-CAT-01 | TC-FR-ING-06-01〜20 | src/core/catalog.ts | 実装済み |
| FR-ING-09 | #3, #4, #9, #20, #59 | DES-CAT-05, DES-FDB-01 | TC-FR-ING-09-01〜07, TC-FR-FDB-01-02 | src/core/catalog.ts, scripts/food-selection.json, src/ui/screens/RegisterScreen.tsx | 実装済み（米・パン・麺・調味料の棚がなく、しょうゆが出ないことを TC-FR-ING-09-06（E2E）で検証済み） |
| FR-FDB-01 | #4, #20, #59 | DES-FDB-01, 02, 06 | TC-FR-FDB-01-01〜03 | scripts/food-selection.json, src/data/foods.json, src/data/integrity.test.ts | 実装済み（9 件を除外。原典再生成・候補関数の結合確認の未実施範囲は docs/04_test/food-selection-review-it03.md） |
| FR-FDB-02 | #4, #59 | DES-FDB-01, 02, 06 | TC-FR-FDB-02-01〜04, TC-FR-FDB-01-03 | scripts/convert-mext-foods.py, scripts/food-selection.json, src/data/foods.json | 実装済み（今回は既存データを再絞り込み。原典 Excel からの再生成は未実施） |
| FR-QTY-01 | #5 | DES-QTY-02 | TC-FR-QTY-01-01〜04 | src/core/quantity.ts | 実装済み（換算。個数 1 の登録は #9） |
| FR-QTY-02 | #5 | DES-QTY-01, 02 | TC-FR-QTY-02-01〜05 | src/core/quantity.ts, src/data/unitWeights.ts | 実装済み |
| FR-QTY-03 | #5 | DES-QTY-02 | TC-FR-QTY-02-01, TC-FR-QTY-03-01, 02 | src/core/quantity.ts | 実装済み |
| FR-QTY-05 | #5, #8 | DES-QTY-02, DES-ANL-01 | TC-FR-QTY-05-01〜05 | src/core/quantity.ts, src/core/analyze.ts | 実装済み |
| FR-QTY-06 | #5 | DES-QTY-02 | （査閲: グラムを入力させる引数がない） | src/core/quantity.ts | 実装済み |
| FR-STP-03 | #7, #8 | DES-NUT-02, DES-STP-01, DES-ANL-01 | TC-FR-STP-03-01〜08 | src/core/nutrition.ts, src/core/analyze.ts | 実装済み（計算。設定画面は IT02） |
| FR-STP-04 | #6 | DES-BAL-02 | TC-FR-STP-04-01〜05 | src/core/balance.ts, src/core/profile.ts | 実装済み（計算。設定画面は IT02） |
| FR-NUT-01 | #7 | DES-NUT-01 | TC-FR-NUT-01-01〜05 | src/core/nutrition.ts | 実装済み |
| FR-NUT-02 | #7 | DES-NUT-03 | TC-FR-NUT-02-01, 02 | src/core/nutrition.ts | 実装済み |
| FR-NUT-03 | #7, #8 | DES-NUT-03, DES-ANL-01 | TC-FR-NUT-03-01, 02 | src/core/nutrition.ts, src/core/analyze.ts | 実装済み |
| FR-NUT-04 | #7 | DES-NUT-04 | TC-FR-NUT-04-01〜03 | src/core/nutrition.ts | 実装済み |
| FR-NUT-05 | #7 | DES-NUT-01, 03 | TC-FR-NUT-05-01〜03 | src/core/nutrition.ts | 実装済み（計算。画面の表示は #9） |
| FR-NUT-06 | #8 | DES-ANL-01 | TC-FR-NUT-06-01, 02 | src/core/analyze.ts | 実装済み |
| FR-BAL-01 | #6, #8 | DES-BAL-01, 02, 04 | TC-FR-BAL-01-01〜04 | src/data/dietaryReference.ts, src/core/balance.ts, src/core/analyze.ts | 実装済み |
| FR-BAL-02 | #8 | DES-BAL-04 | TC-FR-BAL-02-01〜07 | src/core/balance.ts | 実装済み |
| FR-BAL-03 | #8 | DES-BAL-04 | TC-FR-BAL-03-01〜06 | src/core/balance.ts | 実装済み |
| FR-BAL-04 | #8 | DES-BAL-03 | TC-FR-BAL-04-01 | src/core/balance.ts | 実装済み |
| FR-BAL-05 | #8 | DES-BAL-05 | TC-FR-BAL-05-01〜03 | src/core/analyze.ts | 実装済み（判定。画面の表示は #9） |
| FR-UI-01 | #9 | DES-UI-01 | TC-FR-UI-01-01, 02 | src/App.tsx（BalancePanel） | 実装済み（IT01 の暫定表示。画面は手動確認待ち、IT02 で E2E） |
| FR-UI-07 | #9 | DES-UI-01 | TC-FR-UI-01-01 | src/App.tsx（BalancePanel） | 実装済み（画面は手動確認待ち、IT02 で E2E） |
| NFR-07 | #9 | DES-UI-01 | TC-FR-UI-01-01 | src/App.tsx, src/App.css | 実装済み（画面は手動確認待ち、IT02 で E2E） |
| NFR-08 | #2 | DES-PKG-01, 05 | TC-NFR-08-01〜03 | eslint.config.js | 実装済み |
| NFR-09 | #2 | DES-DEV-02 | TC-QA-02-01 | vite.config.ts | 実装済み |
| NFR-10 | #2 | DES-DEV-04 | TC-NFR-10-01 | eslint.config.js, tsconfig.app.json | 実装済み |
| NFR-11 | #4, #5, #59 | DES-FDB-04, 06 | TC-NFR-11-01〜08, TC-FR-FDB-01-03 | src/data/integrity.test.ts | 実装済み |
| NFR-15 | #7 | DES-NUT-01〜04 | TC-FR-NUT-01-01, 02-01, 04-01, TC-FR-STP-03-01 | src/core/nutrition.test.ts | 実装済み |
| QA-01 | #2 | DES-DEV-03 | TC-QA-01-01 | .github/workflows/ci.yml | 実装済み |
| QA-02 | #2 | DES-DEV-02 | TC-QA-02-01 | vite.config.ts | 実装済み |
| QA-09 | #5, #6, #59 | DES-QTY-01, DES-BAL-01, DES-FDB-06 | TC-FR-QTY-02-05、査閲（基準値の出典: REV-007） | src/data/unitWeights.ts, src/data/dietaryReference.ts, docs/04_test/food-selection-review-it03.md | 実装済み（#59 の食品データの原典照合は未実施と明記） |

## 反復 2（IT02）

| 要求 | Issue | 設計 | テストケース | 実装 | 状態 |
|---|---|---|---|---|---|
| FR-ING-01 | #24, #34 | DES-BSK-01, DES-UI-21, 30 | TC-FR-ING-01-01〜12 | src/core/basket.ts, src/ui/screens/RegisterScreen.tsx, src/ui/registerMessage.ts | 実装済み |
| FR-ING-02 | #34 | DES-UI-32 | IT01 の core テスト（画面の棚絞り込みは未検証） | src/ui/screens/RegisterScreen.tsx | 実装済み（画面は査閲） |
| FR-ING-03 | #34 | DES-UI-32 | （IT01 の core のテスト。画面は E2E の登録の操作 TC-FR-ING-01-06・07-01・09-06） | src/ui/screens/RegisterScreen.tsx | 実装済み |
| FR-ING-04 | #34, #46 | DES-UI-33 | TC-FR-ING-04-01〜05（core。画面の優先表示は未検証） | src/ui/screens/RegisterScreen.tsx | 実装済み（画面は査閲） |
| FR-ING-05 | #34 | DES-UI-30 | （IT01 の core のテスト。画面は E2E の登録の操作 TC-FR-ING-01-06・07-01・09-06） | src/ui/screens/RegisterScreen.tsx | 実装済み |
| FR-ING-06 | #34 | DES-UI-30 | IT01 の core テスト（画面の別名表示は未検証） | src/ui/screens/RegisterScreen.tsx | 実装済み（画面は査閲） |
| FR-ING-07 | #34 | DES-UI-31 | TC-FR-ING-07-01 | src/ui/screens/RegisterScreen.tsx | 実装済み |
| FR-ING-09 | #23, #34 | DES-UI-32, 34 | （IT01 の TC-FR-ING-09-01〜07） | src/ui/screens/RegisterScreen.tsx | 実装済み |
| FR-FDB-03 | #34 | DES-UI-35 | TC-FR-ING-08-01〜10（画面の手入力は未検証） | src/ui/screens/RegisterScreen.tsx | 実装済み（画面は査閲） |
| FR-BAL-05 | #27 | DES-ANL-03, DES-UI-41 | TC-FR-BAL-05-04, 05 | src/core/analyze.ts, src/ui/components/BalancePanel.tsx | 実装済み |
| FR-NUT-05 | #27 | DES-ANL-03, DES-UI-41 | TC-FR-BAL-05-05（画面の注記は未検証） | src/core/analyze.ts, src/ui/components/BalancePanel.tsx | 実装済み（画面は査閲） |
| FR-UI-01 | #27 | DES-UI-20, 41 | TC-FR-UI-01-01, 02（E2E） | src/ui/screens/HomeScreen.tsx, src/ui/components/BalancePanel.tsx | 実装済み |
| FR-UI-07 | #27 | DES-UI-41 | （E2E） | src/ui/components/BalancePanel.tsx | 実装済み |
| NFR-07 | #27, #28 | DES-UI-22, 41 | TC-FR-UI-05-07 | src/ui/components/BalancePanel.tsx, src/ui/screens/BalanceDetailScreen.tsx, src/ui/App.css | 実装済み |
| CST-04 | #34 | DES-UI-37 | （査閲: 食品データにない商品の成分値を作る処理がない。手入力だけ） | src/ui/screens/RegisterScreen.tsx | 実装済み |
| FR-ING-08 | #24, #34 | DES-BSK-04, 08, DES-UI-35 | TC-FR-ING-08-01〜11（画面の手入力は未検証） | src/core/basket.ts, src/ui/screens/RegisterScreen.tsx, src/ui/format.ts | 実装済み（画面は査閲） |
| FR-QTY-01 | #24 | DES-BSK-01 | TC-FR-ING-01-01, 02 | src/core/basket.ts | 一部実装（#24: 登録時は個数 1。画面は #27） |
| FR-STP-04 | #24, #29 | DES-BSK-05, DES-UI-23 | TC-FR-STP-01-01, 02 | src/core/basket.ts, src/ui/screens/SettingsScreen.tsx | 実装済み |
| FR-NUT-06 | #24 | DES-BSK-07 | TC-FR-NUT-06-03 | src/core/basket.ts | 実装済み（IT01 の analyzeBasket と合わせて） |
| FR-ING-10 | #24, #27 | DES-BSK-02, 04, DES-UI-40 | TC-FR-ING-10-01〜08 | src/core/basket.ts, src/ui/components/ItemRow.tsx | 実装済み |
| FR-ING-11 | #24, #27 | DES-BSK-03, DES-UI-40 | TC-FR-ING-11-01, 02 | src/core/basket.ts, src/ui/components/ItemRow.tsx | 実装済み |
| FR-ING-12 | #24, #27 | DES-BSK-03, DES-UI-40 | TC-FR-ING-12-01, TC-FR-ING-11-02 | src/core/basket.ts, src/ui/components/ItemRow.tsx | 実装済み |
| FR-ING-13 | #34 | DES-UI-36 | （査閲: 1 食ごとの記録の入口がない） | src/ui/ | 実装済み |
| FR-QTY-04 | #24, #27 | DES-BSK-02 | TC-FR-QTY-04-01〜04, TC-FR-ING-10-07, 08 | src/core/basket.ts, src/ui/components/ItemRow.tsx | 実装済み |
| FR-STP-01 | #24, #29 | DES-BSK-05, DES-UI-23 | TC-FR-STP-01-01〜03 | src/core/basket.ts, src/ui/screens/SettingsScreen.tsx | 実装済み |
| FR-STP-02 | #24, #29 | DES-BSK-05, DES-UI-23 | TC-FR-STP-01-01〜03 | src/core/basket.ts, src/ui/screens/SettingsScreen.tsx | 実装済み |
| FR-STP-05 | #29 | DES-UI-23 | TC-FR-STP-05-01（IT01 の TC-FR-STP-04-05 も） | src/core/profile.ts, src/ui/screens/SettingsScreen.tsx | 実装済み |
| FR-UI-02 | #26 | DES-UI-10〜14, 20〜24 | TC-FR-UI-02-01〜03 | src/ui/App.tsx, src/ui/route.ts, src/ui/components/Navigation.tsx | 実装済み |
| FR-UI-03 | #27 | DES-UI-20 | （E2E） | src/ui/screens/HomeScreen.tsx, src/ui/components/Navigation.tsx | 実装済み |
| FR-UI-04 | #34 | DES-UI-21, 31 | （E2E） | src/ui/screens/RegisterScreen.tsx | 実装済み |
| FR-UI-05 | #28 | DES-UI-22, DES-BAL-06 | TC-FR-UI-05-01〜08 | src/core/balance.ts, src/core/analyze.ts, src/data/dietaryReference.ts, src/ui/screens/BalanceDetailScreen.tsx | 実装済み |
| FR-UI-06 | #27, #28 | DES-UI-20, 22, 41 | TC-FR-UI-05-07 | src/ui/components/BalancePanel.tsx, src/ui/screens/BalanceDetailScreen.tsx | 実装済み |
| FR-UI-08 | #34 | DES-UI-24 | TC-FR-UI-08-01 | src/ui/screens/FoodsScreen.tsx | 実装済み |
| FR-UI-09 | #29 | DES-UI-23 | TC-FR-STP-01-02 | src/ui/screens/SettingsScreen.tsx | 実装済み |
| FR-SYS-01 | #24, #25, #26 | DES-STO-01〜07, DES-UI-13 | TC-FR-SYS-01-01〜10 | src/core/basket.ts, src/core/storage.ts, src/ui/storage.ts, src/ui/App.tsx | 実装済み |
| FR-SYS-02 | #26 | DES-UI-13 | （査閲: ログインの画面・外部の認証を持たない） | src/ui/App.tsx | 実装済み |
| IF-01〜05 | #26, #30 | DES-UI-20〜24, DES-E2E-02, 05 | TC-IF-02-01, 02, TC-IF-03-01 | src/ui/App.css, src/ui/components/Navigation.tsx, e2e/screens.spec.ts | 実装済み（IF-01 は査閲、IF-02 の主な流れはタップ・キーボードで確認、IF-03〜05 は E2E） |
| NFR-01 | #30 | DES-E2E-03 | （実演: IT02 の振り返りで本人が確かめる） | src/ui/screens/HomeScreen.tsx, src/ui/screens/RegisterScreen.tsx | 未検証（本人の確認待ち） |
| NFR-02 | #30 | DES-E2E-03 | TC-NFR-02-01 | e2e/register-home.spec.ts | 実装済み（2 タップ） |
| NFR-12 | #25, #26, #27, #30 | DES-STO-02〜06, DES-UI-13, DES-E2E-04 | TC-NFR-12-01, 02, 07〜36 | src/core/storage.ts, src/ui/storage.ts, src/ui/components/StorageNotice.tsx | 実装済み（保存異常の 5 場面を E2E で確認） |
| NFR-13 | #25 | DES-STO-07 | TC-NFR-13-01〜11 | src/core/storage.ts | 実装済み（版の検査と移行の仕組み。仮の移行表で旧い版を読み込めることを確認） |
| NFR-14 | #26 | DES-UI-13 | （査閲: 外部に送る処理がなく、保存は localStorage だけ） | src/ui/storage.ts | 実装済み |
| QA-03 | #30 | DES-E2E-01〜06 | e2e/register-home.spec.ts, e2e/screens.spec.ts | playwright.config.ts, e2e/, .github/workflows/ci.yml | 実装済み |
| QA-09 | #28 | DES-BAL-06 | TC-FR-UI-05-01 | src/data/dietaryReference.ts（extraReferenceBasis にページと基準の種類） | 実装済み |

## 反復 3（IT03）

| 要求 | Issue | 設計 | テストケース | 実装 | 状態 |
|---|---|---|---|---|---|
| FR-BAL-06 | #54 | DES-SUG-01〜03 | TC-FR-BAL-06-01〜05 | src/core/suggestions.ts, src/core/suggestions.test.ts | core 実装済み（画面はGの範囲） |
| FR-BAL-07 | #54 | DES-SUG-02, 03 | TC-FR-BAL-07-01〜06, 08 | src/core/suggestions.ts, src/core/balance.ts, src/core/suggestions.test.ts | core 実装済み（画面はGの範囲） |
| FR-NUT-06 | #54 | DES-SUG-01〜03 | TC-FR-NUT-06-04（単体部分） | src/core/suggestions.ts, src/core/suggestions.test.ts | core 実装済み（表示・保存・押下はGで検証） |
| NFR-08 | #54 | DES-SUG-01〜03 | TC-FR-BAL-06-04, TC-FR-NUT-06-04、既存lint | src/core/suggestions.ts, src/core/balance.ts | 実装済み（純粋関数・入力不変） |
| NFR-09 | #54 | DES-SUG-01〜03 | TC-FR-BAL-06-01〜05, TC-FR-BAL-07-01〜06, 08、既存の網羅率検査 | src/core/suggestions.test.ts | 実装済み（core 命令網羅率80%以上を検証） |
| FR-BAL-06 | #60 | DES-UI-42、DES-E2E-08 | TC-FR-BAL-06-06〜08 | src/ui/components/SupplementSuggestions.tsx, src/ui/screens/HomeScreen.tsx, src/ui/supplementPresentation.test.ts, src/ui/scheduleSuggestions.test.ts, e2e/supplement-suggestions.spec.ts | 実装済み（概算表示は単体で確認。同梱候補は全件目安重量あり。E2E 追加。通知挿入でリスト外となる座標を含む候補欄全体の連打時フォーカスを修正。再計算前後の同一見出し DOM・フォーカス維持の E2E を追加、再実行は Claude Code が担当） |
| FR-BAL-07 | #60 | DES-UI-42 | TC-FR-BAL-07-02（注意表示） | src/ui/components/SupplementSuggestions.tsx, src/ui/supplementPresentation.test.ts | 実装済み（新しい過剰・不足・既存過剰の悪化を栄養素名で表示し、表示単体試験で確認） |
| FR-NUT-06 | #60 | DES-UI-42 | TC-FR-NUT-06-04（画面部分） | src/ui/App.tsx, src/ui/components/SupplementSuggestions.tsx, e2e/supplement-suggestions.spec.ts | 実装済み（実際の判定と候補計算を分離。表示だけでは保存・判定不変、選んだ候補のみ登録する E2E 追加・未実行） |
| FR-QTY-01 | #60 | DES-UI-42 | TC-FR-BAL-06-06、TC-FR-NUT-06-04 | src/ui/components/SupplementSuggestions.tsx, e2e/supplement-suggestions.spec.ts | 実装済み（既存 register action と registerMessage を再利用し1単位登録。E2E 追加・未実行） |
| NFR-03 | #60 | DES-UI-42 | TC-NFR-03-03（候補の表示）、TC-FR-BAL-06-08（予約中止） | src/ui/App.tsx, src/ui/scheduleSuggestions.ts, src/ui/scheduleSuggestions.test.ts, src/ui/components/SupplementSuggestions.tsx | 実装済み（2回の描画コールバックとタイマー後に計算。revision で古い予約・結果を破棄し、画面反映時に候補 revision を更新。時間計測・予算判定は Issue I） |
| QA-03 | #60 | DES-E2E-08 | TC-FR-BAL-06-06〜08、TC-FR-NUT-06-04 | e2e/supplement-suggestions.spec.ts | E2E 追加済み・未実行（mobile / desktop。連打・欄外へのマウス移動・キーボード・最新 revision・保存を検査。Claude Code が実行） |
