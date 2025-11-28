import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { OrganizationFlatNode } from "@/lib/organizations/types";
import { OrganizationProvider } from "./organization-context";
import { OrganizationEditForm } from "./organization-edit-form";

// Mock Server Actions
vi.mock("@/lib/organizations/actions", () => ({
  createOrganizationAction: vi.fn(),
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

  const mockAllOrganizations: OrganizationFlatNode[] = [
    mockNode,
    {
      id: "org-2",
      name: "テスト組織2",
      parentId: null,
      level: 1,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "org-3",
      name: "テスト組織3",
      parentId: "org-1",
      level: 2,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
  ];

  it("should display organization name", () => {
    render(
      <OrganizationProvider allOrganizations={mockAllOrganizations}>
        <OrganizationEditForm
          mode="edit"
          node={mockNode}
          allOrganizations={mockAllOrganizations}
        />
      </OrganizationProvider>,
    );
    expect(screen.getByDisplayValue("テスト組織")).toBeInTheDocument();
  });

  it("should show validation error for empty name", async () => {
    const user = userEvent.setup();
    render(
      <OrganizationProvider allOrganizations={mockAllOrganizations}>
        <OrganizationEditForm
          mode="edit"
          node={mockNode}
          allOrganizations={mockAllOrganizations}
        />
      </OrganizationProvider>,
    );

    const nameInput = screen.getByLabelText("名称");
    await user.clear(nameInput);

    const submitButton = screen.getByRole("button", { name: /更新/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("名称は必須です")).toBeInTheDocument();
    });
  });

  it("should prevent entering more than 255 characters via maxLength", () => {
    render(
      <OrganizationProvider allOrganizations={mockAllOrganizations}>
        <OrganizationEditForm
          mode="edit"
          node={mockNode}
          allOrganizations={mockAllOrganizations}
        />
      </OrganizationProvider>,
    );

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

    render(
      <OrganizationProvider allOrganizations={mockAllOrganizations}>
        <OrganizationEditForm
          mode="edit"
          node={mockNode}
          allOrganizations={mockAllOrganizations}
        />
      </OrganizationProvider>,
    );

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

    render(
      <OrganizationProvider allOrganizations={mockAllOrganizations}>
        <OrganizationEditForm
          mode="edit"
          node={mockNode}
          allOrganizations={mockAllOrganizations}
        />
      </OrganizationProvider>,
    );

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

    render(
      <OrganizationProvider allOrganizations={mockAllOrganizations}>
        <OrganizationEditForm
          mode="edit"
          node={mockNode}
          allOrganizations={mockAllOrganizations}
        />
      </OrganizationProvider>,
    );

    const submitButton = screen.getByRole("button", { name: /更新/ });
    await user.click(submitButton);

    // Should show loading state
    expect(screen.getByText("更新中...")).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it("should render parent organization select field", () => {
    render(
      <OrganizationProvider allOrganizations={mockAllOrganizations}>
        <OrganizationEditForm
          mode="edit"
          node={mockNode}
          allOrganizations={mockAllOrganizations}
        />
      </OrganizationProvider>,
    );
    expect(screen.getByLabelText("親組織")).toBeInTheDocument();
  });

  it("should enforce maxLength of 255 characters on name input", () => {
    render(
      <OrganizationProvider allOrganizations={mockAllOrganizations}>
        <OrganizationEditForm
          mode="edit"
          node={mockNode}
          allOrganizations={mockAllOrganizations}
        />
      </OrganizationProvider>,
    );
    const nameInput = screen.getByLabelText("名称") as HTMLInputElement;
    expect(nameInput.maxLength).toBe(255);
  });

  it("should update form values when node prop changes", () => {
    const { rerender } = render(
      <OrganizationProvider allOrganizations={mockAllOrganizations}>
        <OrganizationEditForm
          mode="edit"
          node={mockNode}
          allOrganizations={mockAllOrganizations}
        />
      </OrganizationProvider>,
    );

    // Initial values
    expect(screen.getByDisplayValue("テスト組織")).toBeInTheDocument();

    // Change node prop
    const updatedNode: OrganizationFlatNode = {
      id: "org-2",
      name: "更新された組織",
      parentId: "parent-1",
      level: 2,
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
    };

    rerender(
      <OrganizationProvider allOrganizations={mockAllOrganizations}>
        <OrganizationEditForm
          mode="edit"
          node={updatedNode}
          allOrganizations={mockAllOrganizations}
        />
      </OrganizationProvider>,
    );

    // Values should be updated
    expect(screen.getByDisplayValue("更新された組織")).toBeInTheDocument();
  });

  it("should exclude self and descendants from parent organization select options", () => {
    const allOrgs: OrganizationFlatNode[] = [
      {
        id: "org-1",
        name: "親組織",
        parentId: null,
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "org-2",
        name: "自分",
        parentId: "org-1",
        level: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "org-3",
        name: "子組織",
        parentId: "org-2",
        level: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "org-4",
        name: "孫組織",
        parentId: "org-3",
        level: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "org-5",
        name: "別の組織",
        parentId: null,
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const currentNode = allOrgs[1]; // "自分"

    const { container } = render(
      <OrganizationProvider allOrganizations={allOrgs}>
        <OrganizationEditForm
          mode="edit"
          node={currentNode}
          allOrganizations={allOrgs}
        />
      </OrganizationProvider>,
    );

    // SelectContentのhidden selectを確認（shadcn/uiの内部実装）
    const hiddenSelect = container.querySelector("select");
    expect(hiddenSelect).toBeInTheDocument();

    // 選択肢を確認
    const options = Array.from(
      hiddenSelect?.querySelectorAll("option") || [],
    ).map((opt) => ({
      value: opt.getAttribute("value"),
      text: opt.textContent,
    }));

    // 正しい選択肢が存在することを確認
    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: "__none__",
          text: "なし（ルート組織）",
        }),
        expect.objectContaining({ value: "org-1", text: "親組織" }),
        expect.objectContaining({ value: "org-5", text: "別の組織" }),
      ]),
    );

    // 選択肢が3つしかないことを確認（なし + 親組織 + 別の組織）
    expect(options).toHaveLength(3);

    // 自分自身と子孫が含まれていないことを確認
    const optionValues = options.map((opt) => opt.value);
    expect(optionValues).not.toContain("org-2"); // 自分
    expect(optionValues).not.toContain("org-3"); // 子組織
    expect(optionValues).not.toContain("org-4"); // 孫組織
  });
});
