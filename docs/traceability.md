# トレーサビリティマトリクス

- 文書 ID: TRC-001
- 対象: 反復 1（IT01）・反復 2（IT02）の範囲。反復ごとに行を追加する

要求から設計・テスト・実装までの対応を表す。実装の担当者（エージェントを含む）は、自分が担当した要求の行だけを更新する。

| 要求 | Issue | 設計 | テストケース | 実装 | 状態 |
|---|---|---|---|---|---|
| FR-ING-03 | #3 | DES-CAT-06 | TC-FR-ING-03-01〜03 | src/core/catalog.ts | 実装済み（検索の正規化） |
| FR-ING-04 | #3 | DES-CAT-04 | TC-FR-ING-04-01〜03 | src/core/catalog.ts（並び順）, src/App.tsx（検索結果） | 実装済み（並び順。画面は IT02 で E2E） |
| FR-ING-05 | #3 | DES-CAT-01〜03 | TC-FR-ING-05-01〜10 | src/core/catalog.ts（まとめ・代表食品）, src/App.tsx（押して登録） | 実装済み（まとめ・代表食品。画面は IT02 で E2E） |
| FR-ING-06 | #3, #5 | DES-CAT-01 | TC-FR-ING-06-01〜20 | src/core/catalog.ts | 実装済み |
| FR-ING-09 | #3, #4, #9 | DES-CAT-05, DES-FDB-01 | TC-FR-ING-09-01〜07 | src/core/catalog.ts, scripts/food-selection.json, src/App.tsx | 実装済み（判定・データ。画面は手動確認待ち、IT02 で E2E） |
| FR-FDB-01 | #4, #20 | DES-FDB-01, 02 | TC-FR-FDB-01-01, 02 | scripts/food-selection.json, src/data/foods.json | 実装済み |
| FR-FDB-02 | #4 | DES-FDB-01, 02 | TC-FR-FDB-02-01〜04 | scripts/convert-mext-foods.py | 実装済み |
| FR-QTY-01 | #5 | DES-QTY-02 | TC-FR-QTY-01-01〜04 | src/core/quantity.ts | 実装済み（換算。個数 1 の登録は #9） |
| FR-QTY-02 | #5 | DES-QTY-01, 02 | TC-FR-QTY-02-01〜05 | src/core/quantity.ts, src/data/unitWeights.ts | 実装済み |
| FR-QTY-03 | #5 | DES-QTY-02 | TC-FR-QTY-02-01, TC-FR-QTY-03-01, 02 | src/core/quantity.ts | 実装済み |
| FR-QTY-05 | #5, #8 | DES-QTY-02, DES-ANL-01 | TC-FR-QTY-05-01〜04 | src/core/quantity.ts, src/core/analyze.ts | 実装済み |
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
| NFR-11 | #4, #5 | DES-FDB-04 | TC-NFR-11-01〜07 | src/data/integrity.test.ts | 実装済み |
| NFR-15 | #7 | DES-NUT-01〜04 | TC-FR-NUT-01-01, 02-01, 04-01, TC-FR-STP-03-01 | src/core/nutrition.test.ts | 実装済み |
| QA-01 | #2 | DES-DEV-03 | TC-QA-01-01 | .github/workflows/ci.yml | 実装済み |
| QA-02 | #2 | DES-DEV-02 | TC-QA-02-01 | vite.config.ts | 実装済み |
| QA-09 | #5, #6 | DES-QTY-01, DES-BAL-01 | TC-FR-QTY-02-05、査閲（基準値の出典: REV-007） | src/data/unitWeights.ts, src/data/dietaryReference.ts | 実装済み |

## 反復 2（IT02）

| 要求 | Issue | 設計 | テストケース | 実装 | 状態 |
|---|---|---|---|---|---|
| FR-ING-01 | #24, #34 | DES-BSK-01, DES-UI-21, 30 | | | 未着手 |
| FR-ING-02 | #34 | DES-UI-32 | | | 未着手 |
| FR-ING-03 | #34 | DES-UI-32 | | | 未着手 |
| FR-ING-04 | #34 | DES-UI-33 | | | 未着手 |
| FR-ING-05 | #34 | DES-UI-30 | | | 未着手 |
| FR-ING-06 | #34 | DES-UI-30 | | | 未着手 |
| FR-ING-07 | #34 | DES-UI-31 | | | 未着手 |
| FR-ING-09 | #23, #34 | DES-UI-32, 34 | | | 未着手 |
| FR-FDB-03 | #34 | DES-UI-35 | | | 未着手 |
| FR-BAL-05 | #27 | DES-ANL-03, DES-UI-41 | | | 未着手 |
| FR-NUT-05 | #27 | DES-ANL-03, DES-UI-41 | | | 未着手 |
| FR-UI-01 | #27 | DES-UI-20, 41 | | | 未着手 |
| FR-UI-07 | #27 | DES-UI-41 | | | 未着手 |
| NFR-07 | #27, #28 | DES-UI-22, 41 | | | 未着手 |
| CST-04 | #34 | DES-UI-37 | | | 未着手 |
| FR-ING-08 | #24, #34 | DES-BSK-04, 08, DES-UI-35 | | | 未着手 |
| FR-QTY-01 | #24 | DES-BSK-01 | | | 未着手 |
| FR-STP-04 | #24, #29 | DES-BSK-05, DES-UI-23 | | | 未着手 |
| FR-NUT-06 | #24 | DES-BSK-07 | | | 未着手 |
| FR-ING-10 | #24, #27 | DES-BSK-02, 04, DES-UI-40 | | | 未着手 |
| FR-ING-11 | #24, #27 | DES-BSK-03, DES-UI-40 | | | 未着手 |
| FR-ING-12 | #24, #27 | DES-BSK-03, DES-UI-40 | | | 未着手 |
| FR-ING-13 | #34 | DES-UI-36 | | | 未着手 |
| FR-QTY-04 | #24, #27 | DES-BSK-02 | | | 未着手 |
| FR-STP-01 | #24, #29 | DES-BSK-05, DES-UI-23 | | | 未着手 |
| FR-STP-02 | #24, #29 | DES-BSK-05, DES-UI-23 | | | 未着手 |
| FR-STP-05 | #29 | DES-UI-23 | | | 未着手 |
| FR-UI-02 | #26 | DES-UI-10〜13, 20〜24 | | | 未着手 |
| FR-UI-03 | #27 | DES-UI-20 | | | 未着手 |
| FR-UI-04 | #34 | DES-UI-21, 31 | | | 未着手 |
| FR-UI-05 | #28 | DES-UI-22, DES-BAL-06 | | | 未着手 |
| FR-UI-06 | #27, #28 | DES-UI-20, 22, 41 | | | 未着手 |
| FR-UI-08 | #34 | DES-UI-24 | | | 未着手 |
| FR-UI-09 | #29 | DES-UI-23 | | | 未着手 |
| FR-SYS-01 | #25, #26 | DES-STO-01〜07, DES-UI-13 | | | 未着手 |
| FR-SYS-02 | #26 | DES-UI-13 | | | 未着手 |
| IF-01〜05 | #26, #30 | DES-UI-20〜24, DES-E2E-02, 05 | | | 未着手 |
| NFR-01 | #30 | DES-E2E-03 | | | 未着手 |
| NFR-02 | #30 | DES-E2E-03 | | | 未着手 |
| NFR-12 | #25, #26, #27, #30 | DES-STO-02〜06, DES-E2E-04 | | | 未着手 |
| NFR-13 | #25 | DES-STO-07 | | | 未着手 |
| NFR-14 | #26 | DES-UI-13 | | | 未着手 |
| QA-03 | #30 | DES-E2E-01〜06 | | | 未着手 |
| QA-09 | #28 | DES-BAL-06 | | | 未着手 |
