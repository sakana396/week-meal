# weekmeal

weekmeal は、食品ごとの主要栄養素を可視化する Web アプリです。

現在の初期版では、文部科学省「日本食品標準成分表（八訂）増補2023年」の食品データを使い、食品を検索・選択すると、可食部 100g あたりの栄養を横棒グラフで表示します。

## 主な機能

- 食品名・食品番号・カテゴリで検索
- 食品ごとの栄養情報表示
- 横棒グラフによる主要栄養素の比較
- 文科省データから生成した食品 JSON の同梱

今後の画面構成メモは [docs/screen-design.md](docs/screen-design.md) にまとめています。

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

`src/data/foods.json` は、文部科学省の Excel データから生成しています。

まず、食品成分表の Excel ファイルを `/tmp/mext-food.xlsx` に保存します。

```bash
curl -L -o /tmp/mext-food.xlsx "https://www.mext.go.jp/content/20260327-mxt_kagsei-mext-000029402_02.xlsx"
```

次に変換スクリプトを実行します。

```bash
npm run convert:mext
```

このコマンドは `scripts/convert-mext-foods.py` を使い、`src/data/foods.json` を更新します。

## ディレクトリ構成

```text
src/
  App.tsx              画面本体
  App.css              画面スタイル
  data/
    foods.json         食品データ
    nutrients.ts       表示する栄養素定義
  types.ts             食品・栄養素の型定義
scripts/
  convert-mext-foods.py  文科省 Excel から JSON を生成するスクリプト
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
