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
  parentId: string | null;
  level: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * 組織追加のServer Action入力型
 */
export type CreateOrganizationInput = {
  name: string;
  parentId: string | null;
};

/**
 * 組織更新のServer Action入力型
 */
export type UpdateOrganizationInput = {
  id: string;
  name: string;
  parentId: string | null;
};

/**
 * Server Actionの戻り値型
 * @template T データの型（省略時はvoid）
 */
export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};
