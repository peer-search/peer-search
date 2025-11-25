"use client";

import { Button } from "@/components/ui/button";
import { useOrganizationSelection } from "./organization-context";
import { OrganizationEditForm } from "./organization-edit-form";

/**
 * 組織編集パネルコンポーネント
 * 選択された組織ノードの詳細編集フォームを表示
 * 未選択時は選択を促すメッセージと追加ボタンを表示
 */
export function OrganizationEditPanel() {
  const { selectedNode, allOrganizations, isAddMode, setIsAddMode } =
    useOrganizationSelection();

  // 追加モードかつ選択なしの場合は、新規追加フォームを表示
  if (isAddMode && !selectedNode) {
    return (
      <div className="flex-1 p-6">
        <OrganizationEditForm
          mode="create"
          allOrganizations={allOrganizations}
        />
      </div>
    );
  }

  // 選択なしかつ通常モードの場合は、選択を促すメッセージと追加ボタンを表示
  if (!selectedNode) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">組織を選択してください</p>
        <Button onClick={() => setIsAddMode(true)} variant="default" size="lg">
          新規追加
        </Button>
      </div>
    );
  }

  // 選択ありの場合は、編集フォームを表示
  return (
    <div className="flex-1 p-6">
      <OrganizationEditForm
        mode="edit"
        node={selectedNode}
        allOrganizations={allOrganizations}
      />
    </div>
  );
}
