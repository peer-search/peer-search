"use client";

import Image from "next/image";
import { usePresignedUrl } from "@/lib/s3/use-presigned-url";

interface EmployeePhotoProps {
  photoS3Key: string | null;
  nameKanji: string;
}

/**
 * 社員写真コンポーネント（Client Component）
 * Presigned URLを使用してS3から画像を取得
 */
export function EmployeePhoto({ photoS3Key, nameKanji }: EmployeePhotoProps) {
  // Presigned URLを取得
  const { url: presignedUrl, loading } = usePresignedUrl(photoS3Key);

  // 表示するURLを決定（エラー時またはURLがない場合はプレースホルダー）
  const photoUrl = presignedUrl || "/placeholder-avatar.svg";

  return (
    <div
      className="relative w-16 flex-shrink-0 overflow-hidden rounded bg-gray-100"
      style={{ aspectRatio: "3/4" }}
    >
      {loading && photoS3Key ? (
        <div className="w-full h-full bg-gray-200 animate-pulse" />
      ) : (
        <Image
          src={photoUrl}
          alt={`${nameKanji}の写真`}
          fill
          className="object-cover"
          sizes="64px"
          loading="lazy"
          quality={75}
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+"
        />
      )}
    </div>
  );
}
