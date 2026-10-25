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
| FR-ING-08 | #24, #34, #56 | DES-BSK-04, 08, DES-UI-35, DES-MAN-01, DES-STO-08 | TC-FR-ING-08-01〜11（画面の手入力は未検証）、TC-FR-ING-08-02（IT03 で保持に変更）、TC-FR-ING-15-01 | src/core/basket.ts, src/ui/screens/RegisterScreen.tsx, src/ui/format.ts, src/core/storage.ts, e2e/manual-memory.spec.ts | 実装済み（IT03 の台帳保持。E2E 成功（ローカル・CI）。フォーム改善は別 Issue） |
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
| FR-SYS-01 | #24, #25, #26, #56 | DES-STO-01〜07, DES-UI-13, DES-STO-08, 09 | TC-FR-SYS-01-01〜10、TC-NFR-13-12〜14 | src/core/basket.ts, src/core/storage.ts, src/ui/storage.ts, src/ui/App.tsx, e2e/manual-memory.spec.ts | 実装済み（版 2。移行の E2E 成功（ローカル・CI）） |
| FR-SYS-02 | #26 | DES-UI-13 | （査閲: ログインの画面・外部の認証を持たない） | src/ui/App.tsx | 実装済み |
| IF-01〜05 | #26, #30 | DES-UI-20〜24, DES-E2E-02, 05 | TC-IF-02-01, 02, TC-IF-03-01 | src/ui/App.css, src/ui/components/Navigation.tsx, e2e/screens.spec.ts | 実装済み（IF-01 は査閲、IF-02 の主な流れはタップ・キーボードで確認、IF-03〜05 は E2E） |
| NFR-01 | #30 | DES-E2E-03 | （実演: IT02 の振り返りで本人が確かめる） | src/ui/screens/HomeScreen.tsx, src/ui/screens/RegisterScreen.tsx | 未検証（本人の確認待ち） |
| NFR-02 | #30, #56 | DES-E2E-03, DES-UI-43 | TC-NFR-02-01、TC-FR-ING-15-04 | e2e/register-home.spec.ts, e2e/manual-memory.spec.ts | 実装済み（覚えた食品の 2 タップ登録。追加 E2E 成功（ローカル・CI）） |
| NFR-12 | #25, #26, #27, #30, #56 | DES-STO-02〜06, DES-UI-13, DES-E2E-04, DES-STO-08, 09 | TC-NFR-12-01, 02, 07〜36、TC-NFR-13-14、TC-NFR-12-26（保持に変更）、TC-NFR-12-33（登録後まで強化） | src/core/storage.ts, src/ui/storage.ts, src/ui/components/StorageNotice.tsx, src/ui/App.tsx, e2e/register-home.spec.ts | 実装済み（退避不可時の保存停止。強化した E2E 成功（ローカル・CI）） |
| NFR-13 | #25, #56 | DES-STO-07, DES-STO-08 | TC-NFR-13-01〜11、TC-NFR-13-12〜14 | src/core/storage.ts, src/ui/storage.test.ts, e2e/manual-memory.spec.ts | 実装済み（版 1→2 の移行、未参照食品・来歴の往復。E2E 成功（ローカル・CI）） |
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
| FR-ING-15 | #56 | DES-MAN-01, DES-STO-08, DES-UI-43（一覧） | TC-FR-ING-15-01〜09、TC-NFR-13-12, 13 | src/core/manualFoods.ts, src/core/basket.ts, src/core/storage.ts, src/ui/screens/RegisterScreen.tsx, e2e/manual-memory.spec.ts | 実装済み（単体テスト成功。E2E 成功（ローカル・CI）） |
| FR-UI-06 | #55 | DES-COL-01, 02、DES-UI-01, 22, 41 | TC-FR-UI-06-01〜03、TC-FR-BAL-07-07 | src/ui/balanceTone.ts, src/ui/balanceTone.test.ts, src/core/suggestions.test.ts, src/ui/components/BalancePanel.tsx, src/ui/screens/BalanceDetailScreen.tsx, src/ui/App.css, e2e/balance-color.spec.ts | 実装済み。下限比は #54 の実装を再利用し、既存の異常値テスト名を 07-07 に修正。E2E 成功（ローカル・CI）。H-07 の色の違いは本人確認待ち |
| NFR-07 | #55 | DES-COL-01, 02 | TC-FR-UI-06-02, 03、TC-NFR-07-01 | src/ui/balanceTone.test.ts, src/ui/components/BalancePanel.tsx, src/ui/screens/BalanceDetailScreen.tsx, src/ui/App.css, e2e/balance-color.spec.ts | 単体検証済み。黒文字との赤〜黄 256 色の比は最小 5.252:1・最大 19.556:1、紫は約 11.879:1（全 257 色が 4.5:1 以上）。式・一次資料は TST-IT03 2.3。強制カラー E2E 成功（ローカル・CI）、一次資料の本文再取得と H-07 は査閲待ち |
| FR-ING-10 | #57 | DES-BSK-09、DES-UI-45 | TC-FR-ING-14-01〜05 | src/core/basketSession.ts, src/ui/App.tsx, src/ui/screens/HomeScreen.tsx, src/ui/components/ItemRow.tsx, e2e/undo-delete.spec.ts | 実装済み（削除の取り消し。単体検証済み、E2E 成功（ローカル・CI）） |
| FR-ING-14 | #57 | DES-BSK-09、DES-UI-45 | TC-FR-ING-14-01〜05 | src/core/basketSession.ts, src/core/basketSession.test.ts, src/ui/App.tsx, src/ui/screens/HomeScreen.tsx, src/ui/components/ItemRow.tsx, e2e/undo-delete.spec.ts | 実装済み（01〜04 の単体テスト。01〜03・05 の E2E 成功（ローカル・CI）。一時状態を保存・分析から分離） |
| FR-BAL-06 | #60 | DES-UI-42、DES-E2E-08 | TC-FR-BAL-06-06〜08 | src/ui/components/SupplementSuggestions.tsx, src/ui/screens/HomeScreen.tsx, src/ui/supplementPresentation.test.ts, src/ui/scheduleSuggestions.test.ts, e2e/supplement-suggestions.spec.ts | 実装済み（概算表示は単体で確認。同梱候補は全件目安重量あり。E2E 成功（ローカル・CI）。固定枠・候補入替・削除後の候補登録も E2E 成功（ローカル・CI）） |
| FR-BAL-07 | #60 | DES-UI-42 | TC-FR-BAL-07-02（注意表示） | src/ui/components/SupplementSuggestions.tsx, src/ui/supplementPresentation.test.ts | 実装済み（新しい過剰・不足・既存過剰の悪化を栄養素名で表示し、表示単体試験で確認） |
| FR-NUT-06 | #60 | DES-UI-42 | TC-FR-NUT-06-04（画面部分） | src/ui/App.tsx, src/ui/components/SupplementSuggestions.tsx, e2e/supplement-suggestions.spec.ts | 実装済み（実際の判定と候補計算を分離。表示だけでは保存・判定不変、選んだ候補のみ登録する E2E 成功（ローカル・CI）） |
| FR-QTY-01 | #60 | DES-UI-42 | TC-FR-BAL-06-06、TC-FR-NUT-06-04 | src/ui/components/SupplementSuggestions.tsx, e2e/supplement-suggestions.spec.ts | 実装済み（既存 register action と registerMessage を再利用し1単位登録。E2E 成功（ローカル・CI）） |
| NFR-03 | #60 | DES-UI-42 | TC-NFR-03-03（候補の表示）、TC-FR-BAL-06-08（予約中止） | src/ui/App.tsx, src/ui/scheduleSuggestions.ts, src/ui/scheduleSuggestions.test.ts, src/ui/components/SupplementSuggestions.tsx | 実装済み（2回の描画コールバックとタイマー後に計算。revision で古い予約・結果を破棄し、画面反映時に候補 revision を更新。時間計測・予算判定は Issue I） |
| QA-03 | #60 | DES-E2E-08 | TC-FR-BAL-06-06〜08、TC-FR-NUT-06-04 | e2e/supplement-suggestions.spec.ts | E2E 成功（ローカル・CI）。マウス操作を mobile / desktop の画面幅で検証。修正分も E2E 成功（ローカル・CI） |
| FR-ING-08 | #58 | DES-UI-43（フォーム） | TC-FR-ING-08-12, 13 | src/ui/screens/RegisterScreen.tsx, src/ui/App.css, e2e/manual-input.spec.ts | 実装済み（検索語の明示引き継ぎ・成分折りたたみ。E2E 成功（ローカル・CI）） |
| FR-ING-16 | #58 | DES-MAN-02, DES-UI-44, DES-STO-08（来歴） | TC-FR-ING-16-01〜04 | src/core/manualFoods.ts, src/core/manualFoods.test.ts, src/core/storage.test.ts, src/ui/screens/RegisterScreen.tsx, e2e/manual-input.spec.ts, e2e/manual-memory.spec.ts | 実装済み（成分の独立した写し・全項目編集・来歴表示と保持。単体検証、E2E 成功（ローカル・CI）） |
| CST-01, CST-04 | #58 | DES-MAN-02, DES-UI-44 | TC-FR-ING-16-01, 02 | src/core/manualFoods.ts, src/core/manualFoods.test.ts, src/ui/screens/RegisterScreen.tsx, e2e/manual-input.spec.ts | 実装済み（明示選択した実在食品の成分だけを下書きに使用、原典の変更なし。単体検証、E2E 成功（ローカル・CI）） |
| FR-STP-01 | #61 | DES-E2E-09 | TC-FR-STP-01-02（強化） | e2e/screens.spec.ts, e2e/carryover.spec.ts | テスト実装済み（各1単位で主食変更前後の炭水化物の判定、属性用試料で不足項目の変化と保存を検査。栄養詳細の数値確認も維持。E2E 成功（ローカル・CI）） |
| FR-STP-04 | #61 | DES-E2E-09 | TC-FR-STP-01-02（強化） | e2e/screens.spec.ts, e2e/carryover.spec.ts | テスト実装済み（性別・年齢による鉄の数値変化と、ホームのビタミンA・Cの不足追加を検査。E2E 成功（ローカル・CI）） |
| FR-ING-02 | #61 | DES-UI-32、DES-E2E-09 | TC-FR-ING-02-01 | e2e/carryover.spec.ts, src/ui/screens/RegisterScreen.tsx | テスト実装済み（簡易・詳細の棚と検索、0件、絞り込み解除を卵・野菜・すべての棚で確認。IT02 の画面未検証を補う。E2E 成功（ローカル・CI）） |
| FR-ING-04 | #61 | DES-UI-33、DES-E2E-09 | TC-FR-ING-04-06 | e2e/carryover.spec.ts, src/ui/screens/RegisterScreen.tsx | テスト実装済み（野菜の未検索順、優先食材の後半と検索での非優先食材の表示。IT02 の画面未検証を補う。E2E 成功（ローカル・CI）） |
| FR-ING-06 | #61 | DES-UI-30、DES-E2E-09 | TC-FR-ING-06-21 | e2e/carryover.spec.ts, src/ui/screens/RegisterScreen.tsx | テスト実装済み（まぐろと缶詰、はくさいと漬物の別名表示・別行登録。棚は魚でまぐろ・まぐろ（缶詰）、野菜ではくさい、豆腐・納豆ではくさいの漬物の表示を検査。代表食品10252／10260、06233／06236は実装時に関数の出力で確認（自動テストではない）。IT02 の画面未検証を補う。E2E 成功（ローカル・CI）） |
| FR-ING-08 | #61 | DES-UI-35, 43、DES-E2E-09 | TC-FR-ING-08-14, 15、TC-FR-NUT-05-04 | e2e/carryover.spec.ts, src/ui/screens/RegisterScreen.tsx | テスト実装済み（名前・棚だけの登録、集計対象外の通知、空白名の拒否、成分ありの手入力。保持とフォーム操作は #56・#58 の仕様に合わせた。E2E 成功（ローカル・CI）） |
| FR-FDB-03 | #61 | DES-UI-35、DES-E2E-09 | TC-FR-FDB-03-01 | e2e/carryover.spec.ts, src/ui/screens/RegisterScreen.tsx | テスト実装済み（除外したサゴでん粉02032を手入力で補う。除外の根拠は food-selection-review-it03.md。IT02 の画面未検証を補う。E2E 成功（ローカル・CI）） |
| FR-NUT-05 | #61 | DES-UI-22, 41、DES-E2E-09 | TC-FR-NUT-05-04、TC-FR-ING-08-14 | e2e/carryover.spec.ts, src/ui/components/BalancePanel.tsx, src/ui/screens/BalanceDetailScreen.tsx | テスト実装済み（成分一部欠損・全欠損・明示ゼロ・エネルギー欠損の画面通知、充足率とカバー率。人工試料であり実在食品の成分ではない。E2E 成功（ローカル・CI）） |
| IF-02 | #61 | DES-E2E-09 | TC-IF-02-01（強化） | e2e/screens.spec.ts | テスト実装済み（モバイルのタップ登録を itemRow の名前・個数で検査。全機能の実演範囲の本人確認は計画書8章のまま。E2E 成功（ローカル・CI）） |
| QA-05 | #61 | DES-E2E-09 | TC-FR-STP-01-02、TC-IF-02-01、TC-FR-ING-02-01、TC-FR-ING-04-06、TC-FR-ING-06-21、TC-FR-ING-08-14, 15、TC-FR-FDB-03-01、TC-FR-NUT-05-04 | docs/04_test/test-spec-it02.md, docs/04_test/test-spec-it03.md, docs/traceability.md, e2e/screens.spec.ts, e2e/carryover.spec.ts | #61 の担当要求を既存の IT03 表に対応付け、旧仕様書の担当2行も更新。アプリの動作と設計の変更なし。typecheck・lint・format:check・test:coverage・build は成功（565件、core命令網羅率98.74%）。Playwright のテスト収集も成功。E2E 成功（ローカル・CI）：135件成功・1件スキップ（Claude Code とレビュアーが実行。レビュー修正後も Claude Code が実行して同じ結果） |
| NFR-03 | #62 | DES-PER-01、DES-UI-42 | TC-NFR-03-01〜03 | e2e/performance.spec.ts, playwright.config.ts, src/ui/components/SupplementSuggestions.tsx, .github/workflows/ci.yml | 計測を実装。判定と候補を分け、全値・最大値・環境・予算との差を成功時も artifact 保存。行数・CPU倍率・操作別の各回と最大値を標準出力にも表示し、性能計測手順に読み方を記載。CI は時間を記録し、不整合・計測不能は失敗。E2E 成功（ローカル・CI）。中位スマートフォン相当の端末条件・100ms達成は本人またはレビュアーの査閲事項 |
| NFR-04、QA-04 | #62 | DES-PER-02 | TC-NFR-04-01 | docs/04_test/performance-measurement-it03.md | 手順・記録様式を用意。Lighthouse のスコア・日時・コミット・版・設定・URL・機器を反復末の振り返りに記録する。スコア閾値なし。計測結果は本 Issue の対象外 |
| NFR-06 | #62 | DES-E2E-07 | TC-NFR-06-01, 02 | e2e/accessibility.spec.ts, .github/workflows/ci.yml | 全画面と新操作の展開状態で axe を実行し critical / serious 0件を必須化。軽微な違反・判定保留を添付。手入力の名前・棚は対象フォーム内で検索。E2E 成功（ローカル・CI） |
| IF-02〜05、QA-03 | #62 | DES-E2E-05, 07, 08、DES-UI-42, 45 | TC-NFR-06-01, 02 | e2e/accessibility.spec.ts, src/ui/screens/HomeScreen.tsx, src/ui/components/SupplementSuggestions.tsx | 新操作を Tab / Enter / Space、フォーカス、44px、横スクロールなしで両画面幅検査。一連のキーボード操作は候補登録後も候補欄が残る各10単位の4食材を使用。削除通知を取り消しボタンの説明に関連付け、画面移動では古い取り消しへフォーカスせず、候補固定開始時だけ見出しにフォーカス。E2E 成功（ローカル・CI）。全機能の実演範囲は本人の確認事項 |
