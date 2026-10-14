# 画面遷移図

weekmeal の画面間の移動と、各画面内の主な操作をまとめます。
画面や導線を変更したときは、この図も更新します。

詳しい画面仕様は [画面設計メモ](screen-design.md) を参照してください。

## 全体の画面遷移

```mermaid
flowchart LR
    Home[ホーム]
    Register[食材登録]
    Foods[食品一覧]
    Detail[栄養詳細]

    Home -->|食材を登録| Register
    Register -->|登録完了| Home

    Home -->|食品一覧を見る| Foods
    Foods -->|食品を選択| Detail

    Home -->|登録食材を選択| Detail
    Home -->|選択中の詳細を見る| Detail

    Detail -->|サイドナビ| Home
    Register -->|サイドナビ| Home
    Foods -->|サイドナビ| Home
```

すべての画面からサイドナビを使って、ホーム・食材登録・食品一覧・栄養詳細へ直接移動できます。

## 食材登録の操作フロー

```mermaid
flowchart TD
    Start[食材登録画面を開く]
    Mode{入力モード}
    Method{登録方法}

    Category[カテゴリで絞り込む]
    Search[食材名を検索する]
    Food[食材を押す]
    Default[生の代表データを自動選択]

    ManualName[食材名を入力する]
    ManualCategory[カテゴリを選ぶ]
    Nutrients[100g当たりの栄養値を入力する]

    Register[登録する]
    Home[ホームへ戻る]
    Summary[代表データの栄養サマリを表示]
    DetailedSearch[棚と食材名で絞り込む]
    Detailed[正式名称・状態・食品番号から選ぶ]

    Start --> Method
    Method -->|文科省データから選ぶ| Mode
    Mode -->|簡易| Category
    Mode -->|詳細| DetailedSearch
    DetailedSearch --> Detailed
    Detailed --> Register
    Category --> Search
    Search --> Food
    Food --> Default
    Default --> Register

    Method -->|一覧にない食材を手入力| ManualName
    ManualName --> ManualCategory
    ManualCategory --> Nutrients
    Nutrients --> Register

    Register --> Home
    Home --> Summary
```

## 食材名のまとめ方

文科省データの正式名称は内部に保持したまま、登録画面では一般的な食材名にまとめます。
生・ゆで・焼き等は分けず、栄養値が大きく変わる加工品は別項目にします。

```mermaid
flowchart TD
    Raw1[まあじ・生]
    Raw2[にしまあじ・焼き]
    Raw3[しまあじ・養殖・生]
    Aji[あじ<br/>押すと生の代表値で登録]

    ChickenRaw[鶏肉・生]
    ChickenCooked[鶏肉・焼き]
    Chicken[鶏肉<br/>押すと生の代表値で登録]
    KaraageSource[鶏肉・から揚げ]
    Karaage[鶏のから揚げ<br/>別項目として登録]

    Raw1 --> Aji
    Raw2 --> Aji
    Raw3 --> Aji
    ChickenRaw --> Chicken
    ChickenCooked --> Chicken
    KaraageSource --> Karaage
```

## 将来構想: レシート入力

この遷移は未実装です。将来検討する入力方法として記録しています。

```mermaid
flowchart TD
    Receipt[レシートを撮影・選択]
    Read[商品名と数量を読み取る]
    Normalize[一般的な食材名へまとめる]
    Check{確認が必要か}
    Fix[不明な商品・間違いだけ修正]
    Bulk[食材をまとめて登録]
    Purchase[今週買った食材として表示]

    Receipt --> Read
    Read --> Normalize
    Normalize --> Check
    Check -->|必要| Fix
    Fix --> Bulk
    Check -->|不要| Bulk
    Bulk --> Purchase
```
