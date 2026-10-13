# トレーサビリティマトリクス

- 文書 ID: TRC-001
- 対象: 反復 1（IT01）の範囲。反復ごとに行を追加する

要求から設計・テスト・実装までの対応を表す。実装の担当者（エージェントを含む）は、自分が担当した要求の行だけを更新する。

| 要求 | Issue | 設計 | テストケース | 実装 | 状態 |
|---|---|---|---|---|---|
| FR-ING-03 | #3 | DES-CAT-06 | TC-FR-ING-03-01〜03 | src/core/catalog.ts | 実装済み（検索の正規化） |
| FR-ING-04 | #3 | DES-CAT-04 | TC-FR-ING-04-01〜03 | src/core/catalog.ts（並び順）, src/App.tsx（検索結果） | 実装済み（並び順。画面は IT02 で E2E） |
| FR-ING-05 | #3 | DES-CAT-01〜03 | TC-FR-ING-05-01〜10 | src/core/catalog.ts（まとめ・代表食品）, src/App.tsx（押して登録） | 実装済み（まとめ・代表食品。画面は IT02 で E2E） |
| FR-ING-06 | #3, #5 | DES-CAT-01 | TC-FR-ING-06-01〜20 | src/core/catalog.ts | 実装済み |
| FR-ING-09 | #3, #4, #9 | DES-CAT-05, DES-FDB-01 | TC-FR-ING-09-01〜05 | src/core/catalog.ts, scripts/food-selection.json | 一部実装（#3: 判定関数、#4: 食品データから除外） |
| FR-FDB-01 | #4 | DES-FDB-01, 02 | TC-FR-FDB-01-01 | scripts/food-selection.json, src/data/foods.json | 実装済み |
| FR-FDB-02 | #4 | DES-FDB-01, 02 | TC-FR-FDB-02-01〜04 | scripts/convert-mext-foods.py | 実装済み |
| FR-QTY-01 | #5 | DES-QTY-02 | TC-FR-QTY-01-01〜04 | src/core/quantity.ts | 実装済み（換算。個数 1 の登録は #9） |
| FR-QTY-02 | #5 | DES-QTY-01, 02 | TC-FR-QTY-02-01〜05 | src/core/quantity.ts, src/data/unitWeights.ts | 実装済み |
| FR-QTY-03 | #5 | DES-QTY-02 | TC-FR-QTY-02-01, TC-FR-QTY-03-01, 02 | src/core/quantity.ts | 実装済み |
| FR-QTY-05 | #5 | DES-QTY-02 | TC-FR-QTY-05-01, 02 | src/core/quantity.ts | 実装済み |
| FR-QTY-06 | #5 | DES-QTY-02 | （査閲: グラムを入力させる引数がない） | src/core/quantity.ts | 実装済み |
| FR-STP-03 | #7 | DES-NUT-02, DES-STP-01 | | | 未着手 |
| FR-STP-04 | #6 | DES-BAL-02 | | | 未着手 |
| FR-NUT-01 | #7 | DES-NUT-01 | | | 未着手 |
| FR-NUT-02 | #7 | DES-NUT-03 | | | 未着手 |
| FR-NUT-03 | #7 | DES-NUT-03 | | | 未着手 |
| FR-NUT-04 | #7 | DES-NUT-04 | | | 未着手 |
| FR-NUT-05 | #7 | DES-NUT-01, 03 | | | 未着手 |
| FR-NUT-06 | #8 | DES-ANL-01 | | | 未着手 |
| FR-BAL-01 | #6, #8 | DES-BAL-01, 02, 04 | | | 未着手 |
| FR-BAL-02 | #8 | DES-BAL-04 | | | 未着手 |
| FR-BAL-03 | #8 | DES-BAL-04 | | | 未着手 |
| FR-BAL-04 | #8 | DES-BAL-03 | | | 未着手 |
| FR-BAL-05 | #8 | DES-BAL-05 | | | 未着手 |
| FR-UI-01 | #9 | DES-UI-01 | | | 未着手 |
| FR-UI-07 | #9 | DES-UI-01 | | | 未着手 |
| NFR-07 | #9 | DES-UI-01 | | | 未着手 |
| NFR-08 | #2 | DES-PKG-01, 05 | TC-NFR-08-01〜03 | eslint.config.js | 実装済み |
| NFR-09 | #2 | DES-DEV-02 | TC-QA-02-01 | vite.config.ts | 実装済み |
| NFR-10 | #2 | DES-DEV-04 | TC-NFR-10-01 | eslint.config.js, tsconfig.app.json | 実装済み |
| NFR-11 | #4, #5 | DES-FDB-04 | TC-NFR-11-01〜06 | src/data/integrity.test.ts | 実装済み |
| NFR-15 | #7 | DES-NUT-01〜04 | | | 未着手 |
| QA-01 | #2 | DES-DEV-03 | TC-QA-01-01 | .github/workflows/ci.yml | 実装済み |
| QA-02 | #2 | DES-DEV-02 | TC-QA-02-01 | vite.config.ts | 実装済み |
| QA-09 | #5, #6 | DES-QTY-01, DES-BAL-01 | TC-FR-QTY-02-05 | src/data/unitWeights.ts | 一部実装（#5: 目安重量） |
