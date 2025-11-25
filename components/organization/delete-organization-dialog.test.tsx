import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { OrganizationFlatNode } from "@/lib/organizations/types";
import { DeleteOrganizationDialog } from "./delete-organization-dialog";

// Mock Server Actions
vi.mock("@/lib/organizations/actions", () => ({
  deleteOrganizationAction: vi.fn(),
  getDescendantCountAction: vi.fn(),
}));

describe("DeleteOrganizationDialog", () => {
  const mockNode: OrganizationFlatNode = {
    id: "org-1",
    name: "テスト組織",
    parentId: null,
    level: 2,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  it("should render delete button", () => {
    render(<DeleteOrganizationDialog node={mockNode} />);
    expect(screen.getByRole("button", { name: /削除/ })).toBeInTheDocument();
  });

  it("should show confirmation dialog when delete button is clicked", async () => {
    const user = userEvent.setup();
    const { getDescendantCountAction } = await import(
      "@/lib/organizations/actions"
    );
    vi.mocked(getDescendantCountAction).mockResolvedValue(0);

    render(<DeleteOrganizationDialog node={mockNode} />);

    const deleteButton = screen.getByRole("button", { name: /削除/ });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("組織を削除しますか？")).toBeInTheDocument();
    });
  });

  it("should show warning message when node has descendants", async () => {
    const user = userEvent.setup();
    const { getDescendantCountAction } = await import(
      "@/lib/organizations/actions"
    );
    vi.mocked(getDescendantCountAction).mockResolvedValue(3);

    render(<DeleteOrganizationDialog node={mockNode} />);

    const deleteButton = screen.getByRole("button", { name: /削除/ });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(
        screen.getByText(/このノードには3個の子部署が存在します/),
      ).toBeInTheDocument();
    });
  });

  it("should call deleteOrganizationAction when confirmed", async () => {
    const user = userEvent.setup();
    const { deleteOrganizationAction, getDescendantCountAction } = await import(
      "@/lib/organizations/actions"
    );

    vi.mocked(getDescendantCountAction).mockResolvedValue(0);
    vi.mocked(deleteOrganizationAction).mockResolvedValue({ success: true });

    render(<DeleteOrganizationDialog node={mockNode} />);

    const deleteButton = screen.getByRole("button", { name: /削除/ });
    await user.click(deleteButton);

    // Wait for dialog to appear
    await waitFor(() => {
      expect(screen.getByText("組織を削除しますか？")).toBeInTheDocument();
    });

    // Click confirm button in dialog
    const confirmButton = screen.getByRole("button", { name: "削除する" });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(deleteOrganizationAction).toHaveBeenCalledWith("org-1");
    });
  });

  it("should close dialog when cancel is clicked", async () => {
    const user = userEvent.setup();
    const { getDescendantCountAction } = await import(
      "@/lib/organizations/actions"
    );
    vi.mocked(getDescendantCountAction).mockResolvedValue(0);

    render(<DeleteOrganizationDialog node={mockNode} />);

    const deleteButton = screen.getByRole("button", { name: /削除/ });
    await user.click(deleteButton);

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByText("組織を削除しますか？")).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole("button", { name: /キャンセル/ });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(
        screen.queryByText("組織を削除しますか？"),
      ).not.toBeInTheDocument();
    });
  });

  it("should show error alert when deletion fails", async () => {
    const user = userEvent.setup();
    const { deleteOrganizationAction, getDescendantCountAction } = await import(
      "@/lib/organizations/actions"
    );

    vi.mocked(getDescendantCountAction).mockResolvedValue(0);
    vi.mocked(deleteOrganizationAction).mockResolvedValue({
      success: false,
      error: "削除に失敗しました",
    });

    // Mock global alert
    const originalAlert = globalThis.alert;
    const alertMock = vi.fn();
    globalThis.alert = alertMock;

    render(<DeleteOrganizationDialog node={mockNode} />);

    const deleteButton = screen.getByRole("button", { name: /削除/ });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("組織を削除しますか？")).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: "削除する" });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith("削除に失敗しました");
    });

    // Restore original alert
    globalThis.alert = originalAlert;
  });

  it("should properly handle delete confirmation flow", async () => {
    const user = userEvent.setup();
    const { deleteOrganizationAction, getDescendantCountAction } = await import(
      "@/lib/organizations/actions"
    );

    vi.mocked(getDescendantCountAction).mockResolvedValue(0);
    vi.mocked(deleteOrganizationAction).mockResolvedValue({ success: true });

    render(<DeleteOrganizationDialog node={mockNode} />);

    // Click delete button to open dialog
    const deleteButton = screen.getByRole("button", { name: /削除/ });
    await user.click(deleteButton);

    // Dialog should appear
    await waitFor(() => {
      expect(screen.getByText("組織を削除しますか？")).toBeInTheDocument();
    });

    // Confirm deletion
    const confirmButton = screen.getByRole("button", { name: "削除する" });
    expect(confirmButton).not.toBeDisabled();

    await user.click(confirmButton);

    // Action should be called
    await waitFor(() => {
      expect(deleteOrganizationAction).toHaveBeenCalledWith("org-1");
    });
  });
});
