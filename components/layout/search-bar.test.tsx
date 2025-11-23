import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBar } from "./search-bar";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

describe("SearchBar Component", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
    });
  });

  describe("Basic Rendering", () => {
    it("should render search element with form inside", () => {
      render(<SearchBar />);
      const searchElement = document.querySelector("search");
      expect(searchElement).toBeInTheDocument();
      const form = searchElement?.querySelector("form");
      expect(form).toBeInTheDocument();
    });

    it("should render search type dropdown with default '氏名' selected", () => {
      render(<SearchBar />);
      // shadcn/ui Select uses combobox role
      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();
      expect(select).toHaveTextContent("氏名");
    });

    it("should render search input field with aria-label", () => {
      render(<SearchBar />);
      const input = screen.getByLabelText("検索キーワード");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "text");
    });

    it("should render search button", () => {
      render(<SearchBar />);
      const button = screen.getByRole("button", { name: /検索/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe("Search Type Selection", () => {
    it("should have hidden select with all options for accessibility", () => {
      render(<SearchBar />);

      // Radix UI Select renders a hidden native select for accessibility
      const hiddenSelect = document.querySelector('select[aria-hidden="true"]');
      expect(hiddenSelect).toBeInTheDocument();

      const options = hiddenSelect?.querySelectorAll("option");
      expect(options).toHaveLength(3);
      expect(options?.[0]).toHaveTextContent("氏名");
      expect(options?.[1]).toHaveTextContent("社員番号");
      expect(options?.[2]).toHaveTextContent("入社年");
    });
  });

  describe("Placeholder Text", () => {
    it("should show appropriate placeholder for '氏名' search type", () => {
      render(<SearchBar />);
      const input = screen.getByLabelText("検索キーワード");
      expect(input).toHaveAttribute(
        "placeholder",
        expect.stringContaining("氏名"),
      );
    });
  });

  describe("Search Execution", () => {
    it("should navigate to /employees with type and query params when search button is clicked", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);

      const input = screen.getByLabelText("検索キーワード");
      await user.type(input, "山田");

      const button = screen.getByRole("button", { name: /検索/i });
      await user.click(button);

      expect(mockPush).toHaveBeenCalledWith(
        "/employees?type=name&q=%E5%B1%B1%E7%94%B0",
      );
    });

    it("should navigate to /employees without params when query is empty", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);

      const button = screen.getByRole("button", { name: /検索/i });
      await user.click(button);

      expect(mockPush).toHaveBeenCalledWith("/employees");
    });

    it("should navigate with correct type parameter for employeeNumber", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);

      // Change search type via hidden select (simulating user interaction)
      const hiddenSelect = document.querySelector(
        'select[aria-hidden="true"]',
      ) as HTMLSelectElement;
      if (hiddenSelect) {
        hiddenSelect.value = "employeeNumber";
        hiddenSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }

      const input = screen.getByLabelText("検索キーワード");
      await user.type(input, "EMP001");

      const button = screen.getByRole("button", { name: /検索/i });
      await user.click(button);

      expect(mockPush).toHaveBeenCalledWith(
        "/employees?type=employeeNumber&q=EMP001",
      );
    });

    it("should execute search when Enter key is pressed in input field", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);

      const input = screen.getByLabelText("検索キーワード");
      await user.type(input, "太郎{Enter}");

      expect(mockPush).toHaveBeenCalledWith(
        "/employees?type=name&q=%E5%A4%AA%E9%83%8E",
      );
    });
  });
});
