# Deal Hunter AI

Amazon・楽天市場・Yahoo!ショッピングなどの価格と過去相場を比較し、明らかに安い商品を見つけるスマホ向けWebアプリです。

## v0.4.0

- 楽天市場の公式APIデータを扱うLive Providerを追加
- APIキーをブラウザへ埋め込まないGitHub Actions取得方式
- 2時間ごとに楽天市場の監視商品を自動検索
- `deal-data`ブランチへ軽量な価格フィードを自動公開
- 公開データ取得失敗時は端末保存データ、さらに失敗時はサンプルへ自動フォールバック
- 商品名・型番・必須語句・除外語句による検索結果照合
- 送料無料商品のみを検索対象に設定
- 商品画像、販売ショップ名、商品ページリンクに対応
- 取得価格を最大90日分保持し、過去平均・過去最安を段階的に実測値へ移行
- ショップごとのProvider層、同一商品統合、送料・ポイント込み実質価格に対応
- 他サイト中央値、過去平均、過去最安から総合スコアを算出
- 判定理由と判定精度を商品詳細に表示
- お気に入りを端末内に保存
- PWA・GitHub Pages対応

楽天市場ProviderはAPI未設定時もアプリ全体を止めず、サンプル価格へ自動的に戻ります。実データを有効化する手順は[`docs/rakuten-api-setup.md`](docs/rakuten-api-setup.md)にまとめています。

## 構成

```text
providers/provider-core.js
  ├─ DealProvider
  └─ ProviderRegistry

providers/sample-providers.js
  ├─ Amazon Sample Provider
  ├─ 楽天市場 Sample Provider
  ├─ Yahoo! Sample Provider
  └─ 価格.com Reference Provider

providers/rakuten-provider.js
  └─ 実データ → 保存データ → サンプルの切替

data/watchlist.json
  └─ 監視商品・検索条件

scripts/update-rakuten-data.mjs
  └─ 楽天公式API取得・商品照合・価格履歴更新

.github/workflows/update-rakuten-data.yml
  └─ 定期取得とdeal-dataブランチへの公開

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
  id: 'shop-live',
  label: 'ショップ名',
  mode: 'live',
  async load(context) {
    return [
      {
        productKey: 'jan-or-model-number',
        jan: '4900000000000',
        model: 'MODEL-001',
        name: '商品名',
        category: '家電',
        store: 'ショップ名',
        price: 10000,
        shipping: 0,
        points: 500,
        url: '商品URL',
        image: '画像URL'
      }
    ];
  }
});
```

## 実データProviderの優先順位

```text
公開済みの最新フィード
  ↓ 取得失敗
端末内の保存済みフィード
  ↓ 保存なし
サンプルProvider
```

一部ショップが取得できなくても、成功したProviderだけでランキングを生成します。

## ロードマップ

1. Yahoo!ショッピングの正規API Provider
2. JANコード・型番による商品照合精度の向上
3. 商品監視リストの画面編集
4. Amazonデータ取得経路の検討
5. 値下がり通知とお気に入り監視
6. 長期価格履歴用データストア
