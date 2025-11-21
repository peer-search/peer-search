import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { OrganizationTree } from "@/lib/organizations/types";
import { OrganizationCardList } from "./organization-card-list";

describe("OrganizationCardList", () => {
  it("空配列の場合、空状態メッセージを表示する", () => {
    render(<OrganizationCardList organizations={[]} />);

    expect(screen.getByText("組織データがありません")).toBeInTheDocument();
  });

  it("単一の組織を表示する", () => {
    const organizations: OrganizationTree[] = [
      { id: "1", name: "会社A", level: 1, children: [] },
    ];

    render(<OrganizationCardList organizations={organizations} />);

    expect(screen.getByText("会社A")).toBeInTheDocument();
  });

  it("複数の組織を表示する", () => {
    const organizations: OrganizationTree[] = [
      { id: "1", name: "会社A", level: 1, children: [] },
      { id: "2", name: "会社B", level: 1, children: [] },
      { id: "3", name: "会社C", level: 1, children: [] },
    ];

    render(<OrganizationCardList organizations={organizations} />);

    expect(screen.getByText("会社A")).toBeInTheDocument();
    expect(screen.getByText("会社B")).toBeInTheDocument();
    expect(screen.getByText("会社C")).toBeInTheDocument();
  });

  it("階層構造のある組織を再帰的に表示する", () => {
    const organizations: OrganizationTree[] = [
      {
        id: "1",
        name: "会社A",
        level: 1,
        children: [
          {
            id: "2",
            name: "本部B",
            level: 2,
            children: [{ id: "3", name: "部署C", level: 3, children: [] }],
          },
        ],
      },
    ];

    render(<OrganizationCardList organizations={organizations} />);

    expect(screen.getByText("会社A")).toBeInTheDocument();
    expect(screen.getByText("本部B")).toBeInTheDocument();
    expect(screen.getByText("部署C")).toBeInTheDocument();
  });

  it("トップレベルの場合、グリッドレイアウトのクラスが適用される", () => {
    const organizations: OrganizationTree[] = [
      { id: "1", name: "会社A", level: 1, children: [] },
    ];

    const { container } = render(
      <OrganizationCardList organizations={organizations} />,
    );

    const listContainer = container.querySelector(
      '[data-testid="organization-card-list"]',
    );
    expect(listContainer).toHaveClass("grid");
    expect(listContainer).toHaveClass("grid-cols-1");
  });

  it("ネストされた場合、フレックスレイアウトのクラスが適用される", () => {
    const organizations: OrganizationTree[] = [
      { id: "2", name: "本部B", level: 2, children: [] },
    ];

    const { container } = render(
      <OrganizationCardList organizations={organizations} isNested={true} />,
    );

    const listContainer = container.querySelector(
      '[data-testid="organization-card-list"]',
    );
    expect(listContainer).toHaveClass("flex");
    expect(listContainer).toHaveClass("flex-col");
  });

  it("各組織カードに正しいリンクが設定される", () => {
    const organizations: OrganizationTree[] = [
      { id: "org-1", name: "会社A", level: 1, children: [] },
      { id: "org-2", name: "会社B", level: 1, children: [] },
    ];

    render(<OrganizationCardList organizations={organizations} />);

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/employees?org_id=org-1");
    expect(links[1]).toHaveAttribute("href", "/employees?org_id=org-2");
  });

  it("undefinedの場合も空状態メッセージを表示する", () => {
    // @ts-expect-error - テストのためundefinedを渡す
    render(<OrganizationCardList organizations={undefined} />);

    expect(screen.getByText("組織データがありません")).toBeInTheDocument();
  });
});
