@AGENTS.md

## Claude Code 固有の設定

- 共通ルールは上の AGENTS.md に書く。このファイルには Claude Code に固有のことだけを書く
- Issue 番号や要求 ID を指定した実装は、スキル `/implement-req`（`.claude/skills/implement-req/`）で行う
- npm の検証コマンド、Git の通常操作、`gh pr create` は許可済み（`.claude/settings.json`）。force push は禁止している
