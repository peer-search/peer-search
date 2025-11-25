"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { getProfileByUserId } from "@/lib/profiles/service";
import { getUser } from "@/lib/supabase-auth/auth";
import type {
  ActionResult,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from "./types";

/**
 * 管理者権限チェック（共通ヘルパー）
 * @throws {Error} Unauthorized - 未認証の場合
 * @throws {Error} Forbidden - 管理者権限がない場合
 */
export async function checkAdminPermission(): Promise<void> {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden");
  }
}

/**
 * 組織追加のServer Action
 * @param data - 組織追加データ
 * @returns ActionResult
 */
export async function createOrganizationAction(
  data: CreateOrganizationInput,
): Promise<ActionResult> {
  try {
    // 権限チェック
    await checkAdminPermission();
  } catch (_error) {
    return {
      success: false,
      error: "この操作を実行する権限がありません",
    };
  }

  // バリデーション
  if (!data.name.trim()) {
    return { success: false, error: "名称は必須です" };
  }
  if (data.name.length > 255) {
    return {
      success: false,
      error: "名称は255文字以内で入力してください",
    };
  }

  try {
    // 親組織の階層レベル取得
    let level = 1;
    if (data.parentId) {
      const parent = await db.query.organizations.findFirst({
        where: eq(organizations.id, data.parentId),
      });

      if (!parent) {
        return { success: false, error: "親組織が見つかりません" };
      }

      // 階層制約チェック（レベル4に子追加不可）
      if (parent.level >= 4) {
        return {
          success: false,
          error: "課／チーム配下には追加できません",
        };
      }

      level = parent.level + 1;
    }

    // データベース挿入
    await db.insert(organizations).values({
      name: data.name,
      parentId: data.parentId,
      level,
    });

    // ページ再検証
    revalidatePath("/admin/organizations");

    return { success: true };
  } catch (error) {
    console.error("createOrganizationAction error:", error);
    return { success: false, error: "追加に失敗しました" };
  }
}

/**
 * 組織更新のServer Action
 * @param data - 組織更新データ
 * @returns ActionResult
 */
export async function updateOrganizationAction(
  data: UpdateOrganizationInput,
): Promise<ActionResult> {
  try {
    // 権限チェック
    await checkAdminPermission();
  } catch (_error) {
    return {
      success: false,
      error: "この操作を実行する権限がありません",
    };
  }

  // バリデーション
  if (!data.name.trim()) {
    return { success: false, error: "名称は必須です" };
  }
  if (data.name.length > 255) {
    return {
      success: false,
      error: "名称は255文字以内で入力してください",
    };
  }

  try {
    // 循環参照チェック
    if (data.parentId) {
      const { validateParentSelection } = await import("./service");
      const isValid = await validateParentSelection(data.id, data.parentId);
      if (!isValid) {
        return {
          success: false,
          error: "親組織に自分自身または子部署は選択できません",
        };
      }
    }

    // 現在のノード取得
    const currentNode = await db.query.organizations.findFirst({
      where: eq(organizations.id, data.id),
    });

    if (!currentNode) {
      return { success: false, error: "組織が見つかりません" };
    }

    // 親組織変更の場合、階層レベル再計算
    let newLevel = currentNode.level;
    if (data.parentId !== currentNode.parentId) {
      if (data.parentId) {
        const parent = await db.query.organizations.findFirst({
          where: eq(organizations.id, data.parentId),
        });
        newLevel = parent ? parent.level + 1 : 1;
      } else {
        newLevel = 1;
      }

      // 子孫ノードの階層レベルも連動更新
      const { getDescendantIds } = await import("./service");
      const levelDiff = newLevel - currentNode.level;
      const descendantIds = await getDescendantIds(data.id);

      // トランザクション内で一括更新
      await db.transaction(async (tx) => {
        // 自ノード更新
        await tx
          .update(organizations)
          .set({
            name: data.name,
            parentId: data.parentId,
            level: newLevel,
          })
          .where(eq(organizations.id, data.id));

        // 子孫ノードのレベル更新
        for (const descendantId of descendantIds) {
          const descendant = await tx.query.organizations.findFirst({
            where: eq(organizations.id, descendantId),
          });
          if (descendant) {
            await tx
              .update(organizations)
              .set({
                level: descendant.level + levelDiff,
              })
              .where(eq(organizations.id, descendantId));
          }
        }
      });
    } else {
      // 名称のみ更新
      await db
        .update(organizations)
        .set({
          name: data.name,
        })
        .where(eq(organizations.id, data.id));
    }

    // ページ再検証
    revalidatePath("/admin/organizations");

    return { success: true };
  } catch (error) {
    console.error("updateOrganizationAction error:", error);
    return { success: false, error: "更新に失敗しました" };
  }
}

/**
 * 組織削除のServer Action
 * @param id - 削除する組織のID
 * @returns ActionResult
 */
export async function deleteOrganizationAction(
  id: string,
): Promise<ActionResult> {
  try {
    // 権限チェック
    await checkAdminPermission();
  } catch (_error) {
    return {
      success: false,
      error: "この操作を実行する権限がありません",
    };
  }

  try {
    // 組織の存在確認
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, id),
    });

    if (!organization) {
      return { success: false, error: "組織が見つかりません" };
    }

    // ルートノード削除チェック
    if (organization.level === 1) {
      return { success: false, error: "ルート組織は削除できません" };
    }

    // データベースから削除（ON DELETE CASCADEで子孫も連動削除）
    await db.delete(organizations).where(eq(organizations.id, id));

    // ページ再検証
    revalidatePath("/admin/organizations");

    return { success: true };
  } catch (error) {
    console.error("deleteOrganizationAction error:", error);
    return { success: false, error: "削除に失敗しました" };
  }
}
