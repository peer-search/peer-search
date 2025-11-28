import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetS3Client } from "./client";
import {
  generatePresignedGetUrl,
  generatePresignedPutUrl,
} from "./presigned-url";

// AWS SDKのモック
vi.mock("@aws-sdk/client-s3");
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi
    .fn()
    .mockResolvedValue("https://mock-presigned-url.com/key?signature=abc"),
}));

describe("Presigned URL Generation", () => {
  beforeEach(() => {
    // 各テストの前にS3クライアントをリセット
    resetS3Client();

    // 環境変数の設定
    process.env.S3_BUCKET_NAME = "test-bucket";
    process.env.AWS_REGION = "ap-northeast-1";
    process.env.AWS_ACCESS_KEY_ID = "test-access-key";
    process.env.AWS_SECRET_ACCESS_KEY = "test-secret-key";
  });

  describe("generatePresignedGetUrl", () => {
    it("有効なキーでPresigned URLを生成できる", async () => {
      const key = "employees/photos/test.jpg";
      const url = await generatePresignedGetUrl(key);

      expect(url).toBe("https://mock-presigned-url.com/key?signature=abc");
    });

    it("空のキーでエラーをスローする", async () => {
      await expect(generatePresignedGetUrl("")).rejects.toThrow(
        "S3 object key is required",
      );
    });

    it("S3_BUCKET_NAME環境変数がない場合エラーをスローする", async () => {
      delete process.env.S3_BUCKET_NAME;

      await expect(
        generatePresignedGetUrl("employees/photos/test.jpg"),
      ).rejects.toThrow("S3_BUCKET_NAME environment variable is required");
    });

    it("カスタム有効期限を設定できる", async () => {
      const key = "employees/photos/test.jpg";
      const expiresIn = 7200; // 2時間

      const url = await generatePresignedGetUrl(key, expiresIn);

      expect(url).toBeDefined();
      expect(typeof url).toBe("string");
    });
  });

  describe("generatePresignedPutUrl", () => {
    it("有効なキーとContent-TypeでPresigned URLを生成できる", async () => {
      const key = "employees/photos/test.jpg";
      const contentType = "image/jpeg";

      const url = await generatePresignedPutUrl(key, contentType);

      expect(url).toBe("https://mock-presigned-url.com/key?signature=abc");
    });

    it("空のキーでエラーをスローする", async () => {
      await expect(generatePresignedPutUrl("", "image/jpeg")).rejects.toThrow(
        "S3 object key is required",
      );
    });

    it("Content-Typeが指定されていない場合エラーをスローする", async () => {
      await expect(
        generatePresignedPutUrl("employees/photos/test.jpg", ""),
      ).rejects.toThrow("Content type is required");
    });

    it("S3_BUCKET_NAME環境変数がない場合エラーをスローする", async () => {
      delete process.env.S3_BUCKET_NAME;

      await expect(
        generatePresignedPutUrl("employees/photos/test.jpg", "image/jpeg"),
      ).rejects.toThrow("S3_BUCKET_NAME environment variable is required");
    });

    it("カスタム有効期限を設定できる", async () => {
      const key = "employees/photos/test.jpg";
      const contentType = "image/jpeg";
      const expiresIn = 1800; // 30分

      const url = await generatePresignedPutUrl(key, contentType, expiresIn);

      expect(url).toBeDefined();
      expect(typeof url).toBe("string");
    });
  });
});
