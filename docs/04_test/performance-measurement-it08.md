# IT08 行の高さ・性能の計測記録

対象: #162 / NFR-03 / DES-UI-52、DES-PER-07。計測日: 2026-11-24。

`e2e/row-layout.spec.ts` の TC-NFR-03-07 で、個数・g・kg の各行を表示し、フォントと 2 回の描画を待って高さを測った。同名行の詳細名も表示される試料を含む。

| 画面幅 | 行全体の高さの中央値 | 内容領域の高さの中央値 |
| --- | --- | --- |
| 360 px | 70 px | 44 px |
| 1280 px | 70 px | 44 px |

内容領域の中央値に合わせ、画面外の推定値を `auto 44px` とした。開いた行の高さはこの中央値に含まない。


## CPU 4 倍・100 行（TC-NFR-03-07）

2026-11-24、変更を含む `0415e57569cfcd3b62989292a924f4af32199e7c` で計測。Linux WSL2、Intel Core i5-10400F、Chromium 156.0.8078.4、360 × 740 px、CPU 4 倍、覚えた食品 100 件。操作のクリックから判定 commit 後の 2 回目の描画まで、各 5 回の値（ms）を記録する。詳細は `test-results` の `performance.json`。

| 操作 | 5 回の値（ms） | 最大（ms） |
| --- | --- | --- |
| 登録 | 44.300000071525574、54、34.90000009536743、33.5、34.89999997615814 | 54 |
| 増加 | 37.5、37.10000002384186、30.399999976158142、34.300000071525574、33.89999997615814 | 37.5 |
| 削除 | 49.5、60.10000002384186、49.5、63.799999952316284、49.300000071525574 | 63.799999952316284 |
| 候補登録 | 70.10000002384186、121.20000004768372、59.199999928474426、47、58.40000009536743 | 121.20000004768372 |

候補登録も食材登録から判定更新までの操作であり NFR-03 の対象。上記の計測では 1 回 100 ms を超過し、時間条件を満たさなかった。原因は未特定だが、候補登録時の再計算・描画や実行環境の負荷が考えられ、切り分けはしていない。候補反映の最大 149.69999992847443 ms は判定更新とは独立した時計であり、判定時間に加算しない。性能テストの成功は予算達成を意味しない。

### 減少を含む再計測

同日、同じ CPU 4 倍・100 行・覚えた食品 100 件の条件で再計測した。各 5 回の判定更新時間（ms）は次のとおり。今回の全値は 100 ms 以内だが、先の候補登録の超過は取り消さない。

| 操作 | 5 回の値（ms） | 最大（ms） |
| --- | --- | --- |
| 登録 | 47.09999990463257、37.10000002384186、42.799999952316284、36.39999997615814、33.60000002384186 | 47.09999990463257 |
| 候補登録 | 51.60000002384186、40.799999952316284、55.699999928474426、57.60000002384186、79.89999997615814 | 79.89999997615814 |
| 増加 | 36.799999952316284、27.199999928474426、33.200000047683716、30、28 | 36.799999952316284 |
| 減少 | 33.60000002384186、34.199999928474426、35.89999997615814、29.09999990463257、32.09999990463257 | 35.89999997615814 |
| 削除 | 51.299999952316284、48.89999997615814、50.10000002384186、44.89999997615814、41 | 51.299999952316284 |

候補反映の独立した時計は最大 150.40000009536743 ms。判定更新の値とは加算しない。

性能 E2E 全体は 19 件成功（20.6 分）。CPU 4 倍の買い物単位の条件では、30 行・別履歴 0 件の最新への登録が最大 151.70000004768372 ms で NFR-03 の 100 ms を超過した。日付変更も 30 行・別履歴 0 件で 132.30000007152557 ms、100 行・別履歴 0 件で 242.10000002384186 ms、100 行・別履歴 100 件で 226.79999995231628 ms と 100 ms を超えた。日付変更は既存の性能試験の対象であり、SRS の NFR-03 に列挙された登録・個数変更・削除とは分けて記録する。いずれも原因は未特定で、計算・描画や実行環境の負荷の寄与は切り分けていない。時間超過は試験を失敗にしないため、19 件成功は全操作が予算内であることを意味しない。

## 変更前との比較（Claude Code が計測、2026-11-24）

上の計測は、別のワークツリーで Codex が単体テストなどを同時に動かしていた時間に行った。負荷の影響を除くため、ほかの作業を止めた状態で、変更前（`0415e57`、ワークツリーの変更なし）と変更後（`0415e57` ＋本 Issue の未コミットの変更）の性能 E2E（`--project=performance --workers=1`）を続けて実行した。どちらも 19 件成功（18.0 分・18.5 分）。環境は上と同じ PC・Chromium。下の表は CPU 4 倍の条件の各 5 回の最大で、準備（試料の書き込み）の時間を除く。performance.json の減少（decrement）は変更後に足した操作のため、変更前の値はない。

| 記録 | 条件 | 操作 | 変更前の最大（ms） | 変更後の最大（ms） |
| --- | --- | --- | ---: | ---: |
| performance-it04.json | 100行-別履歴0件-CPU4倍 | changeLatestDate | 161.2 | 216.4 |
| performance-it04.json | 100行-別履歴0件-CPU4倍 | decrementLatest | 27.3 | 39.7 |
| performance-it04.json | 100行-別履歴0件-CPU4倍 | decrementPrevious | 32.5 | 30.1 |
| performance-it04.json | 100行-別履歴0件-CPU4倍 | incrementLatest | 37.2 | 46.9 |
| performance-it04.json | 100行-別履歴0件-CPU4倍 | incrementPrevious | 29.4 | 44.2 |
| performance-it04.json | 100行-別履歴0件-CPU4倍 | registerLatest | 46.8 | 60.8 |
| performance-it04.json | 100行-別履歴0件-CPU4倍 | registerPrevious | 52.2 | 66.4 |
| performance-it04.json | 100行-別履歴0件-CPU4倍 | removeLatest | 59.2 | 62.9 |
| performance-it04.json | 100行-別履歴0件-CPU4倍 | removePrevious | 51.1 | 39.8 |
| performance-it04.json | 100行-別履歴100件-CPU4倍 | changeLatestDate | 165.2 | 174.2 |
| performance-it04.json | 100行-別履歴100件-CPU4倍 | decrementLatest | 33.9 | 34.7 |
| performance-it04.json | 100行-別履歴100件-CPU4倍 | decrementPrevious | 30.2 | 31.5 |
| performance-it04.json | 100行-別履歴100件-CPU4倍 | incrementLatest | 35.1 | 33.5 |
| performance-it04.json | 100行-別履歴100件-CPU4倍 | incrementPrevious | 29.2 | 33.0 |
| performance-it04.json | 100行-別履歴100件-CPU4倍 | registerLatest | 60.9 | 40.5 |
| performance-it04.json | 100行-別履歴100件-CPU4倍 | registerPrevious | 33.6 | 40.4 |
| performance-it04.json | 100行-別履歴100件-CPU4倍 | removeLatest | 45.9 | 36.5 |
| performance-it04.json | 100行-別履歴100件-CPU4倍 | removePrevious | 40.4 | 33.2 |
| performance-it04.json | 30行-別履歴0件-CPU4倍 | changeLatestDate | 74.2 | 109.8 |
| performance-it04.json | 30行-別履歴0件-CPU4倍 | decrementLatest | 29.6 | 37.5 |
| performance-it04.json | 30行-別履歴0件-CPU4倍 | decrementPrevious | 28.3 | 27.2 |
| performance-it04.json | 30行-別履歴0件-CPU4倍 | incrementLatest | 39.5 | 31.6 |
| performance-it04.json | 30行-別履歴0件-CPU4倍 | incrementPrevious | 20.3 | 27.5 |
| performance-it04.json | 30行-別履歴0件-CPU4倍 | registerLatest | 46.8 | 38.2 |
| performance-it04.json | 30行-別履歴0件-CPU4倍 | registerPrevious | 60.6 | 29.2 |
| performance-it04.json | 30行-別履歴0件-CPU4倍 | removeLatest | 42.6 | 38.8 |
| performance-it04.json | 30行-別履歴0件-CPU4倍 | removePrevious | 38.1 | 50.1 |
| performance-it04.json | 30行-別履歴100件-CPU4倍 | changeLatestDate | 198.0 | 124.5 |
| performance-it04.json | 30行-別履歴100件-CPU4倍 | decrementLatest | 30.5 | 34.1 |
| performance-it04.json | 30行-別履歴100件-CPU4倍 | decrementPrevious | 18.4 | 21.8 |
| performance-it04.json | 30行-別履歴100件-CPU4倍 | incrementLatest | 33.4 | 36.2 |
| performance-it04.json | 30行-別履歴100件-CPU4倍 | incrementPrevious | 22.8 | 16.8 |
| performance-it04.json | 30行-別履歴100件-CPU4倍 | registerLatest | 48.6 | 55.9 |
| performance-it04.json | 30行-別履歴100件-CPU4倍 | registerPrevious | 37.5 | 33.8 |
| performance-it04.json | 30行-別履歴100件-CPU4倍 | removeLatest | 39.4 | 35.5 |
| performance-it04.json | 30行-別履歴100件-CPU4倍 | removePrevious | 33.6 | 31.3 |
| performance-it04.json | 3行-別履歴0件-CPU4倍 | changeLatestDate | 67.0 | 42.7 |
| performance-it04.json | 3行-別履歴0件-CPU4倍 | decrementLatest | 21.8 | 36.1 |
| performance-it04.json | 3行-別履歴0件-CPU4倍 | decrementPrevious | 20.9 | 22.8 |
| performance-it04.json | 3行-別履歴0件-CPU4倍 | incrementLatest | 30.5 | 26.9 |
| performance-it04.json | 3行-別履歴0件-CPU4倍 | incrementPrevious | 28.4 | 20.2 |
| performance-it04.json | 3行-別履歴0件-CPU4倍 | registerLatest | 35.7 | 38.6 |
| performance-it04.json | 3行-別履歴0件-CPU4倍 | registerPrevious | 37.2 | 25.8 |
| performance-it04.json | 3行-別履歴0件-CPU4倍 | removeLatest | 62.6 | 23.7 |
| performance-it04.json | 3行-別履歴0件-CPU4倍 | removePrevious | 23.5 | 23.2 |
| performance-it04.json | 3行-別履歴100件-CPU4倍 | changeLatestDate | 39.6 | 41.7 |
| performance-it04.json | 3行-別履歴100件-CPU4倍 | decrementLatest | 23.7 | 21.6 |
| performance-it04.json | 3行-別履歴100件-CPU4倍 | decrementPrevious | 19.6 | 26.2 |
| performance-it04.json | 3行-別履歴100件-CPU4倍 | incrementLatest | 27.1 | 25.5 |
| performance-it04.json | 3行-別履歴100件-CPU4倍 | incrementPrevious | 36.3 | 16.0 |
| performance-it04.json | 3行-別履歴100件-CPU4倍 | registerLatest | 41.4 | 39.3 |
| performance-it04.json | 3行-別履歴100件-CPU4倍 | registerPrevious | 29.8 | 40.9 |
| performance-it04.json | 3行-別履歴100件-CPU4倍 | removeLatest | 33.4 | 47.3 |
| performance-it04.json | 3行-別履歴100件-CPU4倍 | removePrevious | 21.0 | 24.9 |
| performance.json | 100行-CPU4倍 | candidate | 70.0 | 65.3 |
| performance.json | 100行-CPU4倍 | decrement | — | 50.6 |
| performance.json | 100行-CPU4倍 | increment | 46.3 | 36.8 |
| performance.json | 100行-CPU4倍 | register | 47.8 | 52.7 |
| performance.json | 100行-CPU4倍 | remove | 58.5 | 42.3 |
| performance.json | 30行-CPU4倍 | candidate | 43.1 | 42.6 |
| performance.json | 30行-CPU4倍 | decrement | — | 32.2 |
| performance.json | 30行-CPU4倍 | increment | 28.3 | 30.2 |
| performance.json | 30行-CPU4倍 | register | 33.3 | 43.8 |
| performance.json | 30行-CPU4倍 | remove | 39.3 | 43.3 |
| performance.json | 3行-CPU4倍 | candidate | 39.6 | 36.2 |
| performance.json | 3行-CPU4倍 | decrement | — | 28.2 |
| performance.json | 3行-CPU4倍 | increment | 20.7 | 20.8 |
| performance.json | 3行-CPU4倍 | register | 35.8 | 42.6 |
| performance.json | 3行-CPU4倍 | remove | 75.0 | 29.8 |

- 登録・候補登録・増加・減少・削除は、変更前・変更後とも 100 ms 以内だった。上の計測の「30 行・別履歴 0 件の登録 151.7 ms」は、この計測では再現しなかった
- 日付の変更（changeLatestDate）は、変更前から 100 ms を超えていた（変更前の最大 198.0 ms）。変更後は条件により増えたものと減ったものがあり、本 Issue の変更による悪化とは判断できない。IT06 の計測（最大約 92.1 ms）より遅い原因は確かめていない。NFR-03 の超過として振り返りに残す
