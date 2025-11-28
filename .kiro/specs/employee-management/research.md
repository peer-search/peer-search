# 調査記録: 社員管理機能（追加・編集・削除）

## 調査概要

- **調査日**: 2025-11-24
- **調査対象**: Next.js 16 Server Actions、Drizzle ORMトランザクション、shadcn/ui Dialog統合
- **調査方法**: Light Discovery（既存知識ベース、プロジェクトパターン分析）
- **調査者**: AI Development Agent

---

## 1. Next.js 16 Server Actions実装パターン

### 1.1 概要

Server Actionsは、Next.js 16でサーバーサイドのミューテーション（データ変更）を実行するための機能です。フォーム送信、データベース更新、認証処理などに使用されます。

### 1.2 基本実装パターン

#### ファイル配置
```
lib/employees/
  ├── service.ts       # データレイヤー（既存）
  ├── actions.ts       # Server Actions（新規）
  └── validation.ts    # バリデーションロジック（新規）
```

#### Server Action関数の構造
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createEmployeeAction(formData: FormData) {
  // 1. 権限チェック
  const user = await getUser();
  const profile = await getProfileByUserId(user.id);
  if (profile?.role !== "admin") {
    throw new Error("Forbidden");
  }

  // 2. フォームデータ抽出
  const employeeNumber = formData.get("employeeNumber") as string;
  const nameKanji = formData.get("nameKanji") as string;
  // ...

  // 3. バリデーション
  const validationErrors = validateEmployeeData({
    employeeNumber,
    nameKanji,
    // ...
  });
  if (validationErrors.length > 0) {
    return { success: false, errors: validationErrors };
  }

  // 4. データベース操作
  try {
    await createEmployee({
      employeeNumber,
      nameKanji,
      // ...
    });
  } catch (error) {
    // UNIQUE制約違反のハンドリング
    if (error.code === "23505") {
      return { success: false, errors: ["社員番号またはメールアドレスが既に使用されています"] };
    }
    throw error;
  }

  // 5. キャッシュ再検証
  revalidatePath("/employees");
  revalidatePath("/employees/[employeeId]", "page");

  // 6. リダイレクト
  redirect("/employees");
}
```

#### TypeScript型定義
```typescript
export type ActionResult = {
  success: boolean;
  errors?: string[];
  fieldErrors?: Record<string, string[]>;
};
```

### 1.3 フォーム統合パターン

#### Client Component（フォーム）
```typescript
"use client";

import { useActionState } from "react";
import { createEmployeeAction } from "@/lib/employees/actions";

export function EmployeeForm() {
  const [state, formAction, isPending] = useActionState(
    createEmployeeAction,
    { success: false }
  );

  return (
    <form action={formAction}>
      <Input name="employeeNumber" required />
      {state.fieldErrors?.employeeNumber && (
        <p className="text-red-600">{state.fieldErrors.employeeNumber[0]}</p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? "保存中..." : "保存"}
      </Button>
    </form>
  );
}
```

### 1.4 エラーハンドリング戦略

| エラータイプ | ハンドリング方法 | ユーザーへの表示 |
|-------------|----------------|----------------|
| バリデーションエラー | `return { success: false, fieldErrors }` | フィールドごとのエラーメッセージ |
| UNIQUE制約違反 | `catch`でPostgreSQLエラーコード検知 | 「社員番号が既に使用されています」 |
| 権限エラー | `throw new Error("Forbidden")` | error.tsx（403ページ） |
| ネットワークエラー | `throw`でエラーバウンダリへ | error.tsx（再試行ボタン付き） |

### 1.5 セキュリティ考慮事項

- **権限チェック**: 全Server Actionの冒頭でサーバーサイド権限検証
- **CSRF保護**: Next.js 16が自動的にCSRFトークンを生成・検証
- **SQLインジェクション防止**: Drizzle ORMのプリペアドステートメントを使用
- **入力サニタイゼーション**: バリデーション関数で実施

---

## 2. Drizzle ORMトランザクション

### 2.1 概要

Drizzle ORMは`db.transaction()`メソッドでトランザクションをサポートしています。複数テーブルへの書き込みの原子性を保証します。

### 2.2 基本実装パターン

#### シンプルなトランザクション
```typescript
import { db } from "@/db";
import { employees, employeeOrganizations } from "@/db/schema";

export async function createEmployee(data: CreateEmployeeInput) {
  return await db.transaction(async (tx) => {
    // 1. 社員レコード挿入
    const [employee] = await tx
      .insert(employees)
      .values({
        employeeNumber: data.employeeNumber,
        nameKanji: data.nameKanji,
        nameKana: data.nameKana,
        email: data.email,
        hireDate: data.hireDate,
        mobilePhone: data.mobilePhone || null,
        photoS3Key: null,
      })
      .returning();

    // 2. 所属組織レコード挿入（オプション）
    if (data.organizationIds && data.organizationIds.length > 0) {
      await tx.insert(employeeOrganizations).values(
        data.organizationIds.map((orgId) => ({
          employeeId: employee.id,
          organizationId: orgId,
          position: null,
        }))
      );
    }

    return employee;
  });
}
```

### 2.3 エラーハンドリング

```typescript
export async function updateEmployee(
  employeeId: string,
  data: UpdateEmployeeInput
) {
  try {
    return await db.transaction(async (tx) => {
      // トランザクション内でエラーが発生すると自動ロールバック
      const [employee] = await tx
        .update(employees)
        .set(data)
        .where(eq(employees.id, employeeId))
        .returning();

      if (!employee) {
        throw new Error("Employee not found");
      }

      return employee;
    });
  } catch (error) {
    // PostgreSQLエラーコード23505: UNIQUE制約違反
    if (error.code === "23505") {
      if (error.constraint === "employees_employee_number_unique") {
        throw new Error("この社員番号は既に使用されています");
      }
      if (error.constraint === "employees_email_unique") {
        throw new Error("このメールアドレスは既に使用されています");
      }
    }
    throw error;
  }
}
```

### 2.4 トランザクション設計方針

| 操作 | トランザクション使用 | 理由 |
|-----|---------------------|------|
| **新規追加** | ✅ 使用 | employees + employee_organizations（複数テーブル） |
| **更新** | ⚠️ 条件付き | employeesテーブルのみなら不要、所属も更新する場合は使用 |
| **削除** | ❌ 不使用 | CASCADE DELETEがDB側で処理、単一DELETE文で完結 |

### 2.5 パフォーマンス考慮事項

- トランザクションはデータベース接続を占有するため、最小限の操作に留める
- `returning()`句で挿入/更新データを取得し、追加クエリを削減
- 不要なトランザクションは避ける（単一テーブル操作の場合）

---

## 3. shadcn/ui Dialog/AlertDialog統合

### 3.1 概要

shadcn/uiの`Dialog`と`AlertDialog`コンポーネントは、モーダルダイアログの実装を提供します。削除確認、編集フォームのモーダル表示に使用します。

### 3.2 インストール

```bash
npx shadcn@latest add dialog
npx shadcn@latest add alert-dialog
```

これにより以下のファイルが生成されます:
- `components/ui/dialog.tsx`
- `components/ui/alert-dialog.tsx`

### 3.3 削除確認ダイアログの実装パターン

#### コンポーネント設計
```typescript
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteEmployeeAction } from "@/lib/employees/actions";
import { useActionState } from "react";

type Props = {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
};

export function DeleteEmployeeDialog({
  employeeId,
  employeeName,
  employeeNumber,
}: Props) {
  const [state, formAction, isPending] = useActionState(
    deleteEmployeeAction.bind(null, employeeId),
    { success: false }
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">削除</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>社員削除の確認</AlertDialogTitle>
          <AlertDialogDescription>
            以下の社員を削除してもよろしいですか？
            <br />
            <strong>
              {employeeName}（{employeeNumber}）
            </strong>
            <br />
            この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <form action={formAction}>
            <AlertDialogAction
              type="submit"
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? "削除中..." : "削除を確定する"}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### 3.4 Server Actionとの統合

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteEmployee } from "./service";
import { getUser } from "@/lib/auth";
import { getProfileByUserId } from "@/lib/profiles/service";

export async function deleteEmployeeAction(employeeId: string) {
  // 権限チェック
  const user = await getUser();
  const profile = await getProfileByUserId(user.id);
  if (profile?.role !== "admin") {
    throw new Error("Forbidden");
  }

  // 削除実行
  try {
    await deleteEmployee(employeeId);
  } catch (error) {
    console.error("Failed to delete employee:", error);
    throw new Error("社員の削除に失敗しました");
  }

  // キャッシュ再検証
  revalidatePath("/employees");

  // リダイレクト
  redirect("/employees");
}
```

### 3.5 アクセシビリティ対応

shadcn/uiの`AlertDialog`は以下のアクセシビリティ機能を提供:
- **Escape キー**: ダイアログを閉じる
- **Tab ナビゲーション**: フォーカス管理
- **ARIA 属性**: `role="alertdialog"`, `aria-labelledby`, `aria-describedby`
- **フォーカストラップ**: ダイアログ内でフォーカスをトラップ

### 3.6 Dialogコンポーネント（編集フォーム用）

削除確認には`AlertDialog`を使用しますが、編集フォーム表示には`Dialog`コンポーネントが適しています。本プロジェクトでは、編集モードを同一ページ内で切り替える方針（`?mode=edit`）のため、`Dialog`は新規追加フォームのモーダル表示に使用可能です。

---

## 4. アーキテクチャ決定事項

### 4.1 Server Actions配置場所

**決定**: `lib/employees/actions.ts`に配置

**理由**:
- `app/employees/actions.ts`ではなく、ビジネスロジック層（`lib/`）に配置
- データレイヤー（`service.ts`）と同じディレクトリで管理
- 他の機能（例: `lib/profiles/`, `lib/auth/`）でも同様のパターンを適用可能

### 4.2 バリデーション関数配置場所

**決定**: `lib/employees/validation.ts`に配置

**理由**:
- クライアントサイド・サーバーサイド両方で再利用可能
- 型定義とバリデーションロジックを集約
- テスト容易性の向上

### 4.3 編集モード切り替え方法

**決定**: クエリパラメータ（`?mode=edit`）を使用

**理由**:
- 別ルート（`/employees/[employeeId]/edit`）よりもシンプル
- ブラウザの戻るボタンで表示モードに戻れる
- メタデータ生成が単一ページで完結

### 4.4 削除確認ダイアログのメッセージ内容

**決定**: 社員名（漢字）と社員番号を表示、「この操作は取り消せません」を明示

**理由**:
- 誤操作防止のため、具体的な削除対象を表示
- 物理削除であることを明示

### 4.5 エラーメッセージの表示場所

**決定**: バリデーションエラーはインライン表示、システムエラーはerror.tsx

**理由**:
- バリデーションエラーはフィールドごとに即座に表示
- ネットワークエラー、権限エラーは全画面のエラーページで表示
- トースト通知は将来的な拡張として保留（要件10に含まれていない）

### 4.6 サーバーサイド権限チェックの実装場所

**決定**: 各Server Action関数の冒頭で実行

**理由**:
- ミドルウェアではなく、各操作で明示的にチェック
- テスト容易性の向上
- エラーメッセージのカスタマイズが容易

---

## 5. 技術的制約と前提条件

### 5.1 TypeScript strict mode

- 全Server Actionで戻り値の型定義が必須
- `FormData`の型推論が弱いため、明示的な型変換が必要
- `null`と`undefined`の厳密な区別

### 5.2 React 19の`useActionState`

- `useFormState`は非推奨、`useActionState`を使用
- `isPending`でローディング状態を管理
- 初期値として`{ success: false }`を提供

### 5.3 Next.js 16のキャッシュ戦略

- `revalidatePath()`で動的ルートのキャッシュを再検証
- `redirect()`はServer Action内で使用可能
- `cookies()`、`headers()`は使用不可（Dynamic Renderingになる）

### 5.4 Drizzle ORMの型推論

- `returning()`句で挿入/更新データの型が自動推論される
- トランザクション内でも型安全性が保たれる
- `$dynamic()`でクエリビルダーの型を動的に構築可能

---

## 6. テスト戦略

### 6.1 Server Actionsのテスト

```typescript
import { describe, it, expect, vi } from "vitest";
import { createEmployeeAction } from "./actions";

describe("createEmployeeAction", () => {
  it("管理者権限がない場合はエラーをスローする", async () => {
    vi.mock("@/lib/auth", () => ({
      getUser: vi.fn().mockResolvedValue({ id: "user-id" }),
    }));
    vi.mock("@/lib/profiles/service", () => ({
      getProfileByUserId: vi.fn().mockResolvedValue({ role: "user" }),
    }));

    const formData = new FormData();
    await expect(createEmployeeAction(formData)).rejects.toThrow("Forbidden");
  });

  it("バリデーションエラーがある場合はエラーを返す", async () => {
    // テストケース実装
  });

  it("正常に社員を作成できる", async () => {
    // テストケース実装
  });
});
```

### 6.2 バリデーション関数のテスト

```typescript
import { describe, it, expect } from "vitest";
import { validateEmployeeData } from "./validation";

describe("validateEmployeeData", () => {
  it("必須フィールドが空の場合はエラーを返す", () => {
    const errors = validateEmployeeData({
      employeeNumber: "",
      nameKanji: "",
      nameKana: "",
      email: "",
      hireDate: "",
    });
    expect(errors).toHaveLength(5);
  });

  it("メールアドレスの形式が不正な場合はエラーを返す", () => {
    const errors = validateEmployeeData({
      employeeNumber: "E001",
      nameKanji: "山田太郎",
      nameKana: "ヤマダタロウ",
      email: "invalid-email",
      hireDate: "2024-01-01",
    });
    expect(errors).toContain("有効なメールアドレスを入力してください");
  });
});
```

### 6.3 統合テスト

Vitestの`happy-dom`を使用してServer Actionsと統合したコンポーネントのテストを実施します。

---

## 7. パフォーマンス最適化

### 7.1 Server Actionsのベストプラクティス

- **最小限のデータ送信**: `FormData`で必要なフィールドのみ送信
- **キャッシュ再検証の最適化**: `revalidatePath()`を必要な範囲のみに限定
- **非同期処理の最適化**: データベース操作を並列化（可能な場合）

### 7.2 Drizzle ORMの最適化

- **プリペアドステートメント**: 全クエリで自動的に使用
- **returning()句**: 追加クエリを削減
- **インデックス活用**: `employee_number`、`email`にUNIQUEインデックスが設定済み

---

## 8. 今後の拡張可能性

### 8.1 トースト通知システム

shadcn/ui `Toast`コンポーネントを追加し、削除成功時のフィードバックを改善できます。

```bash
npx shadcn@latest add toast
```

### 8.2 楽観的UI更新

React 19の`useOptimistic`フックを使用し、Server Actionの実行前にUIを更新できます。

### 8.3 写真アップロード機能

S3への直接アップロード機能を追加し、`photoS3Key`フィールドを更新できます。

---

## 9. 参考リソース

- **Next.js 16 Server Actions**: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
- **Drizzle ORM Transactions**: https://orm.drizzle.team/docs/transactions
- **shadcn/ui Dialog**: https://ui.shadcn.com/docs/components/dialog
- **shadcn/ui AlertDialog**: https://ui.shadcn.com/docs/components/alert-dialog
- **React 19 useActionState**: https://react.dev/reference/react/useActionState

---

## 10. まとめ

本調査により、以下の技術的実装パターンが確立されました:

1. **Server Actions**: `lib/employees/actions.ts`に配置、権限チェック、バリデーション、エラーハンドリングのパターン
2. **Drizzle ORM**: トランザクション使用判断基準、エラーハンドリング方法
3. **shadcn/ui Dialog**: 削除確認ダイアログの実装パターン、Server Actionsとの統合

これらのパターンを基に、設計フェーズで詳細なコンポーネント設計、データフロー設計、エラーハンドリング戦略を策定します。
