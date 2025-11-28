import type { User } from "@supabase/supabase-js";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserMenu } from "./user-menu";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock Supabase auth
vi.mock("@/lib/supabase-auth/authGoogle", () => ({
  signOut: vi.fn(),
}));

// Get reference to mocked signOut
import { signOut as mockSignOut } from "@/lib/supabase-auth/authGoogle";

describe("UserMenu Component", () => {
  const mockPush = vi.fn();
  const mockUser: User = {
    id: "test-user-id",
    email: "test@example.com",
    user_metadata: {
      avatar_url: "https://example.com/avatar.jpg",
      full_name: "Test User",
    },
    app_metadata: {},
    aud: "authenticated",
    created_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
    });
    mockSignOut.mockResolvedValue(undefined);
  });

  describe("Basic Rendering", () => {
    it("should render user avatar button", () => {
      render(<UserMenu user={mockUser} isAdmin={false} />);

      const trigger = screen.getByRole("button", {
        name: /ユーザーメニューを開く/i,
      });
      expect(trigger).toBeInTheDocument();

      // Avatar component is rendered inside the button
      const avatar = trigger.querySelector("span");
      expect(avatar).toBeInTheDocument();
    });

    it("should render avatar fallback with initials when image fails", () => {
      const userWithoutAvatar = {
        ...mockUser,
        user_metadata: { ...mockUser.user_metadata, avatar_url: undefined },
      };
      render(<UserMenu user={userWithoutAvatar} isAdmin={false} />);

      // AvatarFallback should show first letter of email
      expect(screen.getByText("T")).toBeInTheDocument();
    });

    it("should render user menu trigger button with aria-label", () => {
      render(<UserMenu user={mockUser} isAdmin={false} />);

      const trigger = screen.getByRole("button", {
        name: /ユーザーメニューを開く/i,
      });
      expect(trigger).toBeInTheDocument();
    });
  });

  describe("Menu Interaction", () => {
    it("should open menu when avatar is clicked", async () => {
      const user = userEvent.setup();
      render(<UserMenu user={mockUser} isAdmin={false} />);

      const trigger = screen.getByRole("button", {
        name: /ユーザーメニューを開く/i,
      });
      await user.click(trigger);

      // Menu should be visible
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("should display logout menu item for all users", async () => {
      const user = userEvent.setup();
      render(<UserMenu user={mockUser} isAdmin={false} />);

      const trigger = screen.getByRole("button", {
        name: /ユーザーメニューを開く/i,
      });
      await user.click(trigger);

      expect(
        screen.getByRole("menuitem", { name: /ログアウト/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Permission-based Menu Items", () => {
    it("should show admin menu items when user is admin", async () => {
      const user = userEvent.setup();
      render(<UserMenu user={mockUser} isAdmin={true} />);

      const trigger = screen.getByRole("button", {
        name: /ユーザーメニューを開く/i,
      });
      await user.click(trigger);

      expect(
        screen.getByRole("menuitem", { name: /社員追加/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("menuitem", { name: /部署編集/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("menuitem", { name: /ログアウト/i }),
      ).toBeInTheDocument();
    });

    it("should not show admin menu items when user is not admin", async () => {
      const user = userEvent.setup();
      render(<UserMenu user={mockUser} isAdmin={false} />);

      const trigger = screen.getByRole("button", {
        name: /ユーザーメニューを開く/i,
      });
      await user.click(trigger);

      expect(
        screen.queryByRole("menuitem", { name: /社員追加/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("menuitem", { name: /部署編集/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("menuitem", { name: /ログアウト/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Logout Functionality", () => {
    it("should call signOut and redirect to /login when logout is clicked", async () => {
      const user = userEvent.setup();
      render(<UserMenu user={mockUser} isAdmin={false} />);

      const trigger = screen.getByRole("button", {
        name: /ユーザーメニューを開く/i,
      });
      await user.click(trigger);

      const logoutItem = screen.getByRole("menuitem", { name: /ログアウト/i });
      await user.click(logoutItem);

      // signOut is a server action that internally redirects to /login
      expect(mockSignOut).toHaveBeenCalled();
    });

    it("should handle logout error gracefully", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockSignOut.mockRejectedValueOnce(new Error("Logout failed"));

      const user = userEvent.setup();
      render(<UserMenu user={mockUser} isAdmin={false} />);

      const trigger = screen.getByRole("button", {
        name: /ユーザーメニューを開く/i,
      });
      await user.click(trigger);

      const logoutItem = screen.getByRole("menuitem", { name: /ログアウト/i });
      await user.click(logoutItem);

      expect(mockSignOut).toHaveBeenCalled();
      await vi.waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "ログアウトエラー:",
          expect.any(Error),
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Admin Navigation", () => {
    it("should navigate to /employees/new when 社員追加 is clicked", async () => {
      const user = userEvent.setup();
      render(<UserMenu user={mockUser} isAdmin={true} />);

      const trigger = screen.getByRole("button", {
        name: /ユーザーメニューを開く/i,
      });
      await user.click(trigger);

      const addEmployeeItem = screen.getByRole("menuitem", {
        name: /社員追加/i,
      });
      await user.click(addEmployeeItem);

      expect(mockPush).toHaveBeenCalledWith("/employees/new");
    });

    it("should navigate to /admin/organizations when 部署編集 is clicked", async () => {
      const user = userEvent.setup();
      render(<UserMenu user={mockUser} isAdmin={true} />);

      const trigger = screen.getByRole("button", {
        name: /ユーザーメニューを開く/i,
      });
      await user.click(trigger);

      const editDepartmentsItem = screen.getByRole("menuitem", {
        name: /部署編集/i,
      });
      await user.click(editDepartmentsItem);

      expect(mockPush).toHaveBeenCalledWith("/admin/organizations");
    });
  });
});
