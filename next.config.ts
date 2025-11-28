import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 画像最適化設定
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400, // 24時間（1日）
    remotePatterns: [
      // AWS S3
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      // CloudFront CDN（環境変数で設定されている場合）
      ...(process.env.CLOUDFRONT_DOMAIN
        ? [
            {
              protocol: "https" as const,
              hostname: process.env.CLOUDFRONT_DOMAIN,
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
