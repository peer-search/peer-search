import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getS3Url } from "./url";

describe("getS3Url", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 環境変数をリセット
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // 環境変数を元に戻す
    process.env = originalEnv;
  });

  it("CloudFrontドメインが設定されている場合、CloudFront URLを生成する", () => {
    process.env.CLOUDFRONT_DOMAIN = "d123456789.cloudfront.net";
    process.env.S3_BUCKET_NAME = "test-bucket";
    process.env.AWS_REGION = "ap-northeast-1";

    const url = getS3Url("employees/photos/test.jpg");

    expect(url).toBe(
      "https://d123456789.cloudfront.net/employees/photos/test.jpg",
    );
  });

  it("CloudFrontドメインが未設定の場合、S3直接URLを生成する", () => {
    process.env.CLOUDFRONT_DOMAIN = undefined;
    process.env.S3_BUCKET_NAME = "test-bucket";
    process.env.AWS_REGION = "ap-northeast-1";

    const url = getS3Url("employees/photos/test.jpg");

    expect(url).toBe(
      "https://test-bucket.s3.ap-northeast-1.amazonaws.com/employees/photos/test.jpg",
    );
  });

  it("空文字列のkeyが渡された場合、エラーをスローする", () => {
    process.env.S3_BUCKET_NAME = "test-bucket";
    process.env.AWS_REGION = "ap-northeast-1";

    expect(() => getS3Url("")).toThrow("S3 object key cannot be empty");
  });

  it("S3_BUCKET_NAMEが未設定の場合、エラーをスローする", () => {
    process.env.S3_BUCKET_NAME = undefined;
    process.env.AWS_REGION = "ap-northeast-1";

    expect(() => getS3Url("employees/photos/test.jpg")).toThrow(
      "S3_BUCKET_NAME environment variable is not set",
    );
  });

  it("AWS_REGIONが未設定の場合、エラーをスローする", () => {
    process.env.S3_BUCKET_NAME = "test-bucket";
    process.env.AWS_REGION = undefined;

    expect(() => getS3Url("employees/photos/test.jpg")).toThrow(
      "AWS_REGION environment variable is not set",
    );
  });
});
