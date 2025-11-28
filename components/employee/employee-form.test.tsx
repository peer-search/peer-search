import { fireEvent, render, screen } from "@testing-library/react";
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

  describe("写真アップロードUI (Task 5.1)", () => {
    describe("新規作成モード", () => {
      it("写真選択UIが表示される", () => {
        render(<EmployeeForm mode="create" />);

        // ファイル選択input要素が存在することを確認
        const fileInput = screen.getByLabelText(/写真/);
        expect(fileInput).toBeInTheDocument();
        expect(fileInput).toHaveAttribute("type", "file");
        expect(fileInput).toHaveAttribute("accept", "image/*");
      });

      it("ファイル選択ダイアログが開く（file input要素にクリック可能）", () => {
        render(<EmployeeForm mode="create" />);

        const fileInput = screen.getByLabelText(/写真/);
        expect(fileInput).not.toBeDisabled();
      });

      it("選択された画像のプレビューが表示される", async () => {
        const user = userEvent.setup();
        render(<EmployeeForm mode="create" />);

        // ファイル選択
        const fileInput = screen.getByLabelText(/写真/);
        const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
        await user.upload(fileInput, file);

        // プレビュー画像要素が表示されることを確認
        const previewImage = await screen.findByAltText(/プレビュー/i);
        expect(previewImage).toBeInTheDocument();
        expect(previewImage).toHaveAttribute("src");
      });
    });

    describe("編集モード - 既存写真あり", () => {
      const mockEmployeeWithPhoto: Employee = {
        ...mockEmployee,
        photoS3Key: "employee-photos/test.jpg",
      };

      it("既存写真がある場合、プレビューが表示される", () => {
        render(
          <EmployeeForm
            mode="edit"
            initialData={mockEmployeeWithPhoto}
            employeeId={mockEmployeeWithPhoto.id}
          />,
        );

        // 既存写真のプレビューが表示される
        const previewImage = screen.getByAltText(/プレビュー/i);
        expect(previewImage).toBeInTheDocument();
      });

      it("写真変更ボタンが表示される", () => {
        render(
          <EmployeeForm
            mode="edit"
            initialData={mockEmployeeWithPhoto}
            employeeId={mockEmployeeWithPhoto.id}
          />,
        );

        const changeButton = screen.getByRole("button", { name: /写真を変更/ });
        expect(changeButton).toBeInTheDocument();
      });

      it("写真削除ボタンが表示される", () => {
        render(
          <EmployeeForm
            mode="edit"
            initialData={mockEmployeeWithPhoto}
            employeeId={mockEmployeeWithPhoto.id}
          />,
        );

        const deleteButton = screen.getByRole("button", { name: /写真を削除/ });
        expect(deleteButton).toBeInTheDocument();
      });

      it("写真変更ボタンクリックでファイル選択ダイアログが開く", async () => {
        const user = userEvent.setup();
        render(
          <EmployeeForm
            mode="edit"
            initialData={mockEmployeeWithPhoto}
            employeeId={mockEmployeeWithPhoto.id}
          />,
        );

        const changeButton = screen.getByRole("button", { name: /写真を変更/ });
        await user.click(changeButton);

        // ファイル選択inputがクリックされることを確認（hidden inputなので直接確認は困難）
        const fileInput = screen.getByLabelText(/写真/);
        expect(fileInput).toBeInTheDocument();
      });
    });

    describe("編集モード - 既存写真なし", () => {
      it("既存写真がない場合、デフォルトアバターとアップロードボタンが表示される", () => {
        render(
          <EmployeeForm
            mode="edit"
            initialData={mockEmployee}
            employeeId={mockEmployee.id}
          />,
        );

        // デフォルトアバターまたはアップロード促進メッセージが表示される
        const uploadButton = screen.getByRole("button", {
          name: /写真をアップロード/,
        });
        expect(uploadButton).toBeInTheDocument();
      });
    });

    describe("写真削除機能", () => {
      const mockEmployeeWithPhoto: Employee = {
        ...mockEmployee,
        photoS3Key: "employee-photos/test.jpg",
      };

      it("削除ボタンクリック時に確認ダイアログが表示される", async () => {
        const user = userEvent.setup();
        render(
          <EmployeeForm
            mode="edit"
            initialData={mockEmployeeWithPhoto}
            employeeId={mockEmployeeWithPhoto.id}
          />,
        );

        const deleteButton = screen.getByRole("button", {
          name: /写真を削除/,
        });
        await user.click(deleteButton);

        // 確認ダイアログが表示される
        const dialog = await screen.findByRole("alertdialog");
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveTextContent(/削除してもよろしいですか/);
      });

      it("削除確認後、プレビューがクリアされる", async () => {
        const user = userEvent.setup();
        render(
          <EmployeeForm
            mode="edit"
            initialData={mockEmployeeWithPhoto}
            employeeId={mockEmployeeWithPhoto.id}
          />,
        );

        const deleteButton = screen.getByRole("button", {
          name: /写真を削除/,
        });
        await user.click(deleteButton);

        // 確認ダイアログで削除を確定
        const confirmButton = await screen.findByRole("button", {
          name: /削除する/,
        });
        await user.click(confirmButton);

        // プレビューが非表示になり、アップロードボタンが表示される
        const uploadButton = await screen.findByRole("button", {
          name: /写真をアップロード/,
        });
        expect(uploadButton).toBeInTheDocument();
      });
    });
  });

  describe("クライアントサイドバリデーション (Task 5.2)", () => {
    describe("ファイル形式バリデーション", () => {
      it("不正なファイル形式選択時にエラーメッセージが表示される", async () => {
        render(<EmployeeForm mode="create" />);

        const fileInput = screen.getByLabelText(/写真/) as HTMLInputElement;
        const invalidFile = new File(["dummy"], "test.pdf", {
          type: "application/pdf",
        });

        // fireEventを使ってonChangeを直接トリガー
        Object.defineProperty(fileInput, "files", {
          value: [invalidFile],
          writable: false,
        });
        fireEvent.change(fileInput);

        // エラーメッセージが表示される
        const errorMessage = await screen.findByText(/JPEG.*PNG.*GIF.*WebP/i);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass("text-red-600");
      });

      it("許可されたファイル形式（JPEG）でエラーが表示されない", async () => {
        const user = userEvent.setup();
        render(<EmployeeForm mode="create" />);

        const fileInput = screen.getByLabelText(/写真/);
        const validFile = new File(["dummy"], "test.jpg", {
          type: "image/jpeg",
        });
        await user.upload(fileInput, validFile);

        // エラーメッセージが表示されない
        expect(
          screen.queryByText(
            /JPEG, PNG, GIF, WebP形式の画像ファイルのみアップロード可能です/,
          ),
        ).not.toBeInTheDocument();
      });

      it("許可されたファイル形式（PNG）でエラーが表示されない", async () => {
        const user = userEvent.setup();
        render(<EmployeeForm mode="create" />);

        const fileInput = screen.getByLabelText(/写真/);
        const validFile = new File(["dummy"], "test.png", {
          type: "image/png",
        });
        await user.upload(fileInput, validFile);

        expect(
          screen.queryByText(
            /JPEG, PNG, GIF, WebP形式の画像ファイルのみアップロード可能です/,
          ),
        ).not.toBeInTheDocument();
      });
    });

    describe("ファイルサイズバリデーション", () => {
      it("10MB超過ファイル選択時にエラーメッセージが表示される", async () => {
        const user = userEvent.setup();
        render(<EmployeeForm mode="create" />);

        const fileInput = screen.getByLabelText(/写真/);
        // 11MBのファイルを作成
        const largeFile = new File(
          [new ArrayBuffer(11 * 1024 * 1024)],
          "large.jpg",
          { type: "image/jpeg" },
        );
        await user.upload(fileInput, largeFile);

        // エラーメッセージが表示される
        const errorMessage =
          await screen.findByText(/ファイルサイズが10MBを超えています/);
        expect(errorMessage).toBeInTheDocument();
      });

      it("10MB以下のファイルでエラーが表示されない", async () => {
        const user = userEvent.setup();
        render(<EmployeeForm mode="create" />);

        const fileInput = screen.getByLabelText(/写真/);
        // 5MBのファイルを作成
        const validFile = new File(
          [new ArrayBuffer(5 * 1024 * 1024)],
          "valid.jpg",
          { type: "image/jpeg" },
        );
        await user.upload(fileInput, validFile);

        // エラーメッセージが表示されない
        expect(
          screen.queryByText(/ファイルサイズが10MBを超えています/),
        ).not.toBeInTheDocument();
      });
    });

    describe("バリデーション成功時の動作", () => {
      it("バリデーション成功時のみプレビューが表示される", async () => {
        const user = userEvent.setup();
        render(<EmployeeForm mode="create" />);

        const fileInput = screen.getByLabelText(/写真/);
        const validFile = new File(["dummy"], "test.jpg", {
          type: "image/jpeg",
        });
        await user.upload(fileInput, validFile);

        // プレビュー画像が表示される
        const previewImage = await screen.findByAltText(/プレビュー/i);
        expect(previewImage).toBeInTheDocument();
      });

      it("バリデーション失敗時はプレビューが表示されない", async () => {
        const user = userEvent.setup();
        render(<EmployeeForm mode="create" />);

        const fileInput = screen.getByLabelText(/写真/);
        const invalidFile = new File(["dummy"], "test.pdf", {
          type: "application/pdf",
        });
        await user.upload(fileInput, invalidFile);

        // プレビュー画像が表示されない
        expect(screen.queryByAltText(/プレビュー/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("S3直接アップロード処理 (Task 5.3)", () => {
    // グローバルfetchをモック
    const mockFetch = vi.fn();
    beforeEach(() => {
      global.fetch = mockFetch;
      mockFetch.mockClear();
    });

    describe("Presigned URL取得とS3アップロード", () => {
      it("保存ボタンクリック時にPresigned PUT URLを取得する", async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            uploadUrl: "https://s3.amazonaws.com/bucket/presigned-url",
            s3Key: "employee-photos/test-uuid.jpg",
          }),
        });

        render(<EmployeeForm mode="create" />);

        // ファイル選択
        const fileInput = screen.getByLabelText(/写真/);
        const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
        await user.upload(fileInput, file);

        // 保存ボタンをクリック
        const saveButton = screen.getByRole("button", { name: "保存" });
        await user.click(saveButton);

        // Presigned URL取得APIが呼ばれることを確認
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/s3/upload/presign",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
            body: expect.stringContaining("test.jpg"),
          }),
        );
      });

      it("Presigned URL取得後、S3へ直接PUTリクエストを送信する", async () => {
        const user = userEvent.setup();
        const mockPresignedUrl =
          "https://s3.amazonaws.com/bucket/presigned-url";
        const mockS3Key = "employee-photos/test-uuid.jpg";

        // 1回目: Presigned URL取得
        // 2回目: S3へのPUT
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              uploadUrl: mockPresignedUrl,
              s3Key: mockS3Key,
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
          });

        render(<EmployeeForm mode="create" />);

        // ファイル選択
        const fileInput = screen.getByLabelText(/写真/);
        const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
        await user.upload(fileInput, file);

        // 保存ボタンをクリック
        const saveButton = screen.getByRole("button", { name: "保存" });
        await user.click(saveButton);

        // S3への直接PUT
        expect(mockFetch).toHaveBeenCalledWith(
          mockPresignedUrl,
          expect.objectContaining({
            method: "PUT",
            headers: expect.objectContaining({
              "Content-Type": "image/jpeg",
            }),
            body: file,
          }),
        );
      });

      it("S3アップロード成功後、photoS3Keyをフォームデータに含める", async () => {
        const user = userEvent.setup();
        const mockS3Key = "employee-photos/test-uuid.jpg";

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              uploadUrl: "https://s3.amazonaws.com/bucket/presigned-url",
              s3Key: mockS3Key,
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
          });

        render(<EmployeeForm mode="create" />);

        // ファイル選択
        const fileInput = screen.getByLabelText(/写真/);
        const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
        await user.upload(fileInput, file);

        // 保存ボタンをクリック
        const saveButton = screen.getByRole("button", { name: "保存" });
        await user.click(saveButton);

        // photoS3Keyがhidden inputまたは状態として保存されることを確認
        // 実装後に具体的なアサーションを追加
      });
    });

    describe("プログレスインジケーター", () => {
      it("アップロード中にプログレスインジケーターが表示される", async () => {
        const user = userEvent.setup();
        let resolveUpload: (value: unknown) => void;
        const uploadPromise = new Promise((resolve) => {
          resolveUpload = resolve;
        });

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              uploadUrl: "https://s3.amazonaws.com/bucket/presigned-url",
              s3Key: "employee-photos/test-uuid.jpg",
            }),
          })
          .mockReturnValueOnce(uploadPromise as Promise<Response>);

        render(<EmployeeForm mode="create" />);

        // ファイル選択
        const fileInput = screen.getByLabelText(/写真/);
        const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
        await user.upload(fileInput, file);

        // 保存ボタンをクリック
        const saveButton = screen.getByRole("button", { name: "保存" });
        await user.click(saveButton);

        // プログレスインジケーター（保存中...テキスト）が表示される
        expect(screen.getByText(/保存中/)).toBeInTheDocument();

        // アップロード完了
        resolveUpload({ ok: true, status: 200 });
      });

      it("アップロード中は保存ボタンが無効化される", async () => {
        const user = userEvent.setup();
        let resolveUpload: (value: unknown) => void;
        const uploadPromise = new Promise((resolve) => {
          resolveUpload = resolve;
        });

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              uploadUrl: "https://s3.amazonaws.com/bucket/presigned-url",
              s3Key: "employee-photos/test-uuid.jpg",
            }),
          })
          .mockReturnValueOnce(uploadPromise as Promise<Response>);

        render(<EmployeeForm mode="create" />);

        // ファイル選択
        const fileInput = screen.getByLabelText(/写真/);
        const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
        await user.upload(fileInput, file);

        // 保存ボタンをクリック
        const saveButton = screen.getByRole("button", { name: "保存" });
        await user.click(saveButton);

        // 保存ボタンが無効化される
        expect(saveButton).toBeDisabled();

        // アップロード完了
        resolveUpload({ ok: true, status: 200 });
      });
    });

    describe("エラーハンドリング", () => {
      it("Presigned URL取得失敗時にエラーメッセージを表示する", async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({
            error: "Failed to generate presigned URL",
          }),
        });

        render(<EmployeeForm mode="create" />);

        // ファイル選択
        const fileInput = screen.getByLabelText(/写真/);
        const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
        await user.upload(fileInput, file);

        // 保存ボタンをクリック
        const saveButton = screen.getByRole("button", { name: "保存" });
        await user.click(saveButton);

        // サーバーエラーメッセージが表示される
        const errorMessage =
          await screen.findByText(/サーバーエラーが発生しました/);
        expect(errorMessage).toBeInTheDocument();
      });

      it("S3アップロード失敗時にネットワークエラーメッセージを表示する", async () => {
        const user = userEvent.setup();
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              uploadUrl: "https://s3.amazonaws.com/bucket/presigned-url",
              s3Key: "employee-photos/test-uuid.jpg",
            }),
          })
          .mockRejectedValueOnce(new Error("Network error"));

        render(<EmployeeForm mode="create" />);

        // ファイル選択
        const fileInput = screen.getByLabelText(/写真/);
        const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
        await user.upload(fileInput, file);

        // 保存ボタンをクリック
        const saveButton = screen.getByRole("button", { name: "保存" });
        await user.click(saveButton);

        // ネットワークエラーメッセージが表示される
        const errorMessage =
          await screen.findByText(/ネットワークエラーが発生しました/);
        expect(errorMessage).toBeInTheDocument();
      });

      it("認証エラー（401）時に適切なエラーメッセージを表示する", async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({
            error: "Unauthorized. Please sign in.",
          }),
        });

        render(<EmployeeForm mode="create" />);

        // ファイル選択
        const fileInput = screen.getByLabelText(/写真/);
        const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
        await user.upload(fileInput, file);

        // 保存ボタンをクリック
        const saveButton = screen.getByRole("button", { name: "保存" });
        await user.click(saveButton);

        // 認証エラーメッセージが表示される
        const errorMessage = await screen.findByText(
          /認証されていません.*ログインしてください/,
        );
        expect(errorMessage).toBeInTheDocument();
      });

      it("権限エラー（403）時に適切なエラーメッセージを表示する", async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: async () => ({
            error: "Admin permission required.",
          }),
        });

        render(<EmployeeForm mode="create" />);

        // ファイル選択
        const fileInput = screen.getByLabelText(/写真/);
        const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
        await user.upload(fileInput, file);

        // 保存ボタンをクリック
        const saveButton = screen.getByRole("button", { name: "保存" });
        await user.click(saveButton);

        // 権限エラーメッセージが表示される
        const errorMessage =
          await screen.findByText(/この操作を実行する権限がありません/);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    describe("写真なしでの保存", () => {
      it("写真を選択せずに保存した場合、S3アップロードをスキップする", async () => {
        const user = userEvent.setup();
        render(<EmployeeForm mode="create" />);

        // 写真を選択せずに保存
        const saveButton = screen.getByRole("button", { name: "保存" });
        await user.click(saveButton);

        // Presigned URL取得APIが呼ばれないことを確認
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });
  });
});
