import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "./client";

/**
 * S3オブジェクトを削除
 *
 * 削除失敗時もエラーをスローせず、ログ記録のみ行う（ベストエフォート削除）。
 * 孤立ファイルはS3ライフサイクルポリシーで自動クリーンアップされることを想定。
 *
 * @param s3Key - 削除対象のS3オブジェクトキー（例: "employee-photos/abc123.jpg"）
 * @returns 削除成功時はtrue、失敗時はfalse（例外スローしない）
 */
export async function deleteS3Object(s3Key: string): Promise<boolean> {
  // Preconditions: キーの検証
  if (!s3Key) {
    console.error("S3 object key is required for deletion");
    return false;
  }

  // Preconditions: 環境変数の検証
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    console.error("S3_BUCKET_NAME environment variable is required");
    return false;
  }

  try {
    const client = getS3Client();
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });

    await client.send(command);

    // Postcondition: 削除成功
    return true;
  } catch (error) {
    // エラーログ記録のみ、例外スローしない（要件3.6準拠）
    console.error("Failed to delete S3 object:", s3Key, error);
    return false;
  }
}
