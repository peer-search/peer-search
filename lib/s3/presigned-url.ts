import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client } from "./client";

/**
 * S3オブジェクトへのGETアクセス用のPresigned URLを生成
 *
 * @param key - S3オブジェクトキー（例: "employees/photos/sample.jpg"）
 * @param expiresIn - URL有効期限（秒）デフォルト: 3600秒（1時間）
 * @returns Presigned URL
 * @throws 環境変数が設定されていない場合、またはS3操作に失敗した場合
 */
export async function generatePresignedGetUrl(
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  if (!key) {
    throw new Error("S3 object key is required");
  }

  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("S3_BUCKET_NAME environment variable is required");
  }

  try {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(client, command, { expiresIn });
    return presignedUrl;
  } catch (error) {
    console.error("Failed to generate presigned GET URL:", error);
    throw new Error(`Failed to generate presigned GET URL for key: ${key}`);
  }
}

/**
 * S3オブジェクトへのPUTアクセス用のPresigned URLを生成（アップロード用）
 *
 * @param key - S3オブジェクトキー（例: "employees/photos/sample.jpg"）
 * @param contentType - ファイルのMIMEタイプ（例: "image/jpeg"）
 * @param expiresIn - URL有効期限（秒）デフォルト: 3600秒（1時間）
 * @returns Presigned URL
 * @throws 環境変数が設定されていない場合、またはS3操作に失敗した場合
 */
export async function generatePresignedPutUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600,
): Promise<string> {
  if (!key) {
    throw new Error("S3 object key is required");
  }

  if (!contentType) {
    throw new Error("Content type is required");
  }

  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("S3_BUCKET_NAME environment variable is required");
  }

  try {
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(client, command, { expiresIn });
    return presignedUrl;
  } catch (error) {
    console.error("Failed to generate presigned PUT URL:", error);
    throw new Error(`Failed to generate presigned PUT URL for key: ${key}`);
  }
}
