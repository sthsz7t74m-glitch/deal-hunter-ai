# Deal Hunter AI

Amazon・楽天市場・Yahoo!ショッピングなどの価格と過去相場を比較し、明らかに安い商品を見つけるスマホ向けWebアプリです。

## v0.3.0

- ショップごとのProvider層を追加
- Amazon・楽天市場・Yahoo!・価格.comを個別Providerとして管理
- Providerから取得した価格を同一商品単位で自動統合
- 型番・JAN・商品キーを使える正規化インターフェース
- 表示価格だけでなく送料・ポイントを含む実質価格に対応
- Providerごとの接続状態・取得価格数を画面に表示
- 一部Providerが失敗しても、成功したProviderだけでランキングを生成
- 他サイト中央値、過去平均、過去最安から総合スコアを算出
- 判定理由と判定精度を商品詳細に表示
- お気に入りを端末内に保存
- PWA・GitHub Pages対応

現在の各ProviderはUIと統合ロジックを検証するためのサンプル実装です。取得処理はProviderごとに交換できるため、正規API接続時も画面・判定エンジンを変更せず差し替えられます。

## 構成

```text
providers/provider-core.js
  ├─ DealProvider
  └─ ProviderRegistry

providers/sample-providers.js
  ├─ Amazon Provider
  ├─ 楽天市場 Provider
  ├─ Yahoo! Provider
  └─ 価格.com Provider

deal-catalog.js
  └─ 同一商品の照合・価格統合

deal-engine.js
  └─ 相場・履歴・判定スコア

app.js
  └─ 画面状態・描画・操作
```

## Providerの契約

新しいショップは次の形式で登録できます。

```javascript
DealHunterProviders.register({
  id: 'rakuten-live',
  label: '楽天市場',
  mode: 'live',
  async load(context) {
    return [
      {
        productKey: 'jan-or-model-number',
        jan: '4900000000000',
        model: 'MODEL-001',
        name: '商品名',
        category: '家電',
        store: '楽天市場',
        price: 10000,
        shipping: 0,
        points: 500,
        url: '商品URL'
      }
    ];
  }
});
```

## ロードマップ

1. 楽天市場の正規API Provider
2. Yahoo!ショッピングの正規API Provider
3. JANコード・型番による商品照合精度の向上
4. PostgreSQLへの価格履歴保存
5. Amazonデータ取得経路の検討
6. 値下がり通知とお気に入り監視
