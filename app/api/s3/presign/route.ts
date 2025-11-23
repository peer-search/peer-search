import { type NextRequest, NextResponse } from "next/server";
import { generatePresignedGetUrl } from "@/lib/s3/presigned-url";
import { getUser } from "@/lib/supabase-auth/auth";

/**
 * S3オブジェクトへのPresigned URLを発行するAPIエンドポイント
 *
 * @route POST /api/s3/presign
 * @body { s3Key: string } - S3オブジェクトキー
 * @returns { url: string } - Presigned URL（1時間有効）
 * @throws 401 - 認証されていない場合
 * @throws 400 - s3Keyが指定されていない場合
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

    // リクエストボディの解析
    const body = await request.json();
    const { s3Key } = body;

    // 入力バリデーション
    if (!s3Key || typeof s3Key !== "string") {
      return NextResponse.json(
        { error: "s3Key is required and must be a string" },
        { status: 400 },
      );
    }

    // Presigned URL生成
    const presignedUrl = await generatePresignedGetUrl(s3Key);

    return NextResponse.json({ url: presignedUrl });
  } catch (error) {
    console.error("Error generating presigned URL:", error);

    return NextResponse.json(
      {
        error: "Failed to generate presigned URL",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
