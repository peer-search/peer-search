/**
 * 組織階層データの型定義
 */

/**
 * 組織階層ツリーノード
 */
export type OrganizationTree = {
  id: string;
  name: string;
  level: number;
  children: OrganizationTree[];
};

/**
 * 組織階層データ取得エラー
 */
export type OrganizationError =
  | { type: "DatabaseError"; message: string }
  | { type: "TransformError"; message: string };

/**
 * Result型 - 成功または失敗を表現
 */
export type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * RPC関数から返される組織階層データ（フラット配列）
 */
export type OrganizationFlatNode = {
  id: string;
  name: string;
  parent_id: string | null;
  level: number;
};
