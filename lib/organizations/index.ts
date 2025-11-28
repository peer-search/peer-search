/**
 * 組織階層データアクセスレイヤー
 *
 * このモジュールは組織階層データの取得とツリー構造への変換を提供します。
 */

export { getOrganizationHierarchy } from "./service";
export { buildTree } from "./tree";
export type {
  OrganizationError,
  OrganizationFlatNode,
  OrganizationTree,
  Result,
} from "./types";
