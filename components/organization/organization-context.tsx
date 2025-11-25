"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";
import type { OrganizationFlatNode } from "@/lib/organizations/types";

/**
 * 組織選択状態を管理するContext
 * @property selectedNode - 現在選択されている組織ノード（未選択時はnull）
 * @property setSelectedNode - 組織ノードの選択状態を更新する関数
 * @property allOrganizations - 全組織のリスト
 */
interface OrganizationContextValue {
  selectedNode: OrganizationFlatNode | null;
  setSelectedNode: (node: OrganizationFlatNode | null) => void;
  allOrganizations: OrganizationFlatNode[];
}

const OrganizationContext = createContext<OrganizationContextValue | null>(
  null,
);

interface OrganizationProviderProps {
  children: ReactNode;
  allOrganizations: OrganizationFlatNode[];
}

/**
 * 組織選択状態を提供するProviderコンポーネント
 *
 * @description
 * 組織ツリービューと編集フォーム間で選択ノードの状態を共有するために使用する。
 * 初期状態では選択ノードはnull（未選択状態）。
 *
 * @example
 * ```tsx
 * <OrganizationProvider allOrganizations={flatOrganizations}>
 *   <OrganizationListView />
 *   <OrganizationEditPanel />
 * </OrganizationProvider>
 * ```
 *
 * @param children - Providerでラップする子コンポーネント
 * @param allOrganizations - 全組織のフラットリスト
 * @returns Context.Providerでラップされたコンポーネントツリー
 */
export function OrganizationProvider({
  children,
  allOrganizations,
}: OrganizationProviderProps) {
  const [selectedNode, setSelectedNode] = useState<OrganizationFlatNode | null>(
    null,
  );

  const value = useMemo(
    () => ({ selectedNode, setSelectedNode, allOrganizations }),
    [selectedNode, allOrganizations],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

/**
 * 組織選択状態を取得するカスタムフック
 *
 * @description
 * OrganizationProvider内でのみ使用可能。
 * 選択ノードの取得と更新機能を提供する。
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { selectedNode, setSelectedNode } = useOrganizationSelection();
 *
 *   return (
 *     <button onClick={() => setSelectedNode(node)}>
 *       {selectedNode?.name || "未選択"}
 *     </button>
 *   );
 * }
 * ```
 *
 * @throws {Error} OrganizationProvider外で使用された場合にエラーをスロー
 * @returns 選択ノードと更新関数を含むContextの値
 */
export function useOrganizationSelection() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error(
      "useOrganizationSelection must be used within OrganizationProvider",
    );
  }
  return context;
}
