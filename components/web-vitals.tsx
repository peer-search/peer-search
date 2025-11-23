"use client";

import { useReportWebVitals } from "next/web-vitals";

/**
 * Web Vitalsレポーティングコンポーネント
 *
 * Next.jsのuseReportWebVitalsフックを使用して、
 * Core Web Vitalsをブラウザコンソールに出力します。
 *
 * 計測される指標:
 * - CLS (Cumulative Layout Shift)
 * - FID (First Input Delay)
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - TTFB (Time to First Byte)
 * - INP (Interaction to Next Paint)
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    // コンソールにWeb Vitalsを出力
    const { name, value } = metric;

    // 値を読みやすい形式に変換
    const displayValue =
      name === "CLS"
        ? value.toFixed(4) // CLSは小数点
        : `${Math.round(value)}ms`; // その他はミリ秒

    // 要件11.1: FCP 2秒以内の判定
    if (name === "FCP") {
      if (value > 2000) {
        console.warn(
          `[Web Vitals] ${name}: ${displayValue} ⚠️ 要件11.1を満たしていません (目標: < 2000ms)`,
        );
      } else {
        console.log(
          `[Web Vitals] ${name}: ${displayValue} ✅ 要件11.1を満たしています`,
        );
      }
      return;
    }

    // その他のメトリクスも出力
    console.log(`[Web Vitals] ${name}: ${displayValue}`);

    // 本番環境では外部サービスに送信することを推奨
    // 例: Google Analytics, Vercel Analytics, Sentryなど
    if (process.env.NODE_ENV === "production") {
      // TODO: 外部サービスへの送信実装
      // sendToAnalytics({ name, value, ...metric });
    }
  });

  return null; // このコンポーネントは何もレンダリングしない
}
