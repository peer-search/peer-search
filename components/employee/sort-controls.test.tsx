import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SortControls } from "./sort-controls";

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
  ArrowUpDown: () => <span>ArrowUpDown Icon</span>,
  ArrowUp: () => <span>ArrowUp Icon</span>,
  ArrowDown: () => <span>ArrowDown Icon</span>,
}));

describe("SortControls", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParams.delete("sort");
    mockSearchParams.delete("order");
  });

  it("ソート項目ボタンが正しく表示される", () => {
    render(<SortControls />);

    expect(screen.getByText("氏名（かな）")).toBeInTheDocument();
    expect(screen.getByText("社員番号")).toBeInTheDocument();
    expect(screen.getByText("入社年")).toBeInTheDocument();
  });

  it("ボタンクリック時にURL遷移する", async () => {
    const user = userEvent.setup();
    render(<SortControls />);

    await user.click(screen.getByText("氏名（かな）"));

    expect(mockPush).toHaveBeenCalledWith(
      "/employees?sort=name_kana&order=asc",
    );
  });

  it("同じボタンを2回クリックすると降順に切り替わる", async () => {
    const user = userEvent.setup();
    render(<SortControls currentSort="name_kana" currentOrder="asc" />);

    await user.click(screen.getByText("氏名（かな）"));

    expect(mockPush).toHaveBeenCalledWith(
      "/employees?sort=name_kana&order=desc",
    );
  });

  it("降順から再度クリックするとソートが解除される", async () => {
    const user = userEvent.setup();
    render(<SortControls currentSort="name_kana" currentOrder="desc" />);

    await user.click(screen.getByText("氏名（かな）"));

    expect(mockPush).toHaveBeenCalledWith("/employees?");
  });

  it("アクティブなボタンにdefaultスタイルが適用される", () => {
    render(<SortControls currentSort="employee_number" currentOrder="asc" />);

    const activeButton = screen.getByText("社員番号").closest("button");
    expect(activeButton).toHaveClass("bg-primary");
  });

  it("aria-sort属性が正しく設定される", () => {
    render(<SortControls currentSort="hire_date" currentOrder="asc" />);

    const hireDateButton = screen
      .getByText("入社年")
      .closest("button") as HTMLButtonElement;
    const nameButton = screen
      .getByText("氏名（かな）")
      .closest("button") as HTMLButtonElement;

    expect(hireDateButton).toHaveAttribute("aria-sort", "ascending");
    expect(nameButton).toHaveAttribute("aria-sort", "none");
  });

  it("降順時のaria-sort属性が正しく設定される", () => {
    render(<SortControls currentSort="employee_number" currentOrder="desc" />);

    const button = screen
      .getByText("社員番号")
      .closest("button") as HTMLButtonElement;

    expect(button).toHaveAttribute("aria-sort", "descending");
  });

  it("aria-label属性が正しく設定される", () => {
    render(<SortControls />);

    const nameButton = screen
      .getByText("氏名（かな）")
      .closest("button") as HTMLButtonElement;

    expect(nameButton).toHaveAttribute("aria-label", "氏名（かな）でソート");
  });
});
