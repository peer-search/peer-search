"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createEmployeeAction,
  updateEmployeeAction,
} from "@/lib/employees/actions";
import type { Employee } from "@/lib/employees/service";
import type { ActionResult } from "@/lib/employees/types";
import { validatePhotoFile } from "@/lib/employees/validation";

/**
 * フォームモード
 * - create: 新規作成モード
 * - edit: 編集モード
 */
type FormMode = "create" | "edit";

/**
 * EmployeeFormのProps
 */
type EmployeeFormProps = {
  /** フォームモード */
  mode: FormMode;
  /** 編集モード時の初期データ（editモードでは必須） */
  initialData?: Employee;
  /** 編集モード時の社員ID（editモードでは必須） */
  employeeId?: string;
};

/**
 * Dateオブジェクトをyyyy-MM-dd形式の文字列に変換
 */
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 社員フォームコンポーネント
 *
 * 新規追加と編集の両方のモードで使用できる共通フォームコンポーネントです。
 * Server Actionsを使用してサーバーサイドでデータを処理します。
 *
 * @param props.mode - フォームモード（"create" または "edit"）
 * @param props.initialData - 編集モード時の初期データ
 * @param props.employeeId - 編集モード時の社員ID
 */
export function EmployeeForm({
  mode,
  initialData,
  employeeId,
}: EmployeeFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // 写真アップロード状態管理
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedS3Key, setUploadedS3Key] = useState<string | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  // Server Actionの選択 - 編集と新規で分ける
  const [createState, createFormAction, createIsPending] = useActionState(
    createEmployeeAction,
    { success: false },
  );

  const [updateState, updateFormAction, updateIsPending] = useActionState(
    (prevState: ActionResult | undefined, formData: FormData) =>
      updateEmployeeAction(prevState, formData, employeeId || ""),
    { success: false },
  );

  // 実際に使用するstateとactionを選択
  const state = mode === "edit" ? updateState : createState;
  const formAction = mode === "edit" ? updateFormAction : createFormAction;
  const isPending = mode === "edit" ? updateIsPending : createIsPending;

  // 編集モードで既存写真がある場合、プレビューURLを設定
  useEffect(() => {
    if (mode === "edit" && initialData?.photoS3Key) {
      // 仮のプレビューURL（実際はPresigned URLを取得する）
      setPreviewUrl(initialData.photoS3Key);
    }
  }, [mode, initialData?.photoS3Key]);

  // 編集成功時に社員詳細画面に遷移
  useEffect(() => {
    if (mode === "edit" && state.success && employeeId) {
      router.push(`/employees/${employeeId}`);
    }
  }, [mode, state.success, employeeId, router]);

  // ファイル選択ハンドラー
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // クライアントサイドバリデーション
      const validationResult = validatePhotoFile({ file });

      if (!validationResult.success) {
        // バリデーション失敗
        const errorMsg =
          validationResult.fieldErrors?.photo?.[0] || "ファイルが無効です。";
        setPhotoError(errorMsg);
        setSelectedFile(null);
        setPreviewUrl(null);
        // ファイルinputをリセット
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      // バリデーション成功
      setPhotoError(null);
      setSelectedFile(file);
      // プレビューURL生成
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  // 写真変更ボタンクリックハンドラー
  const handleChangePhotoClick = () => {
    fileInputRef.current?.click();
  };

  // 写真削除ハンドラー
  const handleDeletePhoto = () => {
    setShowDeleteDialog(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    // ファイルinputをリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // キャンセルボタンのハンドラー
  const handleCancel = () => {
    if (mode === "edit" && employeeId) {
      // 編集モードの場合、詳細ページに戻る
      router.push(`/employees/${employeeId}`);
    } else {
      // 新規追加モードの場合、一覧ページに戻る
      router.push("/employees");
    }
  };

  // S3アップロード処理
  const uploadToS3 = async (): Promise<string | null> => {
    if (!selectedFile) return null;

    setPhotoError(null);
    setUploading(true);

    try {
      // 1. Presigned PUT URLを取得
      const presignResponse = await fetch("/api/s3/upload/presign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        }),
      });

      if (!presignResponse.ok) {
        await presignResponse.json(); // エラーレスポンスを消費
        if (presignResponse.status === 401) {
          setPhotoError("認証されていません。ログインしてください。");
        } else if (presignResponse.status === 403) {
          setPhotoError("この操作を実行する権限がありません。");
        } else {
          setPhotoError(
            "サーバーエラーが発生しました。しばらくしてからもう一度お試しください。",
          );
        }
        setUploading(false);
        return null;
      }

      const { uploadUrl, s3Key } = await presignResponse.json();

      // 2. S3へ直接アップロード
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("S3 upload failed");
      }

      // 3. アップロード成功
      setUploading(false);
      return s3Key;
    } catch (error) {
      console.error("Upload error:", error);
      setPhotoError(
        "ネットワークエラーが発生しました。もう一度お試しください。",
      );
      setUploading(false);
      return null;
    }
  };

  // 保存ボタンクリックハンドラー
  const handleSaveClick = async () => {
    // 写真が選択されている場合、まずS3へアップロード
    if (selectedFile && !uploadedS3Key) {
      const s3Key = await uploadToS3();
      if (s3Key) {
        setUploadedS3Key(s3Key);
        // S3キーを設定したら自動的にフォーム送信
        setPendingSubmit(true);
      }
      // アップロード失敗時は何もしない（エラーメッセージが表示される）
    } else {
      // 写真が選択されていない、またはすでにアップロード済みの場合は直接フォーム送信
      formRef.current?.requestSubmit();
    }
  };

  // uploadedS3Keyが設定されたら自動的にフォーム送信
  useEffect(() => {
    if (pendingSubmit && uploadedS3Key && formRef.current) {
      formRef.current.requestSubmit();
      setPendingSubmit(false);
    }
  }, [pendingSubmit, uploadedS3Key]);

  return (
    <>
      <form ref={formRef} action={formAction} className="space-y-6">
        {/* 社員番号 */}
        <div>
          <Label htmlFor="employeeNumber">
            社員番号<span className="text-red-600">*</span>
          </Label>
          <Input
            id="employeeNumber"
            name="employeeNumber"
            defaultValue={initialData?.employeeNumber}
            disabled={mode === "edit"} // 編集時は読み取り専用
            required
            aria-describedby={
              state.fieldErrors?.employeeNumber
                ? "employeeNumber-error"
                : undefined
            }
          />
          {state.fieldErrors?.employeeNumber && (
            <p id="employeeNumber-error" className="text-sm text-red-600 mt-1">
              {state.fieldErrors.employeeNumber[0]}
            </p>
          )}
        </div>

        {/* 氏名（漢字） */}
        <div>
          <Label htmlFor="nameKanji">
            氏名（漢字）<span className="text-red-600">*</span>
          </Label>
          <Input
            id="nameKanji"
            name="nameKanji"
            defaultValue={initialData?.nameKanji}
            required
            aria-describedby={
              state.fieldErrors?.nameKanji ? "nameKanji-error" : undefined
            }
          />
          {state.fieldErrors?.nameKanji && (
            <p id="nameKanji-error" className="text-sm text-red-600 mt-1">
              {state.fieldErrors.nameKanji[0]}
            </p>
          )}
        </div>

        {/* 氏名（カナ） */}
        <div>
          <Label htmlFor="nameKana">
            氏名（カナ）<span className="text-red-600">*</span>
          </Label>
          <Input
            id="nameKana"
            name="nameKana"
            defaultValue={initialData?.nameKana}
            required
            aria-describedby={
              state.fieldErrors?.nameKana ? "nameKana-error" : undefined
            }
          />
          {state.fieldErrors?.nameKana && (
            <p id="nameKana-error" className="text-sm text-red-600 mt-1">
              {state.fieldErrors.nameKana[0]}
            </p>
          )}
        </div>

        {/* メールアドレス */}
        <div>
          <Label htmlFor="email">
            メールアドレス<span className="text-red-600">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={initialData?.email}
            required
            aria-describedby={
              state.fieldErrors?.email ? "email-error" : undefined
            }
          />
          {state.fieldErrors?.email && (
            <p id="email-error" className="text-sm text-red-600 mt-1">
              {state.fieldErrors.email[0]}
            </p>
          )}
        </div>

        {/* 入社日 */}
        <div>
          <Label htmlFor="hireDate">
            入社日<span className="text-red-600">*</span>
          </Label>
          <Input
            id="hireDate"
            name="hireDate"
            type="date"
            defaultValue={
              initialData?.hireDate
                ? formatDateForInput(initialData.hireDate)
                : undefined
            }
            required
            aria-describedby={
              state.fieldErrors?.hireDate ? "hireDate-error" : undefined
            }
          />
          {state.fieldErrors?.hireDate && (
            <p id="hireDate-error" className="text-sm text-red-600 mt-1">
              {state.fieldErrors.hireDate[0]}
            </p>
          )}
        </div>

        {/* 携帯電話 */}
        <div>
          <Label htmlFor="mobilePhone">携帯電話</Label>
          <Input
            id="mobilePhone"
            name="mobilePhone"
            type="tel"
            defaultValue={initialData?.mobilePhone || ""}
            aria-describedby={
              state.fieldErrors?.mobilePhone ? "mobilePhone-error" : undefined
            }
          />
          {state.fieldErrors?.mobilePhone && (
            <p id="mobilePhone-error" className="text-sm text-red-600 mt-1">
              {state.fieldErrors.mobilePhone[0]}
            </p>
          )}
        </div>

        {/* 写真アップロードセクション */}
        <div>
          <Label htmlFor="photo">写真</Label>
          <div className="mt-2 space-y-4">
            {/* エラーメッセージ表示 */}
            {photoError && <p className="text-sm text-red-600">{photoError}</p>}
            {/* プレビュー表示 */}
            {previewUrl ? (
              <div className="flex items-start gap-4">
                {/* biome-ignore lint/performance/noImgElement: ObjectURLプレビューのため一時的に<img>を使用、Task 5.3で改善予定 */}
                <img
                  src={previewUrl}
                  alt="写真プレビュー"
                  className="w-32 h-32 object-cover rounded-md border border-gray-200"
                />
                <div className="flex flex-col gap-2">
                  {mode === "edit" && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleChangePhotoClick}
                      >
                        写真を変更
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        写真を削除
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md">
                  <span className="text-gray-400 text-sm">未設定</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleChangePhotoClick}
                >
                  写真をアップロード
                </Button>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              id="photo"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              aria-label="写真"
            />
          </div>
        </div>

        {/* Hidden input for photoS3Key */}
        {uploadedS3Key && (
          <input type="hidden" name="photoS3Key" value={uploadedS3Key} />
        )}

        {/* 全体エラー */}
        {state.errors && state.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <ul className="list-disc list-inside text-sm text-red-600">
              {state.errors.map((error, index) => (
                <li
                  key={`error-${
                    // biome-ignore lint/suspicious/noArrayIndexKey: エラーメッセージは動的で一意のキーがないため、indexを使用
                    index
                  }`}
                >
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* アクション */}
        <div className="flex gap-3">
          <Button
            type="button"
            disabled={isPending || uploading}
            onClick={handleSaveClick}
          >
            {isPending || uploading ? "保存中..." : "保存"}
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel}>
            キャンセル
          </Button>
        </div>
      </form>

      {/* 写真削除確認ダイアログ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>写真を削除</AlertDialogTitle>
            <AlertDialogDescription>
              この写真を削除してもよろしいですか? この操作は元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePhoto}>
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
