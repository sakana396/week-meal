# IT03 性能の手動計測手順

対象: NFR-03、NFR-04、QA-04 / DES-PER-01, 02 / TC-NFR-03-01〜03、TC-NFR-04-01。反復の終わりに人または Claude Code が実施し、結果を `docs/iterations/it03/retrospective.md` に記録する。この文書は計測の手順と記録様式であり、測定結果ではない。

## Lighthouse モバイル計測

1. 対象コミットと作業差分（`git rev-parse HEAD`、`git status --short`）を控える。Node・OS・機器・Chrome の版も控える。
2. `npm run build`、`npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` を実行する。本番ビルドを対象とし、開発サーバーでは測らない。
3. Chrome の新しい専用プロファイルで拡張機能を無効にし、`http://127.0.0.1:4173/#/` を開く。ほかの負荷の大きいアプリを閉じ、前景のタブで測る。初回状態（保存データなし）を基本にし、データを入れる場合はその保存試料も残す。
4. DevTools の Lighthouse で Navigation、Mobile、Performance を選ぶ。ストレージ消去・CPU とネットワークの throttling の値、キャッシュの扱いなど実際の設定を控える。Chrome / Lighthouse の版によって項目が異なる場合も、使った項目と値を書く。
5. Analyze page load を実行する。Performance スコアを転記し、JSON と HTML のレポートをエクスポートする。Lighthouse の版はレポートの `lighthouseVersion` でも確認する。レポートの保存先を振り返りから参照する。
6. TC-NFR-04-01 の判定は必要項目の記録の有無とする。スコアに合否閾値を設けない。繰り返す場合は全スコアと各回の条件を残し、良い回だけを選ばない。

記録様式（実測してから埋める）:

| 項目 | 実測記録 |
|---|---|
| 計測日時・担当 | |
| コミット・作業差分 | |
| ビルドコマンド・Node 版 | |
| URL・配信方法 | |
| 機器（CPU・メモリー）・OS | |
| Chrome 版・Lighthouse 版 | |
| モード・カテゴリ・端末設定 | Navigation / Performance / Mobile（実際の設定も記入） |
| CPU・ネットワーク制限 | |
| 保存データ・ストレージ消去・キャッシュ・拡張機能 | |
| Performance スコア（全回） | |
| JSON・HTML レポートの保存先 | |
| 観測事項・前回との差 | |

## 操作時間の記録と実機相当の確認

通常の機能検査と性能計測を同時に走らせない。

```sh
npm run test:e2e -- --project=mobile --project=desktop --output=test-results/functional
npm run test:e2e -- --project=performance --workers=1 --output=test-results/performance
```

専用 project は Chromium・360×740・タッチ設定で、CPU 制限なし / 4 倍 slowdown、固定 3 / 30 / 100 行、同数の未登録の覚えた食材を使う。各行は食品番号 06061 / 06212 / 11115 を順に繰り返し、個数は 10。各操作を同じ保存状態から 5 回行う。候補集合は同梱データ全件から生成する。

### 標準出力の読み方

`npm run test:e2e -- --project=performance --workers=1` の標準出力で、各回の `[performance:sample]` と操作別の `[performance:summary]` を読める。各行は接頭辞に続く JSON で、時間の単位はすべて ms。`rows` は登録行数（3 / 30 / 100）、`cpuRate` は CPU slowdown の倍率（1 は制限なし、4 は4倍）、`operation` は `register`（通常登録）、`candidate`（候補登録）、`increment`（個数増加）、`usedUp`（使い切った）を表す。`repeat` は1始まりの測定回（1〜5）。

| 出力フィールド | 意味 |
|---|---|
| `elapsedMs` | click 受信から判定反映後の2回目の描画コールバックまで。NFR-03 の対象 |
| `candidateCalculationMs` | 差分準備＋全候補計算の所要時間。診断予算50 ms |
| `candidateReflectionMs` | 判定の描画コールバックから候補 revision の反映まで。診断予算100 ms |
| `clickToCandidateMs` | click 受信から候補反映まで。`elapsedMs` と `candidateReflectionMs` の合計で、NFR-03 の合否には使わない |
| `candidateNotApplicable` | 候補を測らない理由。通常登録は登録画面で候補を計算せず、3行の使い切ったでは2行になり候補欄が消える。候補時間は `null` で、0 ms を意味しない |
| `overJudgmentBudgetMs`、`candidateCalculationOverBudgetMs`、`candidateReflectionOverBudgetMs` | 順に判定100 ms・候補計算50 ms・判定後の候補反映100 msからの超過量（超過なしは0） |
| `maximumMs`、`maximumCandidateCalculationMs`、`maximumCandidateReflectionMs` | summary の操作別5回の最大値（順に判定・候補計算・判定後の候補反映）。`values` は判定の全5回 |

`[performance:unchanged-judgment]` は、別試料で判定文言が変わらない個数変更の計測値（`elapsedMs`）と revision・`balanceChanged: false` を出す。これらの出力は診断記録であり、時間の合否条件は DES-PER-01 のままとする。

### 添付 JSON と実機相当条件

各 JSON は `testInfo.outputPath(ファイル名)` に UTF-8 で書き出してから `attach(name, { path })` で添付する。上記コマンドでは `test-results/performance/<テスト別ディレクトリ>/performance.json` に全測定値・操作別最大値・環境・コミット・作業差分の有無・GitHub の実行情報・候補件数・初期生成・差分準備と全候補計算の時間・判定後から候補反映までの時間・予算超過量を残す。登録画面を開く時間は Playwright の画面待機と通信を含む補助的な経過時間で、NFR-03 のクリック受信からの時間とは分ける。判定文言が変わらない試料でも revision の更新で完了を確認する。候補計算は UI の PerformanceMeasure、判定と候補反映は E2E が注入する MutationObserver で記録する。判定文言が変わらない試料の結果は `test-results/performance/<テスト別ディレクトリ>/unchanged-judgment.json` に残る。`performance.json` の `commit` は `git rev-parse HEAD`、`workingTreeDirty` は `git status --porcelain` が空でなければ `true`。`githubSha` と `githubHeadRef` は環境変数 `GITHUB_SHA`・`GITHUB_HEAD_REF` の値（未設定なら `null`）を記録する。pull_request の CI の HEAD はマージコミットになるため、これらを併せて読む。

axe の全結果（軽微な違反・判定保留を含む）は `test-results/functional/<テスト別ディレクトリ>/axe-<状態名>.json` に残る。状態名は `home-candidates`、`home-removal`、`register-collapsed`、`register-draft`、`register-remembered`、`balance`、`settings`、`foods`、`food-detail`。`--output` を省略したローカル実行では、いずれも `test-results/<テスト別ディレクトリ>/` の下に同名ファイルを残す。別々の呼び出しで両方の記録を保持するには、上記のように出力先を分ける。

CI の upload 手順は `if: always()` で `test-results/` を artifact `playwright-results` として収集する設定。修正後の E2E 実行と CI artifact 内のファイルの確認は Claude Code が行うため、本修正時点では未確認。

CPU 4 倍は比較条件であり、中位スマートフォン相当の認定ではない。反復末に本人の端末、または本人・レビュアーと合意した端末と条件で同じ固定試料・4 操作・各 5 回を測り、次の様式で CI と別に記録する。実機ではブラウザ内の click capture・revision 監視・2 回の requestAnimationFrame の測定方式を維持する。専用 project を接続先の実機ブラウザで実行する場合は接続方法・画面幅・CPU 設定も記録する。端末や接続方法により実行できない場合は達成を未確認とし、CI の値で代用しない。

| 項目 | 記録 |
|---|---|
| 日時・担当・コミット・差分 | |
| 合意した機器・OS・ブラウザ・接続方法・合意者 | |
| 画面幅・CPU 制限・保存試料・候補件数 | |
| 操作別・試料別の全 5 回と最大値 | |
| 判定 100 ms の合否 | 全測定値が 100 ms 以内で合格、1 回でも超過すれば不合格 |
| 候補の差分準備＋全候補計算（50 ms）と判定後の反映（100 ms） | 判定とは別の診断値として全値・最大値・差を記録 |
| JSON・観測事項 | |

CI では時間の超過だけでは失敗にしない。revision 未更新、不整合、例外、計測不能は失敗とする。候補計算の 50 ms と候補反映の 100 ms は診断予算であり、NFR-03 の 100 ms と区別して内訳を査閲する。端末条件が合意できない場合、NFR-03 の達成は未確認として振り返りに残す。

予算を超える回があり得る。超えた回は記録に残る。PR #73 のレビュアーからは、30 行・CPU 4 倍の候補登録で候補計算が 1 回 57.8 ms（50 ms の予算を 7.8 ms 超過）だったとの報告がある。時間超過は記録のみとする条件は変えない。
