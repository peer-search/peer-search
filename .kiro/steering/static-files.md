# Static Files Management

## Architecture Decision

画像、音声、動画などの静的ファイルは **AWS S3に直接保管** し、Vercel・Supabaseを経由せずにアップロード・参照する設計を採用。

### Rationale

- **コスト最適化**: Vercel/Supabaseの帯域制限・ストレージコストを回避
- **パフォーマンス**: S3 + CloudFrontによるグローバルCDN配信
- **スケーラビリティ**: 大容量ファイルやトラフィック増加に対応
- **責任分離**: 静的ファイル管理とアプリケーションロジックを分離

## Upload Pattern

### Direct Upload (Presigned URL)

クライアントから直接S3へアップロード。サーバーはPresigned URLを生成するのみ。

```typescript
// Server: Presigned URL生成 (API Route)
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(request: Request) {
  const { fileName, fileType } = await request.json();

  const s3Key = `uploads/${Date.now()}-${fileName}`;

  const client = new S3Client({ region: process.env.AWS_REGION });
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: s3Key,
    ContentType: fileType,
  });

  const presignedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

  return Response.json({ uploadUrl: presignedUrl, s3Key });
}
```

```typescript
// Client: 直接S3へアップロード
async function uploadFile(file: File) {
  // 1. Presigned URL取得
  const res = await fetch("/api/upload/presign", {
    method: "POST",
    body: JSON.stringify({ fileName: file.name, fileType: file.type }),
  });
  const { uploadUrl, s3Key } = await res.json();

  // 2. S3へ直接PUT
  await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  // 3. S3キーをDBに保存
  await saveToDatabase({ s3Key, fileName: file.name, fileType: file.type });
}
```

### Server Upload (小容量ファイル)

小さなファイルや機密性の高いファイルはサーバー経由でアップロード。

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

async function uploadToS3(buffer: Buffer, key: string, contentType: string) {
  const client = new S3Client({ region: process.env.AWS_REGION });

  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
```

## File Reference Pattern

### Public URL Structure

```
https://{bucket}.s3.{region}.amazonaws.com/{key}
```

または CloudFront経由:

```
https://{cloudfront-domain}/{key}
```

### Database Schema

**S3オブジェクトキーのみをSupabaseに保存**。完全なURLではなくキーを保存することで、バケット名やドメイン変更時の影響を最小化。

```typescript
// db/schema.ts
export const media = pgTable("media", {
  id: uuid("id").primaryKey(),
  s3Key: text("s3_key").notNull(),       // S3オブジェクトキー（例: uploads/1234567890-image.jpg）
  fileType: text("file_type").notNull(), // image/jpeg, video/mp4, etc.
  fileName: text("file_name"),
  fileSize: integer("file_size"),        // bytes
  uploadedBy: uuid("uploaded_by").references(() => profiles.id),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**URL生成はアプリケーションレイヤーで行う**:

```typescript
// lib/s3/url.ts
export function getS3Url(key: string): string {
  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;

  // CloudFront使用時
  if (process.env.CLOUDFRONT_DOMAIN) {
    return `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;
  }

  // S3直接URL
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

// 使用例
const media = await db.query.media.findFirst({ where: eq(media.id, mediaId) });
const publicUrl = getS3Url(media.s3Key);
```

### Image Optimization

Next.js Imageコンポーネントでは、S3キーから生成したURLを使用:

```typescript
import Image from "next/image";
import { getS3Url } from "@/lib/s3/url";

<Image
  src={getS3Url(media.s3Key)}
  alt={media.fileName}
  width={800}
  height={600}
  loader={({ src, width, quality }) => {
    // CloudFront + Lambda@Edge で画像最適化
    return `${src}?w=${width}&q=${quality || 75}`;
  }}
/>
```

## Security Considerations

### Access Control

- **Public files**: S3バケットポリシーでパブリック読み取り許可
- **Private files**: Presigned URLで一時的アクセス権付与

```typescript
// Private fileの参照URL生成
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

async function getPrivateFileUrl(key: string) {
  const client = new S3Client({ region: process.env.AWS_REGION });
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn: 3600 }); // 1時間有効
}
```

### File Validation

- サーバーサイドでファイルタイプ検証（MIME type）
- ファイルサイズ制限（例: 画像10MB、動画100MB）
- ファイル名のサニタイズ（特殊文字除去）

## Environment Variables

```env
# AWS S3設定
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=your-bucket-name
CLOUDFRONT_DOMAIN=your-cloudfront-domain (optional)
```

**重要**: 環境変数は`.env.local`に設定し、`.env.example`にはダミー値のみ記載。

## File Organization

```
/lib/
  s3/
    client.ts       # S3クライアント初期化
    upload.ts       # アップロードユーティリティ
    presign.ts      # Presigned URL生成
    validation.ts   # ファイルバリデーション

/app/api/
  upload/
    presign/route.ts    # Presigned URL発行
    complete/route.ts   # アップロード完了通知（DB保存）
```

## Dependencies

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.x",
    "@aws-sdk/s3-request-presigner": "^3.x"
  }
}
```

## Key Principles

1. **Direct Upload First**: 大容量ファイルは必ずクライアントから直接S3へ
2. **Key-Based Reference**: Supabaseには完全なURLではなく、S3オブジェクトキーのみを保存
3. **No Proxy**: Vercel/Supabase経由でファイルを中継しない
4. **Validate Early**: サーバーサイドでファイルタイプ・サイズを検証
5. **CloudFront Optional**: 将来的にCDN導入を想定した設計
6. **URL Generation at Runtime**: URL生成はアプリケーションレイヤーで動的に行う

---
_Patterns for AWS S3 static file management, not implementation details_
