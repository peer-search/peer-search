/**
 * 新規社員追加フローの統合テスト
 *
 * このテストは、管理者が新規社員を追加する完全なフローをテストします：
 * 1. 管理者ログイン → 新規追加ページアクセス
 * 2. フォーム入力 → 保存
 * 3. 詳細画面表示
 * 4. バリデーションエラー時のエラーメッセージ表示
 * 5. UNIQUE制約違反時のエラーメッセージ表示
 */

import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/db/schema";
import * as profileService from "@/lib/profiles/service";
import * as auth from "@/lib/supabase-auth/auth";
import { createEmployeeAction } from "./actions";
import type { Employee } from "./service";
import * as employeeService from "./service";

// Mock dependencies
vi.mock("@/db", () => ({
  db: {},
}));
vi.mock("@/lib/supabase-auth/auth");
vi.mock("@/lib/profiles/service");
vi.mock("./service");
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

describe("新規社員追加フローの統合テスト", () => {
  // テスト用のモックデータ
  const mockAdminUser: User = {
    id: "admin-123",
    email: "admin@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  };

  const mockAdminProfile: Profile = {
    id: "prof-admin-123",
    userId: "admin-123",
    role: "admin",
    createdAt: new Date(),
  };

  const mockEmployee: Employee = {
    id: "emp-new-123",
    employeeNumber: "E001",
    nameKanji: "山田太郎",
    nameKana: "ヤマダタロウ",
    email: "yamada@example.com",
    hireDate: new Date("2024-01-01"),
    photoS3Key: null,
    mobilePhone: null,
    organizations: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("正常フロー", () => {
    it("管理者が新規社員を作成し、詳細画面へリダイレクトされる", async () => {
      // Arrange: 管理者としてログイン
      vi.mocked(auth.getUser).mockResolvedValue(mockAdminUser);
      vi.mocked(profileService.getProfileByUserId).mockResolvedValue(
        mockAdminProfile,
      );
      vi.mocked(employeeService.createEmployee).mockResolvedValue(mockEmployee);

      // Arrange: フォームデータを準備
      const formData = new FormData();
      formData.set("employeeNumber", "E001");
      formData.set("nameKanji", "山田太郎");
      formData.set("nameKana", "ヤマダタロウ");
      formData.set("email", "yamada@example.com");
      formData.set("hireDate", "2024-01-01");

      // Act: Server Actionを実行
      // redirect()は例外をスローするため、rejects.toThrowErrorでキャッチ
      await expect(
        createEmployeeAction(undefined, formData),
      ).rejects.toThrowError(/REDIRECT:\/employees\/emp-new-123/);

      // Assert: 正しいデータでcreateEmployeeが呼ばれたことを確認
      expect(employeeService.createEmployee).toHaveBeenCalledWith({
        employeeNumber: "E001",
        nameKanji: "山田太郎",
        nameKana: "ヤマダタロウ",
        email: "yamada@example.com",
        hireDate: "2024-01-01",
        mobilePhone: undefined,
      });

      // Assert: 権限チェックが実行されたことを確認
      expect(auth.getUser).toHaveBeenCalled();
      expect(profileService.getProfileByUserId).toHaveBeenCalledWith(
        "admin-123",
      );
    });

    it("携帯電話番号が任意項目として正しく処理される", async () => {
      // Arrange
      vi.mocked(auth.getUser).mockResolvedValue(mockAdminUser);
      vi.mocked(profileService.getProfileByUserId).mockResolvedValue(
        mockAdminProfile,
      );
      vi.mocked(employeeService.createEmployee).mockResolvedValue({
        ...mockEmployee,
        mobilePhone: "090-1234-5678",
      });

      const formData = new FormData();
      formData.set("employeeNumber", "E002");
      formData.set("nameKanji", "鈴木花子");
      formData.set("nameKana", "スズキハナコ");
      formData.set("email", "suzuki@example.com");
      formData.set("hireDate", "2024-02-01");
      formData.set("mobilePhone", "090-1234-5678");

      // Act & Assert
      await expect(
        createEmployeeAction(undefined, formData),
      ).rejects.toThrowError(/REDIRECT:/);

      expect(employeeService.createEmployee).toHaveBeenCalledWith({
        employeeNumber: "E002",
        nameKanji: "鈴木花子",
        nameKana: "スズキハナコ",
        email: "suzuki@example.com",
        hireDate: "2024-02-01",
        mobilePhone: "090-1234-5678",
      });
    });
  });

  describe("バリデーションエラー時のエラーメッセージ表示", () => {
    beforeEach(() => {
      // 管理者権限は持っている状態
      vi.mocked(auth.getUser).mockResolvedValue(mockAdminUser);
      vi.mocked(profileService.getProfileByUserId).mockResolvedValue(
        mockAdminProfile,
      );
    });

    it("必須フィールドが空の場合、適切なエラーメッセージを返す", async () => {
      // Arrange: 全ての必須フィールドが空
      const formData = new FormData();
      formData.set("employeeNumber", "");
      formData.set("nameKanji", "");
      formData.set("nameKana", "");
      formData.set("email", "");
      formData.set("hireDate", "");

      // Act
      const result = await createEmployeeAction(undefined, formData);

      // Assert: バリデーションエラーが返される
      expect(result.success).toBe(false);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.employeeNumber).toContain(
        "社員番号は必須です",
      );
      expect(result.fieldErrors?.nameKanji).toContain("氏名（漢字）は必須です");
      expect(result.fieldErrors?.nameKana).toContain("氏名（カナ）は必須です");
      expect(result.fieldErrors?.email).toContain("メールアドレスは必須です");
      expect(result.fieldErrors?.hireDate).toContain("入社日は必須です");

      // Assert: createEmployeeは呼ばれない
      expect(employeeService.createEmployee).not.toHaveBeenCalled();
    });

    it("メールアドレスの形式が不正な場合、エラーメッセージを返す", async () => {
      // Arrange
      const formData = new FormData();
      formData.set("employeeNumber", "E003");
      formData.set("nameKanji", "佐藤一郎");
      formData.set("nameKana", "サトウイチロウ");
      formData.set("email", "invalid-email"); // 不正なメール形式
      formData.set("hireDate", "2024-03-01");

      // Act
      const result = await createEmployeeAction(undefined, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.fieldErrors?.email).toContain(
        "有効なメールアドレスを入力してください",
      );
      expect(employeeService.createEmployee).not.toHaveBeenCalled();
    });

    it("入社日が未来の日付の場合、エラーメッセージを返す", async () => {
      // Arrange: 未来の日付を設定
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split("T")[0];

      const formData = new FormData();
      formData.set("employeeNumber", "E004");
      formData.set("nameKanji", "高橋二郎");
      formData.set("nameKana", "タカハシジロウ");
      formData.set("email", "takahashi@example.com");
      formData.set("hireDate", futureDateStr);

      // Act
      const result = await createEmployeeAction(undefined, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.fieldErrors?.hireDate).toContain(
        "入社日は本日以前の日付を指定してください",
      );
      expect(employeeService.createEmployee).not.toHaveBeenCalled();
    });

    it("複数フィールドにエラーがある場合、すべてのエラーメッセージを返す", async () => {
      // Arrange: 複数のバリデーションエラー
      const formData = new FormData();
      formData.set("employeeNumber", ""); // 空
      formData.set("nameKanji", "田中三郎");
      formData.set("nameKana", ""); // 空
      formData.set("email", "invalid"); // 不正な形式
      formData.set("hireDate", "2024-04-01");

      // Act
      const result = await createEmployeeAction(undefined, formData);

      // Assert: すべてのエラーが返される
      expect(result.success).toBe(false);
      expect(result.fieldErrors?.employeeNumber).toBeDefined();
      expect(result.fieldErrors?.nameKana).toBeDefined();
      expect(result.fieldErrors?.email).toBeDefined();
      expect(employeeService.createEmployee).not.toHaveBeenCalled();
    });
  });

  describe("UNIQUE制約違反時のエラーメッセージ表示", () => {
    beforeEach(() => {
      // 管理者権限は持っている状態
      vi.mocked(auth.getUser).mockResolvedValue(mockAdminUser);
      vi.mocked(profileService.getProfileByUserId).mockResolvedValue(
        mockAdminProfile,
      );
    });

    it("社員番号が重複している場合、適切なエラーメッセージを返す", async () => {
      // Arrange: UNIQUE制約違反エラーをモック
      const uniqueError = Object.assign(
        new Error("Unique constraint violation"),
        {
          code: "23505",
          constraint: "employees_employee_number_unique",
        },
      );
      vi.mocked(employeeService.createEmployee).mockRejectedValue(uniqueError);

      const formData = new FormData();
      formData.set("employeeNumber", "E001"); // 既存の社員番号
      formData.set("nameKanji", "渡辺四郎");
      formData.set("nameKana", "ワタナベシロウ");
      formData.set("email", "watanabe@example.com");
      formData.set("hireDate", "2024-05-01");

      // Act
      const result = await createEmployeeAction(undefined, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.fieldErrors?.employeeNumber).toContain(
        "この社員番号は既に使用されています",
      );

      // Assert: createEmployeeは呼ばれている
      expect(employeeService.createEmployee).toHaveBeenCalled();
    });

    it("メールアドレスが重複している場合、適切なエラーメッセージを返す", async () => {
      // Arrange: メールアドレスのUNIQUE制約違反
      const uniqueError = Object.assign(
        new Error("Unique constraint violation"),
        {
          code: "23505",
          constraint: "employees_email_unique",
        },
      );
      vi.mocked(employeeService.createEmployee).mockRejectedValue(uniqueError);

      const formData = new FormData();
      formData.set("employeeNumber", "E005");
      formData.set("nameKanji", "伊藤五郎");
      formData.set("nameKana", "イトウゴロウ");
      formData.set("email", "yamada@example.com"); // 既存のメールアドレス
      formData.set("hireDate", "2024-06-01");

      // Act
      const result = await createEmployeeAction(undefined, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.fieldErrors?.email).toContain(
        "このメールアドレスは既に使用されています",
      );
      expect(employeeService.createEmployee).toHaveBeenCalled();
    });
  });

  describe("権限チェック", () => {
    it("一般ユーザーの場合、エラーメッセージを返す", async () => {
      // Arrange: 一般ユーザーとしてログイン
      const generalUser: User = {
        id: "user-456",
        email: "user@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      };
      const generalUserProfile: Profile = {
        id: "prof-user-456",
        userId: "user-456",
        role: "user",
        createdAt: new Date(),
      };

      vi.mocked(auth.getUser).mockResolvedValue(generalUser);
      vi.mocked(profileService.getProfileByUserId).mockResolvedValue(
        generalUserProfile,
      );

      const formData = new FormData();
      formData.set("employeeNumber", "E006");
      formData.set("nameKanji", "中村六郎");
      formData.set("nameKana", "ナカムラロクロウ");
      formData.set("email", "nakamura@example.com");
      formData.set("hireDate", "2024-07-01");

      // Act
      const result = await createEmployeeAction(undefined, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain("この操作を実行する権限がありません");

      // Assert: createEmployeeは呼ばれない
      expect(employeeService.createEmployee).not.toHaveBeenCalled();
    });

    it("未認証ユーザーの場合、エラーメッセージを返す", async () => {
      // Arrange: 未認証状態
      vi.mocked(auth.getUser).mockResolvedValue(null);

      const formData = new FormData();
      formData.set("employeeNumber", "E007");
      formData.set("nameKanji", "小林七郎");
      formData.set("nameKana", "コバヤシシチロウ");
      formData.set("email", "kobayashi@example.com");
      formData.set("hireDate", "2024-08-01");

      // Act
      const result = await createEmployeeAction(undefined, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain("この操作を実行する権限がありません");
      expect(employeeService.createEmployee).not.toHaveBeenCalled();
    });
  });

  describe("エッジケース", () => {
    beforeEach(() => {
      vi.mocked(auth.getUser).mockResolvedValue(mockAdminUser);
      vi.mocked(profileService.getProfileByUserId).mockResolvedValue(
        mockAdminProfile,
      );
    });

    it("データベースエラーが発生した場合、一般的なエラーメッセージを返す", async () => {
      // Arrange: 一般的なデータベースエラー
      const dbError = new Error("Database connection failed");
      vi.mocked(employeeService.createEmployee).mockRejectedValue(dbError);

      const formData = new FormData();
      formData.set("employeeNumber", "E008");
      formData.set("nameKanji", "加藤八郎");
      formData.set("nameKana", "カトウハチロウ");
      formData.set("email", "kato@example.com");
      formData.set("hireDate", "2024-09-01");

      // Act
      const result = await createEmployeeAction(undefined, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        "社員の作成に失敗しました。もう一度お試しください。",
      );
      expect(employeeService.createEmployee).toHaveBeenCalled();
    });

    it("空文字列の携帯電話番号はundefinedとして処理される", async () => {
      // Arrange
      vi.mocked(employeeService.createEmployee).mockResolvedValue(mockEmployee);

      const formData = new FormData();
      formData.set("employeeNumber", "E009");
      formData.set("nameKanji", "吉田九郎");
      formData.set("nameKana", "ヨシダクロウ");
      formData.set("email", "yoshida@example.com");
      formData.set("hireDate", "2024-10-01");
      formData.set("mobilePhone", ""); // 空文字列

      // Act & Assert
      await expect(
        createEmployeeAction(undefined, formData),
      ).rejects.toThrowError(/REDIRECT:/);

      // Assert: mobilePhoneはundefinedとして渡される
      expect(employeeService.createEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          mobilePhone: undefined,
        }),
      );
    });
  });
});
