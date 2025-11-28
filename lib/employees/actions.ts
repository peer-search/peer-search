"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfileByUserId } from "@/lib/profiles/service";
import { deleteS3Object } from "@/lib/s3/delete";
import { getUser } from "@/lib/supabase-auth/auth";
import {
  createEmployee,
  deleteEmployee,
  getEmployeeById,
  updateEmployee,
} from "./service";
import type {
  ActionResult,
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from "./types";
import { validateEmployeeData } from "./validation";

/**
 * 管理者権限チェック（共通ヘルパー）
 * @throws {Error} Unauthorized - 未認証の場合
 * @throws {Error} Forbidden - 管理者権限がない場合
 */
export async function checkAdminPermission(): Promise<void> {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden");
  }
}

/**
 * 新規社員追加 Server Action
 * @param prevState - 前回の状態（useActionState用）
 * @param formData - フォームデータ
 * @returns ActionResult<{ employeeId: string }>
 */
export async function createEmployeeAction(
  _prevState: ActionResult<{ employeeId: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ employeeId: string }>> {
  // 1. 権限チェック
  try {
    await checkAdminPermission();
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        errors: ["この操作を実行する権限がありません"],
      };
    }
    return {
      success: false,
      errors: ["予期しないエラーが発生しました"],
    };
  }

  // 2. フォームデータ抽出
  const photoS3KeyValue = formData.get("photoS3Key") as string;
  const input: CreateEmployeeInput = {
    employeeNumber: formData.get("employeeNumber") as string,
    nameKanji: formData.get("nameKanji") as string,
    nameKana: formData.get("nameKana") as string,
    email: formData.get("email") as string,
    hireDate: formData.get("hireDate") as string,
    mobilePhone: (formData.get("mobilePhone") as string) || undefined,
    photoS3Key: photoS3KeyValue || undefined,
  };

  // 3. バリデーション
  const validationResult = validateEmployeeData(input);
  if (!validationResult.success) {
    return {
      success: false,
      fieldErrors: validationResult.fieldErrors,
    };
  }

  // 4. データベース操作
  let employee: Awaited<ReturnType<typeof createEmployee>> | undefined;
  try {
    employee = await createEmployee(input);
  } catch (error: unknown) {
    console.error("Failed to create employee:", error);

    // UNIQUE制約違反の検出
    const pgError = error as { code?: string; constraint?: string };
    if (pgError.code === "23505") {
      if (pgError.constraint === "employees_employee_number_unique") {
        return {
          success: false,
          fieldErrors: {
            employeeNumber: ["この社員番号は既に使用されています"],
          },
        };
      }
      if (pgError.constraint === "employees_email_unique") {
        return {
          success: false,
          fieldErrors: {
            email: ["このメールアドレスは既に使用されています"],
          },
        };
      }
    }

    // その他のエラー
    return {
      success: false,
      errors: ["社員の作成に失敗しました。もう一度お試しください。"],
    };
  }

  if (!employee) {
    return {
      success: false,
      errors: ["社員の作成に失敗しました。もう一度お試しください。"],
    };
  }

  // 5. キャッシュ再検証
  revalidatePath("/employees");
  revalidatePath(`/employees/${employee.id}`);

  // 6. リダイレクト（成功時）
  redirect(`/employees/${employee.id}`);
}

/**
 * 社員情報更新 Server Action
 * @param prevState - 前回の状態（useActionState用）
 * @param formData - フォームデータ
 * @param employeeId - 社員UUID
 * @returns ActionResult
 */
export async function updateEmployeeAction(
  _prevState: ActionResult | undefined,
  formData: FormData,
  employeeId: string,
): Promise<ActionResult> {
  // 1. 権限チェック
  try {
    await checkAdminPermission();
  } catch (_error) {
    return {
      success: false,
      errors: ["この操作を実行する権限がありません"],
    };
  }

  // 2. フォームデータ抽出
  const photoS3KeyValue = formData.get("photoS3Key") as string;
  const input: UpdateEmployeeInput = {
    nameKanji: formData.get("nameKanji") as string,
    nameKana: formData.get("nameKana") as string,
    email: formData.get("email") as string,
    hireDate: formData.get("hireDate") as string,
    mobilePhone: (formData.get("mobilePhone") as string) || null,
    photoS3Key:
      photoS3KeyValue === "null" ? null : photoS3KeyValue || undefined,
  };

  // 3. バリデーション
  const validationResult = validateEmployeeData(input);
  if (!validationResult.success) {
    return {
      success: false,
      fieldErrors: validationResult.fieldErrors,
    };
  }

  // 4. 写真更新時に古いS3キーを取得（ベストエフォート削除のため）
  let oldPhotoS3Key: string | null = null;
  if (input.photoS3Key !== undefined) {
    try {
      const existingEmployee = await getEmployeeById(employeeId);
      if (existingEmployee) {
        oldPhotoS3Key = existingEmployee.photoS3Key;
      }
    } catch (error) {
      console.error("Failed to fetch existing employee photo:", error);
      // 取得失敗してもDB更新は継続（削除スキップ）
    }
  }

  // 5. データベース操作
  try {
    await updateEmployee(employeeId, input);

    // 6. 古いS3オブジェクト削除（ベストエフォート）
    // photoS3Keyが更新され、かつ古いキーが存在し、新旧が異なる場合のみ削除
    if (
      input.photoS3Key !== undefined &&
      oldPhotoS3Key &&
      oldPhotoS3Key !== input.photoS3Key
    ) {
      const deleteSuccess = await deleteS3Object(oldPhotoS3Key);
      if (!deleteSuccess) {
        // 削除失敗してもDB更新は成功（要件3.6準拠）
        console.warn(
          `Failed to delete old S3 object, but DB update succeeded: ${oldPhotoS3Key}`,
        );
      }
    }

    // 7. キャッシュ再検証
    revalidatePath(`/employees/${employeeId}`);
    revalidatePath("/employees");

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to update employee:", error);

    // UNIQUE制約違反の検出
    const pgError = error as { code?: string; constraint?: string };
    if (pgError.code === "23505") {
      if (pgError.constraint === "employees_email_unique") {
        return {
          success: false,
          fieldErrors: {
            email: ["このメールアドレスは既に使用されています"],
          },
        };
      }
    }

    // その他のエラー
    return {
      success: false,
      errors: ["社員情報の更新に失敗しました。もう一度お試しください。"],
    };
  }
}

/**
 * 社員削除 Server Action
 * @param prevState - 前回の状態（useActionState用）
 * @param employeeId - 社員UUID
 * @returns ActionResult
 */
export async function deleteEmployeeAction(
  _prevState: ActionResult | undefined,
  employeeId: string,
): Promise<never> {
  // 1. 権限チェック
  try {
    await checkAdminPermission();
  } catch (_error) {
    throw new Error("Forbidden"); // 403エラーページへ
  }

  // 2. データベース操作
  try {
    await deleteEmployee(employeeId);
  } catch (error) {
    console.error("Failed to delete employee:", error);
    throw new Error("社員の削除に失敗しました"); // エラーページへ
  }

  // 3. キャッシュ再検証
  revalidatePath("/employees");

  // 4. リダイレクト
  redirect("/employees");
}
