import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmployeesPage from "./page";

// Mock dependencies
vi.mock("@/lib/supabase-auth/auth", () => ({
  getUser: vi.fn(),
}));

vi.mock("@/lib/employees/service", () => ({
  searchEmployees: vi.fn(),
}));

vi.mock("@/components/employee/employee-card-list", () => ({
  EmployeeCardList: ({ employees }: { employees: unknown[] }) => (
    <div data-testid="employee-card-list">
      Employee List ({employees.length})
    </div>
  ),
}));

vi.mock("@/components/employee/sort-controls", () => ({
  SortControls: ({
    currentSort,
    currentOrder,
  }: {
    currentSort?: string;
    currentOrder?: string;
  }) => (
    <div data-testid="sort-controls">
      SortControls: {currentSort || "none"} {currentOrder || "asc"}
    </div>
  ),
}));

import { searchEmployees } from "@/lib/employees/service";
import { getUser } from "@/lib/supabase-auth/auth";

describe("EmployeesPage - ソートUI", () => {
  const mockUser = {
    id: "user-1",
    email: "test@example.com",
  };

  const mockEmployees = [
    {
      id: "emp1",
      employeeNumber: "E001",
      nameKanji: "山田太郎",
      nameKana: "やまだたろう",
      photoS3Key: null,
      mobilePhone: "090-1234-5678",
      email: "yamada@example.com",
      hireDate: new Date("2020-04-01"),
      organizations: [],
    },
    {
      id: "emp2",
      employeeNumber: "E002",
      nameKanji: "佐藤花子",
      nameKana: "さとうはなこ",
      photoS3Key: null,
      mobilePhone: null,
      email: "sato@example.com",
      hireDate: new Date("2021-01-01"),
      organizations: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue(mockUser);
    vi.mocked(searchEmployees).mockResolvedValue(mockEmployees);
  });

  it("SortControlsが表示される", async () => {
    // Act
    const searchParams = Promise.resolve({});
    const result = await EmployeesPage({ searchParams });
    render(result);

    // Assert
    expect(screen.getByTestId("sort-controls")).toBeInTheDocument();
  });

  it("SortControlsが正しいソート状態を受け取る（ソート指定なし）", async () => {
    // Act
    const searchParams = Promise.resolve({});
    const result = await EmployeesPage({ searchParams });
    render(result);

    // Assert
    const sortControls = screen.getByTestId("sort-controls");

    // Should show "none asc" when no sort is specified
    expect(sortControls).toHaveTextContent("SortControls: none asc");
  });

  it("SortControlsが正しいソート状態を受け取る（氏名かな昇順）", async () => {
    // Act
    const searchParams = Promise.resolve({
      sort: "name_kana" as const,
      order: "asc" as const,
    });
    const result = await EmployeesPage({ searchParams });
    render(result);

    // Assert
    const sortControls = screen.getByTestId("sort-controls");

    // Should show the correct sort state
    expect(sortControls).toHaveTextContent("SortControls: name_kana asc");
  });

  it("SortControlsが正しいソート状態を受け取る（社員番号降順）", async () => {
    // Act
    const searchParams = Promise.resolve({
      sort: "employee_number" as const,
      order: "desc" as const,
    });
    const result = await EmployeesPage({ searchParams });
    render(result);

    // Assert
    const sortControls = screen.getByTestId("sort-controls");

    // Should show the correct sort state
    expect(sortControls).toHaveTextContent(
      "SortControls: employee_number desc",
    );
  });

  it("SortControlsが正しいソート状態を受け取る（入社年昇順）", async () => {
    // Act
    const searchParams = Promise.resolve({
      sort: "hire_date" as const,
      order: "asc" as const,
    });
    const result = await EmployeesPage({ searchParams });
    render(result);

    // Assert
    const sortControls = screen.getByTestId("sort-controls");

    // Should show the correct sort state
    expect(sortControls).toHaveTextContent("SortControls: hire_date asc");
  });

  it("検索条件が存在する場合でもソートUIが正常に表示される", async () => {
    // Act - with search conditions
    const searchParams = Promise.resolve({
      type: "name" as const,
      q: "山田",
      hire_year: "2020",
      sort: "name_kana" as const,
      order: "asc" as const,
    });
    const result = await EmployeesPage({ searchParams });
    render(result);

    // Assert: Sort UI should be visible
    expect(screen.getByTestId("sort-controls")).toBeInTheDocument();

    // Should reflect the current sort state
    const sortControls = screen.getByTestId("sort-controls");
    expect(sortControls).toHaveTextContent("SortControls: name_kana asc");

    // Search conditions should also be displayed
    expect(screen.getByText(/氏名「山田」/)).toBeInTheDocument();
    expect(screen.getByText(/入社年「2020年」/)).toBeInTheDocument();
  });
});
