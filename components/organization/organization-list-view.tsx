"use client";

import { flattenTree } from "@/lib/organizations/tree";
import type { OrganizationTree } from "@/lib/organizations/types";
import { useOrganizationSelection } from "./organization-context";
import { OrganizationListItem } from "./organization-list-item";

interface OrganizationListViewProps {
  organizations: OrganizationTree[];
}

/**
 * 組織階層リストビューコンポーネント
 * ツリー構造をフラット配列に変換し、階層インデント表示を実現
 */
export function OrganizationListView({
  organizations,
}: OrganizationListViewProps) {
  const { selectedNode, setSelectedNode } = useOrganizationSelection();

  // ツリー構造をフラット配列に変換
  const flatNodes = flattenTree(organizations);

  return (
    <div className="w-full md:w-1/3 border-r overflow-auto">
      {flatNodes.map((node) => (
        <OrganizationListItem
          key={node.id}
          node={node}
          isSelected={selectedNode?.id === node.id}
          onSelect={() =>
            setSelectedNode({
              id: node.id,
              name: node.name,
              parentId: null, // TODO: Calculate parentId from tree structure
              level: node.level,
              createdAt: new Date(), // TODO: Get from actual data
              updatedAt: new Date(), // TODO: Get from actual data
            })
          }
        />
      ))}
    </div>
  );
}
