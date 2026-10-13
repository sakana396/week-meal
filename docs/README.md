# ドキュメント一覧

本プロジェクトの成果物とその置き場所。工程が進むたびにこの表を更新する。

| 工程 | 成果物 | ファイル | 状態 |
|---|---|---|---|
| 企画 | 要求抽出記録（ヒアリング） | [01_concept/elicitation-notes.md](01_concept/elicitation-notes.md) | 追記中 |
| 企画 | 企画書 | [01_concept/concept.md](01_concept/concept.md) | ドラフト |
| 画面 | 画面設計メモ | [screen-design.md](screen-design.md) | 参考（設計書に取り込み後に削除） |
| 画面 | 画面遷移図 | [screen-flow.md](screen-flow.md) | 参考（設計書に取り込み後に削除） |
| 設計 | データ設計 | [data-design.md](data-design.md) | 現行 |
| 参考 | スーパーの売場分類の参考資料 | [references/supermarket-shelves.md](references/supermarket-shelves.md) | 現行 |
| 要求 | 要求仕様書 (SRS) | [02_requirements/srs.md](02_requirements/srs.md) | v0.1 確定 |
| 横断 | レビュー記録 | [reviews/](reviews/) | 記録中 |

## ID 規約

トレーサビリティのため、要素には次の ID を振る。

| 接頭辞 | 対象 | 例 |
|---|---|---|
| `FR-<区分>-` | 機能要求（区分: ING, FDB, QTY, STP, NUT, BAL, UI, SYS, RCP） | `FR-BAL-02` |
| `NFR-` | 非機能要求 | `NFR-03` |
| `IF-` | 外部インタフェース要求 | `IF-01` |
| `CST-` | 制約 | `CST-02` |
| `QA-` | 品質保証の要求 | `QA-01` |
| `TBD-` | 要求仕様書の未決事項 | `TBD-03` |
| `UC-` | ユースケース | `UC-02` |
| `DES-` | 設計要素（モジュール・コンポーネント） | `DES-BAL-01` |
| `TC-` | テストケース | `TC-FR-BAL-02-01` |
| `ADR-` | 設計判断記録 | `ADR-0001` |
| `E-` | 要求抽出記録の発言 | `E-08` |
| `Q-` | 企画書の未決事項 | `Q-01` |

## 図

UML は [Mermaid](https://mermaid.js.org/) で Markdown に直接書く。
