# DATABASE_URL 特殊文字エンコード修正手順

## 問題

`.env.local` の `DATABASE_URL` に含まれるパスワードに特殊文字（`?`, `&`, `@`, `#`, `:` など）がある場合、PostgreSQLクライアントがURLをパースできずエラーが発生します。

## エラーメッセージ例

```
TypeError: Invalid URL
    at new URL (node:internal/url:828:25)
```

## 解決方法

### ステップ1: パスワードをURLエンコードする

パスワード内の特殊文字を以下のようにエンコードします:

| 特殊文字 | URLエンコード |
|---------|-------------|
| `?`     | `%3F`       |
| `&`     | `%26`       |
| `@`     | `%40`       |
| `#`     | `%23`       |
| `:`     | `%3A`       |
| `/`     | `%2F`       |
| `%`     | `%25`       |
| `+`     | `%2B`       |
| ` `     | `%20`       |

**オンラインツール**: https://www.urlencoder.org/

### ステップ2: .env.localを更新

現在の`.env.local`ファイルのDATABASE_URLを編集します。

**修正前の例**:
```
DATABASE_URL=postgresql://postgres:Vh3p.67?r&m46ki@db.gdxxxlwguoednonmwxvv.supabase.co:5432/postgres
```

**修正後の例**:
```
DATABASE_URL=postgresql://postgres:Vh3p.67%3Fr%26m46ki@db.gdxxxlwguoednonmwxvv.supabase.co:5432/postgres
```

### ステップ3: 動作確認

1. ファイルを保存
2. スクリプトを再実行:
   ```bash
   npm run seed:organizations
   ```

## 自動エンコードスクリプト

以下のNode.jsコマンドでパスワードをエンコードできます:

```bash
node -e "console.log(encodeURIComponent('Vh3p.67?r&m46ki'))"
```

出力: `Vh3p.67%3Fr%26m46ki`

## 代替案: Supabaseダッシュボードからパスワード変更

1. Supabaseダッシュボードにログイン
2. Settings > Database > Database Settings
3. 「Reset database password」をクリック
4. 特殊文字を含まない新しいパスワードを生成
5. 新しいDATABASE_URLを`.env.local`に反映

## トラブルシューティング

### エンコード後もエラーが発生する場合

1. **キャッシュをクリア**:
   ```bash
   rm -rf .next
   npm run build
   ```

2. **環境変数の読み込み確認**:
   ```bash
   node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.DATABASE_URL)"
   ```

3. **接続テスト**:
   ```bash
   npm run test:rpc
   ```

## 参考資料

- [RFC 3986 - URI Generic Syntax](https://datatracker.ietf.org/doc/html/rfc3986)
- [PostgreSQL Connection URI](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
