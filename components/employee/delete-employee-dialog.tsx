"use client";

import { useActionState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteEmployeeAction } from "@/lib/employees/actions";

/**
 * 削除確認ダイアログのProps
 */
type DeleteEmployeeDialogProps = {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
};

/**
 * 社員削除確認ダイアログコンポーネント
 *
 * 削除確認ダイアログを表示し、ユーザーの確認を得た上で
 * 社員を削除するServer Actionを実行します。
 *
 * @param props.employeeId - 削除対象の社員UUID
 * @param props.employeeName - 削除対象の社員名（漢字）
 * @param props.employeeNumber - 削除対象の社員番号
 */
export function DeleteEmployeeDialog({
  employeeId,
  employeeName,
  employeeNumber,
}: DeleteEmployeeDialogProps) {
  const [_state, formAction, isPending] = useActionState(
    deleteEmployeeAction.bind(null, undefined, employeeId),
    undefined,
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">削除</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>社員削除の確認</AlertDialogTitle>
          <AlertDialogDescription>
            以下の社員を削除してもよろしいですか？
            <br />
            <strong className="text-foreground">
              {employeeName}({employeeNumber})
            </strong>
            <br />
            この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <form action={formAction}>
            <AlertDialogAction
              type="submit"
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? "削除中..." : "削除を確定する"}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
