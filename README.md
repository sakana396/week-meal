# weekmeal

weekmeal は、食品ごとの主要栄養素を可視化する Web アプリです。

現在の初期版では、文部科学省「日本食品標準成分表（八訂）増補2023年」の食品データを使い、食品を検索・選択すると、可食部 100g あたりの栄養を横棒グラフで表示します。

## 主な機能

- 食品名・食品番号・カテゴリで検索
- 食品ごとの栄養情報表示
- 横棒グラフによる主要栄養素の比較
- 文科省データから生成した食品 JSON の同梱

画面に関する資料:

- [設計書（反復 2）: 画面と画面遷移](docs/03_design/design-it02.md)
- [スーパーマーケットの売場分類・運営に関する参考資料](docs/references/supermarket-shelves.md)
- [データ設計](docs/data-design.md)

表示している栄養素:

- エネルギー
- たんぱく質
- 脂質
- 炭水化物
- 食物繊維
- 食塩相当量
- ビタミン類
- ミネラル類

## 必要環境

- Node.js `22.12.0` 以上
- npm
- Python 3

このプロジェクトは Vite 8 を使っているため、Node 18 ではなく Node 22 以上で実行してください。

## セットアップ

```bash
npm install
```

Node.js を更新せずに Docker で依存関係を入れる場合:

```bash
npm run docker:install
```

## 開発サーバーの起動

```bash
npm run dev
```

起動後、ブラウザで以下を開きます。

```text
http://localhost:5173/
```

Node.js 18 のまま実行すると Vite が起動できません。
その場合は Node.js 22 以上へ更新するか、Docker で起動してください。

```bash
npm run dev:docker
```

## 検証コマンド

```bash
npm run typecheck      # 型検査
npm run lint           # ESLint
npm run format:check   # Prettier の確認（npm run format で整形）
npm test               # 単体テスト（Vitest）
npm run test:coverage  # 単体テストと網羅率（src/core が対象、命令網羅率 80% 以上）
```

プッシュとプルリクエストごとに、GitHub Actions で同じ検証とビルドを実行します。

## ビルド

```bash
npm run build
```

ビルド結果は `dist/` に出力されます。

Docker でビルドする場合:

```bash
npm run build:docker
```

## ビルド結果の確認

```bash
npm run preview
```

## Docker で動かす場合

ローカルの Node.js バージョンを変更したくない場合は、Node 22 の Docker イメージで実行できます。

```bash
npm run docker:install
npm run dev:docker
```

## 栄養データの再生成

`src/data/foods.json` は、文部科学省の Excel データから、自炊向けの食材だけを絞り込んで生成しています（約 1,200 件）。絞り込む食品は `scripts/food-selection.json`（食品番号と正式名称の一覧）で管理します。

まず、食品成分表の Excel ファイルを `/tmp/mext-food.xlsx` に保存します。

```bash
curl -L -o /tmp/mext-food.xlsx "https://www.mext.go.jp/content/20260327-mxt_kagsei-mext-000029402_02.xlsx"
```

次に変換スクリプトを実行します。

```bash
npm run convert:mext
```

このコマンドは `scripts/convert-mext-foods.py` を使い、`scripts/food-selection.json` にある食品だけを、廃棄率（`refusePct`）とともに `src/data/foods.json` へ書き出します。定義に成分表にない食品番号があると、誤りで終了します。

食品を足すときは、`scripts/food-selection.json` に食品番号と正式名称を 1 行足してから変換し直し、`npm test` で整合性テストが通ることを確かめます。

## ディレクトリ構成

```text
src/
  main.tsx             入口
  ui/                  画面（React）
    App.tsx            画面の切り替え・状態・保存の呼び出し
    screens/           画面ごとの部品
    components/        共通の部品
    storage.ts         localStorage の読み書き
  core/                計算のロジック（React に依存しない純粋な関数）
    catalog.ts         表示名のまとめ・登録対象の判定
    basket.ts          登録した食材と設定の状態
    storage.ts         保存データの形式と検査
  data/
    foods.json         食品データ
    nutrients.ts       表示する栄養素定義
    staples.ts         主食の代表食品
    integrity.test.ts  定義データの整合性テスト
  types.ts             食品・栄養素の型定義
scripts/
  convert-mext-foods.py  文科省 Excel から JSON を生成するスクリプト
  food-selection.json    食品データに含める食品の一覧
```

## データ出典

食品データの出典:

```text
日本食品標準成分表（八訂）増補2023年
文部科学省
```

公式ページ:

- https://www.mext.go.jp/a_menu/syokuhinseibun/
- https://fooddb.mext.go.jp/

## 注意

現在の初期版は、すべて可食部 100g あたりの表示です。
摂取量入力、買い物リスト合計、1週間の栄養管理はまだ未実装です。
