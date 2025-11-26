"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useOrganizationSelection } from "./organization-context";
import { OrganizationEditForm } from "./organization-edit-form";

/**
 * 組織編集パネルコンポーネント
 * 選択された組織ノードの詳細編集フォームを表示
 * 未選択時は選択を促すメッセージと追加ボタンを表示
 *
 * レスポンシブ対応:
 * - モバイル (<768px): Sheet (スライドインパネル) で表示
 * - タブレット・デスクトップ (>=768px): 固定パネルで表示
 */
export function OrganizationEditPanel() {
  const { selectedNode, allOrganizations, isAddMode, setIsAddMode } =
    useOrganizationSelection();

  // モバイル用のSheet表示状態（クライアントサイドのみで判定）
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // クライアントサイドでモバイル判定
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 選択ノードが変更された場合、モバイルでのみSheetを表示
  useEffect(() => {
    if (isMobile && (selectedNode || isAddMode)) {
      setIsSheetOpen(true);
    } else {
      setIsSheetOpen(false);
    }
  }, [selectedNode, isAddMode, isMobile]);

  // 編集フォームコンテンツ
  const editFormContent = (
    <>
      {isAddMode && !selectedNode ? (
        <OrganizationEditForm
          mode="create"
          allOrganizations={allOrganizations}
        />
      ) : selectedNode ? (
        <OrganizationEditForm
          mode="edit"
          node={selectedNode}
          allOrganizations={allOrganizations}
        />
      ) : null}
    </>
  );

  // 未選択時のプレースホルダー
  const placeholderContent = (
    <div className="flex flex-col items-center justify-center gap-4 h-full">
      <p className="text-gray-500">組織を選択してください</p>
      <Button onClick={() => setIsAddMode(true)} variant="default" size="lg">
        新規追加
      </Button>
    </div>
  );

  return (
    <>
      {/* デスクトップ・タブレット用: 固定パネル表示 (>=768px) */}
      <div className="hidden md:flex md:flex-col w-full h-full">
        {selectedNode || isAddMode ? editFormContent : placeholderContent}
      </div>

      {/* モバイル用: Sheet (スライドインパネル) 表示 (<768px) */}
      <div className="md:hidden">
        {/* モバイル用プレースホルダー */}
        {!selectedNode && !isAddMode && placeholderContent}

        {/* モバイル用Sheet */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl overflow-auto"
          >
            <SheetHeader>
              <SheetTitle>
                {isAddMode && !selectedNode ? "組織を追加" : "組織を編集"}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6">{editFormContent}</div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
