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
    <div className="flex flex-col md:flex-row h-screen">
      <OrganizationProvider allOrganizations={allOrganizations}>
        <div className="flex flex-col md:flex-row flex-1">
          <div className="w-full md:w-1/3 border-r overflow-auto">
            <OrganizationListView organizations={organizations} />
          </div>
          <div className="flex-1 p-6">
            <OrganizationEditPanel />
          </div>
        </div>
      </OrganizationProvider>
    </div>
  );
}
