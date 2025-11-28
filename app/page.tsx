import type { Metadata } from "next";
import { OrganizationCardList } from "@/components/organization/organization-card-list";
import { getOrganizationHierarchy } from "@/lib/organizations/service";

// Supabaseクライアントがcookieを使用するため、動的レンダリングを強制
export const dynamic = "force-dynamic";

/**
 * ページメタデータ設定（SEO最適化）
 *
 * Requirements:
 * - 9.3: ページメタデータを適切に設定
 * - 9.4: Next.js metadata APIを使用
 */
export const metadata: Metadata = {
  title: "部署一覧",
  description: "会社・本部・部署・課／チームの一覧を表示します",
};

/**
 * 組織階層ページ（トップページ）
 *
 * React Server Componentとして組織階層データを取得し、
 * カード内包レイアウトで表示する。
 *
 * Requirements:
 * - 1.1: トップページルート（`/`）にマウント
 * - 1.2: Next.js App Routerの`/app/page.tsx`として実装
 * - 1.3: React Server Componentとして実装、初期データをサーバーサイドで取得
 * - 2.1: 組織階層データを取得
 * - 2.5: エラー時は例外をスロー
 */
export default async function Home() {
  // 組織階層データを取得
  const result = await getOrganizationHierarchy();

  // エラーハンドリング: 失敗時は例外をスロー（Next.js error boundaryでキャッチ）
  if (!result.success) {
    throw new Error(result.error.message);
  }

  // 成功時はOrganizationCardListにデータを渡してレンダリング
  return (
    <main className="container mx-auto px-4 py-8 md:px-6 lg:px-8">
      <div className="mb-10 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          部署一覧
        </h1>
      </div>
      <OrganizationCardList organizations={result.data} />
    </main>
  );
}
