import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { OrganizationFlatNode } from "@/lib/organizations/types";
import { OrganizationEditForm } from "./organization-edit-form";

// Mock Server Actions
vi.mock("@/lib/organizations/actions", () => ({
  updateOrganizationAction: vi.fn(),
  deleteOrganizationAction: vi.fn(),
}));

// Mock service functions
vi.mock("@/lib/organizations/service", () => ({
  getDescendantCount: vi.fn().mockResolvedValue(0),
}));

describe("OrganizationEditForm", () => {
  const mockNode: OrganizationFlatNode = {
    id: "org-1",
    name: "テスト組織",
    parentId: null,
    level: 1,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  it("should display organization name", () => {
    render(<OrganizationEditForm node={mockNode} />);
    expect(screen.getByDisplayValue("テスト組織")).toBeInTheDocument();
  });

  it("should show validation error for empty name", async () => {
    const user = userEvent.setup();
    render(<OrganizationEditForm node={mockNode} />);

    const nameInput = screen.getByLabelText("名称");
    await user.clear(nameInput);

    const submitButton = screen.getByRole("button", { name: /更新/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("名称は必須です")).toBeInTheDocument();
    });
  });

  it("should prevent entering more than 255 characters via maxLength", () => {
    render(<OrganizationEditForm node={mockNode} />);

    const nameInput = screen.getByLabelText("名称") as HTMLInputElement;

    // The maxLength attribute prevents typing more than 255 characters
    expect(nameInput.maxLength).toBe(255);

    // Even if we try to set a longer value programmatically,
    // the browser enforces maxLength
  });

  it("should call updateOrganizationAction on submit with valid data", async () => {
    const user = userEvent.setup();
    const { updateOrganizationAction } = await import(
      "@/lib/organizations/actions"
    );
    vi.mocked(updateOrganizationAction).mockResolvedValue({ success: true });

    render(<OrganizationEditForm node={mockNode} />);

    const nameInput = screen.getByLabelText("名称");
    await user.clear(nameInput);
    await user.type(nameInput, "更新後の名称");

    const submitButton = screen.getByRole("button", { name: /更新/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(updateOrganizationAction).toHaveBeenCalledWith({
        id: "org-1",
        name: "更新後の名称",
        parentId: null,
      });
    });
  });

  it("should display server error message when update fails", async () => {
    const user = userEvent.setup();
    const { updateOrganizationAction } = await import(
      "@/lib/organizations/actions"
    );
    vi.mocked(updateOrganizationAction).mockResolvedValue({
      success: false,
      error: "更新に失敗しました",
    });

    render(<OrganizationEditForm node={mockNode} />);

    const submitButton = screen.getByRole("button", { name: /更新/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("更新に失敗しました")).toBeInTheDocument();
    });
  });

  it("should disable submit button while pending", async () => {
    const user = userEvent.setup();
    const { updateOrganizationAction } = await import(
      "@/lib/organizations/actions"
    );
    vi.mocked(updateOrganizationAction).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ success: true }), 100),
        ),
    );

    render(<OrganizationEditForm node={mockNode} />);

    const submitButton = screen.getByRole("button", { name: /更新/ });
    await user.click(submitButton);

    // Should show loading state
    expect(screen.getByText("更新中...")).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it("should render parent organization select field", () => {
    render(<OrganizationEditForm node={mockNode} />);
    expect(screen.getByLabelText("親組織")).toBeInTheDocument();
  });

  it("should enforce maxLength of 255 characters on name input", () => {
    render(<OrganizationEditForm node={mockNode} />);
    const nameInput = screen.getByLabelText("名称") as HTMLInputElement;
    expect(nameInput.maxLength).toBe(255);
  });
});
