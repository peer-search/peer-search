import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/db/schema";
import * as profileService from "@/lib/profiles/service";
import * as s3Delete from "@/lib/s3/delete";
import * as auth from "@/lib/supabase-auth/auth";
import {
  checkAdminPermission,
  createEmployeeAction,
  deleteEmployeeAction,
  updateEmployeeAction,
} from "./actions";
import * as employeeService from "./service";

// Mock dependencies
vi.mock("@/db", () => ({
  db: {},
}));
vi.mock("@/lib/supabase-auth/auth");
vi.mock("@/lib/profiles/service");
vi.mock("@/lib/s3/delete");
vi.mock("./service");
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

describe("checkAdminPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("管理者権限がある場合は例外をスローしない", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "user-123",
      role: "admin",
    } as Profile);

    // Act & Assert
    await expect(checkAdminPermission()).resolves.not.toThrow();
  });

  it("一般ユーザーの場合は'Forbidden'エラーをスローする", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-456",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "user-456",
      role: "user",
    } as Profile);

    // Act & Assert
    await expect(checkAdminPermission()).rejects.toThrow("Forbidden");
  });

  it("未認証ユーザーの場合は'Unauthorized'エラーをスローする", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue(null);

    // Act & Assert
    await expect(checkAdminPermission()).rejects.toThrow("Unauthorized");
  });

  it("プロフィールが存在しない場合は'Forbidden'エラーをスローする", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-789",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue(null);

    // Act & Assert
    await expect(checkAdminPermission()).rejects.toThrow("Forbidden");
  });
});

describe("createEmployeeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("管理者権限がない場合はエラーを返す", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-456",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "user-456",
      role: "user",
    } as Profile);

    const formData = new FormData();
    formData.set("employeeNumber", "E001");
    formData.set("nameKanji", "山田太郎");
    formData.set("nameKana", "ヤマダタロウ");
    formData.set("email", "yamada@example.com");
    formData.set("hireDate", "2024-01-01");

    // Act
    const result = await createEmployeeAction(undefined, formData);

    // Assert
    expect(result.success).toBe(false);
    expect(result.errors).toContain("この操作を実行する権限がありません");
  });

  it("バリデーションエラーがある場合はfieldErrorsを返す", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "admin-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "admin-123",
      role: "admin",
    } as Profile);

    const formData = new FormData();
    formData.set("employeeNumber", "");
    formData.set("nameKanji", "");
    formData.set("nameKana", "");
    formData.set("email", "invalid-email");
    formData.set("hireDate", "");

    // Act
    const result = await createEmployeeAction(undefined, formData);

    // Assert
    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
    expect(result.fieldErrors?.employeeNumber).toContain("社員番号は必須です");
    expect(result.fieldErrors?.nameKanji).toContain("氏名（漢字）は必須です");
    expect(result.fieldErrors?.email).toContain(
      "有効なメールアドレスを入力してください",
    );
  });

  it("UNIQUE制約違反時にfieldErrorsを返す", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "admin-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "admin-123",
      role: "admin",
    } as Profile);

    const error = Object.assign(new Error("Unique constraint violation"), {
      code: "23505",
      constraint: "employees_employee_number_unique",
    });
    vi.mocked(employeeService.createEmployee).mockRejectedValue(error);

    const formData = new FormData();
    formData.set("employeeNumber", "E001");
    formData.set("nameKanji", "山田太郎");
    formData.set("nameKana", "ヤマダタロウ");
    formData.set("email", "yamada@example.com");
    formData.set("hireDate", "2024-01-01");

    // Act
    const result = await createEmployeeAction(undefined, formData);

    // Assert
    expect(result.success).toBe(false);
    expect(result.fieldErrors?.employeeNumber).toContain(
      "この社員番号は既に使用されています",
    );
  });

  it("正常に社員を作成し、リダイレクトする", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "admin-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "admin-123",
      role: "admin",
    } as Profile);
    vi.mocked(employeeService.createEmployee).mockResolvedValue({
      id: "emp-new-123",
      employeeNumber: "E001",
      nameKanji: "山田太郎",
      nameKana: "ヤマダタロウ",
      email: "yamada@example.com",
      hireDate: new Date("2024-01-01"),
      photoS3Key: null,
      mobilePhone: null,
      organizations: [],
    });

    const formData = new FormData();
    formData.set("employeeNumber", "E001");
    formData.set("nameKanji", "山田太郎");
    formData.set("nameKana", "ヤマダタロウ");
    formData.set("email", "yamada@example.com");
    formData.set("hireDate", "2024-01-01");

    // Act & Assert
    await expect(
      createEmployeeAction(undefined, formData),
    ).rejects.toThrowError(/REDIRECT:\/employees\/emp-new-123/);
  });

  it("写真S3キー付きで社員を作成する", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "admin-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "admin-123",
      role: "admin",
    } as Profile);
    vi.mocked(employeeService.createEmployee).mockResolvedValue({
      id: "emp-new-456",
      employeeNumber: "E002",
      nameKanji: "田中花子",
      nameKana: "タナカハナコ",
      email: "tanaka@example.com",
      hireDate: new Date("2024-02-01"),
      photoS3Key: "employee-photos/abc123.jpg",
      mobilePhone: null,
      organizations: [],
    });

    const formData = new FormData();
    formData.set("employeeNumber", "E002");
    formData.set("nameKanji", "田中花子");
    formData.set("nameKana", "タナカハナコ");
    formData.set("email", "tanaka@example.com");
    formData.set("hireDate", "2024-02-01");
    formData.set("photoS3Key", "employee-photos/abc123.jpg");

    // Act & Assert
    await expect(
      createEmployeeAction(undefined, formData),
    ).rejects.toThrowError(/REDIRECT:\/employees\/emp-new-456/);
    expect(employeeService.createEmployee).toHaveBeenCalledWith({
      employeeNumber: "E002",
      nameKanji: "田中花子",
      nameKana: "タナカハナコ",
      email: "tanaka@example.com",
      hireDate: "2024-02-01",
      mobilePhone: undefined,
      photoS3Key: "employee-photos/abc123.jpg",
    });
  });
});

describe("updateEmployeeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("管理者権限がない場合はエラーを返す", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-456",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "user-456",
      role: "user",
    } as Profile);

    const formData = new FormData();
    formData.set("nameKanji", "山田次郎");

    // Act
    const result = await updateEmployeeAction(undefined, formData, "emp-123");

    // Assert
    expect(result.success).toBe(false);
    expect(result.errors).toContain("この操作を実行する権限がありません");
  });

  it("バリデーションエラーがある場合はfieldErrorsを返す", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "admin-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "admin-123",
      role: "admin",
    } as Profile);

    const formData = new FormData();
    formData.set("email", "invalid-email");

    // Act
    const result = await updateEmployeeAction(undefined, formData, "emp-123");

    // Assert
    expect(result.success).toBe(false);
    expect(result.fieldErrors?.email).toContain(
      "有効なメールアドレスを入力してください",
    );
  });

  it("正常に社員情報を更新する", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "admin-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "admin-123",
      role: "admin",
    } as Profile);
    vi.mocked(employeeService.updateEmployee).mockResolvedValue({
      id: "emp-123",
      employeeNumber: "E001",
      nameKanji: "山田次郎",
      nameKana: "ヤマダジロウ",
      email: "yamada2@example.com",
      hireDate: new Date("2024-01-01"),
      photoS3Key: null,
      mobilePhone: null,
      organizations: [],
    });

    const formData = new FormData();
    formData.set("nameKanji", "山田次郎");
    formData.set("nameKana", "ヤマダジロウ");
    formData.set("email", "yamada2@example.com");
    formData.set("hireDate", "2024-01-01");

    // Act
    const result = await updateEmployeeAction(undefined, formData, "emp-123");

    // Assert
    expect(result.success).toBe(true);
    expect(employeeService.updateEmployee).toHaveBeenCalledWith("emp-123", {
      nameKanji: "山田次郎",
      nameKana: "ヤマダジロウ",
      email: "yamada2@example.com",
      hireDate: "2024-01-01",
      mobilePhone: null,
      photoS3Key: undefined,
    });
  });

  it("写真を更新し、古い写真を削除する", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "admin-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "admin-123",
      role: "admin",
    } as Profile);
    vi.mocked(employeeService.getEmployeeById).mockResolvedValue({
      id: "emp-123",
      employeeNumber: "E001",
      nameKanji: "山田太郎",
      nameKana: "ヤマダタロウ",
      email: "yamada@example.com",
      hireDate: new Date("2024-01-01"),
      photoS3Key: "employee-photos/old123.jpg",
      mobilePhone: null,
      organizations: [],
    });
    vi.mocked(employeeService.updateEmployee).mockResolvedValue({
      id: "emp-123",
      employeeNumber: "E001",
      nameKanji: "山田太郎",
      nameKana: "ヤマダタロウ",
      email: "yamada@example.com",
      hireDate: new Date("2024-01-01"),
      photoS3Key: "employee-photos/new456.jpg",
      mobilePhone: null,
      organizations: [],
    });
    vi.mocked(s3Delete.deleteS3Object).mockResolvedValue(true);

    const formData = new FormData();
    formData.set("nameKanji", "山田太郎");
    formData.set("nameKana", "ヤマダタロウ");
    formData.set("email", "yamada@example.com");
    formData.set("hireDate", "2024-01-01");
    formData.set("photoS3Key", "employee-photos/new456.jpg");

    // Act
    const result = await updateEmployeeAction(undefined, formData, "emp-123");

    // Assert
    expect(result.success).toBe(true);
    expect(employeeService.updateEmployee).toHaveBeenCalledWith("emp-123", {
      nameKanji: "山田太郎",
      nameKana: "ヤマダタロウ",
      email: "yamada@example.com",
      hireDate: "2024-01-01",
      mobilePhone: null,
      photoS3Key: "employee-photos/new456.jpg",
    });
    expect(s3Delete.deleteS3Object).toHaveBeenCalledWith(
      "employee-photos/old123.jpg",
    );
  });

  it("写真削除時に古い写真をS3から削除する", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "admin-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "admin-123",
      role: "admin",
    } as Profile);
    vi.mocked(employeeService.getEmployeeById).mockResolvedValue({
      id: "emp-123",
      employeeNumber: "E001",
      nameKanji: "山田太郎",
      nameKana: "ヤマダタロウ",
      email: "yamada@example.com",
      hireDate: new Date("2024-01-01"),
      photoS3Key: "employee-photos/old123.jpg",
      mobilePhone: null,
      organizations: [],
    });
    vi.mocked(employeeService.updateEmployee).mockResolvedValue({
      id: "emp-123",
      employeeNumber: "E001",
      nameKanji: "山田太郎",
      nameKana: "ヤマダタロウ",
      email: "yamada@example.com",
      hireDate: new Date("2024-01-01"),
      photoS3Key: null,
      mobilePhone: null,
      organizations: [],
    });
    vi.mocked(s3Delete.deleteS3Object).mockResolvedValue(true);

    const formData = new FormData();
    formData.set("nameKanji", "山田太郎");
    formData.set("nameKana", "ヤマダタロウ");
    formData.set("email", "yamada@example.com");
    formData.set("hireDate", "2024-01-01");
    formData.set("photoS3Key", "null");

    // Act
    const result = await updateEmployeeAction(undefined, formData, "emp-123");

    // Assert
    expect(result.success).toBe(true);
    expect(employeeService.updateEmployee).toHaveBeenCalledWith("emp-123", {
      nameKanji: "山田太郎",
      nameKana: "ヤマダタロウ",
      email: "yamada@example.com",
      hireDate: "2024-01-01",
      mobilePhone: null,
      photoS3Key: null,
    });
    expect(s3Delete.deleteS3Object).toHaveBeenCalledWith(
      "employee-photos/old123.jpg",
    );
  });

  it("S3削除失敗時もDB更新は成功する", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "admin-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "admin-123",
      role: "admin",
    } as Profile);
    vi.mocked(employeeService.getEmployeeById).mockResolvedValue({
      id: "emp-123",
      employeeNumber: "E001",
      nameKanji: "山田太郎",
      nameKana: "ヤマダタロウ",
      email: "yamada@example.com",
      hireDate: new Date("2024-01-01"),
      photoS3Key: "employee-photos/old123.jpg",
      mobilePhone: null,
      organizations: [],
    });
    vi.mocked(employeeService.updateEmployee).mockResolvedValue({
      id: "emp-123",
      employeeNumber: "E001",
      nameKanji: "山田太郎",
      nameKana: "ヤマダタロウ",
      email: "yamada@example.com",
      hireDate: new Date("2024-01-01"),
      photoS3Key: "employee-photos/new456.jpg",
      mobilePhone: null,
      organizations: [],
    });
    vi.mocked(s3Delete.deleteS3Object).mockResolvedValue(false);

    const formData = new FormData();
    formData.set("nameKanji", "山田太郎");
    formData.set("nameKana", "ヤマダタロウ");
    formData.set("email", "yamada@example.com");
    formData.set("hireDate", "2024-01-01");
    formData.set("photoS3Key", "employee-photos/new456.jpg");

    // Act
    const result = await updateEmployeeAction(undefined, formData, "emp-123");

    // Assert (要件3.6準拠: S3削除失敗時もDB更新成功)
    expect(result.success).toBe(true);
    expect(s3Delete.deleteS3Object).toHaveBeenCalledWith(
      "employee-photos/old123.jpg",
    );
  });
});

describe("deleteEmployeeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("管理者権限がない場合は例外をスローする", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-456",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "user-456",
      role: "user",
    } as Profile);

    // Act & Assert
    await expect(deleteEmployeeAction(undefined, "emp-123")).rejects.toThrow(
      "Forbidden",
    );
  });

  it("正常に社員を削除し、リダイレクトする", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "admin-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "admin-123",
      role: "admin",
    } as Profile);
    vi.mocked(employeeService.deleteEmployee).mockResolvedValue();

    // Act & Assert
    await expect(
      deleteEmployeeAction(undefined, "emp-123"),
    ).rejects.toThrowError(/REDIRECT:\/employees/);
    expect(employeeService.deleteEmployee).toHaveBeenCalledWith("emp-123");
  });
});
