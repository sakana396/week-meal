# レビュー記録 REV-082: Issue #161（PR #164）登録が少ないときに判定の案内を出す

- 対象: PR #164（Issue #161、ブランチ `it08/161-balance-notice`、コミット 75bb0c7）
- 日付: 2026-11-24
- 作成者: Codex（実装）、コミットと PR は Claude Code
- レビュアー: 作成者とは別の Claude Code サブエージェント
- 結果: 要修正（指摘 #1）

## 自動マージの条件 3

該当なし。要求・企画の文書（`docs/01_concept/`、`docs/02_requirements/`）と運用ルール（`AGENTS.md`、`CLAUDE.md`、`.claude/`、`docs/00_plan/`）は変えていない。変更は `src/`、`e2e/`、`docs/04_test/test-spec-it08.md`、`docs/traceability.md` だけ。

## 確かめたこと

- DES-BAL-08（DES-IT08 4 章）の数え方: `analyzeBasket` の judged 結果に `itemCount: active.length` を足しただけで、`active` は既存の「正の量（個数・重さ）かつエネルギー値が null でない行」。行ごとに数えるので同名の別行も別に数える。主食は `active` のあとで `all` に足すので含まれない。既存の最低 3 品目（`minimumItemCount`）と同じ数え方になっている。
- 判定そのもの: `results`・`pfc`・`details`・`approximateItems`・`noDataItems` の求め方と、`insufficient` の条件（`tooFewItems`・`noEnergy`）は変わっていない。既存の `analyzeBasket` のテストは変更なしで通る（`balanceTone.test.ts` は型に合わせて `itemCount: 5` を足しただけ）。
- 表示の条件: `BalancePanel` は `insufficient`（`tooFewItems`・`noEnergy`）で先に return するので、未判定では案内が出ない。judged は必ず 3 行以上なので、`itemCount < 5` は「3・4 行で出し、5 行以上で出さない」と同じになる。
- 文言と位置: 主食あり「登録した食材が少ないため、判定は登録した食材と設定した主食に基づく目安です。」、主食なし（`staple === "none"`）「登録した食材が少ないため、判定は登録した食材に基づく目安です。」で、設計の全文と一致する。判定見出し `h3` の直後の `p` に出る。`BalancePanel` を使うのはホーム（`HomeScreen`）と前の買い物（`HistoryDetailScreen`）だけで、栄養詳細（`BalanceDetailScreen`）は `NoDataNote` だけを使うので案内は出ない。主食の食品データがそろっていることは既存のテスト（`analyze.test.ts` の `defaultAnalysisData.stapleFoods`）が確かめている。
- 単体テスト TC-FR-BAL-09-01: `it.each([2, 3, 4, 5])` で主食 `rice`・`none` の両方について、2 行は `insufficient`、3〜5 行は `judged` と `itemCount` を確かめる（5 行目は `basket[0]` の同名別行）。主食ありでも `itemCount` が増えないので、主食を数えないことも確かめられる。もう一つのテストで、同名 2 行＋別 1 行＋エネルギー欠損・個数 0・重さ −1 の 6 行が `judged`・`itemCount: 3` になること、エネルギー合計 0 が `noEnergy` になることを確かめる。テスト名の先頭に ID がある。
- E2E TC-FR-BAL-09-02（コードを読んだだけ。実行はメインが mobile・desktop で 19 件成功を確認済み）: 主食 `rice`・`none` × 2・3・4・5 行 × ホーム（`#/`）・前の買い物（`#/history/old`）の 16 通りで、3・4 行は `h3 + p` の文言を、2・5 行は案内がないことを確かめる。
- core の約束: 追加は値を返すだけで、React・DOM・`localStorage`・時刻・乱数は使っていない。引数を変更せず、例外も投げない。`any` なし。型のコメントと `BalancePanel` の説明に DES-BAL-08 がある。
- 検証（ワークツリーで実行）: `npm run typecheck`・`npm run lint`・`npm run format:check` は成功。`npm run test:coverage` は 30 ファイル・795 件が成功（`analyze.ts` は行 100%）。E2E はポート 4173 を共有するため実行していない。
- `docs/traceability.md`: 追加の 6 行は、空行・見出し「反復 8（IT08）」・空行・表の見出し 2 行と、FR-BAL-09（#161）の 1 行。ほかの行の書き換えや重複はない（既存の表には反復 7 の見出しがなく、IT08 の見出しは初出）。
- `docs/04_test/test-spec-it08.md`: 変えたのは担当の TC-FR-BAL-09-01・02 の 2 行だけ。TST-IT08 の 1 章の「実装時に各ケースを具体化」に沿った書き直しで、ほかの行は変わっていない。

## 指摘と対応

| # | 重大度 | 指摘 | 対応 |
|---|---|---|---|
| 1 | 要修正 | 境目 5 が `BalancePanel.tsx` に `analysis.itemCount < 5` と数値で直書きされている。(1) 設計は境目 5 を「E-146 の例を採用したエージェントの判断で、栄養学上の閾値ではない」とし、H-20 で本人に確かめるので、変わりうる値である。既存の最低品目数は core の `minimumItemCount` に根拠のコメント付きで置かれており、それと同じく `src/core/analyze.ts` の `minimumItemCount` の近くに定数（例: `fewItemsNoticeCount = 5`）として置き、DES-BAL-08・E-146・H-20 と「根拠ある閾値ではない」ことをコメントに書くべき（QA-09 の考え方とも合う）。(2) 「3・4 行で出し、5 行以上は出さない」は判定の規則なので、AGENTS.md の「`src/core/` の規則は Vitest の単体テストで確かめる」に当たる。今は境目 5 を確かめるのが E2E だけで、TC-FR-BAL-09-01 は `itemCount` しか見ていない。定数を UI で使い、TC-FR-BAL-09-01 の表に「案内を出すか」（2・5 行: 出さない、3・4 行: 出す）の期待を足す（定数と比べる小さな純粋関数を core に置く方法でもよい）。テスト仕様書の TC-FR-BAL-09-01 の内容にも書き足す | analyze.ts に境目の定数と根拠のコメント（DES-BAL-08・E-146・H-20、仮置き）、案内を出すかを返す純粋関数を足し、UI から使うようにした。TC-FR-BAL-09-01 とテスト仕様書に 2・5 行は出さない、3・4 行は出す期待を足した |
| 2 | 軽微 | E2E で 2・5 行のときに案内がないことは `h3 + p` に絞った locator で確かめているので、パネルのほかの位置に案内が出ても通ってしまう。2・5 行では、パネル全体に「登録した食材が少ないため」がないことを確かめるほうが確実（任意） | 2・5 行でパネル全体に案内の文がないことを確かめるようにした |
| 3 | 軽微 | TST-IT08 の TC-FR-BAL-09-01 の書き直しで、もとの「判定結果は従来どおり」が消えた。判定が変わらないことは、既存の `analyzeBasket` のテストが変更なしで通ることで確かめているので、そのことを内容の列に一言残すとよい（任意） | TC-FR-BAL-09-01 に、判定結果は既存テストが変更なしで通ることで確かめる旨を書いた |
| 4 | 情報 | 本 PR の欠陥ではない。並行する PR #163（#159）は FR-RCP-05 の行を `docs/traceability.md` の反復 5 の表の途中に挿し込み、本 PR は新しい「反復 8（IT08）」の表を作る。両方がマージされると IT08 の行が 2 か所に分かれるので、メインで置き場所をそろえるとよい | メインがマージの順に合わせて traceability の置き場所をそろえる |

## 設計への提案

なし。

## 人の査閲が必要な点

境目 5 行と案内の文言（H-20）。設計どおりエージェントの判断として扱われている。マージを止めない（振り返りで確認）。
