import type { User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import type { Organization, Profile } from "@/db/schema";
import * as profileService from "@/lib/profiles/service";
import * as auth from "@/lib/supabase-auth/auth";
import {
  checkAdminPermission,
  createOrganizationAction,
  updateOrganizationAction,
} from "./actions";
import type { CreateOrganizationInput, UpdateOrganizationInput } from "./types";

// Mock dependencies
vi.mock("@/db", () => ({
  db: {
    query: {
      organizations: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
    transaction: vi.fn(),
  },
}));
vi.mock("@/lib/supabase-auth/auth");
vi.mock("@/lib/profiles/service");
vi.mock("./service", () => ({
  validateParentSelection: vi.fn(),
  getDescendantIds: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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

describe("createOrganizationAction", () => {
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

    const input: CreateOrganizationInput = {
      name: "テスト本部",
      parentId: "parent-1",
    };

    // Act
    const result = await createOrganizationAction(input);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("名称が空文字列の場合はバリデーションエラーを返す", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "user-123",
      role: "admin",
    } as Profile);

    const input: CreateOrganizationInput = {
      name: "",
      parentId: "parent-1",
    };

    // Act
    const result = await createOrganizationAction(input);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("名称は必須");
  });

  it("名称が255文字を超える場合はバリデーションエラーを返す", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "user-123",
      role: "admin",
    } as Profile);

    const input: CreateOrganizationInput = {
      name: "a".repeat(256),
      parentId: "parent-1",
    };

    // Act
    const result = await createOrganizationAction(input);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("255文字");
  });

  it("親組織がレベル4の場合はエラーを返す", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "user-123",
      role: "admin",
    } as Profile);

    vi.mocked(db.query.organizations.findFirst).mockResolvedValue({
      id: "parent-1",
      name: "課",
      level: 4,
      parentId: "parent-0",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Organization);

    const input: CreateOrganizationInput = {
      name: "テスト",
      parentId: "parent-1",
    };

    // Act
    const result = await createOrganizationAction(input);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("課／チーム配下には追加できません");
  });

  it("正常な入力で組織を追加できる", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "user-123",
      role: "admin",
    } as Profile);

    vi.mocked(db.query.organizations.findFirst).mockResolvedValue({
      id: "parent-1",
      name: "本部",
      level: 2,
      parentId: "parent-0",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Organization);

    const mockInsert = vi.fn(() => ({
      values: vi.fn().mockResolvedValue(undefined),
    }));
    vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

    const input: CreateOrganizationInput = {
      name: "テスト本部",
      parentId: "parent-1",
    };

    // Act
    const result = await createOrganizationAction(input);

    // Assert
    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/organizations");
  });

  it("親がnullの場合はルート組織として追加できる", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "user-123",
      role: "admin",
    } as Profile);

    const mockInsert = vi.fn(() => ({
      values: vi.fn().mockResolvedValue(undefined),
    }));
    vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

    const input: CreateOrganizationInput = {
      name: "テスト会社",
      parentId: null,
    };

    // Act
    const result = await createOrganizationAction(input);

    // Assert
    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/organizations");
  });
});

describe("updateOrganizationAction", () => {
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

    const input: UpdateOrganizationInput = {
      id: "org-1",
      name: "更新後の名前",
      parentId: "parent-1",
    };

    // Act
    const result = await updateOrganizationAction(input);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("名称が空文字列の場合はバリデーションエラーを返す", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "user-123",
      role: "admin",
    } as Profile);

    const input: UpdateOrganizationInput = {
      id: "org-1",
      name: "",
      parentId: "parent-1",
    };

    // Act
    const result = await updateOrganizationAction(input);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("名称は必須");
  });

  it("名称が255文字を超える場合はバリデーションエラーを返す", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "user-123",
      role: "admin",
    } as Profile);

    const input: UpdateOrganizationInput = {
      id: "org-1",
      name: "a".repeat(256),
      parentId: "parent-1",
    };

    // Act
    const result = await updateOrganizationAction(input);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("255文字");
  });

  it("循環参照がある場合はエラーを返す", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "user-123",
      role: "admin",
    } as Profile);

    // Mock validateParentSelection to return false (circular reference)
    const { validateParentSelection } = await import("./service");
    vi.mocked(validateParentSelection).mockResolvedValue(false);

    const input: UpdateOrganizationInput = {
      id: "org-1",
      name: "更新後の名前",
      parentId: "org-2",
    };

    // Act
    const result = await updateOrganizationAction(input);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain(
      "親組織に自分自身または子部署は選択できません",
    );
  });

  it("組織が存在しない場合はエラーを返す", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "user-123",
      role: "admin",
    } as Profile);

    vi.mocked(db.query.organizations.findFirst).mockResolvedValue(undefined);

    const input: UpdateOrganizationInput = {
      id: "org-1",
      name: "更新後の名前",
      parentId: null,
    };

    // Act
    const result = await updateOrganizationAction(input);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("組織が見つかりません");
  });

  it("名称のみ更新できる", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "user-123",
      role: "admin",
    } as Profile);

    const { validateParentSelection } = await import("./service");
    vi.mocked(validateParentSelection).mockResolvedValue(true);

    vi.mocked(db.query.organizations.findFirst).mockResolvedValue({
      id: "org-1",
      name: "元の名前",
      level: 2,
      parentId: "parent-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Organization);

    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn(() => ({ where: mockWhere }));
    const mockUpdate = vi.fn(() => ({ set: mockSet }));
    vi.mocked(db.update).mockImplementation(mockUpdate as any);

    const input: UpdateOrganizationInput = {
      id: "org-1",
      name: "更新後の名前",
      parentId: "parent-1",
    };

    // Act
    const result = await updateOrganizationAction(input);

    // Assert
    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/organizations");
  });

  it("親組織を変更すると階層レベルが再計算される", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "user-123",
      role: "admin",
    } as Profile);

    const { validateParentSelection, getDescendantIds } = await import(
      "./service"
    );
    vi.mocked(validateParentSelection).mockResolvedValue(true);
    vi.mocked(getDescendantIds).mockResolvedValue(["org-2", "org-3"]);

    // First call: current node
    vi.mocked(db.query.organizations.findFirst)
      .mockResolvedValueOnce({
        id: "org-1",
        name: "元の名前",
        level: 3,
        parentId: "old-parent",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Organization)
      // Second call: new parent
      .mockResolvedValueOnce({
        id: "new-parent",
        name: "新しい親",
        level: 1,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Organization);

    const mockTransaction = vi.fn((callback) => callback(db));
    vi.mocked(db.transaction).mockImplementation(mockTransaction as any);

    const mockUpdate = vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    }));
    vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

    const input: UpdateOrganizationInput = {
      id: "org-1",
      name: "更新後の名前",
      parentId: "new-parent",
    };

    // Act
    const result = await updateOrganizationAction(input);

    // Assert
    expect(result.success).toBe(true);
    expect(mockTransaction).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/admin/organizations");
  });

  it("親をnullに変更するとルート組織になる", async () => {
    // Arrange
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-123",
    } as User);
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
      userId: "user-123",
      role: "admin",
    } as Profile);

    const { getDescendantIds } = await import("./service");
    vi.mocked(getDescendantIds).mockResolvedValue([]);

    vi.mocked(db.query.organizations.findFirst).mockResolvedValue({
      id: "org-1",
      name: "元の名前",
      level: 2,
      parentId: "parent-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Organization);

    const mockTransaction = vi.fn((callback) => callback(db));
    vi.mocked(db.transaction).mockImplementation(mockTransaction as any);

    const mockUpdate = vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    }));
    vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

    const input: UpdateOrganizationInput = {
      id: "org-1",
      name: "更新後の名前",
      parentId: null,
    };

    // Act
    const result = await updateOrganizationAction(input);

    // Assert
    expect(result.success).toBe(true);
    expect(mockTransaction).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/admin/organizations");
  });
});
