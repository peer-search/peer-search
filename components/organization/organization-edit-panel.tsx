"use client";

import { useOrganizationSelection } from "./organization-context";
import { OrganizationEditForm } from "./organization-edit-form";

/**
 * 組織編集パネルコンポーネント
 * 選択された組織ノードの詳細編集フォームを表示
 * 未選択時は選択を促すメッセージを表示
 */
export function OrganizationEditPanel() {
  const { selectedNode, allOrganizations } = useOrganizationSelection();

  if (!selectedNode) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">組織を選択してください</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <OrganizationEditForm
        node={selectedNode}
        allOrganizations={allOrganizations}
      />
    </div>
  );
}
