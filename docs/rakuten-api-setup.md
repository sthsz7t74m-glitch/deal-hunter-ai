# 楽天市場 実データProviderの有効化

Deal Hunter AI v0.4.0では、楽天市場の商品価格をGitHub Actionsで定期取得し、公開用の`deal-data`ブランチへ配信します。

APIキーをブラウザへ埋め込まず、GitHub ActionsのRepository secretsから利用する構成です。

## 1. 楽天ウェブサービスでアプリを作成

楽天ウェブサービスの管理画面でアプリを作成し、次の値を取得します。

- Application ID
- Access Key
- Affiliate ID（任意）

## 2. GitHub Repository secretsへ登録

リポジトリの次の画面を開きます。

`Settings → Secrets and variables → Actions → New repository secret`

以下を登録してください。

| Secret名 | 必須 | 内容 |
|---|---:|---|
| `RAKUTEN_APPLICATION_ID` | 必須 | 楽天ウェブサービスのApplication ID |
| `RAKUTEN_ACCESS_KEY` | 必須 | 楽天ウェブサービスのAccess Key |
| `RAKUTEN_AFFILIATE_ID` | 任意 | 楽天アフィリエイトID |

## 3. 初回更新を実行

Actionsから`Update Rakuten deal data`を開き、`Run workflow`を実行します。

成功すると`deal-data`ブランチに次のファイルが作成されます。

```text
rakuten-offers.json
```

以降は2時間ごとに自動更新されます。

## 4. 監視商品を編集

監視対象は次のファイルで管理します。

```text
data/watchlist.json
```

商品ごとに以下を設定できます。

- 固定の商品キー
- 表示名
- 楽天検索用キーワード
- 型番
- カテゴリ
- 必須語句
- 除外語句
- 初期の参考価格履歴

曖昧な商品は`"liveEnabled": false`にすると、実データ検索の対象外になります。

## 動作モード

楽天Providerは次の順番でデータを選びます。

1. `deal-data`ブランチの最新実データ
2. 端末内に保存した直近の実データ
3. UI検証用サンプルデータ

画面上では次のように表示されます。

- `実データ`：GitHub Actionsが生成した最新価格
- `保存データ`：前回取得した実データ
- `サンプル`：API未設定、または一度も実データを取得できていない状態

## 価格履歴

GitHub Actionsは前回の公開データを読み込み、商品ごとの取得価格を最大90日分保持します。

履歴が3件未満の間は`data/watchlist.json`の初期参考価格を併用し、履歴が蓄積した後は実測値の平均・最安値を優先します。
