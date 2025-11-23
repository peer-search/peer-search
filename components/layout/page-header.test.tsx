import type { User } from "@supabase/supabase-js";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PageHeader } from "./page-header";

// Mock child components
vi.mock("./search-bar", () => ({
  SearchBar: () => <div data-testid="search-bar">SearchBar Mock</div>,
}));

vi.mock("./user-menu", () => ({
  UserMenu: ({ user, isAdmin }: { user: User; isAdmin: boolean }) => (
    <div data-testid="user-menu">
      UserMenu Mock - {user.email} - Admin: {isAdmin.toString()}
    </div>
  ),
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("PageHeader Component", () => {
  const mockUser: User = {
    id: "test-user-id",
    email: "test@example.com",
    user_metadata: {
      avatar_url: "https://example.com/avatar.jpg",
    },
    app_metadata: {},
    aud: "authenticated",
    created_at: "2024-01-01T00:00:00Z",
  };

  describe("Basic Structure", () => {
    it("should render header element", () => {
      render(<PageHeader user={mockUser} isAdmin={false} />);

      const header = document.querySelector("header");
      expect(header).toBeInTheDocument();
    });

    it("should render all three main components: logo, SearchBar, UserMenu", () => {
      render(<PageHeader user={mockUser} isAdmin={false} />);

      // Logo/System name
      expect(screen.getByText(/peer-search/i)).toBeInTheDocument();

      // SearchBar (appears twice for responsive design: desktop + mobile)
      const searchBars = screen.getAllByTestId("search-bar");
      expect(searchBars.length).toBeGreaterThanOrEqual(1);

      // UserMenu
      expect(screen.getByTestId("user-menu")).toBeInTheDocument();
    });

    it("should render logo as a link to home page", () => {
      render(<PageHeader user={mockUser} isAdmin={false} />);

      const logoLink = screen.getByRole("link", { name: /peer-search/i });
      expect(logoLink).toBeInTheDocument();
      expect(logoLink).toHaveAttribute("href", "/");
    });
  });

  describe("Permission Handling", () => {
    it("should pass isAdmin=true to UserMenu when user is admin", () => {
      render(<PageHeader user={mockUser} isAdmin={true} />);

      const userMenu = screen.getByTestId("user-menu");
      expect(userMenu).toHaveTextContent("Admin: true");
    });

    it("should pass isAdmin=false to UserMenu when user is not admin", () => {
      render(<PageHeader user={mockUser} isAdmin={false} />);

      const userMenu = screen.getByTestId("user-menu");
      expect(userMenu).toHaveTextContent("Admin: false");
    });

    it("should pass user object to UserMenu", () => {
      render(<PageHeader user={mockUser} isAdmin={false} />);

      const userMenu = screen.getByTestId("user-menu");
      expect(userMenu).toHaveTextContent(mockUser.email);
    });
  });

  describe("Layout", () => {
    it("should have container with flex layout", () => {
      render(<PageHeader user={mockUser} isAdmin={false} />);

      const header = document.querySelector("header");
      expect(header).toBeInTheDocument();

      // The inner container has flex layout
      const container = header?.querySelector(".container");
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass("flex");
    });
  });
});
