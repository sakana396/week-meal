# ドキュメント一覧

本プロジェクトの成果物とその置き場所。工程が進むたびにこの表を更新する。

| 工程 | 成果物 | ファイル | 状態 |
|---|---|---|---|
| 企画 | 要求抽出記録（ヒアリング） | [01_concept/elicitation-notes.md](01_concept/elicitation-notes.md) | 追記中 |
| 企画 | 企画書 | [01_concept/concept.md](01_concept/concept.md) | ドラフト |
| 設計 | データ設計 | [data-design.md](data-design.md) | 現行 |
| 参考 | スーパーの売場分類の参考資料 | [references/supermarket-shelves.md](references/supermarket-shelves.md) | 現行 |
| 要求 | 要求仕様書 (SRS) | [02_requirements/srs.md](02_requirements/srs.md) | v0.6 確定 |
| 計画 | プロジェクト計画書 | [00_plan/project-plan.md](00_plan/project-plan.md) | v0.4 承認 |
| 反復 | 反復 1 振り返り | [iterations/it01/retrospective.md](iterations/it01/retrospective.md) | 1.0 確定 |
| 反復 | 反復 2 振り返り | [iterations/it02/retrospective.md](iterations/it02/retrospective.md) | 0.2 案（本人の記入待ち） |
| 反復 | 反復 1（計算の核とデータ）計画書 | [iterations/it01/plan.md](iterations/it01/plan.md) | v0.3 承認 |
| 要求 | ユースケース記述・図 | [02_requirements/use-cases.md](02_requirements/use-cases.md) | v0.1（反復 1 の範囲） |
| 設計 | 技術スタック ADR | [adr/0001-tech-stack.md](adr/0001-tech-stack.md) | 採用 |
| 設計 | 食品データ ADR | [adr/0002-food-data.md](adr/0002-food-data.md) | 採用 |
| 設計 | 計算方式 ADR | [adr/0003-balance-calculation.md](adr/0003-balance-calculation.md) | 承認 |
| 設計 | 設計書（反復 1） | [03_design/design-it01.md](03_design/design-it01.md) | v0.2 採用 |
| 反復 | 反復 2（登録と判定の画面）計画書 | [iterations/it02/plan.md](iterations/it02/plan.md) | v0.2 |
| 反復 | 反復 3（提案と仕上げ）計画書 | [iterations/it03/plan.md](iterations/it03/plan.md) | v0.1 |
| 反復 | 反復 3 振り返り | [iterations/it03/retrospective.md](iterations/it03/retrospective.md) | 0.2 案（本人の記入待ち） |
| 反復 | 反復 4（買い物の単位と公開）計画書 | [iterations/it04/plan.md](iterations/it04/plan.md) | v0.2 |
| 設計 | 設計書（反復 2）: 状態・保存・画面・E2E | [03_design/design-it02.md](03_design/design-it02.md) | v0.1 採用 |
| 設計 | 設計書（反復 3）: 提案と仕上げ | [03_design/design-it03.md](03_design/design-it03.md) | v0.2 採用 |
| 設計 | 保存方式 ADR | [adr/0004-storage.md](adr/0004-storage.md) | 採用 |
| 設計 | 補う候補の選び方 ADR | [adr/0005-supplement-suggestions.md](adr/0005-supplement-suggestions.md) | 採用 |
| 試験 | テスト仕様書（反復 2） | [04_test/test-spec-it02.md](04_test/test-spec-it02.md) | 追記中 |
| 試験 | テスト仕様書（反復 3） | [04_test/test-spec-it03.md](04_test/test-spec-it03.md) | 骨組み |
| 試験 | テスト仕様書（反復 1） | [04_test/test-spec-it01.md](04_test/test-spec-it01.md) | 追記中 |
| 試験 | 食品の除外・維持の査閲資料（IT03 #59） | [04_test/food-selection-review-it03.md](04_test/food-selection-review-it03.md) | 本人の査閲待ち |
| 横断 | トレーサビリティマトリクス | [traceability.md](traceability.md) | 反復 1 の行を用意 |
| 横断 | レビュー記録 | [reviews/](reviews/) | 記録中 |

## エージェント向けのルール

コーディングエージェントの共通ルールはリポジトリ直下の [AGENTS.md](../AGENTS.md) にある。

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
