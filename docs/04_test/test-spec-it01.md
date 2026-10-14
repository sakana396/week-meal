# テスト仕様書（反復 1）

- 文書 ID: TST-IT01
- 版: 0.1
- 作成日: 2026-10-14
- 対象: [設計書 DES-IT01](../03_design/design-it01.md)

## 1. 方針

- 単体テストは Vitest で書き、`src/**/*.test.ts` に置く
- テストケース ID は `TC-<要求ID>-<連番2桁>`。テストの名前（`it` の第 1 引数）の先頭に ID を書く
- 1 つの要求に、正常系・境界値・異常系を最低 1 件ずつ考える
- 計算の期待値は手計算で求め、計算の過程を備考に書く（NFR-15）

## 2. テストケース

実装の Issue ごとに追記する。

| ID | 対象（要求・設計） | 前提 | 入力・操作 | 期待結果 | 種別 |
|---|---|---|---|---|---|
| TC-NFR-08-01 | NFR-08 / DES-PKG-05 | lint の設定がある | `src/core/` のファイルで `react` を import して `npm run lint` | `no-restricted-imports` の誤りになる（#2 で手動確認） | 異常 |
| TC-NFR-08-02 | NFR-08 / DES-PKG-05 | 同上 | `src/core/` のファイルで `Date.now()` を使って `npm run lint` | `no-restricted-properties` の誤りになる（#2 で手動確認） | 異常 |
| TC-NFR-10-01 | NFR-10 / DES-DEV-04 | 同上 | `any` を書いて `npm run lint` | `@typescript-eslint/no-explicit-any` の誤りになる（#2 で手動確認） | 異常 |
| TC-NFR-08-03 | NFR-08 / DES-PKG-05 | 同上 | `src/core/` で `.tsx` からの react の import、下の階層からの `../../App`・`../ui/*` の import、`globalThis.localStorage`、引数なしの `new Date()`、動的 `import("react")`、`import("react").FC` を書いて `npm run lint` | すべて誤りになる。`../data/*` の import と `new Date(0)` は誤りにならない（#2 で手動確認） | 異常 |
| TC-QA-02-01 | QA-02 / DES-DEV-02 | 網羅率の閾値 80% | テストのない関数を `src/core/` に置いて `npm run test:coverage` | 終了コードが 0 以外になる（#2 で手動確認） | 異常 |
| TC-QA-01-01 | QA-01 / DES-DEV-03 | CI の設定がある | プルリクエストを作る | 型検査・lint・フォーマット確認・単体テスト・ビルドが実行される | 正常 |

## 3. 変更履歴

| 版 | 日付 | 内容 |
|---|---|---|
| 0.1 | 2026-10-14 | 雛形 |
