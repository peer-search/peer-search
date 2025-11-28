/**
 * 社員管理機能の型定義
 */

/**
 * 新規社員追加の入力データ
 */
export interface CreateEmployeeInput {
  /** 社員番号（必須、UNIQUE） */
  employeeNumber: string;
  /** 氏名（漢字）（必須） */
  nameKanji: string;
  /** 氏名（カナ）（必須） */
  nameKana: string;
  /** メールアドレス（必須、UNIQUE） */
  email: string;
  /** 入社日（必須、ISO 8601形式: "YYYY-MM-DD"） */
  hireDate: string;
  /** 携帯電話（任意） */
  mobilePhone?: string;
  /** 所属組織UUIDの配列（任意） */
  organizationIds?: string[];
}

/**
 * 社員情報更新の入力データ
 */
export interface UpdateEmployeeInput {
  /** 氏名（漢字） */
  nameKanji?: string;
  /** 氏名（カナ） */
  nameKana?: string;
  /** メールアドレス（UNIQUE制約チェック必要） */
  email?: string;
  /** 入社日 */
  hireDate?: string;
  /** 携帯電話（nullで削除） */
  mobilePhone?: string | null;
}

/**
 * バリデーションエラー型
 */
export interface ValidationError {
  /** エラーが発生したフィールド名 */
  field: string;
  /** エラーメッセージ */
  message: string;
}

/**
 * Server Actionの戻り値型
 */
export type ActionResult<T = void> = {
  /** 操作が成功したかどうか */
  success: boolean;
  /** 成功時のデータ */
  data?: T;
  /** 全体エラーメッセージの配列 */
  errors?: string[];
  /** フィールドごとのエラーメッセージ */
  fieldErrors?: Record<string, string[]>;
};
