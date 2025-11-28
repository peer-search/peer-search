import type { CreateEmployeeInput, UpdateEmployeeInput } from "./types";

/**
 * バリデーション結果型
 */
export type ValidationResult = {
  /** バリデーションが成功したかどうか */
  success: boolean;
  /** フィールドごとのエラーメッセージ */
  fieldErrors?: Record<string, string[]>;
};

/**
 * メールアドレス形式の正規表現
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 社員データのバリデーション
 * @param data - 検証対象データ
 * @returns バリデーション結果
 */
export function validateEmployeeData(
  data: Partial<CreateEmployeeInput | UpdateEmployeeInput>,
): ValidationResult {
  const fieldErrors: Record<string, string[]> = {};

  // 社員番号（新規追加時のみ必須）
  if ("employeeNumber" in data) {
    if (!data.employeeNumber || data.employeeNumber.trim() === "") {
      fieldErrors.employeeNumber = ["社員番号は必須です"];
    } else if (data.employeeNumber.length > 20) {
      fieldErrors.employeeNumber = ["社員番号は20文字以内で入力してください"];
    }
  }

  // 氏名（漢字）
  if ("nameKanji" in data) {
    if (!data.nameKanji || data.nameKanji.trim() === "") {
      fieldErrors.nameKanji = ["氏名（漢字）は必須です"];
    } else if (data.nameKanji.length > 100) {
      fieldErrors.nameKanji = ["氏名（漢字）は100文字以内で入力してください"];
    }
  }

  // 氏名（カナ）
  if ("nameKana" in data) {
    if (!data.nameKana || data.nameKana.trim() === "") {
      fieldErrors.nameKana = ["氏名（カナ）は必須です"];
    } else if (data.nameKana.length > 100) {
      fieldErrors.nameKana = ["氏名（カナ）は100文字以内で入力してください"];
    }
  }

  // メールアドレス
  if ("email" in data) {
    if (!data.email || data.email.trim() === "") {
      fieldErrors.email = ["メールアドレスは必須です"];
    } else if (!EMAIL_REGEX.test(data.email)) {
      fieldErrors.email = ["有効なメールアドレスを入力してください"];
    } else if (data.email.length > 255) {
      fieldErrors.email = ["メールアドレスは255文字以内で入力してください"];
    }
  }

  // 入社日
  if ("hireDate" in data) {
    if (!data.hireDate || data.hireDate.trim() === "") {
      fieldErrors.hireDate = ["入社日は必須です"];
    } else {
      const hireDate = new Date(data.hireDate);

      if (Number.isNaN(hireDate.getTime())) {
        fieldErrors.hireDate = ["有効な日付を入力してください"];
      } else {
        // ISO形式の日付文字列 (YYYY-MM-DD) をローカル日付として比較
        const hireDateStr = data.hireDate.split("T")[0]; // ISO形式の場合に備えてT以降を削除
        const todayStr = new Date().toISOString().split("T")[0];

        if (hireDateStr > todayStr) {
          fieldErrors.hireDate = ["入社日は本日以前の日付を指定してください"];
        }
      }
    }
  }

  // 携帯電話（任意、形式チェックのみ）
  if (data.mobilePhone && data.mobilePhone.trim() !== "") {
    if (data.mobilePhone.length > 20) {
      fieldErrors.mobilePhone = ["携帯電話は20文字以内で入力してください"];
    }
  }

  return {
    success: Object.keys(fieldErrors).length === 0,
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  };
}
