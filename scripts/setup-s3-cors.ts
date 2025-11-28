/**
 * S3バケットのCORS設定を確認・設定するスクリプト
 *
 * Usage: node scripts/load-env.mjs scripts/setup-s3-cors.ts
 */

import {
  type CORSConfiguration,
  GetBucketCorsCommand,
  PutBucketCorsCommand,
} from "@aws-sdk/client-s3";
import { getS3Client } from "../lib/s3/client";

const REQUIRED_CORS_CONFIG: CORSConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: [
        "http://localhost:3000",
        "https://your-domain.com", // 本番環境のドメインに置き換える
      ],
      AllowedMethods: ["PUT", "POST", "GET"],
      AllowedHeaders: ["Content-Type", "x-amz-*"],
      MaxAgeSeconds: 3600,
    },
  ],
};

async function setupCors(): Promise<void> {
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("S3_BUCKET_NAME environment variable is required");
  }

  console.log(`Setting up CORS for bucket: ${bucketName}`);

  try {
    const client = getS3Client();

    // 既存のCORS設定を取得
    try {
      const getCorsCommand = new GetBucketCorsCommand({ Bucket: bucketName });
      const currentCors = await client.send(getCorsCommand);
      console.log("Current CORS configuration:");
      console.log(JSON.stringify(currentCors.CORSRules, null, 2));
    } catch (error) {
      // CORSが未設定の場合はNoSuchCORSConfigurationエラーが返る
      console.log("No existing CORS configuration found.");
    }

    // CORS設定を適用
    const putCorsCommand = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: REQUIRED_CORS_CONFIG,
    });
    await client.send(putCorsCommand);

    console.log("\n✅ CORS configuration applied successfully!");
    console.log("New CORS configuration:");
    console.log(JSON.stringify(REQUIRED_CORS_CONFIG.CORSRules, null, 2));
  } catch (error) {
    console.error("❌ Failed to setup CORS:", error);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  setupCors()
    .then(() => {
      console.log("\n✅ CORS setup completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ CORS setup failed:", error);
      process.exit(1);
    });
}

export { setupCors, REQUIRED_CORS_CONFIG };
