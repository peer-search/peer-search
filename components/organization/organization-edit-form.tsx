"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createOrganizationAction,
  updateOrganizationAction,
} from "@/lib/organizations/actions";
import type { OrganizationFlatNode } from "@/lib/organizations/types";
import { DeleteOrganizationDialog } from "./delete-organization-dialog";
import { useOrganizationSelection } from "./organization-context";

interface OrganizationEditFormProps {
  mode: "create" | "edit";
  node?: OrganizationFlatNode;
  allOrganizations: OrganizationFlatNode[];
}

/**
 * 組織編集フォームコンポーネント
 * 名称・親組織の編集フォーム、バリデーション、Server Action呼び出し
 */
export function OrganizationEditForm({
  mode,
  node,
  allOrganizations,
}: OrganizationEditFormProps) {
  const { setIsAddMode, setSelectedNode } = useOrganizationSelection();
  const [name, setName] = useState(mode === "edit" && node ? node.name : "");
  const [parentId, setParentId] = useState<string | null>(
    mode === "edit" && node ? node.parentId : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // nodeが変更されたときにフォームの状態を同期（編集モード時のみ）
  useEffect(() => {
    if (mode === "edit" && node) {
      setName(node.name);
      setParentId(node.parentId);
      setError(null);
    }
  }, [mode, node]);

  // 子孫ノードのIDを取得（自分自身と子孫を親組織として選択できないようにする）
  // BFS（幅優先探索）で全子孫を探索（編集モード時のみ）
  const descendantIds = useMemo(() => {
    if (mode === "create" || !node) {
      return new Set<string>();
    }

    const descendants = new Set<string>();
    const queue = [node.id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) break;
      descendants.add(currentId); // 自分自身も含める

      // この組織を親とする子組織を探す
      const children = allOrganizations.filter(
        (org) => org.parentId === currentId,
      );

      queue.push(...children.map((child) => child.id));
    }

    return descendants;
  }, [mode, node, allOrganizations]);

  // 利用可能な親組織のリスト（自分自身と子孫を除外）
  const availableParents = useMemo(() => {
    return allOrganizations.filter((org) => !descendantIds.has(org.id));
  }, [allOrganizations, descendantIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // クライアントサイドバリデーション
    if (!name.trim()) {
      setError("名称は必須です");
      return;
    }
    if (name.length > 255) {
      setError("名称は255文字以内で入力してください");
      return;
    }

    // Server Action呼び出し
    startTransition(async () => {
      if (mode === "create") {
        // 新規追加
        const result = await createOrganizationAction({
          name,
          parentId,
        });

        if (result.success) {
          // 追加成功後、追加モードを解除
          setIsAddMode(false);
          // フォームをリセット
          setName("");
          setParentId(null);
        } else {
          setError(result.error || "追加に失敗しました");
        }
      } else if (node) {
        // 編集
        const result = await updateOrganizationAction({
          id: node.id,
          name,
          parentId,
        });

        if (!result.success) {
          setError(result.error || "更新に失敗しました");
        }
      }
    });
  };

  const handleCancel = () => {
    if (mode === "create") {
      // 追加モードを解除してフォームをリセット
      setIsAddMode(false);
      setName("");
      setParentId(null);
      setError(null);
    } else {
      // 編集モードの場合は選択を解除
      setSelectedNode(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">名称</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1"
          maxLength={255}
          disabled={isPending}
          placeholder="組織名を入力してください"
        />
      </div>

      <div>
        <Label htmlFor="parentId">親組織</Label>
        <Select
          value={parentId || "__none__"}
          onValueChange={(value) =>
            setParentId(value === "__none__" ? null : value)
          }
          disabled={isPending}
        >
          <SelectTrigger id="parentId" className="mt-1">
            <SelectValue placeholder="なし（ルート組織）" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">なし（ルート組織）</SelectItem>
            {availableParents.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {"　".repeat(org.level - 1)}
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? mode === "create"
              ? "追加中..."
              : "更新中..."
            : mode === "create"
              ? "追加"
              : "更新"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isPending}
        >
          キャンセル
        </Button>
        {mode === "edit" && node && <DeleteOrganizationDialog node={node} />}
      </div>
    </form>
  );
}
