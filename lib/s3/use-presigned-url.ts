"use client";

import { useEffect, useState } from "react";

interface UsePresignedUrlResult {
  url: string | null;
  loading: boolean;
  error: Error | null;
}

/**
 * S3オブジェクトのPresigned URLを取得するカスタムフック
 *
 * @param s3Key - S3オブジェクトキー（nullの場合はリクエストをスキップ）
 * @returns { url, loading, error } - Presigned URL、ローディング状態、エラー
 *
 * @example
 * ```tsx
 * const { url, loading, error } = usePresignedUrl(employee.photoS3Key);
 *
 * if (loading) return <Skeleton />;
 * if (error) return <PlaceholderImage />;
 * return <img src={url || "/placeholder.svg"} />;
 * ```
 */
export function usePresignedUrl(s3Key: string | null): UsePresignedUrlResult {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // s3Keyがnullまたは空の場合は早期リターン
    if (!s3Key) {
      setUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;

    async function fetchPresignedUrl() {
      try {
        const response = await fetch("/api/s3/presign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ s3Key }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              `Failed to fetch presigned URL: ${response.statusText}`,
          );
        }

        const data = await response.json();

        if (isMounted) {
          setUrl(data.url);
          setError(null);
        }
      } catch (err) {
        console.error("Error fetching presigned URL:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
          setUrl(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchPresignedUrl();

    // クリーンアップ関数
    return () => {
      isMounted = false;
    };
  }, [s3Key]);

  return { url, loading, error };
}
