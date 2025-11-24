import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DeleteEmployeeDialog } from "./delete-employee-dialog";

// Mock deleteEmployeeAction
vi.mock("@/lib/employees/actions", () => ({
  deleteEmployeeAction: vi.fn(),
}));

// Mock React's useActionState
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    useActionState: vi.fn((action, initialState) => [
      initialState,
      action,
      false,
    ]),
  };
});

describe("DeleteEmployeeDialog", () => {
  const mockProps = {
    employeeId: "test-employee-id",
    employeeName: "山田太郎",
    employeeNumber: "EMP001",
  };

  it("削除ボタンを表示する", () => {
    render(<DeleteEmployeeDialog {...mockProps} />);
    expect(screen.getByRole("button", { name: "削除" })).toBeInTheDocument();
  });

  it("削除ボタンをクリックするとダイアログが開く", async () => {
    const user = userEvent.setup();
    render(<DeleteEmployeeDialog {...mockProps} />);

    const deleteButton = screen.getByRole("button", { name: "削除" });
    await user.click(deleteButton);

    // ダイアログが開かれることを確認
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("社員削除の確認")).toBeInTheDocument();
  });

  it("ダイアログに社員名と社員番号が表示される", async () => {
    const user = userEvent.setup();
    render(<DeleteEmployeeDialog {...mockProps} />);

    const deleteButton = screen.getByRole("button", { name: "削除" });
    await user.click(deleteButton);

    // 社員名と社員番号の表示を確認
    expect(screen.getByText(/山田太郎/)).toBeInTheDocument();
    expect(screen.getByText(/EMP001/)).toBeInTheDocument();
  });

  it("ダイアログに警告メッセージが表示される", async () => {
    const user = userEvent.setup();
    render(<DeleteEmployeeDialog {...mockProps} />);

    const deleteButton = screen.getByRole("button", { name: "削除" });
    await user.click(deleteButton);

    // 警告メッセージの確認
    expect(
      screen.getByText(/以下の社員を削除してもよろしいですか/),
    ).toBeInTheDocument();
    expect(screen.getByText(/この操作は取り消せません/)).toBeInTheDocument();
  });

  it("キャンセルボタンが表示される", async () => {
    const user = userEvent.setup();
    render(<DeleteEmployeeDialog {...mockProps} />);

    const deleteButton = screen.getByRole("button", { name: "削除" });
    await user.click(deleteButton);

    // キャンセルボタンの確認
    expect(
      screen.getByRole("button", { name: "キャンセル" }),
    ).toBeInTheDocument();
  });

  it("削除を確定するボタンが表示される", async () => {
    const user = userEvent.setup();
    render(<DeleteEmployeeDialog {...mockProps} />);

    const deleteButton = screen.getByRole("button", { name: "削除" });
    await user.click(deleteButton);

    // 削除を確定するボタンの確認
    expect(
      screen.getByRole("button", { name: "削除を確定する" }),
    ).toBeInTheDocument();
  });
});
