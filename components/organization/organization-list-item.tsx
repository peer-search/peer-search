"use client";

import { cn } from "@/lib/utils";

interface OrganizationListItemProps {
  node: {
    id: string;
    name: string;
    level: number;
  };
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * 個別組織リストアイテムコンポーネント
 * 階層レベルに応じたインデント表示、選択状態のハイライトを実現
 */
export function OrganizationListItem({
  node,
  isSelected,
  onSelect,
}: OrganizationListItemProps) {
  // 階層レベルに応じたインデント（level * 20px）
  const indentStyle = { paddingLeft: `${node.level * 20}px` };

  return (
    <button
      type="button"
      className={cn(
        "w-full text-left px-4 py-2 cursor-pointer hover:bg-gray-100",
        isSelected && "bg-blue-100 border-l-4 border-blue-500",
      )}
      style={indentStyle}
      onClick={onSelect}
    >
      <span>{node.name}</span>
    </button>
  );
}
