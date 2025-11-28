"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  deleteOrganizationAction,
  getDescendantCountAction,
} from "@/lib/organizations/actions";
import type { OrganizationFlatNode } from "@/lib/organizations/types";

interface DeleteOrganizationDialogProps {
  node: OrganizationFlatNode;
}

/**
 * 組織削除確認ダイアログコンポーネント
 * 削除確認ダイアログ、子ノード警告表示
 */
export function DeleteOrganizationDialog({
  node,
}: DeleteOrganizationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [descendantCount, setDescendantCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  // ダイアログが開かれたときに子孫ノード数を取得
  useEffect(() => {
    if (isOpen) {
      getDescendantCountAction(node.id).then(setDescendantCount);
    }
  }, [isOpen, node.id]);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteOrganizationAction(node.id);

      if (result.success) {
        setIsOpen(false);
      } else {
        alert(result.error || "削除に失敗しました");
      }
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive">
          削除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>組織を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {descendantCount > 0 && (
              <span className="text-red-600 font-bold block">
                このノードには{descendantCount}
                個の子部署が存在します。すべて削除されます。
              </span>
            )}
            <span className="block">この操作は取り消せません。</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending}>
            {isPending ? "削除中..." : "削除する"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
