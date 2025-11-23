# S3 Presigned URL セットアップガイド

このドキュメントでは、社員写真をプライベートS3バケットから安全に取得するためのPresigned URL機能のセットアップ手順を説明します。

## 概要

Presigned URLは、プライベートS3バケット内のオブジェクトに対して、一時的なアクセス権限を付与する仕組みです。これにより、S3バケットをパブリックに公開することなく、認証されたユーザーのみが社員写真にアクセスできるようになります。

### アーキテクチャ

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. Presigned URLをリクエスト
       ▼
┌─────────────────────┐
│ Next.js App         │
│ /api/s3/presign     │ ← Supabase認証チェック
└──────┬──────────────┘
       │ 2. AWS SDKでPresigned URL生成
       ▼
┌─────────────────┐
│   AWS S3        │
│ (Private Bucket)│
└─────────────────┘
```

## 前提条件

- AWS アカウント
- S3バケットが作成済み
- IAMユーザーまたはロールの作成権限
- Next.js アプリケーションが動作している

## セットアップ手順

### 1. S3バケットの設定

#### 1.1 バケットのパブリックアクセスブロック設定

S3バケットを完全にプライベートに設定します。

**AWS Management Console:**

1. S3コンソールを開く
2. 対象のバケットを選択
3. 「アクセス許可」タブをクリック
4. 「パブリックアクセスをブロック」セクションで「編集」をクリック
5. すべてのオプションを有効化:
   - ✅ 新しいアクセスコントロールリスト (ACL) を介して付与されたバケットとオブジェクトへのパブリックアクセスをブロックする
   - ✅ 任意のアクセスコントロールリスト (ACL) を介して付与されたバケットとオブジェクトへのパブリックアクセスをブロックする
   - ✅ 新しいパブリックバケットポリシーまたはアクセスポイントポリシーを介して付与されたバケットとオブジェクトへのパブリックアクセスをブロックする
   - ✅ 任意のパブリックバケットポリシーまたはアクセスポイントポリシーを介したバケットとオブジェクトへのパブリックアクセスとクロスアカウントアクセスをブロックする
6. 「変更を保存」をクリック

**AWS CLI:**

```bash
aws s3api put-public-access-block \
  --bucket YOUR-BUCKET-NAME \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

#### 1.2 バケットポリシーの確認

バケットポリシーでパブリックアクセスを許可する設定がないことを確認します。

```bash
# バケットポリシーの確認
aws s3api get-bucket-policy --bucket YOUR-BUCKET-NAME
```

パブリックアクセスを許可するポリシーがある場合は削除してください。

### 2. IAMユーザー/ロールの設定

#### 2.1 IAMポリシーの作成

アプリケーションがS3オブジェクトにアクセスするための最小権限のIAMポリシーを作成します。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/employees/photos/*"
    }
  ]
}
```

**重要ポイント:**
- `s3:GetObject` - 画像の取得に必要
- `s3:PutObject` - 将来の画像アップロード機能に必要
- リソースは `employees/photos/*` に限定（最小権限の原則）

**AWS CLI:**

```bash
# ポリシーファイルを作成
cat > s3-employee-photos-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/employees/photos/*"
    }
  ]
}
EOF

# IAMポリシーを作成
aws iam create-policy \
  --policy-name S3EmployeePhotosAccess \
  --policy-document file://s3-employee-photos-policy.json
```

#### 2.2 IAMユーザーの作成とポリシーのアタッチ

```bash
# IAMユーザーを作成
aws iam create-user --user-name s3-employee-photos-user

# ポリシーをユーザーにアタッチ
aws iam attach-user-policy \
  --user-name s3-employee-photos-user \
  --policy-arn arn:aws:iam::YOUR-ACCOUNT-ID:policy/S3EmployeePhotosAccess

# アクセスキーを作成
aws iam create-access-key --user-name s3-employee-photos-user
```

出力されたアクセスキーIDとシークレットアクセスキーを安全に保存してください。

### 3. 環境変数の設定

`.env.local` ファイルに以下の環境変数を設定します。

```env
# S3バケット設定
S3_BUCKET_NAME=your-bucket-name
AWS_REGION=ap-northeast-1

# AWS認証情報
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# CloudFront（オプション - Presigned URLでは不要）
# CLOUDFRONT_DOMAIN=d1234567890abc.cloudfront.net
```

**セキュリティ上の注意:**
- `.env.local` ファイルは `.gitignore` に含まれていることを確認
- 本番環境では環境変数を安全に管理（Vercel Environment Variables、AWS Secrets Managerなど）
- アクセスキーは定期的にローテーション

### 4. アプリケーションの設定

環境変数を設定したら、開発サーバーを再起動します。

```bash
# 開発サーバーを停止（Ctrl+C）
# 再起動
pnpm dev
```

### 5. 動作確認

#### 5.1 画像のアップロード

S3バケットに社員写真をアップロードします。

```bash
# 単一ファイルのアップロード
aws s3 cp employee-photo.jpg \
  s3://YOUR-BUCKET-NAME/employees/photos/[employee-uuid].jpg

# 複数ファイルのアップロード
aws s3 sync ./photos/ \
  s3://YOUR-BUCKET-NAME/employees/photos/ \
  --exclude "*" \
  --include "*.jpg" \
  --include "*.png"
```

#### 5.2 データベースへのS3キーの登録

```sql
UPDATE employees
SET photo_s3_key = 'employees/photos/550e8400-e29b-41d4-a716-446655440000.jpg'
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

#### 5.3 ブラウザでの確認

1. アプリケーションにログイン
2. 社員一覧ページ (`/employees`) にアクセス
3. 社員写真が表示されることを確認

#### 5.4 Presigned URLの確認

ブラウザの開発者ツールで以下を確認:

**Network タブ:**
1. `/api/s3/presign` へのPOSTリクエストが成功していること（200 OK）
2. レスポンスに `url` フィールドが含まれていること
3. 画像リクエストが成功していること（200 OK）

**Console タブ:**
- エラーメッセージがないことを確認

## トラブルシューティング

### 問題: 403 Forbidden エラー

**原因1: IAM権限が不足**

```bash
# IAMユーザーのポリシーを確認
aws iam list-attached-user-policies --user-name s3-employee-photos-user

# ポリシーの内容を確認
aws iam get-policy-version \
  --policy-arn arn:aws:iam::YOUR-ACCOUNT-ID:policy/S3EmployeePhotosAccess \
  --version-id v1
```

**解決策:**
- 正しいIAMポリシーがアタッチされているか確認
- ポリシーのリソースARNが正しいか確認

**原因2: 環境変数が正しく設定されていない**

```bash
# 環境変数の確認
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
echo $S3_BUCKET_NAME
```

**解決策:**
- `.env.local` ファイルを確認
- 開発サーバーを再起動

### 問題: Presigned URLが生成されない

**エラーログの確認:**

```bash
# Next.jsのログを確認
# ターミナルで開発サーバーのログを見る
```

**よくあるエラー:**
- `S3_BUCKET_NAME environment variable is required` → `.env.local` を確認
- `AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables are required` → 認証情報を確認

### 問題: 画像が表示されない（プレースホルダーのまま）

**確認ポイント:**

1. **データベースの確認:**
```sql
SELECT id, name_kanji, photo_s3_key FROM employees WHERE photo_s3_key IS NOT NULL;
```

2. **S3にファイルが存在するか確認:**
```bash
aws s3 ls s3://YOUR-BUCKET-NAME/employees/photos/
```

3. **ブラウザのConsoleでエラー確認**

### 問題: Presigned URLの有効期限切れ

**症状:**
- 画像が一定時間後にアクセスできなくなる

**原因:**
- Presigned URLのデフォルト有効期限は1時間

**解決策:**
- 有効期限を延長する場合は `lib/s3/presigned-url.ts` の `expiresIn` を変更
- または、フロントエンドで有効期限切れ時に再取得する仕組みを実装

```typescript
// 有効期限を2時間に変更
const presignedUrl = await generatePresignedGetUrl(s3Key, 7200);
```

## セキュリティのベストプラクティス

### 1. 最小権限の原則

- IAMポリシーは必要最小限の権限のみを付与
- S3リソースのパスを具体的に指定（ワイルドカード `*` を避ける）

### 2. アクセスキーの管理

- アクセスキーを定期的にローテーション（90日ごと推奨）
- アクセスキーをソースコードにハードコードしない
- 本番環境では環境変数管理サービスを使用

### 3. 認証の徹底

- API Routeで必ず認証チェック（`getUser()`）を実施
- Presigned URLの有効期限を適切に設定（デフォルト: 1時間）

### 4. 監査ログ

- S3バケットのアクセスログを有効化
- CloudTrailでIAMアクションを記録

```bash
# S3アクセスログの有効化
aws s3api put-bucket-logging \
  --bucket YOUR-BUCKET-NAME \
  --bucket-logging-status \
  "LoggingEnabled={TargetBucket=YOUR-LOG-BUCKET,TargetPrefix=s3-access-logs/}"
```

## 参考資料

- [AWS S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

## サポート

問題が解決しない場合は、以下を含めて開発チームに問い合わせてください:

1. エラーメッセージの全文
2. ブラウザの開発者ツールのログ
3. Next.jsサーバーのログ
4. 実行した手順
