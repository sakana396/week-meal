# レビュー記録 REV-085: Issue #167（PR #168）CI で時々失敗する E2E の待ち方を直す

- 対象: PR #168（Issue #167、ブランチ `it08/167-flaky-e2e`、コミット f028400 と修正分 d941791）
- 日付: 2026-11-24
- 作成者: Codex（実装）、コミットは Claude Code（メイン）
- レビュアー: 作成者・コミットしたエージェントとは別の Claude Code サブエージェント
- 結果: 承認（2026-11-24。指摘 #1・#2 の修正分（d941791）を同じレビュアーが再レビューして承認）

## 自動マージの条件 3

該当なし。要求・企画の文書（`docs/01_concept/`、`docs/02_requirements/`）と運用ルール（`AGENTS.md`、`CLAUDE.md`、`.claude/`、`docs/00_plan/`）は変えていない。変更は `e2e/compact-row.spec.ts`、`e2e/receipt.spec.ts`、`e2e/row-layout.spec.ts`、`docs/04_test/test-spec-it08.md` だけ。

## 指摘と対応

| # | 重大度 | 指摘 | 対応 |
|---|---|---|---|
| 1 | 中 | Issue の「ほかの E2E に、保存の直後に 1 回だけ読む同じ形がないか確かめ、あれば同じように直す」について、同じ原因（DES-UI-50 の保存の予約）で読む形が `e2e/compact-row.spec.ts` に 3 か所残っている。83 行（TC-FR-UI-10-02・03 同名行）、138 行（TC-FR-UI-10-01・03 削除して復元）、221 行（TC-FR-UI-10-02 長い名前）は、`page.goto("#/")` の直後に `JSON.parse(localStorage.getItem("weekmeal:state")!)` を読んで書き換える。初めて開いたときの保存も `scheduleAfterPaint`（`requestAnimationFrame` の後の `setTimeout(0)`）で予約され、読み込み時に同期で書く処理はない（`src/ui/App.tsx` 137〜161 行、`src/ui/storage.ts`）。`goto` は `load` で戻るため、初回の保存より先に読むと `null` になり `state.shoppings = …` で例外になる。レビュアーが別のポート（4291）で配信し、Playwright で同じ読み書きを試したところ、トレースなしでは desktop 19/30・27/40、mobile 17/40 で例外になった。トレースを取ると（`playwright.config.ts` の `trace: "retain-on-failure"` と同じ）0/30 で、操作ごとのトレースの遅れで競合が隠れているだけと考えられる。各テストの書き換えの前に `await expect.poll(() => page.evaluate(() => localStorage.getItem("weekmeal:state"))).not.toBeNull()` で初回の保存を待つか、`receipt.spec.ts` の TC-FR-RCP-01-03 のように `initialAppState` から作った状態を `setItem` して `reload` する形にする | compact-row.spec.ts の 3 か所で、初回の保存を待ってから状態を書き換えるようにした。ほかの E2E に同じ形がないことを確かめた |
| 2 | 軽微 | テスト仕様書 `docs/04_test/test-spec-it08.md` の 3 章「既存ケースの変更」に、TC-NFR-06-05 が「変更なしで確認する」と書かれたままで、今回 E2E を変えたことと合わない（REV-083 #6 と同じ種類）。3 章の TC-NFR-06-05 を「スクロール後、行の描画（`checkVisibility({ contentVisibilityAuto: true })`）を待ってからテキストを採る。期待結果は維持（Issue #167）」のように分けて書く。TC-FR-RCP-06-03・TC-FR-UI-10-01・03 は IT08 の新規ケースで期待結果を変えていないので、変更履歴 0.6 にケース ID を挙げる程度でよい | テスト仕様書 3 章の TC-NFR-06-05 に、スクロール後に描画を待つことと期待結果の維持を書いた |

参考（指摘ではない）:

- `register-home.spec.ts` 228 行（TC-NFR-12-33）は、登録の後に保存データが `{壊れた` のままであることを 1 回だけ読む。「書かれていないこと」の確認なので、待ち方で失敗する形ではない（保存の前に読めば誤って成功する側）。保存しない理由は `loaded.available` が `false` で `useLayoutEffect` が早く戻ることで、予約に依存しないため実害はない。
- `row-layout.spec.ts` の追加した `expect.poll` がタイムアウトしたときは、「スクロール後」の観測が `observations` に入る前に失敗するため、JSON には「画面外」の観測だけが残る。描画が戻らなかったことは失敗のメッセージで分かるので、直さなくてよい。
- `compact-row.spec.ts` の削除と取り消しのケースの `toBe(1)` は、削除の保存が書かれる前の状態（1 件）でも満たされる。修正前の 1 回の読み取りも同じで、最終の保存状態（1 件）と一致するので期待値は弱めていない。

## 確かめたこと

失敗の原因の見立て（確かめること 1）:

- `gh run view 45369761520 --attempt 1 --log-failed` で、TC-NFR-06-05（mobile・desktop）が 172 行の `expect(text.innerText).toContain(targetName)` で `Received string: ""`、TC-FR-RCP-06-03（desktop）が 331 行の `expect(items).toHaveLength(1)` で `Received array: []` になっていた。attempt 2 は TC-NFR-06-05（desktop）だけ。
- 保存の予約: `src/ui/scheduleAfterPaint.ts` は `requestAnimationFrame` の後の `setTimeout(0)` で `save` を呼び、`src/ui/App.tsx` の `useLayoutEffect` が状態の変更ごとに予約する（DES-IT06 5.1 の DES-UI-50 どおり）。`receipt.spec.ts` の `savedItems` は `localStorage` を 1 回読むだけなので、「1 件を登録」の直後に読むと予約の前の空の配列になる。ログの `[]` と合う。
- 画面外の行: `.item-row` は `content-visibility: auto`（DES-PER-07）。`toBeInViewport` は交差の判定で、描画の後回しの解除（次の描画の更新）より先に満たされうる。解除の前は `innerText` が空になることは IT06 の計測記録（`performance-measurement-it06.md` 2 章）で観測済みで、ログの `""` と合う。

直し方と試験の意図（確かめること 2）:

- TC-FR-RCP-06-03: `expect.poll(() => savedItems(page)).toHaveLength(1)` で保存を待ってから、量（`weight`・150 g・`g`）を読む。同じファイルの 106 行・221 行と同じ書き方。期待値は変えていない。
- TC-NFR-06-05: 「画面外」の段は変えておらず、ループの前の `waitForFunction` で描画が後回しになっていることを引き続き確かめている。「スクロール後」は `checkVisibility({ contentVisibilityAuto: true })` が `true` になるまで待ってから `innerText`・`textContent`・ariaSnapshot・`getByRole` を採る。描画が戻らなければポーリングが既定の 5 秒で失敗するので、「スクロール後に描画され、`innerText` で名前を読める」ことの検査は弱まっていない。画面外の `innerText` の空文字を許容し、スクロール後は全文を読めるという IT05・IT06 の記録（TST-IT06 の TC-NFR-06-05、DES-IT06 6.2、IT06 の振り返り）の扱いとも合う。待つ対象は既存の `waitForFunction` と同じ `firstElementChild` で、固定時間の待ちは使っていない。
- TC-FR-UI-10-01・03（`compact-row.spec.ts` 削除して復元）: 取り消し後の 1 回の読み取りを、対象の買い物の件数が 1 になるまでのポーリングに変えた。期待値は同じ。

同じ形の残り（確かめること 3）:

- `grep` で `localStorage.getItem("weekmeal:state")`、`savedItems(`、`stored(page)`、`saved(page)` の使い方を全 E2E で確かめた。`manual-input`・`manual-memory`・`undo-delete`・`row-quantity`・`supplement-suggestions`・`register-home`（296 行）・`performance` は、操作の後に `expect.poll` で待ってから読むか、`reload` の後（`pagehide` で書き出し済み）に読んでいる。`receipt.spec.ts` の `savedItems` の 3 か所はすべてポーリングの後。残りは指摘 #1 の `compact-row.spec.ts` の 3 か所。

アプリのコードとテスト仕様書（確かめること 4）:

- `git diff origin/main...HEAD --stat` は `e2e/` の 3 ファイルとテスト仕様書だけで、`src/` の変更はない。
- テスト仕様書は版を 0.6 にし、変更履歴に「Issue #167 の保存と画面外の行の描画の待機を修正。期待結果は維持」を足した。3 章は指摘 #2。トレーサビリティは新しいケースがないので変更不要。

実行したこと:

- `npm run typecheck`、`npm run lint`、変更した 4 ファイルの `prettier --check` は成功。
- E2E（ポート 4173）は実行していない（Codex の 140 件の繰り返しと全件 243 件の成功の報告を前提にした）。指摘 #1 の確かめのため、`npm run build` の上で `vite preview --port 4291` を起動し、Playwright の単独のスクリプト（スクラッチパッド）で `goto` 直後の読み書きを繰り返した。E2E のテストファイルは実行していない。

## 再レビュー（d941791）

結果: 承認。指摘 #1・#2 はどちらも解消した。新しい指摘はない。

- 指摘 #1: `compact-row.spec.ts` の 3 か所（同名行、削除して復元、長い名前）で、`page.goto("#/")` の後、書き換えの前に `expect.poll(() => page.evaluate(() => localStorage.getItem("weekmeal:state"))).not.toBeNull()` で初回の保存を待つようにした。指摘で挙げた 3 か所すべてにあり、ほかに `goto` の直後に保存データを読んで書き換える箇所はない（`grep` で再確認）。期待値は変えていない。
- 指摘 #1 の確かめ: 前回と同じ方法（`vite preview --port 4291`、スクラッチパッドの単独スクリプト、トレースなし）で、mobile・desktop 各 40 回、`goto` の直後の読み取りと、待った後の読み書きを試した。直後の読み取りは mobile 15/40・desktop 16/40 で `null` だった（競合はまだ起きる）。初回の保存を待った後の読み書きの例外は両方とも 0/40 だった。書き換えの 300 ms 後に、アプリのその後の保存で上書きされていないことも確かめた（両方とも 0/40）。初回の保存の後は状態が変わらず、予約された保存が残らないため、この後の `reload` で書き換えた状態が読まれる。
- 指摘 #2: テスト仕様書 3 章で TC-IF-03-01 と TC-NFR-06-05 の行を分け、TC-NFR-06-05 に「スクロール後、行の描画を待ってから文字を読む。期待結果は維持（Issue #167）」と書いた。実際の変更と合う。
- 修正分の `src/` の変更はない（`git diff f028400 HEAD --stat -- src` が空）。`npm run typecheck`、`npm run lint`、変更したファイルの `prettier --check` は成功。E2E（ポート 4173）は実行していない（Codex の、直した spec の 5 回繰り返し 90 件と全 E2E 243 件成功・1 件スキップの報告を前提にした）。
