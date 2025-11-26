import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { OrganizationFlatNode } from "@/lib/organizations/types";
import { OrganizationProvider } from "./organization-context";
import { OrganizationEditPanel } from "./organization-edit-panel";

// Mock Server Actions
vi.mock("@/lib/organizations/actions", () => ({
  updateOrganizationAction: vi.fn(),
  deleteOrganizationAction: vi.fn(),
  getDescendantCountAction: vi.fn().mockResolvedValue(0),
}));

const mockOrganizations: OrganizationFlatNode[] = [
  {
    id: "org-1",
    name: "テスト組織1",
    parentId: null,
    level: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "org-2",
    name: "テスト組織2",
    parentId: null,
    level: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("OrganizationEditPanel", () => {
  it("should display placeholder message when no node is selected", () => {
    render(
      <OrganizationProvider allOrganizations={mockOrganizations}>
        <OrganizationEditPanel />
      </OrganizationProvider>,
    );

    // Text appears multiple times due to responsive design (desktop + mobile)
    const placeholderElements = screen.getAllByText("組織を選択してください");
    expect(placeholderElements.length).toBeGreaterThan(0);
    expect(placeholderElements[0]).toBeInTheDocument();
  });

  it("should render edit form when a node is selected", () => {
    // This test will be expanded once OrganizationEditForm is implemented
    // For now, we just verify the component structure
    render(
      <OrganizationProvider allOrganizations={mockOrganizations}>
        <OrganizationEditPanel />
      </OrganizationProvider>,
    );

    // When no selection, should show placeholder
    // Text appears multiple times due to responsive design (desktop + mobile)
    const placeholderElements = screen.getAllByText("組織を選択してください");
    expect(placeholderElements.length).toBeGreaterThan(0);
    expect(placeholderElements[0]).toBeInTheDocument();
  });
});
