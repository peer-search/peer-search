"use client";

import { useState, useTransition } from "react";
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
import { updateOrganizationAction } from "@/lib/organizations/actions";
import type { OrganizationFlatNode } from "@/lib/organizations/types";
import { DeleteOrganizationDialog } from "./delete-organization-dialog";

interface OrganizationEditFormProps {
  node: OrganizationFlatNode;
}

/**
 * 組織編集フォームコンポーネント
 * 名称・親組織の編集フォーム、バリデーション、Server Action呼び出し
 */
export function OrganizationEditForm({ node }: OrganizationEditFormProps) {
  const [name, setName] = useState(node.name);
  const [parentId, setParentId] = useState<string | null>(node.parentId);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      const result = await updateOrganizationAction({
        id: node.id,
        name,
        parentId,
      });

      if (!result.success) {
        setError(result.error || "更新に失敗しました");
      }
    });
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
            {/* TODO: Add available parent options excluding self and descendants */}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "更新中..." : "更新"}
        </Button>
        <DeleteOrganizationDialog node={node} />
      </div>
    </form>
  );
}
