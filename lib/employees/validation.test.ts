import { describe, expect, it } from "vitest";
import type { CreateEmployeeInput } from "./types";
import { validateEmployeeData } from "./validation";

describe("validateEmployeeData", () => {
  describe("成功パターン", () => {
    it("有効なデータの場合は success: true を返す", () => {
      const validData: CreateEmployeeInput = {
        employeeNumber: "EMP001",
        nameKanji: "山田太郎",
        nameKana: "ヤマダタロウ",
        email: "yamada@example.com",
        hireDate: "2024-01-15",
        mobilePhone: "090-1234-5678",
      };

      const result = validateEmployeeData(validData);

      expect(result.success).toBe(true);
      expect(result.fieldErrors).toBeUndefined();
    });

    it("携帯電話が未設定でも成功する", () => {
      const validData: CreateEmployeeInput = {
        employeeNumber: "EMP001",
        nameKanji: "山田太郎",
        nameKana: "ヤマダタロウ",
        email: "yamada@example.com",
        hireDate: "2024-01-15",
      };

      const result = validateEmployeeData(validData);

      expect(result.success).toBe(true);
    });
  });

  describe("社員番号のバリデーション", () => {
    it("社員番号が空の場合はエラーを返す", () => {
      const invalidData = {
        employeeNumber: "",
        nameKanji: "山田太郎",
        nameKana: "ヤマダタロウ",
        email: "yamada@example.com",
        hireDate: "2024-01-15",
      };

      const result = validateEmployeeData(invalidData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.employeeNumber).toEqual([
        "社員番号は必須です",
      ]);
    });

    it("社員番号が20文字を超える場合はエラーを返す", () => {
      const invalidData = {
        employeeNumber: "A".repeat(21),
        nameKanji: "山田太郎",
        nameKana: "ヤマダタロウ",
        email: "yamada@example.com",
        hireDate: "2024-01-15",
      };

      const result = validateEmployeeData(invalidData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.employeeNumber).toEqual([
        "社員番号は20文字以内で入力してください",
      ]);
    });
  });

  describe("氏名（漢字）のバリデーション", () => {
    it("氏名（漢字）が空の場合はエラーを返す", () => {
      const invalidData = {
        employeeNumber: "EMP001",
        nameKanji: "",
        nameKana: "ヤマダタロウ",
        email: "yamada@example.com",
        hireDate: "2024-01-15",
      };

      const result = validateEmployeeData(invalidData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.nameKanji).toEqual(["氏名（漢字）は必須です"]);
    });

    it("氏名（漢字）が100文字を超える場合はエラーを返す", () => {
      const invalidData = {
        employeeNumber: "EMP001",
        nameKanji: "あ".repeat(101),
        nameKana: "ヤマダタロウ",
        email: "yamada@example.com",
        hireDate: "2024-01-15",
      };

      const result = validateEmployeeData(invalidData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.nameKanji).toEqual([
        "氏名（漢字）は100文字以内で入力してください",
      ]);
    });
  });

  describe("氏名（カナ）のバリデーション", () => {
    it("氏名（カナ）が空の場合はエラーを返す", () => {
      const invalidData = {
        employeeNumber: "EMP001",
        nameKanji: "山田太郎",
        nameKana: "",
        email: "yamada@example.com",
        hireDate: "2024-01-15",
      };

      const result = validateEmployeeData(invalidData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.nameKana).toEqual(["氏名（カナ）は必須です"]);
    });

    it("氏名（カナ）が100文字を超える場合はエラーを返す", () => {
      const invalidData = {
        employeeNumber: "EMP001",
        nameKanji: "山田太郎",
        nameKana: "ア".repeat(101),
        email: "yamada@example.com",
        hireDate: "2024-01-15",
      };

      const result = validateEmployeeData(invalidData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.nameKana).toEqual([
        "氏名（カナ）は100文字以内で入力してください",
      ]);
    });
  });

  describe("メールアドレスのバリデーション", () => {
    it("メールアドレスが空の場合はエラーを返す", () => {
      const invalidData = {
        employeeNumber: "EMP001",
        nameKanji: "山田太郎",
        nameKana: "ヤマダタロウ",
        email: "",
        hireDate: "2024-01-15",
      };

      const result = validateEmployeeData(invalidData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.email).toEqual(["メールアドレスは必須です"]);
    });

    it("メールアドレスの形式が不正な場合はエラーを返す", () => {
      const testCases = [
        "invalid",
        "invalid@",
        "@invalid.com",
        "invalid@com",
        "invalid@.com",
      ];

      for (const email of testCases) {
        const invalidData = {
          employeeNumber: "EMP001",
          nameKanji: "山田太郎",
          nameKana: "ヤマダタロウ",
          email,
          hireDate: "2024-01-15",
        };

        const result = validateEmployeeData(invalidData);

        expect(result.success).toBe(false);
        expect(result.fieldErrors?.email).toEqual([
          "有効なメールアドレスを入力してください",
        ]);
      }
    });

    it("メールアドレスが255文字を超える場合はエラーを返す", () => {
      const invalidData = {
        employeeNumber: "EMP001",
        nameKanji: "山田太郎",
        nameKana: "ヤマダタロウ",
        email: `${"a".repeat(250)}@test.com`,
        hireDate: "2024-01-15",
      };

      const result = validateEmployeeData(invalidData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.email).toEqual([
        "メールアドレスは255文字以内で入力してください",
      ]);
    });
  });

  describe("入社日のバリデーション", () => {
    it("入社日が空の場合はエラーを返す", () => {
      const invalidData = {
        employeeNumber: "EMP001",
        nameKanji: "山田太郎",
        nameKana: "ヤマダタロウ",
        email: "yamada@example.com",
        hireDate: "",
      };

      const result = validateEmployeeData(invalidData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.hireDate).toEqual(["入社日は必須です"]);
    });

    it("入社日が不正な形式の場合はエラーを返す", () => {
      const invalidData = {
        employeeNumber: "EMP001",
        nameKanji: "山田太郎",
        nameKana: "ヤマダタロウ",
        email: "yamada@example.com",
        hireDate: "invalid-date",
      };

      const result = validateEmployeeData(invalidData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.hireDate).toEqual([
        "有効な日付を入力してください",
      ]);
    });

    it("入社日が未来の日付の場合はエラーを返す", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split("T")[0];

      const invalidData = {
        employeeNumber: "EMP001",
        nameKanji: "山田太郎",
        nameKana: "ヤマダタロウ",
        email: "yamada@example.com",
        hireDate: futureDateStr,
      };

      const result = validateEmployeeData(invalidData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.hireDate).toEqual([
        "入社日は本日以前の日付を指定してください",
      ]);
    });

    it("入社日が本日の場合は成功する", () => {
      const today = new Date().toISOString().split("T")[0];

      const validData = {
        employeeNumber: "EMP001",
        nameKanji: "山田太郎",
        nameKana: "ヤマダタロウ",
        email: "yamada@example.com",
        hireDate: today,
      };

      const result = validateEmployeeData(validData);

      expect(result.success).toBe(true);
    });
  });

  describe("携帯電話のバリデーション", () => {
    it("携帯電話が20文字を超える場合はエラーを返す", () => {
      const invalidData = {
        employeeNumber: "EMP001",
        nameKanji: "山田太郎",
        nameKana: "ヤマダタロウ",
        email: "yamada@example.com",
        hireDate: "2024-01-15",
        mobilePhone: "0".repeat(21),
      };

      const result = validateEmployeeData(invalidData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.mobilePhone).toEqual([
        "携帯電話は20文字以内で入力してください",
      ]);
    });

    it("携帯電話が空文字列の場合はエラーにならない", () => {
      const validData = {
        employeeNumber: "EMP001",
        nameKanji: "山田太郎",
        nameKana: "ヤマダタロウ",
        email: "yamada@example.com",
        hireDate: "2024-01-15",
        mobilePhone: "",
      };

      const result = validateEmployeeData(validData);

      expect(result.success).toBe(true);
    });
  });

  describe("複数フィールドエラー", () => {
    it("複数のフィールドにエラーがある場合は全てのエラーを返す", () => {
      const invalidData = {
        employeeNumber: "",
        nameKanji: "",
        nameKana: "",
        email: "invalid",
        hireDate: "",
      };

      const result = validateEmployeeData(invalidData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.employeeNumber).toBeDefined();
      expect(result.fieldErrors?.nameKanji).toBeDefined();
      expect(result.fieldErrors?.nameKana).toBeDefined();
      expect(result.fieldErrors?.email).toBeDefined();
      expect(result.fieldErrors?.hireDate).toBeDefined();
    });
  });
});
