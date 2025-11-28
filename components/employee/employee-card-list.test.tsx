import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Employee } from "@/lib/employees/service";
import { EmployeeCardList } from "./employee-card-list";

// Next.jsのImageとLinkをモック
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // biome-ignore lint/performance/noImgElement: Test mock for Next.js Image
    <img src={src} alt={alt} />
  ),
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

describe("EmployeeCardList", () => {
  const mockEmployees: Employee[] = [
    {
      id: "1",
      employeeNumber: "E001",
      nameKanji: "山田太郎",
      nameKana: "やまだたろう",
      photoS3Key: "employees/photos/test1.jpg",
      mobilePhone: "090-1234-5678",
      email: "yamada@example.com",
      hireDate: new Date("2020-04-01"),
      organizations: [
        {
          organizationId: "org1",
          organizationName: "開発部",
          organizationPath: "会社 > 開発部",
          position: "部長",
        },
      ],
    },
    {
      id: "2",
      employeeNumber: "E002",
      nameKanji: "鈴木花子",
      nameKana: "すずきはなこ",
      photoS3Key: "employees/photos/test2.jpg",
      mobilePhone: "090-9876-5432",
      email: "suzuki@example.com",
      hireDate: new Date("2021-04-01"),
      organizations: [
        {
          organizationId: "org2",
          organizationName: "営業部",
          organizationPath: "会社 > 営業部",
          position: "課長",
        },
      ],
    },
    {
      id: "3",
      employeeNumber: "E003",
      nameKanji: "佐藤次郎",
      nameKana: "さとうじろう",
      photoS3Key: null,
      mobilePhone: null,
      email: "sato@example.com",
      hireDate: new Date("2022-04-01"),
      organizations: [],
    },
  ];

  it("社員配列が正しくレンダリングされる", () => {
    render(<EmployeeCardList employees={mockEmployees} />);

    // 3人の社員がレンダリングされていることを確認
    expect(screen.getByText("山田太郎")).toBeInTheDocument();
    expect(screen.getByText("鈴木花子")).toBeInTheDocument();
    expect(screen.getByText("佐藤次郎")).toBeInTheDocument();
  });

  it("空配列の場合、メッセージが表示される", () => {
    render(<EmployeeCardList employees={[]} />);

    expect(screen.getByText("社員が見つかりませんでした")).toBeInTheDocument();
  });

  it("空配列の場合、カードが表示されない", () => {
    render(<EmployeeCardList employees={[]} />);

    // カードが存在しないことを確認（社員番号で確認）
    expect(screen.queryByText("E001")).not.toBeInTheDocument();
  });

  it("グリッドレイアウトのクラスが適用されている", () => {
    const { container } = render(
      <EmployeeCardList employees={mockEmployees} />,
    );

    const gridElement = container.querySelector(".grid");
    expect(gridElement).toBeInTheDocument();
    expect(gridElement).toHaveClass("grid-cols-1");
    expect(gridElement).toHaveClass("md:grid-cols-2");
    expect(gridElement).toHaveClass("lg:grid-cols-3");
  });

  it("正しい数の社員カードがレンダリングされる", () => {
    render(<EmployeeCardList employees={mockEmployees} />);

    // role="article"でカードの数を確認
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(3);
  });

  it("各社員カードに一意のキーが設定されている", () => {
    const { container } = render(
      <EmployeeCardList employees={mockEmployees} />,
    );

    // すべてのリンク要素を取得
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(3);

    // 各リンクが異なるhrefを持つことを確認
    const hrefs = Array.from(links).map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/employees/1");
    expect(hrefs).toContain("/employees/2");
    expect(hrefs).toContain("/employees/3");
  });
});
