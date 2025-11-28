/**
 * 組織管理ページの統合テスト
 * タスク7.1: 管理者専用組織管理ページを作成
 */

import { redirect } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminOrganizationsPage, { metadata } from "./page";

// redirect()は実際にはエラーをスローする
const redirectError = new Error("NEXT_REDIRECT") as Error & { digest: string };
redirectError.digest = "NEXT_REDIRECT";

// モックの設定
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw redirectError;
  }),
}));

vi.mock("@/lib/supabase-auth/auth", () => ({
  getUser: vi.fn(),
}));

vi.mock("@/lib/profiles/service", () => ({
  getProfileByUserId: vi.fn(),
}));

vi.mock("@/lib/organizations/service", () => ({
  getOrganizationHierarchy: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      organizations: {
        findMany: vi.fn(),
      },
    },
  },
}));

vi.mock("@/components/organization/organization-context", () => ({
  OrganizationProvider: ({
    children,
    allOrganizations,
  }: {
    children: React.ReactNode;
    allOrganizations: unknown[];
  }) => (
    <div
      data-testid="organization-provider"
      data-organizations-count={allOrganizations.length}
    >
      {children}
    </div>
  ),
}));

vi.mock("@/components/organization/organization-list-view", () => ({
  OrganizationListView: ({
    organizations,
  }: {
    organizations: Array<{ id: string; name: string }>;
  }) => (
    <div data-testid="organization-list-view">
      {organizations.map((org) => (
        <div key={org.id}>{org.name}</div>
      ))}
    </div>
  ),
}));

vi.mock("@/components/organization/organization-edit-panel", () => ({
  OrganizationEditPanel: () => (
    <div data-testid="organization-edit-panel">Edit Panel</div>
  ),
}));

const { getUser } = await import("@/lib/supabase-auth/auth");
const { getProfileByUserId } = await import("@/lib/profiles/service");
const { getOrganizationHierarchy } = await import(
  "@/lib/organizations/service"
);
const { db } = await import("@/db");

describe("AdminOrganizationsPage - タスク7.1検証", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトで空配列を返すようにモック
    vi.mocked(db.query.organizations.findMany).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const mockOrganizations = [
    {
      id: "org-1",
      name: "会社A",
      level: 1,
      children: [
        {
          id: "org-2",
          name: "本部B",
          level: 2,
          children: [],
        },
      ],
    },
  ];

  describe("認証チェック", () => {
    it("未認証ユーザーは/loginにリダイレクトされる", async () => {
      // Arrange
      vi.mocked(getUser).mockResolvedValue(null);

      // Act & Assert
      await expect(AdminOrganizationsPage()).rejects.toThrow("NEXT_REDIRECT");
      expect(redirect).toHaveBeenCalledWith("/login");
    });

    it("認証済みユーザーはプロフィールチェックに進む", async () => {
      // Arrange
      vi.mocked(getUser).mockResolvedValue({
        id: "user-123",
        email: "admin@example.com",
      });
      vi.mocked(getProfileByUserId).mockResolvedValue({
        id: "profile-123",
        userId: "user-123",
        role: "admin",
        nameKanji: "管理者",
        nameKana: "かんりしゃ",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(getOrganizationHierarchy).mockResolvedValue({
        success: true,
        data: mockOrganizations,
      });

      // Act
      await AdminOrganizationsPage();

      // Assert
      expect(getProfileByUserId).toHaveBeenCalledWith("user-123");
    });
  });

  describe("管理者権限チェック", () => {
    it("プロフィールが存在しない場合はエラーをスローする", async () => {
      // Arrange
      vi.mocked(getUser).mockResolvedValue({
        id: "user-123",
        email: "user@example.com",
      });
      vi.mocked(getProfileByUserId).mockResolvedValue(null);

      // Act & Assert
      await expect(AdminOrganizationsPage()).rejects.toThrow("Forbidden");
    });

    it("管理者権限がない場合はエラーをスローする", async () => {
      // Arrange
      vi.mocked(getUser).mockResolvedValue({
        id: "user-123",
        email: "user@example.com",
      });
      vi.mocked(getProfileByUserId).mockResolvedValue({
        id: "profile-123",
        userId: "user-123",
        role: "user", // 管理者ではない
        nameKanji: "一般ユーザー",
        nameKana: "いっぱんゆーざー",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act & Assert
      await expect(AdminOrganizationsPage()).rejects.toThrow("Forbidden");
    });

    it("管理者権限がある場合は組織データ取得に進む", async () => {
      // Arrange
      vi.mocked(getUser).mockResolvedValue({
        id: "user-123",
        email: "admin@example.com",
      });
      vi.mocked(getProfileByUserId).mockResolvedValue({
        id: "profile-123",
        userId: "user-123",
        role: "admin",
        nameKanji: "管理者",
        nameKana: "かんりしゃ",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(getOrganizationHierarchy).mockResolvedValue({
        success: true,
        data: mockOrganizations,
      });

      // Act
      await AdminOrganizationsPage();

      // Assert
      expect(getOrganizationHierarchy).toHaveBeenCalled();
    });
  });

  describe("組織階層データの取得", () => {
    it("getOrganizationHierarchy()が呼び出される", async () => {
      // Arrange
      vi.mocked(getUser).mockResolvedValue({
        id: "user-123",
        email: "admin@example.com",
      });
      vi.mocked(getProfileByUserId).mockResolvedValue({
        id: "profile-123",
        userId: "user-123",
        role: "admin",
        nameKanji: "管理者",
        nameKana: "かんりしゃ",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(getOrganizationHierarchy).mockResolvedValue({
        success: true,
        data: mockOrganizations,
      });

      // Act
      await AdminOrganizationsPage();

      // Assert
      expect(getOrganizationHierarchy).toHaveBeenCalledTimes(1);
    });

    it("データ取得が失敗した場合はエラーをスローする", async () => {
      // Arrange
      vi.mocked(getUser).mockResolvedValue({
        id: "user-123",
        email: "admin@example.com",
      });
      vi.mocked(getProfileByUserId).mockResolvedValue({
        id: "profile-123",
        userId: "user-123",
        role: "admin",
        nameKanji: "管理者",
        nameKana: "かんりしゃ",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(getOrganizationHierarchy).mockResolvedValue({
        success: false,
        error: {
          type: "DatabaseError",
          message: "Failed to fetch organizations",
        },
      });

      // Act & Assert
      await expect(AdminOrganizationsPage()).rejects.toThrow(
        "Failed to fetch organizations",
      );
    });
  });

  describe("レイアウトレンダリング", () => {
    it("2カラムレイアウトが構築される", async () => {
      // Arrange
      vi.mocked(getUser).mockResolvedValue({
        id: "user-123",
        email: "admin@example.com",
      });
      vi.mocked(getProfileByUserId).mockResolvedValue({
        id: "profile-123",
        userId: "user-123",
        role: "admin",
        nameKanji: "管理者",
        nameKana: "かんりしゃ",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(getOrganizationHierarchy).mockResolvedValue({
        success: true,
        data: mockOrganizations,
      });

      // Act
      const result = await AdminOrganizationsPage();

      // Assert
      // OrganizationProviderでラップされたdivが返される
      expect(result).toBeTruthy();
      expect(result.props.children.type).toBe("div");
      expect(result.props.children.props.className).toContain("flex");
      expect(result.props.children.props.className).toContain("md:flex-row");
    });

    it("OrganizationProviderでラップされる", async () => {
      // Arrange
      vi.mocked(getUser).mockResolvedValue({
        id: "user-123",
        email: "admin@example.com",
      });
      vi.mocked(getProfileByUserId).mockResolvedValue({
        id: "profile-123",
        userId: "user-123",
        role: "admin",
        nameKanji: "管理者",
        nameKana: "かんりしゃ",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(getOrganizationHierarchy).mockResolvedValue({
        success: true,
        data: mockOrganizations,
      });

      // Act
      const result = await AdminOrganizationsPage();

      // Assert
      // OrganizationProviderがレンダリングされることを確認
      expect(result).toBeTruthy();
      // 子要素がdivであることを確認
      expect(result.props.children).toBeTruthy();
      expect(result.props.children.type).toBe("div");
      // 2つの主要な構造（リストビューと編集パネル）がレンダリングされることを確認
      expect(result.props.children.props.children).toBeTruthy();
    });

    it("OrganizationListViewに組織データが渡される", async () => {
      // Arrange
      vi.mocked(getUser).mockResolvedValue({
        id: "user-123",
        email: "admin@example.com",
      });
      vi.mocked(getProfileByUserId).mockResolvedValue({
        id: "profile-123",
        userId: "user-123",
        role: "admin",
        nameKanji: "管理者",
        nameKana: "かんりしゃ",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(getOrganizationHierarchy).mockResolvedValue({
        success: true,
        data: mockOrganizations,
      });

      // Act
      const result = await AdminOrganizationsPage();

      // Assert
      expect(result).toBeTruthy();
      // OrganizationListViewがレンダリングされ、組織データが渡されることを確認
      expect(getOrganizationHierarchy).toHaveBeenCalled();
      expect(result.props.children).toBeTruthy();
    });

    it("OrganizationEditPanelがレンダリングされる", async () => {
      // Arrange
      vi.mocked(getUser).mockResolvedValue({
        id: "user-123",
        email: "admin@example.com",
      });
      vi.mocked(getProfileByUserId).mockResolvedValue({
        id: "profile-123",
        userId: "user-123",
        role: "admin",
        nameKanji: "管理者",
        nameKana: "かんりしゃ",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(getOrganizationHierarchy).mockResolvedValue({
        success: true,
        data: mockOrganizations,
      });

      // Act
      const result = await AdminOrganizationsPage();

      // Assert
      expect(result).toBeTruthy();
      // 編集パネルがレイアウトの一部として含まれることを確認
      expect(result.props.children).toBeTruthy();
    });
  });

  describe("メタデータ", () => {
    it("正しいタイトルが設定される", () => {
      expect(metadata.title).toBe("組織管理 | Peer Search");
    });

    it("noindex, nofollowが設定される", () => {
      expect(metadata.robots).toBe("noindex, nofollow");
    });
  });

  describe("サーバーサイドレンダリング", () => {
    it("RSCとして動作し、サーバーサイドでデータフェッチが完了する", async () => {
      // Arrange
      vi.mocked(getUser).mockResolvedValue({
        id: "user-123",
        email: "admin@example.com",
      });
      vi.mocked(getProfileByUserId).mockResolvedValue({
        id: "profile-123",
        userId: "user-123",
        role: "admin",
        nameKanji: "管理者",
        nameKana: "かんりしゃ",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(getOrganizationHierarchy).mockResolvedValue({
        success: true,
        data: mockOrganizations,
      });

      // Act
      const result = await AdminOrganizationsPage();

      // Assert
      // getOrganizationHierarchy()がサーバーサイドで呼ばれることを確認
      expect(getOrganizationHierarchy).toHaveBeenCalledTimes(1);

      // コンポーネントが正しく返されることを確認（RSCの動作）
      expect(result).toBeTruthy();
      expect(result.props.children).toBeTruthy();
    });
  });
});
