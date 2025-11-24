"use client";

import Image from "next/image";
import { usePresignedUrl } from "@/lib/s3/use-presigned-url";

type Props = {
  s3Key: string | null;
};

export function EmployeeDetailPhoto({ s3Key }: Props) {
  const { url, isLoading } = usePresignedUrl(s3Key);

  return (
    <div className="w-full max-w-md">
      <div className="relative aspect-[3/4] bg-white flex items-center justify-center overflow-hidden rounded-lg shadow-md">
        {isLoading ? (
          <div
            data-testid="photo-skeleton"
            className="animate-pulse bg-gray-200 w-full h-full"
          />
        ) : (
          <Image
            src={url || "/placeholder-avatar.svg"}
            alt="社員写真"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        )}
      </div>
    </div>
  );
}
