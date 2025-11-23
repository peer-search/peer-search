/**
 * S3オブジェクトキーから表示用URLを生成
 *
 * @param key - S3オブジェクトキー（例: "employees/photos/uuid.jpg"）
 * @returns 完全なHTTP(S) URL
 * @throws S3_BUCKET_NAME, AWS_REGION環境変数が未設定の場合、またはkeyが空文字列の場合
 */
export function getS3Url(key: string): string {
  // バリデーション
  if (!key || key.trim() === "") {
    throw new Error("S3 object key cannot be empty");
  }

  const bucketName = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;

  if (!bucketName) {
    throw new Error("S3_BUCKET_NAME environment variable is not set");
  }

  if (!region) {
    throw new Error("AWS_REGION environment variable is not set");
  }

  // CloudFront優先
  if (cloudfrontDomain) {
    return `https://${cloudfrontDomain}/${key}`;
  }

  // S3直接URL
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
}
