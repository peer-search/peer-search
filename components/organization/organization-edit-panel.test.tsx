import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrganizationProvider } from "./organization-context";
import { OrganizationEditPanel } from "./organization-edit-panel";

// Mock Server Actions
vi.mock("@/lib/organizations/actions", () => ({
  updateOrganizationAction: vi.fn(),
  deleteOrganizationAction: vi.fn(),
}));

// Mock service functions
vi.mock("@/lib/organizations/service", () => ({
  getDescendantCount: vi.fn().mockResolvedValue(0),
}));

describe("OrganizationEditPanel", () => {
  it("should display placeholder message when no node is selected", () => {
    render(
      <OrganizationProvider>
        <OrganizationEditPanel />
      </OrganizationProvider>,
    );

    expect(screen.getByText("組織を選択してください")).toBeInTheDocument();
  });

  it("should render edit form when a node is selected", () => {
    // This test will be expanded once OrganizationEditForm is implemented
    // For now, we just verify the component structure
    render(
      <OrganizationProvider>
        <OrganizationEditPanel />
      </OrganizationProvider>,
    );

    // When no selection, should show placeholder
    expect(screen.getByText("組織を選択してください")).toBeInTheDocument();
  });
});
