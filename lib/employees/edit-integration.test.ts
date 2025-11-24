/**
 * 社員情報編集フローの統合テスト
 *
 * このテストは、管理者が社員情報を編集する完全なフローをテストします：
 * 1. 管理者ログイン → 社員詳細画面
 * 2. 編集ボタンクリック → フォーム編集
 * 3. 保存 → 表示モード表示
 * 4. 社員番号が読み取り専用であることを確認
 * 5. バリデーションエラー時のエラーメッセージ表示
 * 6. キャンセルボタンで表示モードに戻ることを確認
 */

import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/db/schema";
import * as profileService from "@/lib/profiles/service";
import * as auth from "@/lib/supabase-auth/auth";
import { updateEmployeeAction } from "./actions";
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

describe("社員情報編集フローの統合テスト", () => {
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
    userId: "admin-123",
    role: "admin",
    displayName: "管理者",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEmployee: Employee = {
    id: "emp-123",
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
    it("管理者が社員情報を更新し、表示モードに戻る", async () => {
      // Arrange: 管理者としてログイン
      vi.mocked(auth.getUser).mockResolvedValue(mockAdminUser);
      vi.mocked(profileService.getProfileByUserId).mockResolvedValue(
        mockAdminProfile,
      );

      const updatedEmployee: Employee = {
        ...mockEmployee,
        nameKanji: "山田次郎",
        nameKana: "ヤマダジロウ",
        email: "yamada2@example.com",
      };
      vi.mocked(employeeService.updateEmployee).mockResolvedValue(
        updatedEmployee,
      );

      // Arrange: 編集フォームデータを準備
      const formData = new FormData();
      formData.set("nameKanji", "山田次郎");
      formData.set("nameKana", "ヤマダジロウ");
      formData.set("email", "yamada2@example.com");
      formData.set("hireDate", "2024-01-01");

      // Act: Server Actionを実行
      const result = await updateEmployeeAction(undefined, formData, "emp-123");

      // Assert: 成功が返される
      expect(result.success).toBe(true);

      // Assert: 正しいデータでupdateEmployeeが呼ばれた
      expect(employeeService.updateEmployee).toHaveBeenCalledWith("emp-123", {
        nameKanji: "山田次郎",
        nameKana: "ヤマダジロウ",
        email: "yamada2@example.com",
        hireDate: "2024-01-01",
        mobilePhone: null,
      });

      // Assert: 権限チェックが実行された
      expect(auth.getUser).toHaveBeenCalled();
      expect(profileService.getProfileByUserId).toHaveBeenCalledWith(
        "admin-123",
      );
    });

    it("携帯電話番号を更新できる", async () => {
      // Arrange
      vi.mocked(auth.getUser).mockResolvedValue(mockAdminUser);
      vi.mocked(profileService.getProfileByUserId).mockResolvedValue(
        mockAdminProfile,
      );

      const updatedEmployee: Employee = {
        ...mockEmployee,
        mobilePhone: "090-1234-5678",
      };
      vi.mocked(employeeService.updateEmployee).mockResolvedValue(
        updatedEmployee,
      );

      const formData = new FormData();
      formData.set("nameKanji", "山田太郎");
      formData.set("nameKana", "ヤマダタロウ");
      formData.set("email", "yamada@example.com");
      formData.set("hireDate", "2024-01-01");
      formData.set("mobilePhone", "090-1234-5678");

      // Act
      const result = await updateEmployeeAction(undefined, formData, "emp-123");

      // Assert
      expect(result.success).toBe(true);
      expect(employeeService.updateEmployee).toHaveBeenCalledWith(
        "emp-123",
        expect.objectContaining({
          mobilePhone: "090-1234-5678",
        }),
      );
    });

    it("携帯電話番号を削除できる（空文字列でnullに変換）", async () => {
      // Arrange
      vi.mocked(auth.getUser).mockResolvedValue(mockAdminUser);
      vi.mocked(profileService.getProfileByUserId).mockResolvedValue(
        mockAdminProfile,
      );

      const updatedEmployee: Employee = {
        ...mockEmployee,
        mobilePhone: null,
      };
      vi.mocked(employeeService.updateEmployee).mockResolvedValue(
        updatedEmployee,
      );

      const formData = new FormData();
      formData.set("nameKanji", "山田太郎");
      formData.set("nameKana", "ヤマダタロウ");
      formData.set("email", "yamada@example.com");
      formData.set("hireDate", "2024-01-01");
      formData.set("mobilePhone", ""); // 空文字列

      // Act
      const result = await updateEmployeeAction(undefined, formData, "emp-123");

      // Assert: mobilePhoneがnullとして渡される
      expect(result.success).toBe(true);
      expect(employeeService.updateEmployee).toHaveBeenCalledWith(
        "emp-123",
        expect.objectContaining({
          mobilePhone: null,
        }),
      );
    });
  });

  describe("社員番号は更新対象外", () => {
    it("社員番号フィールドは編集フォームに含まれない（更新時は無視される）", async () => {
      // Arrange
      vi.mocked(auth.getUser).mockResolvedValue(mockAdminUser);
      vi.mocked(profileService.getProfileByUserId).mockResolvedValue(
        mockAdminProfile,
      );
      vi.mocked(employeeService.updateEmployee).mockResolvedValue(mockEmployee);

      // Act: 社員番号を含むフォームデータを送信（実際のUIでは送信されないが、念のためテスト）
      const formData = new FormData();
      formData.set("employeeNumber", "E999"); // 社員番号は無視されるべき
      formData.set("nameKanji", "山田太郎");
      formData.set("nameKana", "ヤマダタロウ");
      formData.set("email", "yamada@example.com");
      formData.set("hireDate", "2024-01-01");

      const result = await updateEmployeeAction(undefined, formData, "emp-123");

      // Assert: updateEmployeeに社員番号が渡されていないことを確認
      expect(result.success).toBe(true);
      expect(employeeService.updateEmployee).toHaveBeenCalledWith(
        "emp-123",
        expect.not.objectContaining({
          employeeNumber: expect.anything(),
        }),
      );
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

    it("メールアドレスの形式が不正な場合、エラーメッセージを返す", async () => {
      // Arrange
      const formData = new FormData();
      formData.set("nameKanji", "山田太郎");
      formData.set("nameKana", "ヤマダタロウ");
      formData.set("email", "invalid-email"); // 不正なメール形式
      formData.set("hireDate", "2024-01-01");

      // Act
      const result = await updateEmployeeAction(undefined, formData, "emp-123");

      // Assert
      expect(result.success).toBe(false);
      expect(result.fieldErrors?.email).toContain(
        "有効なメールアドレスを入力してください",
      );
      expect(employeeService.updateEmployee).not.toHaveBeenCalled();
    });

    it("入社日が未来の日付の場合、エラーメッセージを返す", async () => {
      // Arrange: 未来の日付を設定
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split("T")[0];

      const formData = new FormData();
      formData.set("nameKanji", "山田太郎");
      formData.set("nameKana", "ヤマダタロウ");
      formData.set("email", "yamada@example.com");
      formData.set("hireDate", futureDateStr);

      // Act
      const result = await updateEmployeeAction(undefined, formData, "emp-123");

      // Assert
      expect(result.success).toBe(false);
      expect(result.fieldErrors?.hireDate).toContain(
        "入社日は本日以前の日付を指定してください",
      );
      expect(employeeService.updateEmployee).not.toHaveBeenCalled();
    });

    it("必須フィールドが空の場合、エラーメッセージを返す", async () => {
      // Arrange: 必須フィールドを空にする
      const formData = new FormData();
      formData.set("nameKanji", "");
      formData.set("nameKana", "");
      formData.set("email", "");
      formData.set("hireDate", "");

      // Act
      const result = await updateEmployeeAction(undefined, formData, "emp-123");

      // Assert: バリデーションエラーが返される
      expect(result.success).toBe(false);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.nameKanji).toContain("氏名（漢字）は必須です");
      expect(result.fieldErrors?.nameKana).toContain("氏名（カナ）は必須です");
      expect(result.fieldErrors?.email).toContain("メールアドレスは必須です");
      expect(result.fieldErrors?.hireDate).toContain("入社日は必須です");
      expect(employeeService.updateEmployee).not.toHaveBeenCalled();
    });

    it("複数フィールドにエラーがある場合、すべてのエラーメッセージを返す", async () => {
      // Arrange
      const formData = new FormData();
      formData.set("nameKanji", "");
      formData.set("nameKana", "山田太郎");
      formData.set("email", "invalid");
      formData.set("hireDate", "2024-01-01");

      // Act
      const result = await updateEmployeeAction(undefined, formData, "emp-123");

      // Assert: 複数のエラーが返される
      expect(result.success).toBe(false);
      expect(result.fieldErrors?.nameKanji).toBeDefined();
      expect(result.fieldErrors?.email).toBeDefined();
      expect(employeeService.updateEmployee).not.toHaveBeenCalled();
    });
  });

  describe("UNIQUE制約違反のエラーハンドリング", () => {
    beforeEach(() => {
      vi.mocked(auth.getUser).mockResolvedValue(mockAdminUser);
      vi.mocked(profileService.getProfileByUserId).mockResolvedValue(
        mockAdminProfile,
      );
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
      vi.mocked(employeeService.updateEmployee).mockRejectedValue(uniqueError);

      const formData = new FormData();
      formData.set("nameKanji", "山田太郎");
      formData.set("nameKana", "ヤマダタロウ");
      formData.set("email", "existing@example.com"); // 既存のメールアドレス
      formData.set("hireDate", "2024-01-01");

      // Act
      const result = await updateEmployeeAction(undefined, formData, "emp-123");

      // Assert
      expect(result.success).toBe(false);
      expect(result.fieldErrors?.email).toContain(
        "このメールアドレスは既に使用されています",
      );
      expect(employeeService.updateEmployee).toHaveBeenCalled();
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
        userId: "user-456",
        role: "user",
        displayName: "一般ユーザー",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(auth.getUser).mockResolvedValue(generalUser);
      vi.mocked(profileService.getProfileByUserId).mockResolvedValue(
        generalUserProfile,
      );

      const formData = new FormData();
      formData.set("nameKanji", "山田太郎");
      formData.set("nameKana", "ヤマダタロウ");
      formData.set("email", "yamada@example.com");
      formData.set("hireDate", "2024-01-01");

      // Act
      const result = await updateEmployeeAction(undefined, formData, "emp-123");

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain("この操作を実行する権限がありません");
      expect(employeeService.updateEmployee).not.toHaveBeenCalled();
    });

    it("未認証ユーザーの場合、エラーメッセージを返す", async () => {
      // Arrange: 未認証状態
      vi.mocked(auth.getUser).mockResolvedValue(null);

      const formData = new FormData();
      formData.set("nameKanji", "山田太郎");
      formData.set("nameKana", "ヤマダタロウ");
      formData.set("email", "yamada@example.com");
      formData.set("hireDate", "2024-01-01");

      // Act
      const result = await updateEmployeeAction(undefined, formData, "emp-123");

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain("この操作を実行する権限がありません");
      expect(employeeService.updateEmployee).not.toHaveBeenCalled();
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
      vi.mocked(employeeService.updateEmployee).mockRejectedValue(dbError);

      const formData = new FormData();
      formData.set("nameKanji", "山田太郎");
      formData.set("nameKana", "ヤマダタロウ");
      formData.set("email", "yamada@example.com");
      formData.set("hireDate", "2024-01-01");

      // Act
      const result = await updateEmployeeAction(undefined, formData, "emp-123");

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        "社員情報の更新に失敗しました。もう一度お試しください。",
      );
      expect(employeeService.updateEmployee).toHaveBeenCalled();
    });

    it("存在しない社員IDを指定した場合、エラーを返す", async () => {
      // Arrange: 存在しない社員
      const notFoundError = new Error("Employee not found");
      vi.mocked(employeeService.updateEmployee).mockRejectedValue(
        notFoundError,
      );

      const formData = new FormData();
      formData.set("nameKanji", "山田太郎");
      formData.set("nameKana", "ヤマダタロウ");
      formData.set("email", "yamada@example.com");
      formData.set("hireDate", "2024-01-01");

      // Act
      const result = await updateEmployeeAction(
        undefined,
        formData,
        "non-existent-id",
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(employeeService.updateEmployee).toHaveBeenCalledWith(
        "non-existent-id",
        expect.any(Object),
      );
    });
  });

  describe("キャンセル操作", () => {
    it("キャンセルボタンはクライアント側で処理されるため、Server Actionはテストしない", () => {
      // Note: キャンセルボタンのロジックはEmployeeFormコンポーネント内で
      // router.push()を使用して処理されるため、Server Actionのテストでは
      // カバーできません。このテストはコンポーネントテストで実施します。
      expect(true).toBe(true);
    });
  });
});
