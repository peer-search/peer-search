# S3バケット設定手順

## Task 1.1: CORS設定

### AWS CLIでの設定方法

1. CORS設定JSONファイルを作成（`cors-config.json`）:
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "http://localhost:3000",
        "https://your-production-domain.com"
      ],
      "AllowedMethods": ["PUT", "POST", "GET"],
      "AllowedHeaders": ["Content-Type", "x-amz-*"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

2. AWS CLIでCORS設定を適用:
```bash
aws s3api put-bucket-cors \
  --bucket peer-search-develop-bucket \
  --cors-configuration file://cors-config.json \
  --region ap-northeast-1
```

3. 設定を確認:
```bash
aws s3api get-bucket-cors \
  --bucket peer-search-develop-bucket \
  --region ap-northeast-1
```

### AWSコンソールでの設定方法

1. S3コンソールで`peer-search-develop-bucket`を開く
2. **Permissions** タブ → **Cross-origin resource sharing (CORS)** セクション
3. 以下のJSON設定を貼り付けて保存:
```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-production-domain.com"
    ],
    "AllowedMethods": ["PUT", "POST", "GET"],
    "AllowedHeaders": ["Content-Type", "x-amz-*"],
    "MaxAgeSeconds": 3600
  }
]
```

### 検証方法

クライアントから直接S3へPUTリクエストを送信して、CORSエラーが発生しないことを確認:
```bash
# Presigned URLを取得してテストアップロード
curl -X PUT "PRESIGNED_URL" \
  -H "Content-Type: image/jpeg" \
  --upload-file test-image.jpg
```

## Task 1.2: ライフサイクルポリシー設定

### AWS CLIでの設定方法

1. ライフサイクルポリシーJSONファイルを作成（`lifecycle-config.json`）:
```json
{
  "Rules": [
    {
      "Id": "DeleteOrphanedEmployeePhotos",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "employee-photos/"
      },
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

2. AWS CLIでライフサイクルポリシーを適用:
```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket peer-search-develop-bucket \
  --lifecycle-configuration file://lifecycle-config.json \
  --region ap-northeast-1
```

3. 設定を確認:
```bash
aws s3api get-bucket-lifecycle-configuration \
  --bucket peer-search-develop-bucket \
  --region ap-northeast-1
```

### AWSコンソールでの設定方法

1. S3コンソールで`peer-search-develop-bucket`を開く
2. **Management** タブ → **Lifecycle rules** → **Create lifecycle rule**
3. ルール名: `DeleteOrphanedEmployeePhotos`
4. **Rule scope**: Filter using prefix → `employee-photos/`
5. **Lifecycle rule actions**: Expire current versions of objects
6. **Days after object creation**: `30`
7. 保存

### 目的

- 写真更新・削除時にS3削除失敗した孤立ファイルを自動クリーンアップ
- ストレージコストの最適化

## Task 1.3: 環境変数検証

### 必須環境変数

`.env.local`に以下の変数が設定されていることを確認:
```bash
S3_BUCKET_NAME=peer-search-develop-bucket
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID>
AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_ACCESS_KEY>
```

### 検証方法

1. 環境変数が設定されているか確認:
```bash
pnpm dotenv -e .env.local -- node -e "console.log(process.env.S3_BUCKET_NAME, process.env.AWS_REGION)"
```

2. S3接続テスト（Presigned URL生成）:
```bash
pnpm dotenv -e .env.local -- tsx scripts/test-s3-connection.ts
```

## トラブルシューティング

### CORS設定が反映されない場合

- ブラウザキャッシュをクリア
- 設定適用後、数分待ってから再試行
- S3バケットのパブリックアクセスブロック設定を確認（プライベートバケットでもCORSは動作します）

### ライフサイクルポリシーが動作しない場合

- ポリシーのStatusが`Enabled`になっているか確認
- プレフィックスが正しいか確認（`employee-photos/`）
- ライフサイクルポリシーは日次で実行されるため、即座には削除されない

### 環境変数が読み込まれない場合

- `.env.local`ファイルがプロジェクトルートに存在するか確認
- 環境変数に余分なスペースや改行がないか確認
- `pnpm dotenv -e .env.local -- <command>`で実行していることを確認
