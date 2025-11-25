import type {
  OrganizationFlatNode,
  OrganizationTree,
} from "@/lib/organizations/types";

/**
 * フラット配列の組織階層データをツリー構造に変換する
 *
 * @param flatNodes - RPC関数から取得したフラット配列の組織階層データ
 * @returns ツリー構造の組織階層データ（ルートノードの配列）
 *
 * @example
 * const flatData = [
 *   { id: '1', name: '会社A', parentId: null, level: 1, createdAt: new Date(), updatedAt: new Date() },
 *   { id: '2', name: '本部B', parentId: '1', level: 2, createdAt: new Date(), updatedAt: new Date() },
 *   { id: '3', name: '部署C', parentId: '2', level: 3, createdAt: new Date(), updatedAt: new Date() },
 * ];
 * const tree = buildTree(flatData);
 * // => [{ id: '1', name: '会社A', level: 1, children: [...] }]
 */
export function buildTree(
  flatNodes: OrganizationFlatNode[],
): OrganizationTree[] {
  // ノードIDをキーとしたマップを作成（O(1)で親ノードを検索するため）
  const nodeMap = new Map<string, OrganizationTree>();

  // すべてのノードをマップに追加（初期状態ではchildren: []）
  for (const node of flatNodes) {
    nodeMap.set(node.id, {
      id: node.id,
      name: node.name,
      level: node.level,
      children: [],
    });
  }

  // ルートノード（parentId が null）を格納する配列
  const rootNodes: OrganizationTree[] = [];

  // 親子関係を構築
  for (const node of flatNodes) {
    const treeNode = nodeMap.get(node.id);
    if (!treeNode) {
      // ノードが見つからない場合はスキップ（通常は発生しない）
      continue;
    }

    if (node.parentId === null) {
      // ルートノード（parentId が null）の場合
      rootNodes.push(treeNode);
    } else {
      // 子ノードの場合、親ノードのchildrenに追加
      const parentNode = nodeMap.get(node.parentId);
      if (parentNode) {
        parentNode.children.push(treeNode);
      } else {
        // 親ノードが見つからない場合（データ不整合）
        // 警告ログを出力し、ルートノードとして扱う
        console.warn(
          `Parent node not found for node ${node.id} (parentId: ${node.parentId})`,
        );
        rootNodes.push(treeNode);
      }
    }
  }

  // 各ノードの子ノードをlevel順でソート
  for (const node of nodeMap.values()) {
    node.children.sort((a, b) => a.level - b.level);
  }

  return rootNodes;
}

/**
 * ツリー構造の組織階層データをフラット配列に変換する（深さ優先順序）
 *
 * @param tree - ツリー構造の組織階層データ
 * @returns フラット配列の組織階層データ（階層情報のみ、parentIdなどは含まない）
 *
 * @example
 * const tree = [
 *   {
 *     id: '1', name: '会社A', level: 1,
 *     children: [
 *       { id: '2', name: '本部B', level: 2, children: [] }
 *     ]
 *   }
 * ];
 * const flat = flattenTree(tree);
 * // => [
 * //   { id: '1', name: '会社A', level: 1 },
 * //   { id: '2', name: '本部B', level: 2 }
 * // ]
 */
export function flattenTree(
  tree: OrganizationTree[],
): Array<{ id: string; name: string; level: number }> {
  const result: Array<{ id: string; name: string; level: number }> = [];

  // 深さ優先探索で再帰的にツリーをフラット化
  function traverse(nodes: OrganizationTree[]) {
    for (const node of nodes) {
      // 現在のノードを結果配列に追加
      result.push({
        id: node.id,
        name: node.name,
        level: node.level,
      });

      // 子ノードがある場合、再帰的に処理
      if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(tree);
  return result;
}
