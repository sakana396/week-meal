---
name: implement-req
description: GitHub Issue 番号、または要求 ID（FR-/NFR-）・設計 ID（DES-）を指定して、設計書どおりに実装し、テスト・文書の更新・プルリクエスト作成まで行う。「#4 をやって」「Issue 5 を実装して」「FR-QTY-02 を実装して」のような依頼で使う。
argument-hint: "<#Issue番号 | 要求ID | 設計ID> [...]"
---

# Issue・要求 ID を指定した実装

対象: $ARGUMENTS

AGENTS.md のルールに従う。以下の手順を順に行い、各段階で問題があれば止めて人に報告する。

## Claude Code が使うとき（実装は Codex に任せる）

AGENTS.md の「エージェントの分担」により、Claude Code は手順 3〜6 を自分で行わず、Codex に任せる。

1. 手順 0〜1 を確かめ、手順 2 のブランチを git worktree で作る（`git worktree add <パス> -b <ブランチ名> origin/main`）。Codex は既定でネットワークを使えないので、worktree で `npm ci` を済ませておく
2. Codex に、このスキルの手順 0〜6 を行い、「コミット・push・プルリクエストの作成・マージ・force push・`git stash` はしない。変更は worktree に残す」ことを伝えて実行させる

   ```sh
   codex exec -C <worktree> -s workspace-write -o <報告の保存先> "<依頼>" < /dev/null
   ```

   - PR #47・#53 では、`--add-dir` で本体の `.git` を足しても Codex が `index.lock` を作れずコミットに失敗した（REV-024、REV-027）。そのため、コミットは Claude Code が行う
   - `< /dev/null` を付けないと、標準入力を待って止まる（REV-024）
   - 終わるのを待つときは、起動時に `$!` で PID を控えて `kill -0` で確かめる（`pgrep -f` は待つ側のコマンド自身に一致することがある）
   - 報告の保存先は worktree の外（作業用の一時ディレクトリなど）に置き、コミットに紛れ込まないようにする
   - E2E などで localhost を使うときは `-c sandbox_workspace_write.network_access=true` を付ける

3. Codex の報告と差分を読み、worktree で手順 5 の検証コマンドを自分でも実行する。通れば手順 7 のコミット（本文に「実装は Codex」と書く）、push とプルリクエストの作成、手順 8 を行う。レビューの指摘は、Codex に同じ worktree で直させる
4. Codex が失敗したり使えなかったりしたときは、自分で実装せず人に報告する
5. マージしたら worktree を片付ける（`git worktree remove <パス>`）

## 0. Issue の確認（Issue 番号が指定されたとき）

1. `gh issue view <番号>` で Issue を読み、「対象」（要求・設計・ユースケース）、「作業内容」、「作らないもの」、「依存」を把握する。以降の手順の対象 ID は Issue の「対象」に書かれたものとする
2. 「依存」の Issue がすべて閉じているか `gh issue view <依存の番号> --json state` で確かめる。**閉じていないものがあれば着手せずに報告する**
3. 要求 ID だけが指定されたときは、`docs/traceability.md` の Issue 列から該当の Issue を探し、あればその Issue として扱う

## 1. 範囲の確認

1. `docs/iterations/` の最新の `plan.md` を読み、対象の ID が今の反復の範囲に入っているか確かめる。**範囲外なら実装せずに報告する**
2. SRS（`docs/02_requirements/srs.md`）で要求の文面と検証方法を確かめる
3. 今の反復の設計書（`docs/03_design/`）で、対象に関係する設計要素（DES-）をすべて洗い出す。設計書の「設計と SRS の対応」表を使う
4. 未決事項（TBD）が絡んでいて、設計書にも決定がない場合は、実装せずに報告する

## 2. ブランチの作成

```sh
git fetch origin
git switch -c it<反復番号>/<Issue 番号>-<短い説明> origin/main
```

例: `it01/5-unit-weights`。依存の Issue のマージ結果を取り込むため、最新の `origin/main` から切る。

すでに作業用のブランチにいる場合は、そのまま使う。

## 3. テストケースの設計（実装より先に行う）

1. テスト仕様書（`docs/04_test/` の今の反復のもの）に、対象のテストケースがあるか確かめる
2. なければ追記する。1 つの要求に、正常系・境界値・異常系を最低 1 件ずつ考える
   - ID: `TC-<要求ID>-<連番2桁>`（例: `TC-FR-QTY-02-01`）
   - 列: ID、対象（要求・設計）、前提、入力・操作、期待結果、種別（正常・境界・異常）
3. テストコードを書く（Vitest）。`it.each` の表駆動テストにして、テストの名前の先頭にテストケース ID を入れる
4. テストが**失敗する**ことを確かめる（まだ実装していないため）

## 4. 実装

1. 設計書どおりに実装する。関数や型のコメントに設計 ID を書く
2. core の約束（React・DOM・localStorage・Date.now()・Math.random() を使わない、引数を変えない、例外を投げない）を守る
3. 設計書に書かれていない判断が必要になったら、最も単純な方法で実装し、プルリクエストの「設計への提案」に書く。大きな判断なら止めて報告する

## 5. 検証

```sh
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage
npm run build
```

すべて通るまで直す。テストを通すために期待値を書き換えるときは、設計書・テスト仕様書の根拠を確かめる。

## 6. 文書の更新

1. テスト仕様書: 追加・変更したテストケース
2. トレーサビリティマトリクス（`docs/traceability.md`）: 対象の要求の行に、テストケース ID・実装したファイル・状態（「実装済み」）を書く。他の行は触らない
3. 設計書・SRS は変更しない（変更が必要なら「設計への提案」に書く）

## 7. コミットとプルリクエスト

1. コミットする。本文に対象の ID を書く。Codex の変更をコミットするときは、本文に「実装は Codex」と書く

```
feat: 目安重量と量の換算を実装

FR-QTY-01, FR-QTY-02 / DES-QTY-01, DES-QTY-02
```

2. push してプルリクエストを作る。説明は AGENTS.md の形式に従い、先頭に `Closes #<Issue 番号>` を書く（マージで Issue が自動で閉じる）

```sh
git push -u origin HEAD
gh pr create --base main --title "<要約>" --body "<AGENTS.md の形式>"
```

3. マージはまだしない（手順 8 で判断する）

## 8. レビューとマージ

1. CI の結果を待つ: `gh pr checks <番号> --watch`。失敗したら直して push し直す
2. 実装者とは別のエージェントにレビューを頼む（例: 実装が Codex なら、コミットした Claude Code とは別のサブエージェント。Claude Code なら別のサブエージェント）。人がいる場合は人でもよい。レビュアーには「読み取りだけ・マージしない」と伝える。指摘に対応し、`docs/reviews/REV-<連番>-issue<番号>.md` に記録する
3. 指摘に対応して直したときは、**修正分を同じ方法で再レビュー**し、「承認」を得る。再レビューの結果をレビュー記録に追記する
4. AGENTS.md の「自動マージの条件」をすべて確かめる。特に、`git diff --name-only origin/main...HEAD` に `docs/01_concept/`、`docs/02_requirements/` 、`AGENTS.md`、`CLAUDE.md`、`.claude/`、`docs/00_plan/` が含まれるなら、本人の指示か承認がレビュー記録にあるかを確かめる。採用した設計への提案は、レビュー記録と今の反復の振り返り（`docs/iterations/itNN/retrospective.md`）に書く
5. 条件を満たせば、マージの直前に `gh pr checks <番号>` を確かめ、`gh pr merge <番号> --merge` を 1 回だけ実行する。拒否されたら AGENTS.md の「マージのしかた」に従う。条件を満たさなければマージせず、理由を報告する

## 9. 報告

人に次を短く報告する。

- 対象の Issue 番号、実装した ID、追加したテストケースの数
- 人の査閲が必要な点（あれば）
- 検証コマンドの結果
- プルリクエストの URL と、マージしたかどうか（しなかった場合はその理由）
- 設計への提案や、未解決の点（あれば）
