# week-meal

食事管理システムの最小実装です。  
栄養情報は [Open Food Facts API](https://world.openfoodfacts.org/data) から取得します。

## 使い方

```bash
python meal_manager.py add breakfast banana --quantity 1
python meal_manager.py list
python meal_manager.py summary
```

- `add`: 食事を追加（`--quantity` は倍率）
- `list`: 保存済み食事を表示
- `summary`: 合計栄養を表示

データはデフォルトで `meals.json` に保存されます。`--storage` で変更できます。

```bash
python meal_manager.py --storage /tmp/meals.json add lunch apple
```

## テスト

```bash
python -m unittest discover -s tests -p "test_*.py"
```