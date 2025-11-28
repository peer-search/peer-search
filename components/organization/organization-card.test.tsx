import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { OrganizationTree } from "@/lib/organizations/types";
import { OrganizationCard } from "./organization-card";

describe("OrganizationCard", () => {
  it("組織名を表示する", () => {
    const node: OrganizationTree = {
      id: "1",
      name: "会社A",
      level: 1,
      children: [],
    };

    render(<OrganizationCard node={node} />);

    expect(screen.getByText("会社A")).toBeInTheDocument();
  });

  it("社員一覧へのリンクが正しいURLを持つ", () => {
    const node: OrganizationTree = {
      id: "test-org-id",
      name: "本部B",
      level: 2,
      children: [],
    };

    render(<OrganizationCard node={node} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/employees?org_id=test-org-id");
  });

  it("適切なaria-labelを持つ", () => {
    const node: OrganizationTree = {
      id: "1",
      name: "部署C",
      level: 3,
      children: [],
    };

    render(<OrganizationCard node={node} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("aria-label", "部署Cの社員一覧を表示");
  });

  it("子ノードがない場合、CardContentを表示しない", () => {
    const node: OrganizationTree = {
      id: "1",
      name: "会社A",
      level: 1,
      children: [],
    };

    const { container } = render(<OrganizationCard node={node} />);

    // CardContentがレンダリングされていないことを確認
    const cardContent = container.querySelector('[class*="CardContent"]');
    expect(cardContent).toBeNull();
  });

  it("子ノードがある場合、renderChildren関数を呼び出す", () => {
    const node: OrganizationTree = {
      id: "1",
      name: "会社A",
      level: 1,
      children: [
        { id: "2", name: "本部B", level: 2, children: [] },
        { id: "3", name: "本部C", level: 2, children: [] },
      ],
    };

    const renderChildren = (children: OrganizationTree[]) => (
      <div data-testid="children-rendered">
        {children.map((child) => (
          <div key={child.id}>{child.name}</div>
        ))}
      </div>
    );

    render(<OrganizationCard node={node} renderChildren={renderChildren} />);

    expect(screen.getByTestId("children-rendered")).toBeInTheDocument();
    expect(screen.getByText("本部B")).toBeInTheDocument();
    expect(screen.getByText("本部C")).toBeInTheDocument();
  });

  it("data-testid属性が正しく設定される", () => {
    const node: OrganizationTree = {
      id: "test-123",
      name: "テスト組織",
      level: 1,
      children: [],
    };

    render(<OrganizationCard node={node} />);

    const card = screen.getByTestId("org-card-test-123");
    expect(card).toBeInTheDocument();
  });
});
