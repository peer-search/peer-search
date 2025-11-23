import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Employee } from "@/lib/employees/service";
import { EmployeeCard } from "./employee-card";

// Next.jsのImageとLinkをモック
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
  }: {
    src: string;
    alt: string;
    // biome-ignore lint/performance/noImgElement: Test mock for Next.js Image
  }) => <img src={src} alt={alt} />,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// S3 URLユーティリティをモック
vi.mock("@/lib/s3/url", () => ({
  getS3Url: (key: string) =>
    `https://test-bucket.s3.ap-northeast-1.amazonaws.com/${key}`,
}));

describe("EmployeeCard", () => {
  const mockEmployee: Employee = {
    id: "1",
    employeeNumber: "E001",
    nameKanji: "山田太郎",
    nameKana: "やまだたろう",
    photoS3Key: "employees/photos/test.jpg",
    mobilePhone: "090-1234-5678",
    email: "yamada@example.com",
    hireDate: new Date("2020-04-01"),
    organizations: [
      {
        organizationId: "org1",
        organizationName: "開発部",
        organizationPath: "会社 > 本部 > 開発部",
        position: "部長",
      },
    ],
  };

  it("社員情報が正しく表示される", () => {
    render(<EmployeeCard employee={mockEmployee} />);

    expect(screen.getByText("山田太郎")).toBeInTheDocument();
    expect(screen.getByText("やまだたろう")).toBeInTheDocument();
    expect(screen.getByText("E001")).toBeInTheDocument();
    expect(screen.getByText("090-1234-5678")).toBeInTheDocument();
    expect(screen.getByText("yamada@example.com")).toBeInTheDocument();
  });

  it("所属組織情報が正しく表示される", () => {
    render(<EmployeeCard employee={mockEmployee} />);

    expect(screen.getByText("会社 > 本部 > 開発部")).toBeInTheDocument();
    expect(screen.getByText(/部長/)).toBeInTheDocument();
  });

  it("複数所属の場合、すべての所属が表示される", () => {
    const employeeWithMultipleOrgs: Employee = {
      ...mockEmployee,
      organizations: [
        {
          organizationId: "org1",
          organizationName: "開発部",
          organizationPath: "会社 > 開発部",
          position: "部長",
        },
        {
          organizationId: "org2",
          organizationName: "営業部",
          organizationPath: "会社 > 営業部",
          position: "課長",
        },
      ],
    };

    render(<EmployeeCard employee={employeeWithMultipleOrgs} />);

    expect(screen.getByText("会社 > 開発部")).toBeInTheDocument();
    expect(screen.getByText("会社 > 営業部")).toBeInTheDocument();
    expect(screen.getByText(/部長/)).toBeInTheDocument();
    expect(screen.getByText(/課長/)).toBeInTheDocument();
  });

  it("所属なしの場合、「所属なし」と表示される", () => {
    const employeeWithoutOrgs: Employee = {
      ...mockEmployee,
      organizations: [],
    };

    render(<EmployeeCard employee={employeeWithoutOrgs} />);

    expect(screen.getByText("所属なし")).toBeInTheDocument();
  });

  it("photoS3Keyがnullの場合、プレースホルダー画像が表示される", () => {
    const employeeWithoutPhoto: Employee = {
      ...mockEmployee,
      photoS3Key: null,
    };

    render(<EmployeeCard employee={employeeWithoutPhoto} />);

    const img = screen.getByAltText("山田太郎の写真");
    expect(img).toHaveAttribute("src", "/placeholder-avatar.svg");
  });

  it("mobilePhoneがnullの場合、携帯電話が表示されない", () => {
    const employeeWithoutPhone: Employee = {
      ...mockEmployee,
      mobilePhone: null,
    };

    render(<EmployeeCard employee={employeeWithoutPhone} />);

    expect(screen.queryByText("携帯電話:")).not.toBeInTheDocument();
  });

  it("正しいリンク先が設定されている", () => {
    render(<EmployeeCard employee={mockEmployee} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/employees/1");
  });

  it("ARIA属性が正しく設定されている", () => {
    render(<EmployeeCard employee={mockEmployee} />);

    const card = screen.getByRole("article");
    expect(card).toHaveAttribute("aria-label", "山田太郎の社員カード");
  });
});
