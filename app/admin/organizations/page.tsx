import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrganizationProvider } from "@/components/organization/organization-context";
import { OrganizationEditPanel } from "@/components/organization/organization-edit-panel";
import { OrganizationListView } from "@/components/organization/organization-list-view";
import { db } from "@/db";
import { getOrganizationHierarchy } from "@/lib/organizations/service";
import { getProfileByUserId } from "@/lib/profiles/service";
import { getUser } from "@/lib/supabase-auth/auth";

/**
 * 組織管理ページのメタデータ
 */
export const metadata: Metadata = {
  title: "組織管理 | Peer Search",
  robots: "noindex, nofollow",
};

/**
 * 管理者専用組織管理ページ
 *
 * @returns 組織管理ページコンポーネント
 */
export default async function AdminOrganizationsPage() {
  // 1. 認証チェック
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  // 2. 管理者権限チェック
  const profile = await getProfileByUserId(user.id);
  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden");
  }

  // 3. 組織階層データ取得
  const result = await getOrganizationHierarchy();

  if (!result.success) {
    throw new Error(result.error.message);
  }

  const organizations = result.data;

  // 4. 全組織のフラットリストを取得（createdAt, updatedAt付き）
  const dbOrganizations = await db.query.organizations.findMany({
    orderBy: (organizations, { asc }) => [asc(organizations.level)],
    columns: {
      id: true,
      name: true,
      parentId: true,
      level: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // OrganizationFlatNode型に明示的に変換
  const allOrganizations = dbOrganizations.map((org) => ({
    id: org.id,
    name: org.name,
    parentId: org.parentId,
    level: org.level,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  }));

  // 5. レイアウトレンダリング
  return (
    <OrganizationProvider allOrganizations={allOrganizations}>
      <div className="flex flex-col md:flex-row h-screen overflow-hidden">
        {/* 左側: 組織リストビュー
            - モバイル (<768px): 画面全体に表示（縦方向）
            - タブレット (768px-1024px): 40%幅
            - デスクトップ (>=1024px): 30%幅
        */}
        <div className="w-full md:w-2/5 lg:w-[30%] md:border-r overflow-auto">
          <OrganizationListView organizations={organizations} />
        </div>

        {/* 右側: 編集パネル
            - モバイル (<768px): Sheetで表示（OrganizationEditPanelで制御）
            - タブレット (768px-1024px): 60%幅
            - デスクトップ (>=1024px): 70%幅
        */}
        <div className="w-full md:flex-1 p-6 overflow-auto">
          <OrganizationEditPanel />
        </div>
      </div>
    </OrganizationProvider>
  );
}
