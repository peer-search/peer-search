import { type NextRequest, NextResponse } from "next/server";
import {
  ALLOWED_PHOTO_MIME_TYPES,
  type AllowedPhotoMimeType,
  MIME_TO_EXTENSION,
} from "@/lib/employees/validation";
import { getProfileByUserId } from "@/lib/profiles/service";
import { generatePresignedPutUrl } from "@/lib/s3/presigned-url";
import { getUser } from "@/lib/supabase-auth/auth";

/**
 * S3へのアップロード用Presigned PUT URLを発行するAPIエンドポイント
 *
 * @route POST /api/s3/upload/presign
 * @body { fileName: string, fileType: string } - ファイル名とMIMEタイプ
 * @returns { uploadUrl: string, s3Key: string } - Presigned PUT URLとS3オブジェクトキー
 * @throws 401 - 認証されていない場合
 * @throws 403 - 管理者権限がない場合
 * @throws 400 - リクエストが不正な場合（必須パラメータ欠如、不正なMIMEタイプ）
 * @throws 500 - Presigned URL生成に失敗した場合
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 },
      );
    }

    // 権限チェック（管理者のみ）
    const profile = await getProfileByUserId(user.id);
    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admin permission required." },
        { status: 403 },
      );
    }

    // リクエストボディの解析
    const body = await request.json();
    const { fileName, fileType } = body;

    // 入力バリデーション - 必須パラメータ
    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json(
        { error: "fileName is required and must be a string" },
        { status: 400 },
      );
    }

    if (!fileType || typeof fileType !== "string") {
      return NextResponse.json(
        { error: "fileType is required and must be a string" },
        { status: 400 },
      );
    }

    // MIMEタイプホワイトリスト検証
    if (!ALLOWED_PHOTO_MIME_TYPES.includes(fileType as AllowedPhotoMimeType)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, GIF, WebP formats are allowed.",
        },
        { status: 400 },
      );
    }

    // S3キー生成（employee-photos/{uuid}.{ext}形式）
    const uuid = crypto.randomUUID();
    const extension = MIME_TO_EXTENSION[fileType as AllowedPhotoMimeType];
    const s3Key = `employee-photos/${uuid}.${extension}`;

    // Presigned PUT URL生成（有効期限1時間 = 3600秒）
    const uploadUrl = await generatePresignedPutUrl(s3Key, fileType, 3600);

    return NextResponse.json({ uploadUrl, s3Key });
  } catch (error) {
    console.error("Error generating presigned upload URL:", error);

    return NextResponse.json(
      {
        error: "Failed to generate presigned URL",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
