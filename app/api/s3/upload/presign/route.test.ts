import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// モックの設定
vi.mock("@/lib/supabase-auth/auth", () => ({
  getUser: vi.fn(),
}));

vi.mock("@/lib/profiles/service", () => ({
  getProfileByUserId: vi.fn(),
}));

vi.mock("@/lib/s3/presigned-url", () => ({
  generatePresignedPutUrl: vi.fn(),
}));

import { getProfileByUserId } from "@/lib/profiles/service";
import { generatePresignedPutUrl } from "@/lib/s3/presigned-url";
import { getUser } from "@/lib/supabase-auth/auth";

describe("POST /api/s3/upload/presign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("認証チェック", () => {
    it("未認証ユーザーに401エラーを返却する", async () => {
      vi.mocked(getUser).mockResolvedValue(null);

      const request = new Request("http://localhost/api/s3/upload/presign", {
        method: "POST",
        body: JSON.stringify({
          fileName: "test.jpg",
          fileType: "image/jpeg",
        }),
      }) as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized. Please sign in.");
    });
  });

  describe("権限チェック", () => {
    it("非管理者ユーザーに403エラーを返却する", async () => {
      vi.mocked(getUser).mockResolvedValue({ id: "user-id" });
      vi.mocked(getProfileByUserId).mockResolvedValue({
        id: "profile-id",
        userId: "user-id",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request("http://localhost/api/s3/upload/presign", {
        method: "POST",
        body: JSON.stringify({
          fileName: "test.jpg",
          fileType: "image/jpeg",
        }),
      }) as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Admin permission required.");
    });
  });

  describe("MIMEタイプバリデーション", () => {
    beforeEach(() => {
      vi.mocked(getUser).mockResolvedValue({ id: "admin-id" });
      vi.mocked(getProfileByUserId).mockResolvedValue({
        id: "profile-id",
        userId: "admin-id",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it("不正なMIMEタイプでリクエストすると400エラーを返却する", async () => {
      const invalidTypes = ["image/bmp", "image/svg+xml", "application/pdf"];

      for (const fileType of invalidTypes) {
        const request = new Request("http://localhost/api/s3/upload/presign", {
          method: "POST",
          body: JSON.stringify({
            fileName: "test.file",
            fileType,
          }),
        }) as NextRequest;

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("Invalid file type");
        expect(data.error).toContain("JPEG, PNG, GIF, WebP");
      }
    });

    it("許可されたMIMEタイプでリクエストすると成功する", async () => {
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

      vi.mocked(generatePresignedPutUrl).mockResolvedValue(
        "https://s3.amazonaws.com/bucket/key?presigned",
      );

      for (const fileType of validTypes) {
        const request = new Request("http://localhost/api/s3/upload/presign", {
          method: "POST",
          body: JSON.stringify({
            fileName: "test.file",
            fileType,
          }),
        }) as NextRequest;

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.uploadUrl).toBeDefined();
        expect(data.s3Key).toBeDefined();
      }
    });
  });

  describe("S3キー生成", () => {
    beforeEach(() => {
      vi.mocked(getUser).mockResolvedValue({ id: "admin-id" });
      vi.mocked(getProfileByUserId).mockResolvedValue({
        id: "profile-id",
        userId: "admin-id",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(generatePresignedPutUrl).mockResolvedValue(
        "https://s3.amazonaws.com/bucket/key?presigned",
      );
    });

    it("S3キーがemployee-photos/{uuid}.{ext}形式で生成される", async () => {
      const request = new Request("http://localhost/api/s3/upload/presign", {
        method: "POST",
        body: JSON.stringify({
          fileName: "my-photo.jpg",
          fileType: "image/jpeg",
        }),
      }) as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.s3Key).toMatch(/^employee-photos\/[a-f0-9-]{36}\.jpg$/);
    });

    it("MIMEタイプから正しい拡張子にマッピングされる", async () => {
      const testCases = [
        { fileType: "image/jpeg", expectedExt: "jpg" },
        { fileType: "image/png", expectedExt: "png" },
        { fileType: "image/gif", expectedExt: "gif" },
        { fileType: "image/webp", expectedExt: "webp" },
      ];

      for (const { fileType, expectedExt } of testCases) {
        const request = new Request("http://localhost/api/s3/upload/presign", {
          method: "POST",
          body: JSON.stringify({
            fileName: "test.file",
            fileType,
          }),
        }) as NextRequest;

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.s3Key).toMatch(
          new RegExp(`^employee-photos/[a-f0-9-]{36}\\.${expectedExt}$`),
        );
      }
    });
  });

  describe("Presigned URL生成", () => {
    beforeEach(() => {
      vi.mocked(getUser).mockResolvedValue({ id: "admin-id" });
      vi.mocked(getProfileByUserId).mockResolvedValue({
        id: "profile-id",
        userId: "admin-id",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it("生成されたPresigned URLとS3キーを返却する", async () => {
      const mockPresignedUrl = "https://s3.amazonaws.com/bucket/key?presigned";
      vi.mocked(generatePresignedPutUrl).mockResolvedValue(mockPresignedUrl);

      const request = new Request("http://localhost/api/s3/upload/presign", {
        method: "POST",
        body: JSON.stringify({
          fileName: "test.jpg",
          fileType: "image/jpeg",
        }),
      }) as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.uploadUrl).toBe(mockPresignedUrl);
      expect(data.s3Key).toMatch(/^employee-photos\/[a-f0-9-]{36}\.jpg$/);
    });

    it("generatePresignedPutUrlにContentTypeを渡す", async () => {
      vi.mocked(generatePresignedPutUrl).mockResolvedValue(
        "https://s3.amazonaws.com/bucket/key?presigned",
      );

      const request = new Request("http://localhost/api/s3/upload/presign", {
        method: "POST",
        body: JSON.stringify({
          fileName: "test.png",
          fileType: "image/png",
        }),
      }) as NextRequest;

      await POST(request);

      expect(generatePresignedPutUrl).toHaveBeenCalledWith(
        expect.stringMatching(/^employee-photos\/[a-f0-9-]{36}\.png$/),
        "image/png",
        3600,
      );
    });
  });

  describe("エラーハンドリング", () => {
    beforeEach(() => {
      vi.mocked(getUser).mockResolvedValue({ id: "admin-id" });
      vi.mocked(getProfileByUserId).mockResolvedValue({
        id: "profile-id",
        userId: "admin-id",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it("fileName未指定で400エラーを返却する", async () => {
      const request = new Request("http://localhost/api/s3/upload/presign", {
        method: "POST",
        body: JSON.stringify({
          fileType: "image/jpeg",
        }),
      }) as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("fileName");
    });

    it("fileType未指定で400エラーを返却する", async () => {
      const request = new Request("http://localhost/api/s3/upload/presign", {
        method: "POST",
        body: JSON.stringify({
          fileName: "test.jpg",
        }),
      }) as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("fileType");
    });

    it("Presigned URL生成失敗時に500エラーを返却する", async () => {
      vi.mocked(generatePresignedPutUrl).mockRejectedValue(
        new Error("S3 error"),
      );

      const request = new Request("http://localhost/api/s3/upload/presign", {
        method: "POST",
        body: JSON.stringify({
          fileName: "test.jpg",
          fileType: "image/jpeg",
        }),
      }) as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to generate presigned URL");
      expect(data.details).toBeDefined();
    });
  });
});
