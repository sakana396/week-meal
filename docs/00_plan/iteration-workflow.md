# 反復の進め方（エージェント向けの手順）

- 文書 ID: PLAN-002
- 版: 0.1
- 作成日: 2026-11-05
- 根拠: AGENTS.md、[PLAN-001](project-plan.md)。IT06 で実際に行った流れを手順にした（本人の指示「codexをメインで進めても問題ないようにはできないの」。REV-073）

メインのエージェント（Claude Code または Codex。AGENTS.md の「エージェントの分担」）が、1 つの反復を始めから終わりまで進めるための手順。規則そのものは AGENTS.md にあり、この文書は手順と前例だけを書く。食い違ったら AGENTS.md に従う。

## 1. 作業の前に読む

- AGENTS.md、[docs/README.md](../README.md)、[PLAN-001](project-plan.md)
- 前の反復の振り返り（`docs/iterations/it<NN>/retrospective.md`）。次の反復への持ち越しが書いてある
- 実装の手順: [.claude/skills/implement-req/SKILL.md](../../.claude/skills/implement-req/SKILL.md)
- 書き方に迷ったら、前の反復の同じ種類の文書を開いて形をまねる。IT06 の例: [計画](../iterations/it06/plan.md) → [設計](../03_design/design-it06.md) → [テスト仕様](../04_test/test-spec-it06.md) → [REV-065](../reviews/REV-065-issue127.md)〜REV-072 → [振り返り](../iterations/it06/retrospective.md)

## 2. 反復の流れ

1 つの反復は下の 4 段階で進む。どの段階も「Issue → ブランチ → PR → 別のエージェントのレビュー → マージ」の順に行う。

| 段階 | 作るもの | IT06 の前例 |
|---|---|---|
| 計画 | `docs/iterations/it<NN>/plan.md`、SRS・PLAN-001 の変更、E-xx の追記 | Issue #127、PR #128、REV-065 |
| 設計 | `docs/03_design/design-it<NN>.md`、`docs/04_test/test-spec-it<NN>.md`（骨組み）、必要なら ADR の追記、実装 Issue の作成 | Issue #129、PR #130、REV-066 |
| 実装 | 設計の「実装 Issue の分け方の案」ごとの Issue を 1 つずつ | Issue #131〜#134、PR #135〜#140 |
| 振り返り | `docs/iterations/it<NN>/retrospective.md`、PLAN-001 のマイルストーンの完了 | Issue #141、PR #142、REV-072 |

## 3. 本人への質問と記録

- 範囲、直し方、数値の承認、完了の判断は本人が決める。推測で進めず、選択肢の質問で聞く
- 質問では「問いの文」と「2〜4 個の選択肢（短い説明つき）」を示す。おすすめがあれば先頭に置き、「（おすすめ）」と書く
- 回答は `docs/01_concept/elicitation-notes.md` の末尾に新しい E-xx として追記する。番号は既存の最大の次にする（`grep -o '^| E-[0-9]*' docs/01_concept/elicitation-notes.md | tail -1` で確かめる）
  - 書き方は E-118〜E-126 に合わせる。要旨の列には、本人の回答の語をそのまま書き、日付と「会話。エージェントが選択肢を示した問いに答えた」を添える。問いの全文・選択肢・言い換え・意味の説明は解釈の列に書く
  - 既存の E-xx は変えない
- エージェントが書き起こした文（SRS の要求文など）は「本人は確かめていない」と記録する。確かめるのは振り返りのとき

## 4. 計画

1. 本人に聞く: 反復で何をするか（前の振り返りの持ち越しを選択肢にする）と、それぞれをどこまでやるか
2. ラベル `it<NN>` とマイルストーン `IT<NN>` がなければ `gh` で作る。計画の Issue を作る
3. ブランチ `it<NN>/<Issue 番号>-plan` で `plan.md` を書く。章立ては IT06 の計画と同じにする（目的、仮説 H-xx、対象の要求、作らないもの、成果物、完了の条件、決めたこと P-xx、本人に確かめてほしいこと、変更履歴）
4. SRS に要求の追加や変更があれば、版を上げ、8 章の件数と変更履歴を直す。PLAN-001 に反復の行とマイルストーンを足し、`docs/README.md` に行を足す
5. PR を作り、7 章のレビューとマージを行う

## 5. 設計

1. 設計の Issue を作り、`design-it<NN>.md` を書く。章立ては IT06 の設計と同じにする。設計 ID は `DES-<領域>-<番号>` で、番号は既存の最大の次にする（grep で確かめる）
2. 7 章に「実装 Issue の分け方の案（A, B, C…）」と、案どうしの依存を書く
3. `test-spec-it<NN>.md` の骨組みを書く（新規ケースの ID・内容・種別、期待値が変わる既存ケース）
4. マージした後、案ごとに実装 Issue を作る。ラベルとマイルストーンを付け、本文は「対象／内容／作らないもの／依存／人の査閲が必要な点」にする（#131 が手本）

## 6. 実装

- [implement-req](../../.claude/skills/implement-req/SKILL.md) の手順どおりに進める。Issue ごとに worktree を作る: `git worktree add -b it<NN>/<番号>-<説明> ../it<NN>-<番号> origin/main`。そのあと worktree で `npm ci` を実行する
- 提出の前に、AGENTS.md の検証コマンドをすべて通す
- E2E は `npm run build` の後に `npx playwright test --workers=1` で流す。ポート 4173 を共有するので、`ss -ltn | grep :4173` で空いていることを確かめ、2 つを同時に流さない
- 依存の Issue がマージされるまで、着手しない

## 7. PR・レビュー・マージ

- PR の説明は AGENTS.md の形にする
- レビューは、変更を書いたエージェントとは別のエージェントに頼む。Codex がメインのときは、別に起動した Codex のセッションでよい（例: `codex exec -C <worktree> "PR #<番号> をレビューし、docs/reviews/REV-<番号>-issue<番号>.md に書いて（形式は REV-072）。結果（承認／修正が必要）と指摘を返して" < /dev/null`）
  - REV の番号は、既存の最大の次にする（`ls docs/reviews | tail -1`）
  - 要求・企画の文書や運用ルールを変える PR では、REV に「自動マージの条件 3」の表（根拠の本人の発言をそのまま・問い・反映）を書く。根拠の発言がなければマージしない
  - 指摘を直したら、同じレビュアーに修正分を再レビューしてもらう。REV の結果の行を直し、「## 再レビュー」の節を足す
- マージの直前に `gh pr checks <番号>` がすべて成功していることを確かめ、`gh pr merge <番号> --merge` で 1 件ずつマージする。main が先に進んでいたら、ブランチで `git merge origin/main` して push し、CI を待つ

## 8. 振り返り

1. 本人に聞く: 仮説の結果、完了の条件を満たしたか、書き起こした文の確認、反復を完了にしてよいか
2. `retrospective.md` を書く。形は IT06 の振り返りと同じにする。事実は PR・REV・計測記録から引き、確かめていないことは「未確認」と書く
3. 本人が「完了でよい」と答えたら、PLAN-001 のマイルストーンを完了にする

## 9. 変更履歴

| 版 | 日付 | 内容 |
|---|---|---|
| 0.1 | 2026-11-05 | 初版（REV-073） |
