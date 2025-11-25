import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OrganizationListItem } from "./organization-list-item";

describe("OrganizationListItem", () => {
  const mockNode = {
    id: "org-1",
    name: "テスト組織",
    level: 1,
  };

  it("should render organization name", () => {
    render(
      <OrganizationListItem
        node={mockNode}
        isSelected={false}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText("テスト組織")).toBeInTheDocument();
  });

  it("should apply indent based on level", () => {
    const { container } = render(
      <OrganizationListItem
        node={mockNode}
        isSelected={false}
        onSelect={() => {}}
      />,
    );

    const element = container.firstChild as HTMLElement;
    expect(element).toHaveStyle({ paddingLeft: "20px" }); // level 1 * 20px
  });

  it("should apply selected styles when isSelected is true", () => {
    const { container } = render(
      <OrganizationListItem
        node={mockNode}
        isSelected={true}
        onSelect={() => {}}
      />,
    );

    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain("bg-blue-100");
    expect(element.className).toContain("border-l-4");
    expect(element.className).toContain("border-blue-500");
  });

  it("should call onSelect when clicked", async () => {
    const user = userEvent.setup();
    const mockOnSelect = vi.fn();

    render(
      <OrganizationListItem
        node={mockNode}
        isSelected={false}
        onSelect={mockOnSelect}
      />,
    );

    await user.click(screen.getByText("テスト組織"));
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it("should apply hover styles", () => {
    const { container } = render(
      <OrganizationListItem
        node={mockNode}
        isSelected={false}
        onSelect={() => {}}
      />,
    );

    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain("hover:bg-gray-100");
  });

  it("should render different indentation for different levels", () => {
    const level2Node = { ...mockNode, level: 2 };
    const level3Node = { ...mockNode, level: 3 };
    const level4Node = { ...mockNode, level: 4 };

    const { container: container2 } = render(
      <OrganizationListItem
        node={level2Node}
        isSelected={false}
        onSelect={() => {}}
      />,
    );
    expect(container2.firstChild).toHaveStyle({ paddingLeft: "40px" });

    const { container: container3 } = render(
      <OrganizationListItem
        node={level3Node}
        isSelected={false}
        onSelect={() => {}}
      />,
    );
    expect(container3.firstChild).toHaveStyle({ paddingLeft: "60px" });

    const { container: container4 } = render(
      <OrganizationListItem
        node={level4Node}
        isSelected={false}
        onSelect={() => {}}
      />,
    );
    expect(container4.firstChild).toHaveStyle({ paddingLeft: "80px" });
  });
});
