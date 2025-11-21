import Link from "next/link";
import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrganizationTree } from "@/lib/organizations/types";

/**
 * 組織カードコンポーネントのProps
 */
export interface OrganizationCardProps {
  /** 組織ノードデータ */
  node: OrganizationTree;
  /** 子ノードのレンダリング関数（再帰的なレンダリング用） */
  renderChildren?: (children: OrganizationTree[]) => React.ReactNode;
}

/**
 * 組織カードコンポーネント
 *
 * 単一の組織ノードをカードとして表示し、クリック時に社員一覧画面へ遷移する。
 *
 * Requirements:
 * - 3.1: shadcn/ui Cardコンポーネントを使用
 * - 3.3: 組織名を表示
 * - 3.4: クリック可能なインタラクティブ要素
 * - 4.1, 4.2, 4.3: Next.js Linkで/employees?org_id={node.id}へ遷移
 * - 5.1, 5.2: ホバー・フォーカスのスタイル
 * - 5.3, 5.4: ARIA属性とキーボードアクセシビリティ
 */
export function OrganizationCard({
  node,
  renderChildren,
}: OrganizationCardProps) {
  const hasChildren = node.children && node.children.length > 0;

  return (
    <Card
      className="flex min-h-fit flex-col transition-all hover:shadow-lg focus-within:outline focus-within:outline-2 focus-within:outline-primary"
      data-testid={`org-card-${node.id}`}
    >
      <Link
        href={`/employees?org_id=${node.id}`}
        className="block focus:outline-none"
        aria-label={`${node.name}の社員一覧を表示`}
      >
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">{node.name}</CardTitle>
        </CardHeader>
      </Link>

      {hasChildren && renderChildren && (
        <CardContent className="flex-1 space-y-3 pt-2">
          {renderChildren(node.children)}
        </CardContent>
      )}
    </Card>
  );
}
