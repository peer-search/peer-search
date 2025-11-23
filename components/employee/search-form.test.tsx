import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchForm } from "./search-form";

// Next.jsのルーターをモック
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

// lucide-reactアイコンをモック
vi.mock("lucide-react", () => ({
  Search: () => <span>Search Icon</span>,
  X: () => <span>X Icon</span>,
}));

describe("SearchForm", () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    mockPush.mockClear();
    mockSearchParams.delete("name");
    mockSearchParams.delete("employee_number");
    mockSearchParams.delete("hire_year");
  });

  it("フォームが正しくレンダリングされる", () => {
    render(<SearchForm />);

    expect(screen.getByLabelText("氏名")).toBeInTheDocument();
    expect(screen.getByLabelText("社員番号")).toBeInTheDocument();
    expect(screen.getByLabelText("入社年")).toBeInTheDocument();
  });

  it("デフォルト値が正しく復元される", () => {
    const defaultValues = {
      name: "山田太郎",
      employeeNumber: "E001",
      hireYear: "2020",
    };

    render(<SearchForm defaultValues={defaultValues} />);

    expect(screen.getByLabelText("氏名")).toHaveValue("山田太郎");
    expect(screen.getByLabelText("社員番号")).toHaveValue("E001");
    expect(screen.getByLabelText("入社年")).toHaveValue(2020);
  });

  it("フォーム入力が正しく動作する", async () => {
    const user = userEvent.setup();
    const defaultValues = {
      name: "",
      employeeNumber: "",
      hireYear: "",
    };
    render(<SearchForm defaultValues={defaultValues} />);

    const nameInput = screen.getByLabelText("氏名");

    // 氏名フィールドに入力して検証
    await user.click(nameInput);
    await user.paste("鈴木花子");

    expect(nameInput).toHaveValue("鈴木花子");
  });

  it("検索ボタンクリック時にURL遷移する", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);

    await user.click(screen.getByLabelText("氏名"));
    await user.paste("田中");
    await user.click(screen.getAllByText(/検索/)[0]);

    expect(mockPush).toHaveBeenCalledWith("/employees?name=%E7%94%B0%E4%B8%AD");
  });

  it("複数の検索条件を同時に設定できる", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);

    await user.click(screen.getByLabelText("氏名"));
    await user.paste("山田");
    await user.click(screen.getByLabelText("社員番号"));
    await user.paste("E001");
    await user.click(screen.getByLabelText("入社年"));
    await user.paste("2020");
    await user.click(screen.getAllByText(/検索/)[0]);

    expect(mockPush).toHaveBeenCalledWith(
      "/employees?name=%E5%B1%B1%E7%94%B0&employee_number=E001&hire_year=2020",
    );
  });

  it("空白のみの入力はパラメータに含まれない", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);

    await user.type(screen.getByLabelText("氏名"), "   ");
    await user.click(screen.getAllByText(/検索/)[0]);

    expect(mockPush).toHaveBeenCalledWith("/employees?");
  });

  it("クリアボタンでフォームがリセットされる", async () => {
    const user = userEvent.setup();
    const defaultValues = {
      name: "山田太郎",
      employeeNumber: "E001",
      hireYear: "2020",
    };

    render(<SearchForm defaultValues={defaultValues} />);

    await user.click(screen.getAllByText("クリア")[0]);

    expect(screen.getByLabelText("氏名")).toHaveValue("");
    expect(screen.getByLabelText("社員番号")).toHaveValue("");
    expect(screen.getByLabelText("入社年")).toHaveValue(null);
    expect(mockPush).toHaveBeenCalledWith("/employees");
  });

  it("入社年フィールドは数値のみ入力可能", () => {
    render(<SearchForm />);

    const hireYearInput = screen.getByLabelText("入社年");
    expect(hireYearInput).toHaveAttribute("type", "number");
  });

  it("社員番号の空白がトリムされる", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);

    await user.click(screen.getByLabelText("社員番号"));
    await user.paste("  E001  ");
    await user.click(screen.getAllByText(/検索/)[0]);

    expect(mockPush).toHaveBeenCalledWith("/employees?employee_number=E001");
  });
});
