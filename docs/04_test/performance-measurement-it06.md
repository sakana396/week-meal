# IT06 行の高さ・画面外の行・性能の計測記録

対象: #133 / NFR-03、NFR-06、FR-QTY-07 / DES-PER-07、DES-UI-51、DES-IT06 6 章。

計測日: 2026-11-05。Claude Code がローカル（WSL2）で実行した JSON とログから転記した。数値は丸めず、JSON の値のまま記載する。以下の表と JSON は、推定値を 767 px 以下で `auto 213.5px`、それ以外で `auto 113px` に変更した後の再実行結果。変更前の超過は 4 章に区別して記録する。

実行ログ: `/tmp/claude-1000/-home-sakana-orca-workspaces-week-meal-main/73c6eca0-9a79-42cf-a1c3-50c44d997559/scratchpad/e2e133c.log`（E2E 全体: `238 passed (15.9m)`、`1 skipped`。性能 19 件も成功）。実行ログは `/tmp` のスクラッチ領域にある一時ファイルで残らないため、要点（実行件数・結果と変更前の超過値）をこの記録に写した。成功は性能予算内を意味しないため、4 章で実測値から判定する。結果 JSON は今回の実行で上書きされた `test-results/<テスト別ディレクトリ>/` にある。目視・ページ内検索・実際の読み上げの確認結果は、これらの資料にないため未確認とする。

## 1. 行の高さ（TC-NFR-03-06）

`e2e/row-layout.spec.ts` は mobile（360×740）・desktop（1280×800）で、各行を画面内にスクロールし、フォントと 2 回の描画を経て `getBoundingClientRect().height` を記録する。試料は名前 4 種 × 個数・g・kg の 12 行。「にんじん」「ミックスベジタブル」は目安重量の定義あり、「試料」「目安重量の定義がない長い食材名の測定用試料」は定義なしの人工の表示名とする。食品番号は 06212 に固定し、名前で定義の有無を分ける。定義なしの個数行にも概算 100 g の表示があり、重さ行には目安の表示がない。

各プロジェクトの `row-heights-it06.json` に、試料・目安定義の有無・実寸・CSS の推定寸法・余白・枠・幅ごとの中央値・ブラウザの版・日時を残す。`test-results/<テスト別ディレクトリ>/` に保存し、添付する。中央値は 12 行を等しい重みで算出する。行全体と内容領域（高さから上下の余白と枠を引いた値）の両方を残し、CSS の `contain-intrinsic-size` が内容領域を表すことに注意して推定値を検討する。

| 記録 | 360 px | 1280 px |
| --- | --- | --- |
| 実行日時・コミット・差分の有無 | `2026-11-05T04:06:38.143Z`、コミット・差分の有無は高さ JSON・機能ログに記録なし（性能 JSON の記録は 4 章に記載） | `2026-11-05T04:08:15.495Z`、コミット・差分の有無は高さ JSON・機能ログに記録なし（性能 JSON の記録は 4 章に記載） |
| 各試料の高さ・JSON の保存先 | [row-heights-it06.json](../../test-results/row-layout-TC-NFR-03-06-行の実寸と幅ごとの中央値を記録する-mobile/row-heights-it06.json)（各試料は下表） | [row-heights-it06.json](../../test-results/row-layout-TC-NFR-03-06-行の実寸と幅ごとの中央値を記録する-desktop/row-heights-it06.json)（各試料は下表） |
| 行全体／内容領域の中央値 | 239.5 px ／ 213.5 px | 139 px ／ 113 px |
| 採用する推定寸法と根拠 | `auto 213.5px`。内容領域の中央値に一致させる（767 px 以下） | `auto 113px`。内容領域の中央値に一致させる（768 px 以上） |
| スクロールのつまみの跳ねの目視確認 | 未確認（JSON・ログに目視結果なし。変更後に確認が必要） | 未確認（JSON・ログに目視結果なし。変更後に確認が必要） |

変更前の `auto 180px` は実測に基づく値ではなかった。2026-11-05 に DES-PER-07・DES-IT06 6.1 に従って `src/ui/App.css` を変更した。上下の padding 合計 24 px と border 合計 2 px を除いた内容領域の中央値を使う。幅による差が大きいため、既存の行の配置の切り替え（767 px 以下）に合わせて推定値も分けた。これは 360 px と 1280 px の試料に基づく推定であり、ほかの幅の実測値ではない。`auto` は維持し、一度表示した行の実寸を記憶する。変更後の再計測は 4 章に記録した。スクロールの目視確認は未実施。

各試料の行全体の高さ（px）。量は個数 1、g は 200 g、kg は 0.2 kg、食品番号はすべて 06212。

| 食材名 | 目安定義 | 量の種類 | 360 px | 1280 px |
| --- | --- | --- | --- | --- |
| にんじん | あり | 個数 | 240 | 140 |
| にんじん | あり | g | 239 | 139 |
| にんじん | あり | kg | 239 | 139 |
| ミックスベジタブル | あり | 個数 | 240 | 140 |
| ミックスベジタブル | あり | g | 239 | 139 |
| ミックスベジタブル | あり | kg | 239 | 139 |
| 試料 | なし | 個数 | 240 | 140 |
| 試料 | なし | g | 239 | 139 |
| 試料 | なし | kg | 239 | 139 |
| 目安重量の定義がない長い食材名の測定用試料 | なし | 個数 | 256 | 140 |
| 目安重量の定義がない長い食材名の測定用試料 | なし | g | 293 | 139 |
| 目安重量の定義がない長い食材名の測定用試料 | なし | kg | 293 | 139 |

## 2. 画面外の行（TC-NFR-06-05）

コードから確認できること: `.item-row` は `content-visibility: auto` を使い、React は画面外も含む全行の DOM・テキスト・ボタンの `aria-label` を生成している。アプリには画面外の行に対する `aria-hidden` や DOM の間引きがない。名前と操作対象を読む既存の `itemRow` はテキストのロケーターを使い、`innerText` を前提にしない。ただし、DOM が存在することだけではブラウザの読み上げ・検索への影響を判断できない。

調査テストは 100 行目に一意の名前「画面外の検索確認用にんじん」を置く。画面外で描画が省略された状態を `checkVisibility({ contentVisibilityAuto: true })` で確認し、スクロール前後の `innerText`・`textContent`・`locator.ariaSnapshot()`・`getByRole` の件数を `offscreen-text-it06.json` に記録する。アクセシビリティの取得より先にテキストを採る。`innerText` の空文字は固定の期待値にせず記録し、`textContent`・アクセシビリティ情報・ロケーターでは対象名と操作を取得できることを検査する。最後に焦点移動と Enter で個数を増やせることを確認する。失敗しても、それまでの観測を JSON に残す。

| 確認項目 | 360 px | 1280 px |
| --- | --- | --- |
| スクロール前後の描画省略状態・innerText・textContent | 描画省略 `true` → `false`。innerText は `""` → 名前・単位・個数・目安・削除の全文。textContent は前後とも全文（下記 JSON に原文） | 描画省略 `true` → `false`。innerText は `""` → 名前・単位・個数・目安・削除の全文。textContent は前後とも全文（下記 JSON に原文） |
| ariaSnapshot・getByRole・操作の結果 | ariaSnapshot は前後とも食材名・単位切り替え・増減・削除を含む。getByRole は前後とも 1 件。焦点移動後の Enter で 1 → 1.5 の検査成功（実行ログ） | ariaSnapshot は前後とも食材名・単位切り替え・増減・削除を含む。getByRole は前後とも 1 件。焦点移動後の Enter で 1 → 1.5 の検査成功（実行ログ） |
| Chromium のページ内検索 | 未確認（JSON・ログに Ctrl+F の確認結果なし） | 未確認（JSON・ログに Ctrl+F の確認結果なし） |
| 読み上げ・後回しの範囲への判断 | 実際の読み上げは未確認。自動検査では情報取得・操作に不整合なし。後回しの範囲は維持する | 実際の読み上げは未確認。自動検査では情報取得・操作に不整合なし。後回しの範囲は維持する |

観測原文: mobile は [offscreen-text-it06.json](../../test-results/row-layout-TC-NFR-06-05-画面外の行のテキストとアクセシビリティを比較する-mobile/offscreen-text-it06.json)、desktop は [offscreen-text-it06.json](../../test-results/row-layout-TC-NFR-06-05-画面外の行のテキストとアクセシビリティを比較する-desktop/offscreen-text-it06.json)。両幅とも同じ結果。textContent は前後とも `画面外の検索確認用にんじん個gkg−1 つ（概算）＋1 単位 ≒ 100 g（概算）削除`。スクロール後の innerText は `画面外の検索確認用にんじん\n個\ng\nkg\n−\n1 つ（概算）\n＋\n1 単位 ≒ 100 g（概算）\n削除`。

ページ内検索は、同じ保存試料のホームで先頭へ戻り、Chromium の Ctrl+F で「画面外の検索確認用にんじん」を検索する。件数、対象行が画面内に出ること、強調表示、検索を閉じた後の操作を確認して記録する。`getByText` の検索はブラウザのページ内検索の代わりにしない。スクリーンリーダーでの実際の読み上げは ariaSnapshot と区別して記録する。アクセシビリティ情報や操作に影響がある場合は DES-IT06 6.2 に従って後回しの範囲を調整し、性能を測り直す。

## 3. 性能 E2E の準備（DES-IT06 6.3）

PR #120 の登録一覧の待ちが 5 秒で失敗した件に対し、`e2e/performance.spec.ts` の準備専用の assertion を 30 秒にした。対象は初期候補の revision=0、前の買い物の詳細画面、登録画面の食材名一覧、計測するボタンの表示・有効化。スクロールの待ちも 30 秒とする。固定時間の sleep は加えず、必要な要素の状態を待つ。試料の書き込み・再読み込みと画面移動・操作対象の準備の所要時間を `kind: "preparation"` として既存の詳細 JSON の samples に残し、途中で失敗した段階も記録する。準備時間は Node 側の時計で測るため、Playwright 通信の時間も含む。phase は待つ状態、timeoutMs は準備の待ち時間を示す。

クリック捕捉から判定 commit 後の 2 回目の描画までの時計、候補の時計、各条件 5 回、100 / 50 ms の予算、計測中の 5 秒のタイムアウト、CI の判定規則は変えていない。時間超過は記録のみ、計測不能・機能不整合は失敗とする。

- 100 行・別履歴 100 件・CPU 4 倍での各準備段階の所要時間と再現の有無: 各段階は下表。全 135 記録で準備失敗なし。登録画面の食材名一覧を待つ既報の失敗は今回再現せず。ただしローカルでの結果であり、CI での原因特定・解消を示すものではない
- 待つ要素と段階別の詳細 JSON の保存先: [performance-it04.json](../../test-results/performance-TC-NFR-03-04-T-c5a1a-FR-03-06-100行-別履歴100件-CPU4倍-performance/performance-it04.json)。`kind: "preparation"` の phase・repeat・elapsedMs・timeoutMs を参照

| phase | 記録数 | 最小 elapsedMs | 最大 elapsedMs | timeoutMs |
| --- | --- | --- | --- | --- |
| 試料の書き込み・対象画面と候補 revision=0 | 45 | 1087.3406330000143 | 2122.267545999959 | 30000 |
| 登録画面・食材名一覧 | 45 | 0.003467000089585781 | 478.9943500000518 | 30000 |
| 操作対象の表示・有効化・スクロール | 45 | 255.88790199998766 | 433.1866089999676 | 30000 |

所要時間は各 phase の記録をそのまま集計したもの。全 repeat の値は上記の詳細 JSON にある。

## 4. 変更後の NFR-03 の再計測（TC-NFR-03-06）

既存の性能 E2E の 3 / 30 / 100 行、別履歴 0 / 100 件、CPU 1 / 4 倍、各操作 5 回を使う。`changeLatestDate` を含む買い物単位のケースに TC-NFR-03-06 を対応付けた。全条件の値は `performance-it04.json`、操作別の全値・最大値と環境は `performance-it05-summary.json` に従来どおり残す。ファイル名は継続利用する。

- 実行日時・コミット・差分の有無・環境: 2026-11-05、ローカル（WSL2）。買い物単位 12 条件の開始 `2026-11-05T04:10:27.734Z`、終了 `2026-11-05T04:21:27.258Z`。コミット `79aa5ba503e75d66ba7c7ead1165df9779abc855`、workingTreeDirty=true。OS `linux 6.18.54.1-microsoft-standard-WSL2`、CPU `Intel(R) Core(TM) i5-10400F CPU @ 2.90GHz`、cores=12、Chromium `156.0.8078.4`、360×740、CPU 1 / 4 倍、各操作 5 回、ci=false
- CPU 4 倍・100 行・別履歴 0 件の日付変更 5 回／最大値: `[87, 83.5, 84.29999999888241, 83.09999999962747, 88]` ms ／ 88 ms
- CPU 4 倍・100 行・別履歴 100 件の日付変更 5 回／最大値: `[91.79999999888241, 92.09999999962747, 78.79999999888241, 81.5, 82.59999999962747]` ms ／ 92.09999999962747 ms
- CPU 4 倍の全操作の全条件の最大値・100 ms 以内かの結論: 下表の操作別最大値。3 / 30 / 100 行・別履歴 0 / 100 件の各操作 5 回、計 270 回がすべて 100 ms 以内。日付変更を含む最大値は 92.09999999962747 ms で、変更後の TC-NFR-03-06 は合格。このローカル WSL2 の CPU 4 倍の模擬条件で NFR-03 を満たす。変更前後の各対策の寄与は切り分けていない。
- JSON の保存先・機能不整合／計測不能の有無: 下記の条件別 JSON 一覧を参照。実行ログは E2E 全体 238 件成功・1 件スキップ（性能 19 件すべて成功）。今回の検査範囲では機能不整合・計測不能は検出されなかった（時間超過は失敗にしない既存規則）

変更前（`auto 180px`、同日の `e2e133b.log`）は、CPU 4 倍・100 行・別履歴 100 件の日付変更の 1 回が 119.69999999925494 ms（約 119.7 ms）で、100 ms を超過した。その測定では TC-NFR-03-06 の時間条件を満たしていない。CI の判定規則は時間超過を記録のみにし、計測不能・機能不整合を失敗とする。ローカルの性能 E2E も同じ記録のみの実装なので、変更前の性能 19 件成功は 100 ms 達成を示さない。変更後の合格は上記の実測値に基づく。変更前の JSON は今回上書きされており、ここに残した変更前の値とログを参照する。

CPU 4 倍・買い物単位の操作別最大値（3 / 30 / 100 行、別履歴 0 / 100 件、各 5 回の全条件）。

| 操作 | 最大値（ms） | 行数 | 別履歴件数 |
| --- | --- | --- | --- |
| registerLatest | 36.40000000037253 | 100 | 100 |
| incrementLatest | 31.40000000037253 | 100 | 0 |
| decrementLatest | 30.800000000745058 | 100 | 0 |
| removeLatest | 33.5 | 100 | 0 |
| registerPrevious | 26.799999998882413 | 100 | 100 |
| incrementPrevious | 33.19999999925494 | 100 | 100 |
| decrementPrevious | 30.90000000037253 | 100 | 0 |
| removePrevious | 37.600000001490116 | 100 | 100 |
| changeLatestDate | 92.09999999962747 | 100 | 100 |

条件別の JSON（集約 JSON に各操作 5 回の全値と最大値、同じディレクトリの詳細 JSON に準備と計測の全記録がある）。

| 行数 | 別履歴件数 | CPU 倍率 | 集約 JSON | 詳細 JSON |
| --- | --- | --- | --- | --- |
| 3 | 0 | 1 | [performance-it05-summary.json](../../test-results/performance-TC-NFR-03-04-T-d29d9-TC-NFR-03-06-3行-別履歴0件-CPU1倍-performance/performance-it05-summary.json) | [performance-it04.json](../../test-results/performance-TC-NFR-03-04-T-d29d9-TC-NFR-03-06-3行-別履歴0件-CPU1倍-performance/performance-it04.json) |
| 3 | 0 | 4 | [performance-it05-summary.json](../../test-results/performance-TC-NFR-03-04-T-3c6a2-TC-NFR-03-06-3行-別履歴0件-CPU4倍-performance/performance-it05-summary.json) | [performance-it04.json](../../test-results/performance-TC-NFR-03-04-T-3c6a2-TC-NFR-03-06-3行-別履歴0件-CPU4倍-performance/performance-it04.json) |
| 3 | 100 | 1 | [performance-it05-summary.json](../../test-results/performance-TC-NFR-03-04-T-e20f3--NFR-03-06-3行-別履歴100件-CPU1倍-performance/performance-it05-summary.json) | [performance-it04.json](../../test-results/performance-TC-NFR-03-04-T-e20f3--NFR-03-06-3行-別履歴100件-CPU1倍-performance/performance-it04.json) |
| 3 | 100 | 4 | [performance-it05-summary.json](../../test-results/performance-TC-NFR-03-04-T-e2a32--NFR-03-06-3行-別履歴100件-CPU4倍-performance/performance-it05-summary.json) | [performance-it04.json](../../test-results/performance-TC-NFR-03-04-T-e2a32--NFR-03-06-3行-別履歴100件-CPU4倍-performance/performance-it04.json) |
| 30 | 0 | 1 | [performance-it05-summary.json](../../test-results/performance-TC-NFR-03-04-T-f0967-C-NFR-03-06-30行-別履歴0件-CPU1倍-performance/performance-it05-summary.json) | [performance-it04.json](../../test-results/performance-TC-NFR-03-04-T-f0967-C-NFR-03-06-30行-別履歴0件-CPU1倍-performance/performance-it04.json) |
| 30 | 0 | 4 | [performance-it05-summary.json](../../test-results/performance-TC-NFR-03-04-T-b8534-C-NFR-03-06-30行-別履歴0件-CPU4倍-performance/performance-it05-summary.json) | [performance-it04.json](../../test-results/performance-TC-NFR-03-04-T-b8534-C-NFR-03-06-30行-別履歴0件-CPU4倍-performance/performance-it04.json) |
| 30 | 100 | 1 | [performance-it05-summary.json](../../test-results/performance-TC-NFR-03-04-T-85e10-NFR-03-06-30行-別履歴100件-CPU1倍-performance/performance-it05-summary.json) | [performance-it04.json](../../test-results/performance-TC-NFR-03-04-T-85e10-NFR-03-06-30行-別履歴100件-CPU1倍-performance/performance-it04.json) |
| 30 | 100 | 4 | [performance-it05-summary.json](../../test-results/performance-TC-NFR-03-04-T-1a691-NFR-03-06-30行-別履歴100件-CPU4倍-performance/performance-it05-summary.json) | [performance-it04.json](../../test-results/performance-TC-NFR-03-04-T-1a691-NFR-03-06-30行-別履歴100件-CPU4倍-performance/performance-it04.json) |
| 100 | 0 | 1 | [performance-it05-summary.json](../../test-results/performance-TC-NFR-03-04-T-dd8a9--NFR-03-06-100行-別履歴0件-CPU1倍-performance/performance-it05-summary.json) | [performance-it04.json](../../test-results/performance-TC-NFR-03-04-T-dd8a9--NFR-03-06-100行-別履歴0件-CPU1倍-performance/performance-it04.json) |
| 100 | 0 | 4 | [performance-it05-summary.json](../../test-results/performance-TC-NFR-03-04-T-952ee--NFR-03-06-100行-別履歴0件-CPU4倍-performance/performance-it05-summary.json) | [performance-it04.json](../../test-results/performance-TC-NFR-03-04-T-952ee--NFR-03-06-100行-別履歴0件-CPU4倍-performance/performance-it04.json) |
| 100 | 100 | 1 | [performance-it05-summary.json](../../test-results/performance-TC-NFR-03-04-T-655b2-FR-03-06-100行-別履歴100件-CPU1倍-performance/performance-it05-summary.json) | [performance-it04.json](../../test-results/performance-TC-NFR-03-04-T-655b2-FR-03-06-100行-別履歴100件-CPU1倍-performance/performance-it04.json) |
| 100 | 100 | 4 | [performance-it05-summary.json](../../test-results/performance-TC-NFR-03-04-T-c5a1a-FR-03-06-100行-別履歴100件-CPU4倍-performance/performance-it05-summary.json) | [performance-it04.json](../../test-results/performance-TC-NFR-03-04-T-c5a1a-FR-03-06-100行-別履歴100件-CPU4倍-performance/performance-it04.json) |

従来ケース（TC-NFR-03-01・03）の CPU 4 倍の操作別最大値も以下に記録する。候補計算と候補反映はそれぞれ独立した時計で、判定の最大値と加算しない。`—` は該当する値なし。

| 行数 | 操作 | 判定等の最大値（ms） | 候補計算最大値（ms） | 候補反映最大値（ms） | JSON |
| --- | --- | --- | --- | --- | --- |
| 3 | register | 25.09999999962747 | — | — | [performance.json](../../test-results/performance-TC-NFR-03-01-3行-CPU4倍の判定と候補を計測-performance/performance.json) |
| 3 | candidate | 34.79999999888241 | 16.199999999254942 | 27.300000000745058 | [performance.json](../../test-results/performance-TC-NFR-03-01-3行-CPU4倍の判定と候補を計測-performance/performance.json) |
| 3 | increment | 19.09999999962747 | 19.5 | 28.299999998882413 | [performance.json](../../test-results/performance-TC-NFR-03-01-3行-CPU4倍の判定と候補を計測-performance/performance.json) |
| 3 | remove | 20.300000000745058 | — | — | [performance.json](../../test-results/performance-TC-NFR-03-01-3行-CPU4倍の判定と候補を計測-performance/performance.json) |
| 30 | register | 27 | — | — | [performance.json](../../test-results/performance-TC-NFR-03-01-30行-CPU4倍の判定と候補を計測-performance/performance.json) |
| 30 | candidate | 23.700000001117587 | 16.09999999962747 | 40.5 | [performance.json](../../test-results/performance-TC-NFR-03-01-30行-CPU4倍の判定と候補を計測-performance/performance.json) |
| 30 | increment | 17.40000000037253 | 16 | 29.300000000745058 | [performance.json](../../test-results/performance-TC-NFR-03-01-30行-CPU4倍の判定と候補を計測-performance/performance.json) |
| 30 | remove | 22.5 | 17.90000000037253 | 47.59999999962747 | [performance.json](../../test-results/performance-TC-NFR-03-01-30行-CPU4倍の判定と候補を計測-performance/performance.json) |
| 100 | register | 29.90000000037253 | — | — | [performance.json](../../test-results/performance-TC-NFR-03-01-TC-NFR-03-03-100行-CPU4倍の判定と候補を計測-performance/performance.json) |
| 100 | candidate | 42.19999999925494 | 19.90000000037253 | 72.59999999962747 | [performance.json](../../test-results/performance-TC-NFR-03-01-TC-NFR-03-03-100行-CPU4倍の判定と候補を計測-performance/performance.json) |
| 100 | increment | 43.899999998509884 | 22.100000001490116 | 44.19999999925494 | [performance.json](../../test-results/performance-TC-NFR-03-01-TC-NFR-03-03-100行-CPU4倍の判定と候補を計測-performance/performance.json) |
| 100 | remove | 32.5 | 23.59999999962747 | 98.90000000037253 | [performance.json](../../test-results/performance-TC-NFR-03-01-TC-NFR-03-03-100行-CPU4倍の判定と候補を計測-performance/performance.json) |

今回の全 E2E 再実行はログに `Running 239 tests using 1 worker` と記録されている。個別に実行するときは次の順に行い、性能 E2E はほかの E2E・Lighthouse と同時に流さない。

```sh
npm run test:e2e -- e2e/row-layout.spec.ts e2e/row-quantity.spec.ts --project=mobile --project=desktop --workers=1 --output=test-results/functional
npm run test:e2e -- --project=performance --workers=1 --output=test-results/performance
```
