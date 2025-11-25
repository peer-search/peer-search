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
  const { selectedNode, setSelectedNode, allOrganizations } =
    useOrganizationSelection();

  // ツリー構造をフラット配列に変換（parentIdも含む）
  const flatNodes = flattenTree(organizations);

  return (
    <div className="w-full md:w-1/3 border-r overflow-auto">
      {flatNodes.map((node) => {
        // allOrganizationsから完全なノード情報を取得
        const fullNode = allOrganizations.find((org) => org.id === node.id);

        return (
          <OrganizationListItem
            key={node.id}
            node={node}
            isSelected={selectedNode?.id === node.id}
            onSelect={() =>
              setSelectedNode(
                fullNode || {
                  id: node.id,
                  name: node.name,
                  parentId: node.parentId,
                  level: node.level,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              )
            }
          />
        );
      })}
    </div>
  );
}
