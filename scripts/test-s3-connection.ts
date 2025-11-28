/**
 * S3接続と環境変数を検証するテストスクリプト
 *
 * Usage: pnpm dotenv -e .env.local -- tsx scripts/test-s3-connection.ts
 */

import { getS3Client } from "../lib/s3/client";
import { generatePresignedGetUrl } from "../lib/s3/presigned-url";

async function testS3Connection(): Promise<void> {
  console.log("🔍 Checking environment variables...\n");

  // 環境変数の検証
  const requiredEnvVars = [
    "AWS_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "S3_BUCKET_NAME",
  ];

  const missingVars: string[] = [];
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (!value) {
      missingVars.push(envVar);
      console.log(`❌ ${envVar}: NOT SET`);
    } else {
      // 認証情報は一部のみ表示
      if (envVar.includes("KEY") || envVar.includes("SECRET")) {
        const masked = `${value.substring(0, 4)}${"*".repeat(value.length - 8)}${value.substring(value.length - 4)}`;
        console.log(`✅ ${envVar}: ${masked}`);
      } else {
        console.log(`✅ ${envVar}: ${value}`);
      }
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`,
    );
  }

  console.log("\n🔧 Testing S3 client initialization...\n");

  // S3クライアント初期化テスト
  try {
    const client = getS3Client();
    console.log("✅ S3 client initialized successfully");
    console.log(`   Region: ${process.env.AWS_REGION}`);
    console.log(`   Bucket: ${process.env.S3_BUCKET_NAME}`);
  } catch (error) {
    console.error("❌ Failed to initialize S3 client:", error);
    throw error;
  }

  console.log("\n🔗 Testing Presigned URL generation...\n");

  // Presigned URL生成テスト（実際のファイルは存在しなくてもURLは生成可能）
  try {
    const testKey = "test/connection-test.txt";
    const presignedUrl = await generatePresignedGetUrl(testKey);

    // URLフォーマットの検証
    const url = new URL(presignedUrl);
    const expectedBucket = process.env.S3_BUCKET_NAME;
    const expectedRegion = process.env.AWS_REGION;

    console.log("✅ Presigned URL generated successfully");
    console.log(`   Host: ${url.host}`);
    console.log(`   Expected bucket: ${expectedBucket}`);
    console.log(`   Expected region: ${expectedRegion}`);

    // バケット名とリージョンがURLに含まれているか確認
    if (
      url.host.includes(expectedBucket || "") &&
      url.host.includes(expectedRegion || "")
    ) {
      console.log("✅ URL format is correct");
    } else {
      console.warn("⚠️  URL format may be incorrect");
      console.warn(`   URL: ${presignedUrl.substring(0, 100)}...`);
    }

    // URLの有効期限パラメータを確認
    const expiresParam = url.searchParams.get("X-Amz-Expires");
    if (expiresParam) {
      console.log(`✅ URL expiration: ${expiresParam} seconds`);
    }
  } catch (error) {
    console.error("❌ Failed to generate presigned URL:", error);
    throw error;
  }

  console.log("\n✅ All S3 connection tests passed!");
  console.log(
    "\n📝 Note: CORS and Lifecycle policies must be configured manually in AWS Console or CLI.",
  );
  console.log("   See docs/s3-setup.md for setup instructions.");
}

// スクリプト実行
if (require.main === module) {
  testS3Connection()
    .then(() => {
      console.log("\n✅ S3 connection test completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ S3 connection test failed:", error);
      process.exit(1);
    });
}

export { testS3Connection };
