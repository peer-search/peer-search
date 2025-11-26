import { sql } from "drizzle-orm";
import { db } from "@/db";
import { buildTree } from "@/lib/organizations/tree";
import type {
  OrganizationError,
  OrganizationFlatNode,
  OrganizationTree,
  Result,
} from "@/lib/organizations/types";
import { createClient } from "@/lib/supabase-auth/server";

/**
 * 組織階層データをSupabaseから取得し、ツリー構造に変換する
 *
 * @returns 成功時はツリー構造の組織階層データ、失敗時はエラー情報を含むResult型
 *
 * @example
 * const result = await getOrganizationHierarchy();
 * if (result.success) {
 *   console.log('Organizations:', result.data);
 * } else {
 *   console.error('Error:', result.error);
 * }
 */
export async function getOrganizationHierarchy(): Promise<
  Result<OrganizationTree[], OrganizationError>
> {
  try {
    // Supabaseクライアントを生成
    const supabase = await createClient();

    // RPC関数 get_org_hierarchy() を実行
    const { data, error } = await supabase.rpc("get_org_hierarchy");

    if (error) {
      // RPC実行エラー
      console.error("RPC execution error:", error);
      return {
        success: false,
        error: {
          type: "DatabaseError",
          message: `Failed to fetch organization hierarchy: ${error.message}`,
        },
      };
    }

    // データが空の場合は空配列を返す
    if (!data || data.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    // フラット配列をツリー構造に変換
    try {
      const flatNodes = data as OrganizationFlatNode[];
      const tree = buildTree(flatNodes);

      return {
        success: true,
        data: tree,
      };
    } catch (transformError) {
      // ツリー変換エラー
      console.error("Tree transformation error:", transformError);
      return {
        success: false,
        error: {
          type: "TransformError",
          message:
            transformError instanceof Error
              ? transformError.message
              : "Failed to transform organization data to tree structure",
        },
      };
    }
  } catch (error) {
    // その他の予期しないエラー
    console.error("Unexpected error in getOrganizationHierarchy:", error);
    return {
      success: false,
      error: {
        type: "DatabaseError",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
    };
  }
}

/**
 * 子孫ノードのIDを取得する
 *
 * 再帰CTEを使用して、指定されたノードの全子孫ノードIDを取得します。
 *
 * @param nodeId - 対象ノードのID
 * @returns 子孫ノードのID配列
 *
 * @example
 * const descendantIds = await getDescendantIds('node-1');
 * // ['node-2', 'node-3', 'node-4']
 */
export async function getDescendantIds(nodeId: string): Promise<string[]> {
  // 再帰CTEで子孫ノードを取得
  const result = await db.execute<{ id: string }>(sql`
    WITH RECURSIVE descendants AS (
      SELECT id, parent_id FROM organizations WHERE parent_id = ${nodeId}
      UNION ALL
      SELECT o.id, o.parent_id
      FROM organizations o
      INNER JOIN descendants d ON o.parent_id = d.id
    )
    SELECT id FROM descendants
  `);

  // Drizzle's execute returns { rows: [...] } structure
  const rows = (result as unknown as { rows: Array<{ id: string }> }).rows;
  return rows.map((row) => row.id);
}

/**
 * 子孫ノード数を取得する
 *
 * @param nodeId - 対象ノードのID
 * @returns 子孫ノード数
 *
 * @example
 * const count = await getDescendantCount('node-1');
 * console.log(`${count}個の子部署があります`);
 */
export async function getDescendantCount(nodeId: string): Promise<number> {
  const ids = await getDescendantIds(nodeId);
  return ids.length;
}

/**
 * 親組織の選択が有効かどうかを検証する
 *
 * 循環参照を防ぐため、以下の条件をチェックします：
 * - 親が自分自身でないこと
 * - 親が自分の子孫ノードでないこと
 *
 * @param nodeId - 対象ノードのID
 * @param parentId - 選択された親ノードのID（nullの場合はルートノード化）
 * @returns 有効な場合はtrue、無効な場合はfalse
 *
 * @example
 * const isValid = await validateParentSelection('node-1', 'node-2');
 * if (!isValid) {
 *   console.error('循環参照が発生します');
 * }
 */
export async function validateParentSelection(
  nodeId: string,
  parentId: string | null,
): Promise<boolean> {
  // nullの場合はルートノード化なのでOK
  if (parentId === null) {
    return true;
  }

  // 親が自分自身ではないか
  if (nodeId === parentId) {
    return false;
  }

  // 親が子孫ノードではないか
  const descendantIds = await getDescendantIds(nodeId);
  if (descendantIds.includes(parentId)) {
    return false;
  }

  return true;
}
