import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getS3Client, resetS3Client } from "./client";
import { deleteS3Object } from "./delete";

// S3Clientのsendメソッドをモック
const mockSend = vi.fn();

// clientモジュールのgetS3Clientをモック
vi.mock("./client", async () => {
  const actual = await vi.importActual<typeof import("./client")>("./client");
  return {
    ...actual,
    getS3Client: vi.fn(() => ({
      send: mockSend,
    })),
  };
});

describe("deleteS3Object", () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    mockSend.mockReset();
    resetS3Client();

    // 環境変数の設定
    process.env.S3_BUCKET_NAME = "test-bucket";
    process.env.AWS_REGION = "ap-northeast-1";
    process.env.AWS_ACCESS_KEY_ID = "test-access-key";
    process.env.AWS_SECRET_ACCESS_KEY = "test-secret-key";

    // console.errorをモック（エラーログのテスト用）
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("正常削除時にtrueを返す", async () => {
    // DeleteObjectCommandが成功するようにモック
    mockSend.mockResolvedValue({});

    const result = await deleteS3Object("employee-photos/test.jpg");

    expect(result).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
  });

  it("S3エラー時にfalseを返し、エラーログを記録する", async () => {
    // DeleteObjectCommandが失敗するようにモック
    const mockError = new Error("AccessDenied");
    mockSend.mockRejectedValue(mockError);

    const result = await deleteS3Object("employee-photos/test.jpg");

    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      "Failed to delete S3 object:",
      "employee-photos/test.jpg",
      mockError,
    );
  });

  it("例外をスローしない（エラー時もfalseを返す）", async () => {
    // DeleteObjectCommandが失敗するようにモック
    mockSend.mockRejectedValue(new Error("Network error"));

    await expect(deleteS3Object("employee-photos/test.jpg")).resolves.toBe(
      false,
    );
  });

  it("空のキーでfalseを返す", async () => {
    const result = await deleteS3Object("");

    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      "S3 object key is required for deletion",
    );
  });

  it("S3_BUCKET_NAME環境変数がない場合falseを返す", async () => {
    delete process.env.S3_BUCKET_NAME;

    const result = await deleteS3Object("employee-photos/test.jpg");

    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      "S3_BUCKET_NAME environment variable is required",
    );
  });

  it("削除コマンドに正しいパラメータを渡す", async () => {
    mockSend.mockResolvedValue({});

    const s3Key = "employee-photos/abc123.jpg";
    await deleteS3Object(s3Key);

    const deleteCommand = mockSend.mock.calls[0][0] as DeleteObjectCommand;
    expect(deleteCommand.input.Bucket).toBe("test-bucket");
    expect(deleteCommand.input.Key).toBe(s3Key);
  });
});
