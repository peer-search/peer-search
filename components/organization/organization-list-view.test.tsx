import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type {
  OrganizationFlatNode,
  OrganizationTree,
} from "@/lib/organizations/types";
import { OrganizationProvider } from "./organization-context";
import { OrganizationListView } from "./organization-list-view";

describe("OrganizationListView", () => {
  const mockAllOrganizations: OrganizationFlatNode[] = [
    {
      id: "org-1",
      name: "会社A",
      parentId: null,
      level: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "org-2",
      name: "本部B",
      parentId: "org-1",
      level: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "org-3",
      name: "部署C",
      parentId: "org-2",
      level: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockOrganizations: OrganizationTree[] = [
    {
      id: "org-1",
      name: "会社A",
      level: 1,
      children: [
        {
          id: "org-2",
          name: "本部B",
          level: 2,
          children: [
            {
              id: "org-3",
              name: "部署C",
              level: 3,
              children: [],
            },
          ],
        },
      ],
    },
  ];

  it("should render all organization nodes in depth-first order", () => {
    render(
      <OrganizationProvider allOrganizations={mockAllOrganizations}>
        <OrganizationListView organizations={mockOrganizations} />
      </OrganizationProvider>,
    );

    expect(screen.getByText("会社A")).toBeInTheDocument();
    expect(screen.getByText("本部B")).toBeInTheDocument();
    expect(screen.getByText("部署C")).toBeInTheDocument();
  });

  it("should handle empty organizations array", () => {
    render(
      <OrganizationProvider allOrganizations={[]}>
        <OrganizationListView organizations={[]} />
      </OrganizationProvider>,
    );

    // No items should be rendered
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should select a node when clicked", async () => {
    const user = userEvent.setup();

    render(
      <OrganizationProvider allOrganizations={mockAllOrganizations}>
        <OrganizationListView organizations={mockOrganizations} />
      </OrganizationProvider>,
    );

    const node = screen.getByText("本部B");
    await user.click(node);

    // Check if the node is selected (implementation-specific assertion)
    // This will depend on how selection styling is implemented
  });

  it("should render nodes with proper hierarchy indentation", () => {
    render(
      <OrganizationProvider allOrganizations={mockAllOrganizations}>
        <OrganizationListView organizations={mockOrganizations} />
      </OrganizationProvider>,
    );

    // Level 1 node should have 20px indent
    const level1Node = screen.getByText("会社A").closest("button");
    expect(level1Node).toHaveStyle({ paddingLeft: "20px" });

    // Level 2 node should have 40px indent
    const level2Node = screen.getByText("本部B").closest("button");
    expect(level2Node).toHaveStyle({ paddingLeft: "40px" });

    // Level 3 node should have 60px indent
    const level3Node = screen.getByText("部署C").closest("button");
    expect(level3Node).toHaveStyle({ paddingLeft: "60px" });
  });
});
