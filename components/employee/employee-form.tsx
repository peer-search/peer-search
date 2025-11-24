"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createEmployeeAction,
  updateEmployeeAction,
} from "@/lib/employees/actions";
import type { Employee } from "@/lib/employees/service";

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

  // Server Actionの選択
  // 編集モードの場合、employeeIdを含むラッパー関数を作成
  const wrappedAction =
    mode === "edit" && employeeId
      ? (prevState: unknown, formData: FormData) =>
          updateEmployeeAction(prevState, formData, employeeId)
      : createEmployeeAction;

  const [state, formAction, isPending] = useActionState(wrappedAction, {
    success: false,
  });

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

  return (
    <form action={formAction} className="space-y-6">
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
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中..." : "保存"}
        </Button>
        <Button type="button" variant="outline" onClick={handleCancel}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}
