import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Employee } from "@/lib/employees/service";
import { EmployeeForm } from "./employee-form";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock Server Actions
vi.mock("@/lib/employees/actions", () => ({
  createEmployeeAction: vi.fn(),
  updateEmployeeAction: vi.fn(),
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

describe("EmployeeForm", () => {
  const mockRouter = {
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  };

  const mockEmployee: Employee = {
    id: "test-employee-id",
    employeeNumber: "EMP001",
    nameKanji: "山田太郎",
    nameKana: "ヤマダタロウ",
    email: "yamada@example.com",
    hireDate: new Date("2024-01-01"),
    mobilePhone: "090-1234-5678",
    photoS3Key: null,
    organizations: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter);
  });

  describe("新規追加モード", () => {
    it("空のフォームを表示する", () => {
      render(<EmployeeForm mode="create" />);

      expect(screen.getByLabelText(/社員番号/)).toHaveValue("");
      expect(screen.getByLabelText(/氏名.*漢字/)).toHaveValue("");
      expect(screen.getByLabelText(/氏名.*カナ/)).toHaveValue("");
      expect(screen.getByLabelText(/メールアドレス/)).toHaveValue("");
      expect(screen.getByLabelText(/入社日/)).toHaveValue("");
      expect(screen.getByLabelText(/携帯電話/)).toHaveValue("");
    });

    it("必須フィールドにアスタリスクが表示される", () => {
      render(<EmployeeForm mode="create" />);

      // 必須フィールドのラベルとアスタリスクが存在することを確認
      expect(screen.getByText("社員番号")).toBeInTheDocument();
      expect(screen.getByText("氏名（漢字）")).toBeInTheDocument();
      expect(screen.getByText("氏名（カナ）")).toBeInTheDocument();
      expect(screen.getByText("メールアドレス")).toBeInTheDocument();
      expect(screen.getByText("入社日")).toBeInTheDocument();
      // アスタリスクが5つ存在することを確認(必須フィールド分)
      const asterisks = screen.getAllByText("*");
      expect(asterisks).toHaveLength(5);
    });

    it("保存ボタンとキャンセルボタンが表示される", () => {
      render(<EmployeeForm mode="create" />);

      expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "キャンセル" }),
      ).toBeInTheDocument();
    });

    it("キャンセルボタンをクリックすると一覧ページに遷移する", async () => {
      const user = userEvent.setup();
      render(<EmployeeForm mode="create" />);

      const cancelButton = screen.getByRole("button", { name: "キャンセル" });
      await user.click(cancelButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/employees");
    });
  });

  describe("編集モード", () => {
    it("既存データが初期値として設定される", () => {
      render(
        <EmployeeForm
          mode="edit"
          initialData={mockEmployee}
          employeeId={mockEmployee.id}
        />,
      );

      expect(screen.getByLabelText(/社員番号/)).toHaveValue("EMP001");
      expect(screen.getByLabelText(/氏名.*漢字/)).toHaveValue("山田太郎");
      expect(screen.getByLabelText(/氏名.*カナ/)).toHaveValue("ヤマダタロウ");
      expect(screen.getByLabelText(/メールアドレス/)).toHaveValue(
        "yamada@example.com",
      );
      expect(screen.getByLabelText(/入社日/)).toHaveValue("2024-01-01");
      expect(screen.getByLabelText(/携帯電話/)).toHaveValue("090-1234-5678");
    });

    it("社員番号フィールドがdisabledになる", () => {
      render(
        <EmployeeForm
          mode="edit"
          initialData={mockEmployee}
          employeeId={mockEmployee.id}
        />,
      );

      expect(screen.getByLabelText(/社員番号/)).toBeDisabled();
    });

    it("キャンセルボタンをクリックすると詳細ページに遷移する", async () => {
      const user = userEvent.setup();
      render(
        <EmployeeForm
          mode="edit"
          initialData={mockEmployee}
          employeeId={mockEmployee.id}
        />,
      );

      const cancelButton = screen.getByRole("button", { name: "キャンセル" });
      await user.click(cancelButton);

      expect(mockRouter.push).toHaveBeenCalledWith(
        `/employees/${mockEmployee.id}`,
      );
    });
  });

  // Note: エラー表示のテストは、useActionStateのモック戦略が複雑なため、
  // 統合テストで実施する方が適切です。ここでは基本的なレンダリングと
  // ユーザーインタラクションのテストに集中します。
});
