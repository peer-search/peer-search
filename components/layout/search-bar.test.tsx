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
      // There are two comboboxes: search type and hire year
      const comboboxes = screen.getAllByRole("combobox");
      expect(comboboxes[0]).toHaveTextContent("氏名");
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

    it("should render hire year filter checkbox", () => {
      render(<SearchBar />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();
    });

    it("should render hire year dropdown (disabled by default)", () => {
      render(<SearchBar />);
      const comboboxes = screen.getAllByRole("combobox");
      // Second combobox is hire year
      expect(comboboxes[1]).toBeDisabled();
    });
  });

  describe("Search Type Selection", () => {
    it("should have hidden select with name and employeeNumber options", () => {
      render(<SearchBar />);

      // Radix UI Select renders a hidden native select for accessibility
      const hiddenSelects = document.querySelectorAll(
        'select[aria-hidden="true"]',
      );
      // First hidden select is for search type
      const searchTypeSelect = hiddenSelects[0];

      const options = searchTypeSelect?.querySelectorAll("option");
      expect(options).toHaveLength(2);
      expect(options?.[0]).toHaveTextContent("氏名");
      expect(options?.[1]).toHaveTextContent("社員番号");
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

  describe("Search Execution - Basic Query", () => {
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

    it("should navigate to /employees without params when query is empty and hire year is off", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);

      const button = screen.getByRole("button", { name: /検索/i });
      await user.click(button);

      expect(mockPush).toHaveBeenCalledWith("/employees");
    });

    it("should navigate with correct type parameter for employeeNumber", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);

      // Change search type via hidden select
      const hiddenSelects = document.querySelectorAll(
        'select[aria-hidden="true"]',
      );
      const searchTypeSelect = hiddenSelects[0] as HTMLSelectElement;
      if (searchTypeSelect) {
        searchTypeSelect.value = "employeeNumber";
        searchTypeSelect.dispatchEvent(new Event("change", { bubbles: true }));
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

  describe("Hire Year Filter", () => {
    it("should enable hire year dropdown when checkbox is checked", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);

      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      const comboboxes = screen.getAllByRole("combobox");
      expect(comboboxes[1]).not.toBeDisabled();
    });

    it("should navigate with hire_year param when hire year filter is enabled", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);

      // Enable hire year filter
      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      // Enter search query
      const input = screen.getByLabelText("検索キーワード");
      await user.type(input, "山田");

      const button = screen.getByRole("button", { name: /検索/i });
      await user.click(button);

      // Should include current year by default
      const currentYear = new Date().getFullYear();
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining(`hire_year=${currentYear}`),
      );
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("type=name&q=%E5%B1%B1%E7%94%B0"),
      );
    });

    it("should navigate with only hire_year when query is empty", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);

      // Enable hire year filter
      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      const button = screen.getByRole("button", { name: /検索/i });
      await user.click(button);

      const currentYear = new Date().getFullYear();
      expect(mockPush).toHaveBeenCalledWith(
        `/employees?hire_year=${currentYear}`,
      );
    });

    it("should not include hire_year param when filter is disabled", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);

      const input = screen.getByLabelText("検索キーワード");
      await user.type(input, "山田");

      const button = screen.getByRole("button", { name: /検索/i });
      await user.click(button);

      expect(mockPush).toHaveBeenCalledWith(
        "/employees?type=name&q=%E5%B1%B1%E7%94%B0",
      );
      expect(mockPush).not.toHaveBeenCalledWith(
        expect.stringContaining("hire_year"),
      );
    });
  });
});
