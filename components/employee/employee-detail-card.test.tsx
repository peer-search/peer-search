import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Employee } from "@/lib/employees/service";
import { EmployeeDetailCard } from "./employee-detail-card";

const mockEmployee: Employee = {
  id: "123",
  employeeNumber: "12345",
  nameKanji: "山田太郎",
  nameKana: "やまだたろう",
  photoS3Key: "photos/123.jpg",
  mobilePhone: "090-1234-5678",
  email: "yamada@example.com",
  hireDate: new Date("2020-04-01"),
  organizations: [
    {
      organizationId: "org1",
      organizationName: "第一課",
      organizationPath: "ABC株式会社 技術本部 開発部 第一課",
      position: "課長",
    },
  ],
};

describe("EmployeeDetailCard", () => {
  it("社員情報を正しく表示する", () => {
    render(<EmployeeDetailCard employee={mockEmployee} />);
    expect(screen.getByText("山田太郎")).toBeInTheDocument();
    expect(screen.getByText("やまだたろう")).toBeInTheDocument();
    expect(screen.getByText("12345")).toBeInTheDocument();
    expect(screen.getByText("2020年")).toBeInTheDocument();
  });

  it("メールアドレスがリンクとして表示される", () => {
    render(<EmployeeDetailCard employee={mockEmployee} />);
    const mailLink = screen.getByRole("link", { name: "yamada@example.com" });
    expect(mailLink).toHaveAttribute("href", "mailto:yamada@example.com");
  });

  it("所属情報が複数行で表示される", () => {
    render(<EmployeeDetailCard employee={mockEmployee} />);
    expect(
      screen.getByText("ABC株式会社 技術本部 開発部 第一課 (課長)"),
    ).toBeInTheDocument();
  });

  it("携帯電話がnullの場合「未登録」を表示する", () => {
    const employeeWithoutPhone = { ...mockEmployee, mobilePhone: null };
    render(<EmployeeDetailCard employee={employeeWithoutPhone} />);
    expect(screen.getByText("未登録")).toBeInTheDocument();
  });

  it("役職がない所属情報は括弧なしで表示される", () => {
    const employeeWithoutPosition: Employee = {
      ...mockEmployee,
      organizations: [
        {
          organizationId: "org2",
          organizationName: "第二課",
          organizationPath: "ABC株式会社 技術本部 開発部 第二課",
          position: null,
        },
      ],
    };
    render(<EmployeeDetailCard employee={employeeWithoutPosition} />);
    expect(
      screen.getByText("ABC株式会社 技術本部 開発部 第二課"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\(/)).not.toBeInTheDocument();
  });

  it("所属情報がない場合は「所属情報なし」を表示する", () => {
    const employeeWithoutOrganizations: Employee = {
      ...mockEmployee,
      organizations: [],
    };
    render(<EmployeeDetailCard employee={employeeWithoutOrganizations} />);
    expect(screen.getByText("所属情報なし")).toBeInTheDocument();
  });

  it("複数の所属情報がある場合はすべて表示される", () => {
    const employeeWithMultipleOrgs: Employee = {
      ...mockEmployee,
      organizations: [
        {
          organizationId: "org1",
          organizationName: "第一課",
          organizationPath: "ABC株式会社 技術本部 開発部 第一課",
          position: "課長",
        },
        {
          organizationId: "org2",
          organizationName: "プロジェクトチーム",
          organizationPath: "ABC株式会社 技術本部 プロジェクトチーム",
          position: "リーダー",
        },
      ],
    };
    render(<EmployeeDetailCard employee={employeeWithMultipleOrgs} />);
    expect(
      screen.getByText("ABC株式会社 技術本部 開発部 第一課 (課長)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("ABC株式会社 技術本部 プロジェクトチーム (リーダー)"),
    ).toBeInTheDocument();
  });
});
