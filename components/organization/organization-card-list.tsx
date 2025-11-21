import type React from "react";
import type { OrganizationTree } from "@/lib/organizations/types";
import { OrganizationCard } from "./organization-card";

/**
 * 組織カードリストコンポーネントのProps
 */
export interface OrganizationCardListProps {
  /** 組織階層ツリーデータ */
  organizations: OrganizationTree[];
}

/**
 * 組織カードリストコンポーネント
 *
 * 組織階層ツリーを受け取り、カード内包レイアウトでレンダリングする。
 * 再帰的に子ノードをレンダリングし、レスポンシブグリッドレイアウトを提供する。
 *
 * Requirements:
 * - 3.2: カード内包レイアウトで階層表示
 * - 3.3: 各ノードをOrganizationCardとしてレンダリング
 * - 3.5: Tailwind CSSでレスポンシブレイアウト
 * - 3.6: 社員カードを表示しない（組織階層ノードのみ）
 * - 8.1, 8.2, 8.3, 8.4: レスポンシブデザイン（モバイル・タブレット・デスクトップ）
 */
export function OrganizationCardList({
  organizations,
}: OrganizationCardListProps) {
  // 空配列の場合は空状態メッセージを表示
  if (!organizations || organizations.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">組織データがありません</p>
      </div>
    );
  }

  // 子ノードを再帰的にレンダリングする関数
  const renderChildren = (children: OrganizationTree[]): React.ReactNode => {
    return <OrganizationCardList organizations={children} />;
  };

  return (
    <div
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
      data-testid="organization-card-list"
    >
      {organizations.map((org) => (
        <OrganizationCard
          key={org.id}
          node={org}
          renderChildren={renderChildren}
        />
      ))}
    </div>
  );
}
