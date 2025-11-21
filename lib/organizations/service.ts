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
