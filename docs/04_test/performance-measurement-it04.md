# IT04 性能と公開 URL の手動計測手順

対象: NFR-03、NFR-04、FR-SYS-03、QA-03、QA-04 / DES-PER-03, 04、DES-E2E-10 / TC-NFR-03-04、TC-NFR-04-02、TC-FR-SYS-03-01。この文書は手順と記録様式である。2026-11-02 に Claude Code が行った計測の記録を、各表に書いた。振り返りはこの記録を参照する。

## Lighthouse モバイル計測

1. 公開 URL `https://sakana396.github.io/week-meal/` を開き、配信されたコミット、日時、担当、機器と OS、Chrome の版を控える。公開 URL が対象であり、ローカルの preview は使わない。
2. Chrome の新しい専用プロファイルで拡張機能を無効にする。ほかの負荷の大きいアプリを閉じ、前景のタブで計測する。保存データの有無を控える。
3. DevTools の Lighthouse で Navigation、Mobile、Performance を選ぶ。ストレージ消去、CPU とネットワークの制限、キャッシュの設定を控える。項目名は実際の Chrome / Lighthouse の版に合わせて記録する。
4. Analyze page load を実行し、Performance スコアと計測日時を記録する。JSON と HTML のレポートをエクスポートし、保存先を記録する。Lighthouse の版はレポートの `lighthouseVersion` でも確認する。
5. TC-NFR-04-02 は必要項目が記録されていることを判定する。スコアの合否閾値は設けない。複数回測った場合は全回を記録する。

| 項目 | 記録 |
| --- | --- |
| 計測日時・担当 | 2026-11-01T15:41:58Z〜15:42:22Z（日本時間 11/2 0:42 ごろ）、Claude Code |
| URL・配信コミット | https://sakana396.github.io/week-meal/ 、main de5d298（PR #96 のマージ後の配信） |
| 機器・OS・Chrome 版・Lighthouse 版 | 開発者の PC（12 スレッド、メモリ 15 GB）の WSL2（Linux 6.18.54.1-microsoft-standard-WSL2）。Google Chrome for Testing 156.0.8078.4（Playwright の chromium-1248）を headless で使用。Lighthouse 13.5.0（CLI。作業用ディレクトリに入れ、リポジトリの依存には足していない） |
| モード・カテゴリ・端末設定 | Navigation / Performance / Mobile。DevTools ではなく CLI（`lighthouse https://sakana396.github.io/week-meal/ --only-categories=performance --form-factor=mobile --chrome-flags="--headless=new --no-sandbox"`） |
| CPU・ネットワーク制限 | simulate（Lighthouse の既定）。CPU 4 倍、RTT 150 ms |
| 保存データ・ストレージ消去・キャッシュ・拡張機能 | Lighthouse の既定（ストレージを消去）。保存データなしの初回表示。拡張機能なし（headless） |
| Performance スコア（全回） | 97・98・98（ほかの負荷のない状態の 3 回）。参考: この前に性能 E2E と同時に流した 3 回は 97・87・85 で、CPU の競合の影響を受けたので採らない |
| JSON・HTML レポートの保存先 | JSON は `docs/04_test/lighthouse-it04/run1.json`〜`run3.json`（ほかの負荷のない 3 回。Prettier で整形）。HTML は JSON から作り直せるので保存していない |
| 観測事項 | 実機ではなく開発者の PC の模擬。公開 URL（GitHub Pages）の配信を含む初回表示だけを測った |

## 操作時間の記録と実機相当の確認

通常の機能検査と性能計測は別の呼び出しで行う。E2E の接続先はビルドしたアプリの `vite preview` である。

```sh
npm run test:e2e -- --project=mobile --project=desktop --output=test-results/functional
npm run test:e2e -- --project=performance --workers=1 --output=test-results/performance
```

性能 E2E は Chromium・360×740・タッチ設定で、最新と前の買い物にそれぞれ 3 / 30 / 100 行、未登録の覚えた食品を対象の買い物の行数と同数、対象外の履歴を 0 / 100 件置く。対象外の履歴は各 3 行で、日付を 2026-01-01 から 1 日ずつずらす（100 件なら最終日は 2026-04-10）。すべて最新・前の買い物より古い。各条件で最新と前の買い物の登録・個数の増加と減少・行削除、最新が入れ替わる日付変更を同じ初期状態から各 5 回行う。CPU 制限なし / 4 倍 slowdown の両方を記録する。

### 標準出力の読み方

`[performance:sample]` は各回、`[performance:summary]` は操作別 5 回の最大値と全値を示す。接頭辞の後は JSON で、時間の単位は ms。`rows` は対象の買い物の行数、`historyCount` は対象外の履歴件数、`cpuRate` は CPU slowdown の倍率、`repeat` は 1〜5。`operation` は `registerLatest`、`incrementLatest`、`decrementLatest`、`removeLatest`、`registerPrevious`、`incrementPrevious`、`decrementPrevious`、`removePrevious`、`changeLatestDate` のいずれか。

| 出力フィールド | 意味 |
| --- | --- |
| `elapsedMs` | click 受信から判定反映後の 2 回目の描画コールバックまで。NFR-03 の対象 |
| `candidateCalculationMs`、`candidateReflectionMs` | ホームの候補計算と判定描画後の候補反映。判定とは別の診断値 |
| `candidateNotApplicable` | 登録画面、前の買い物の詳細、日付変更などで候補を測らない理由。`null` は 0 ms を意味しない |
| `overJudgmentBudgetMs`、`candidateCalculationOverBudgetMs`、`candidateReflectionOverBudgetMs` | 判定 100 ms・候補計算 50 ms・候補反映 100 ms からの超過量 |
| `maximumMs`、`maximumCandidateCalculationMs`、`maximumCandidateReflectionMs`、`values` | 操作別の最大値と、判定の全 5 回 |

IT03 の `TC-NFR-03-01〜03` の記録と E2E は残す。IT04 の試料と操作は `TC-NFR-03-04` として別に記録する。

### 添付 JSON と実機相当条件

各条件の `performance-it04.json` は `test-results/performance/<テスト別ディレクトリ>/` に書き出し、Playwright に添付する。コミット、作業差分の有無、GitHub の実行情報、OS・CPU・ブラウザ・画面幅・CPU 倍率・行数・履歴数と、操作別の全値・最大値・超過量を含む。旧ケースの `performance.json` と `unchanged-judgment.json` はそのまま残る。

CPU 4 倍は比較条件であり、中位スマートフォン相当の認定ではない。本人またはレビュアーと合意した機器・ブラウザ・接続方法・CPU 条件で、同じ固定試料と操作を測り、CI と分けて記録する。端末条件を合意できない場合は NFR-03 の達成を未確認とする。

| 項目 | 記録 |
| --- | --- |
| 日時・担当・コミット・差分 | Claude Code が 2 回測った。1 回目は 2026-11-02 02:45:23〜02:53:42、2 回目は 02:53:42〜03:01:42（日本時間）。計測の前に、ほかの Playwright・Lighthouse・vitest・Codex のプロセスが動いていないことを確かめ、計測中はほかの作業を流していない。ブランチ it04/90-verification（コミット 6f8a865 の上の未コミットの変更: レビュー REV-049 の指摘による試料の変更） |
| 合意した機器・OS・ブラウザ・接続方法・合意者 | 合意した条件はない（IT03 から持ち越しの「中位のスマートフォン相当」の条件は本人の判断待ち）。代わりに開発者の PC の WSL2、Node v22.23.2、Chromium（Playwright）で、ほかの負荷のない状態で測った |
| 画面幅・CPU 制限・保存試料・履歴件数 | 360×740・タッチ。CPU 制限なし / 4 倍。対象の買い物 3 / 30 / 100 行 × 対象外の履歴 0 / 100 件（IT04 の条件）と、IT03 の TC-NFR-03-01〜03 の条件 |
| 操作別・試料別の全 5 回と最大値 | 2 回とも 19 件のテストが成功。操作別の 5 回の値と最大値（`[performance:summary]` の行）を `docs/04_test/performance-it04/summary-run1.json`・`summary-run2.json` に保存した（IT03 の TC-NFR-03-01〜03 の条件を含む）。最大値: 1 回目は CPU 制限なしで 39.1 ms、CPU 4 倍で 96.1 ms。2 回目は CPU 制限なしで 34.6 ms、CPU 4 倍で 123.3 ms。どちらの回も、最大は「100 行・最新が入れ替わる日付変更」 |
| 判定 100 ms の合否 | 判定しない（合意した端末条件がないため、NFR-03 は未確認）。参考: CPU 制限なしでは、2 回とも全条件が 100 ms 以内。CPU 4 倍では、1 回目は全条件が 100 ms 以内、2 回目は「100 行・対象外の履歴 100 件・最新が入れ替わる日付変更」の 1 条件だけが 100 ms を超えた（123.3 ms） |
| 候補計算 50 ms と判定後の反映 100 ms | この記録では集計していない（標準出力に残る診断値） |
| JSON・観測事項 | 採らなかった計測が 2 つある。(1) 2026-11-02 00:25 からの 1 回は、途中で Lighthouse を同時に流していて、CPU 4 倍で最大 741 ms（100 行・補う候補の登録）など多くの条件が 100 ms を超えた。(2) 02:13〜02:28 ごろの 2 回（最大 128.6 ms・104.5 ms）は、レビュー（REV-049）の指摘の前の試料（覚えた食品 0 件、対象外の履歴は行のない空の買い物）で、2 回目の時間帯の記録もあいまいだった。どちらも採らず、試料を直してから上の 2 回を測り直した |

CI では時間の超過だけでは失敗にしない。revision 未更新、保存結果の不整合、画面例外、計測不能は失敗にする。

## 公開 URL の手動確認

1. 公開 URL `https://sakana396.github.io/week-meal/` を新しいブラウザのプロファイルで開き、日時・機器・ブラウザ・配信コミットを控える。
2. 食材を 3 件登録し、ホームで判定結果と登録行を確認する。必要なら主食を設定し、値を控える。
3. ページを再読み込みし、登録行・判定結果・設定が保持されることを確認する。
4. DevTools の Network で操作中の fetch / XHR と別オリジンへの要求を確認し、登録した食材と設定が外部へ送信されていないことを記録する。新しいプロファイルの保存状態を使い、開発サーバーの localStorage は移さない。

| 項目 | 記録 |
| --- | --- |
| 日時・担当・URL・配信コミット | 2026-11-01T17:20:38Z（日本時間 11/2 2:20）、Claude Code。https://sakana396.github.io/week-meal/ 、main de5d298 |
| 機器・OS・ブラウザ | 開発者の PC の WSL2。Chromium 156.0.8078.4（Playwright の chromium-1248、headless）、360×740・タッチ、新しいブラウザのコンテキスト（保存データなし）。手作業の DevTools ではなく Playwright のスクリプトで確かめた |
| 登録した食材・設定・判定・再読み込み後の状態 | キャベツ・にんじん・豚肉を登録。設定は初期値（ご飯・中盛り）。ホームに「偏りがあります」（過剰: たんぱく質、不足: ビタミン D）と補う候補が出た。再読み込みのあとも 3 件と判定が残り、保存データは版 3・買い物 1 件・3 行だった |
| fetch / XHR・別オリジンへの要求・外部送信 | 操作の始めから再読み込みまでの要求 6 件はすべて https://sakana396.github.io のもの。fetch / XHR は 0 件、別オリジンへの要求は 0 件 |
| 観測事項 | 実機ではなく開発者の PC での確認。登録・判定・再読み込み・要求の確認まで行った。本人の端末では確かめていない |
