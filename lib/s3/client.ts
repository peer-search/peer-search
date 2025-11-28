import { S3Client } from "@aws-sdk/client-s3";

let s3Client: S3Client | null = null;

/**
 * S3クライアントのシングルトンインスタンスを取得
 * 環境変数から認証情報を読み込み、S3クライアントを初期化する
 */
export function getS3Client(): S3Client {
  if (s3Client) {
    return s3Client;
  }

  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region) {
    throw new Error(
      "AWS_REGION environment variable is required for S3 client",
    );
  }

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables are required for S3 client",
    );
  }

  s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3Client;
}

/**
 * テスト用: S3クライアントのシングルトンインスタンスをリセット
 */
export function resetS3Client(): void {
  s3Client = null;
}
