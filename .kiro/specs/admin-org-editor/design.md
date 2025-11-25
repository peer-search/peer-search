# Technical Design Document

## 1. Overview and Goals

### 機能概要
管理者が組織階層（会社 → 本部 → 部署 → 課／チーム）の追加・編集・削除を実行できる部署編集ページ。ファイルエクスプローラー風のツリービューによる直感的な階層構造の把握と、選択ノードの詳細編集フォームによる効率的な組織管理を実現する。

### 実装目標
- **管理者専用の組織CRUD機能**: Server Actionsによる安全でタイプセーフなデータ変更操作
- **直感的なUI/UX**: 階層構造を視覚的に把握できるツリービュー + 詳細編集フォーム
- **データ整合性の保証**: 循環参照防止、階層レベル制約、ON DELETE CASCADEによる連動削除
- **段階的実装**: Phase 1（MVP）とPhase 2（ツリービュー）で段階的にリリース

### 既存システムとの関係
- **読み取り専用組織階層表示**: 既存の`/`ページ（`OrganizationCard`、`getOrganizationHierarchy()`）は変更なし
- **権限管理**: 既存の`checkAdminPermission()`パターンを再利用
- **データモデル**: 既存の`organizations`テーブルを拡張（`updated_at`カラム追加のみ）
- **Server Actionsパターン**: 社員管理機能（`lib/employees/actions.ts`）で確立されたパターンを適用

---

## 2. Architecture Pattern & Boundary Map

### システム境界

```
┌─────────────────────────────────────────────────────────────┐
│  /admin/organizations ページ（新規作成）                      │
│  ┌────────────────────────┐  ┌─────────────────────────┐    │
│  │  左側: ツリービュー    │  │  右側: 編集フォーム     │    │
│  │  (Phase 1: リスト表示) │  │  (名称・親組織選択)     │    │
│  │  (Phase 2: ツリー形式) │  │                         │    │
│  └────────────────────────┘  └─────────────────────────┘    │
│                ↓                           ↓                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Server Actions (/lib/organizations/actions.ts)      │   │
│  │  - createOrganizationAction()                        │   │
│  │  - updateOrganizationAction()                        │   │
│  │  - deleteOrganizationAction()                        │   │
│  │  - checkAdminPermission()（再利用）                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                ↓                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Service Layer (/lib/organizations/service.ts)       │   │
│  │  - getOrganizationHierarchy()（既存・再利用）        │   │
│  │  - validateParentSelection()（新規）                 │   │
│  │  - getDescendantIds()（新規）                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                ↓                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Database (Supabase Postgres / Drizzle ORM)         │   │
│  │  - organizations テーブル                           │   │
│  │  - ON DELETE CASCADE 制約（既存）                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

External:
  - proxy.ts（Next.js 16）: 認証チェック
  - Supabase Auth: ユーザー認証
  - profiles テーブル: 管理者権限判定（role = 'admin'）
```

### アーキテクチャパターン

#### Server-First Pattern
- **ページコンポーネント**: React Server Component（`/app/admin/organizations/page.tsx`）
- **データフェッチ**: サーバーサイドで`getOrganizationHierarchy()`を呼び出し、初期データをSSR
- **データ変更**: Server Actionsで`"use server"`ディレクティブを使用
- **再レンダリング**: `revalidatePath('/admin/organizations')`でページ更新

#### 2カラムレイアウト
- **左側**: 組織ツリービュー（固定幅またはリサイズ可能）
- **右側**: 詳細編集フォーム（選択ノードの情報表示・編集）
- **レスポンシブ**: `md:flex-row`（デスクトップ）、`flex-col`（モバイル）

#### ハイブリッドアプローチ（段階的実装）

**Phase 1（MVP）**:
- シンプルなリスト表示（階層インデントで視覚化）
- 編集フォーム（名称・親組織選択）
- CRUD Server Actions実装
- Effort: M（3-7日）、Risk: Low

**Phase 2（エンハンスメント）**:
- ファイルエクスプローラー風ツリービュー
- 展開/折りたたみ、キーボードナビゲーション
- ARIA属性によるアクセシビリティ対応
- Effort: M（3-7日）、Risk: Medium

---

## 3. Technology Stack Alignment

### 使用技術（既存スタックに準拠）
- **Framework**: Next.js 16.0.1（App Router）
- **UI Library**: React 19.2（Server Components）
- **Language**: TypeScript 5（strict mode）
- **ORM**: Drizzle ORM（タイプセーフなDB操作）
- **Database**: Supabase Postgres
- **Auth**: Supabase Auth + `proxy.ts`（Next.js 16パターン）
- **UI Components**: shadcn/ui（`button`, `input`, `label`, `dialog`, `alert-dialog`, `select`）
- **Styling**: Tailwind CSS 4
- **Testing**: Vitest + React Testing Library

### 新規依存関係（Phase 2で評価）
- **ツリービューライブラリ候補**:
  - `react-arborist`（推奨）: 高機能、アクセシビリティ対応、仮想スクロール
  - `rc-tree`（代替案）: シンプル、カスタマイズ可能
  - 自作（最終手段）: 完全なコントロール、ただし工数増

**Phase 1では追加の外部依存関係なし**: 既存のshadcn/uiコンポーネントとTailwind CSSで実装可能

---

## 4. System Flows

### 4.1 ページ初期表示フロー

```
[ユーザー] → /admin/organizations にアクセス
    ↓
[proxy.ts] 認証チェック
    ↓ (未認証)
    → /login にリダイレクト
    ↓ (認証済み)
[page.tsx] サーバーサイドで権限チェック
    ↓ (role !== 'admin')
    → 403エラーページ表示
    ↓ (role === 'admin')
[page.tsx] getOrganizationHierarchy() でデータ取得
    ↓
[page.tsx] ツリービュー + 編集フォームをレンダリング（SSR）
    ↓
[Client] 初期表示完了（ルートノード自動選択）
```

### 4.2 組織追加フロー

```
[ユーザー] → ツリービューで親ノードを選択
    ↓
[Client] 「子部署を追加」ボタンをクリック
    ↓
[Client] 右側に追加フォームを表示（親組織自動設定）
    ↓
[ユーザー] → 名称を入力し、送信ボタンをクリック
    ↓
[Client] クライアントサイドバリデーション
    ↓ (エラーあり)
    → フォーム下部にエラーメッセージ表示
    ↓ (エラーなし)
[Server Action] createOrganizationAction() 呼び出し
    ↓
[Server Action] checkAdminPermission()（権限チェック）
    ↓ (権限なし)
    → Error("Forbidden") をスロー
    ↓ (権限あり)
[Server Action] サーバーサイドバリデーション
    ↓ (階層レベル4に子追加)
    → エラーメッセージ「課／チーム配下には追加できません」を返す
    ↓ (バリデーション通過)
[Server Action] Drizzle ORMで organizations テーブルに挿入
    ↓ (DB制約違反)
    → エラーメッセージ「追加に失敗しました」を返す
    ↓ (成功)
[Server Action] revalidatePath('/admin/organizations') 実行
    ↓
[Server Action] 成功ステータスを返す
    ↓
[Client] 成功メッセージ「組織を追加しました」を表示
    ↓
[Client] ページ再レンダリング（新規ノード表示）
```

### 4.3 組織編集フロー

```
[ユーザー] → ツリービューでノードを選択
    ↓
[Client] 右側に編集フォームを表示（既存データ表示）
    ↓
[ユーザー] → 名称または親組織を変更し、送信ボタンをクリック
    ↓
[Client] クライアントサイドバリデーション
    ↓ (エラーあり)
    → フォーム下部にエラーメッセージ表示
    ↓ (エラーなし)
[Server Action] updateOrganizationAction() 呼び出し
    ↓
[Server Action] checkAdminPermission()（権限チェック）
    ↓ (権限なし)
    → Error("Forbidden") をスロー
    ↓ (権限あり)
[Server Action] サーバーサイドバリデーション
    ↓ (循環参照チェック)
    [Service] validateParentSelection()
        → 選択された親が自分自身または子孫か確認
        → [Service] getDescendantIds() で子孫ID取得
    ↓ (循環参照あり)
    → エラーメッセージ「親組織に自分自身または子部署は選択できません」を返す
    ↓ (バリデーション通過)
[Server Action] 親組織変更の場合、階層レベルを自動再計算
    ↓
[Server Action] Drizzle ORMで organizations テーブルを更新
    ↓ (DB制約違反)
    → エラーメッセージ「更新に失敗しました」を返す
    ↓ (成功)
[Server Action] 子孫ノードの階層レベルも連動して更新（トランザクション）
    ↓
[Server Action] revalidatePath('/admin/organizations') 実行
    ↓
[Server Action] 成功ステータスを返す
    ↓
[Client] 成功メッセージ「組織を更新しました」を表示
    ↓
[Client] ページ再レンダリング（変更反映）
```

### 4.4 組織削除フロー

```
[ユーザー] → ツリービューでノードを選択
    ↓
[Client] 「削除」ボタンをクリック
    ↓
[Client] 確認ダイアログ表示
    ↓ (子ノードあり)
    [Client] getDescendantIds() で子ノード数を取得
    → 「このノードには{N}個の子部署が存在します。すべて削除されます。」警告追加
    ↓
[ユーザー] → ダイアログで「削除」を選択
    ↓
[Server Action] deleteOrganizationAction() 呼び出し
    ↓
[Server Action] checkAdminPermission()（権限チェック）
    ↓ (権限なし)
    → Error("Forbidden") をスロー
    ↓ (権限あり)
[Server Action] ルートノード削除チェック（level === 1）
    ↓ (ルートノード)
    → エラーメッセージ「ルートノードは削除できません」を返す
    ↓ (ルートノード以外)
[Server Action] Drizzle ORMで organizations テーブルから削除
    ↓
[Database] ON DELETE CASCADE 制約により子孫ノードも連動削除
    ↓ (DB制約違反)
    → エラーメッセージ「削除に失敗しました」を返す
    ↓ (成功)
[Server Action] revalidatePath('/admin/organizations') 実行
    ↓
[Server Action] 成功ステータスを返す
    ↓
[Client] 成功メッセージ「組織を削除しました」を表示
    ↓
[Client] ページ再レンダリング（削除されたノード非表示）
```

---

## 5. Components & Interface Contracts

### 5.1 ページコンポーネント

#### `/app/admin/organizations/page.tsx`（新規作成）
**責任**: ページルーティング、権限チェック、初期データ取得、レイアウト

```typescript
// Server Component
export default async function AdminOrganizationsPage() {
  // 1. 認証チェック（proxy.tsで自動実施）
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. 管理者権限チェック
  const profile = await getProfileByUserId(user.id);
  if (!profile || profile.role !== 'admin') {
    // 403エラーページにリダイレクトまたはエラー表示
    throw new Error('Forbidden');
  }

  // 3. 組織階層データ取得
  const organizations = await getOrganizationHierarchy();

  // 4. レイアウトレンダリング
  return (
    <div className="flex flex-col md:flex-row h-screen">
      <OrganizationListView organizations={organizations} />
      <OrganizationEditPanel />
    </div>
  );
}

// Metadata
export const metadata = {
  title: '組織管理 | Peer Search',
  robots: 'noindex, nofollow',
};
```

#### `/app/admin/organizations/loading.tsx`（新規作成）
**責任**: ローディング状態の表示

```typescript
export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <p>読み込み中...</p>
    </div>
  );
}
```

#### `/app/admin/organizations/error.tsx`（新規作成）
**責任**: エラー状態の表示

```typescript
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-xl font-bold mb-4">エラーが発生しました</h2>
      <p className="mb-4">{error.message}</p>
      <button onClick={reset} className="px-4 py-2 bg-blue-500 text-white rounded">
        再試行
      </button>
    </div>
  );
}
```

---

### 5.2 UIコンポーネント（Phase 1）

#### `/components/organization/organization-list-view.tsx`（新規作成）
**責任**: 組織階層のリスト表示、選択状態管理

```typescript
'use client';

interface OrganizationListViewProps {
  organizations: OrganizationTree[];
}

export function OrganizationListView({ organizations }: OrganizationListViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const flatNodes = flattenTree(organizations); // ツリーをフラット配列に変換

  return (
    <div className="w-full md:w-1/3 border-r overflow-auto">
      {flatNodes.map(node => (
        <OrganizationListItem
          key={node.id}
          node={node}
          isSelected={node.id === selectedId}
          onSelect={() => setSelectedId(node.id)}
        />
      ))}
    </div>
  );
}
```

**インターフェース**:
- **Props**: `organizations` - 組織階層データ（ツリー構造）
- **State**: `selectedId` - 選択中のノードID
- **Events**: `onSelect(id)` - ノード選択時のコールバック

---

#### `/components/organization/organization-list-item.tsx`（新規作成）
**責任**: 個別組織ノードの表示、階層インデント

```typescript
'use client';

interface OrganizationListItemProps {
  node: OrganizationFlatNode;
  isSelected: boolean;
  onSelect: () => void;
}

export function OrganizationListItem({ node, isSelected, onSelect }: OrganizationListItemProps) {
  const indentStyle = { paddingLeft: `${node.level * 20}px` };

  return (
    <div
      className={cn(
        "px-4 py-2 cursor-pointer hover:bg-gray-100",
        isSelected && "bg-blue-100 border-l-4 border-blue-500"
      )}
      style={indentStyle}
      onClick={onSelect}
    >
      <span>{node.name}</span>
    </div>
  );
}
```

**インターフェース**:
- **Props**: `node` - 組織ノード、`isSelected` - 選択状態、`onSelect` - 選択時のコールバック
- **Styling**: 階層レベルに応じたインデント（`level * 20px`）

---

#### `/components/organization/organization-edit-panel.tsx`（新規作成）
**責任**: 編集フォームの表示、選択ノードとの連携

```typescript
'use client';

export function OrganizationEditPanel() {
  const { selectedNode } = useOrganizationSelection(); // Context APIで選択ノード取得

  if (!selectedNode) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p>組織を選択してください</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <OrganizationEditForm node={selectedNode} />
    </div>
  );
}
```

**インターフェース**:
- **Context**: `useOrganizationSelection()` - 選択ノードを取得
- **Conditional Rendering**: 未選択時は「組織を選択してください」を表示

---

#### `/components/organization/organization-edit-form.tsx`（新規作成）
**責任**: 名称・親組織の編集フォーム、バリデーション、Server Action呼び出し

```typescript
'use client';

interface OrganizationEditFormProps {
  node: OrganizationFlatNode;
}

export function OrganizationEditForm({ node }: OrganizationEditFormProps) {
  const [name, setName] = useState(node.name);
  const [parentId, setParentId] = useState(node.parentId);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // クライアントサイドバリデーション
    if (!name.trim()) {
      setError('名称は必須です');
      return;
    }
    if (name.length > 255) {
      setError('名称は255文字以内で入力してください');
      return;
    }

    // Server Action呼び出し
    startTransition(async () => {
      const result = await updateOrganizationAction({
        id: node.id,
        name,
        parentId,
      });

      if (!result.success) {
        setError(result.error || '更新に失敗しました');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">名称</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full border rounded px-3 py-2"
          maxLength={255}
        />
      </div>

      <div>
        <label htmlFor="parentId" className="block text-sm font-medium">親組織</label>
        <select
          id="parentId"
          value={parentId || ''}
          onChange={(e) => setParentId(e.target.value || null)}
          className="mt-1 block w-full border rounded px-3 py-2"
        >
          <option value="">なし（ルート組織）</option>
          {/* 自分自身と子孫ノードを除外したリスト */}
          {getAvailableParents(node).map(parent => (
            <option key={parent.id} value={parent.id}>{parent.name}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {isPending ? '更新中...' : '更新'}
        </button>

        <DeleteOrganizationButton node={node} />
      </div>
    </form>
  );
}
```

**インターフェース**:
- **Props**: `node` - 編集対象の組織ノード
- **State**: `name`, `parentId`, `error`, `isPending`
- **Events**: `handleSubmit()` - フォーム送信時の処理
- **Helper**: `getAvailableParents(node)` - 循環参照を除外した親組織候補リスト

---

#### `/components/organization/delete-organization-dialog.tsx`（新規作成）
**責任**: 削除確認ダイアログ、子ノード警告表示

```typescript
'use client';

interface DeleteOrganizationButtonProps {
  node: OrganizationFlatNode;
}

export function DeleteOrganizationButton({ node }: DeleteOrganizationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const descendantCount = getDescendantCount(node.id); // 子孫ノード数取得

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteOrganizationAction(node.id);

      if (result.success) {
        setIsOpen(false);
      } else {
        alert(result.error || '削除に失敗しました');
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-500 text-white rounded"
      >
        削除
      </button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>組織を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {descendantCount > 0 && (
                <p className="text-red-600 font-bold mb-2">
                  このノードには{descendantCount}個の子部署が存在します。すべて削除されます。
                </p>
              )}
              <p>この操作は取り消せません。</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              {isPending ? '削除中...' : '削除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

**インターフェース**:
- **Props**: `node` - 削除対象の組織ノード
- **State**: `isOpen` - ダイアログ表示状態、`isPending` - 削除処理中フラグ
- **Helper**: `getDescendantCount(id)` - 子孫ノード数取得
- **Warning**: 子ノードが存在する場合、警告メッセージを表示

---

### 5.3 Server Actions

#### `/lib/organizations/actions.ts`（新規作成）
**責任**: CRUD操作のServer Actions、権限チェック、バリデーション

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUser } from '@/lib/supabase-auth/auth';
import { getProfileByUserId } from '@/lib/profiles/service';
import { validateParentSelection, getDescendantIds } from './service';

// 型定義
interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// 権限チェックヘルパー（再利用）
async function checkAdminPermission(): Promise<void> {
  const user = await getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile || profile.role !== 'admin') {
    throw new Error('Forbidden');
  }
}

// 組織追加
export async function createOrganizationAction(data: {
  name: string;
  parentId: string | null;
}): Promise<ActionResult> {
  try {
    // 権限チェック
    await checkAdminPermission();

    // バリデーション
    if (!data.name.trim()) {
      return { success: false, error: '名称は必須です' };
    }
    if (data.name.length > 255) {
      return { success: false, error: '名称は255文字以内で入力してください' };
    }

    // 親組織の階層レベル取得
    let level = 1;
    if (data.parentId) {
      const parent = await db.query.organizations.findFirst({
        where: eq(organizations.id, data.parentId),
      });

      if (!parent) {
        return { success: false, error: '親組織が見つかりません' };
      }

      // 階層制約チェック（レベル4に子追加不可）
      if (parent.level >= 4) {
        return { success: false, error: '課／チーム配下には追加できません' };
      }

      level = parent.level + 1;
    }

    // データベース挿入
    await db.insert(organizations).values({
      name: data.name,
      parentId: data.parentId,
      level,
    });

    // ページ再検証
    revalidatePath('/admin/organizations');

    return { success: true };
  } catch (error) {
    console.error('createOrganizationAction error:', error);
    return { success: false, error: '追加に失敗しました' };
  }
}

// 組織更新
export async function updateOrganizationAction(data: {
  id: string;
  name: string;
  parentId: string | null;
}): Promise<ActionResult> {
  try {
    // 権限チェック
    await checkAdminPermission();

    // バリデーション
    if (!data.name.trim()) {
      return { success: false, error: '名称は必須です' };
    }
    if (data.name.length > 255) {
      return { success: false, error: '名称は255文字以内で入力してください' };
    }

    // 循環参照チェック
    if (data.parentId) {
      const isValid = await validateParentSelection(data.id, data.parentId);
      if (!isValid) {
        return { success: false, error: '親組織に自分自身または子部署は選択できません' };
      }
    }

    // 現在のノード取得
    const currentNode = await db.query.organizations.findFirst({
      where: eq(organizations.id, data.id),
    });

    if (!currentNode) {
      return { success: false, error: '組織が見つかりません' };
    }

    // 親組織変更の場合、階層レベル再計算
    let newLevel = currentNode.level;
    if (data.parentId !== currentNode.parentId) {
      if (data.parentId) {
        const parent = await db.query.organizations.findFirst({
          where: eq(organizations.id, data.parentId),
        });
        newLevel = parent ? parent.level + 1 : 1;
      } else {
        newLevel = 1;
      }

      // 子孫ノードの階層レベルも連動更新
      const levelDiff = newLevel - currentNode.level;
      const descendantIds = await getDescendantIds(data.id);

      // トランザクション内で一括更新
      await db.transaction(async (tx) => {
        // 自ノード更新
        await tx.update(organizations)
          .set({
            name: data.name,
            parentId: data.parentId,
            level: newLevel,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, data.id));

        // 子孫ノードのレベル更新
        for (const descendantId of descendantIds) {
          await tx.update(organizations)
            .set({
              level: sql`level + ${levelDiff}`,
              updatedAt: new Date(),
            })
            .where(eq(organizations.id, descendantId));
        }
      });
    } else {
      // 名称のみ更新
      await db.update(organizations)
        .set({
          name: data.name,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, data.id));
    }

    // ページ再検証
    revalidatePath('/admin/organizations');

    return { success: true };
  } catch (error) {
    console.error('updateOrganizationAction error:', error);
    return { success: false, error: '更新に失敗しました' };
  }
}

// 組織削除
export async function deleteOrganizationAction(id: string): Promise<ActionResult> {
  try {
    // 権限チェック
    await checkAdminPermission();

    // ルートノード削除チェック
    const node = await db.query.organizations.findFirst({
      where: eq(organizations.id, id),
    });

    if (!node) {
      return { success: false, error: '組織が見つかりません' };
    }

    if (node.level === 1) {
      return { success: false, error: 'ルートノードは削除できません' };
    }

    // データベース削除（ON DELETE CASCADEにより子孫も連動削除）
    await db.delete(organizations).where(eq(organizations.id, id));

    // ページ再検証
    revalidatePath('/admin/organizations');

    return { success: true };
  } catch (error) {
    console.error('deleteOrganizationAction error:', error);
    return { success: false, error: '削除に失敗しました' };
  }
}
```

**インターフェース**:
- **共通**: `checkAdminPermission()` - 管理者権限チェック（`lib/employees/actions.ts`パターンを再利用）
- **createOrganizationAction**: 名称・親組織から新規ノード作成、階層レベル自動計算
- **updateOrganizationAction**: 名称・親組織更新、循環参照チェック、階層レベル再計算、子孫ノード連動更新
- **deleteOrganizationAction**: ルートノード削除禁止、ON DELETE CASCADEによる子孫連動削除
- **戻り値**: `ActionResult<T>` - 成功/失敗ステータスとエラーメッセージ

---

### 5.4 Service Layer

#### `/lib/organizations/service.ts`（拡張）
**責任**: 読み取り専用操作（既存）、バリデーションロジック（新規）

```typescript
// 既存関数（変更なし）
export async function getOrganizationHierarchy(): Promise<OrganizationTree[]> {
  // 既存実装（RPC呼び出し）
}

// 新規関数: 循環参照検証
export async function validateParentSelection(
  nodeId: string,
  parentId: string
): Promise<boolean> {
  // 親が自分自身ではないか
  if (nodeId === parentId) {
    return false;
  }

  // 親が子孫ノードではないか
  const descendantIds = await getDescendantIds(nodeId);
  if (descendantIds.includes(parentId)) {
    return false;
  }

  return true;
}

// 新規関数: 子孫ノードID取得
export async function getDescendantIds(nodeId: string): Promise<string[]> {
  // 再帰CTEで子孫ノードを取得
  const result = await db.execute(sql`
    WITH RECURSIVE descendants AS (
      SELECT id, parent_id FROM organizations WHERE parent_id = ${nodeId}
      UNION ALL
      SELECT o.id, o.parent_id
      FROM organizations o
      INNER JOIN descendants d ON o.parent_id = d.id
    )
    SELECT id FROM descendants
  `);

  return result.rows.map(row => row.id as string);
}

// 新規関数: 子孫ノード数取得
export async function getDescendantCount(nodeId: string): Promise<number> {
  const ids = await getDescendantIds(nodeId);
  return ids.length;
}
```

**インターフェース**:
- **validateParentSelection**: 循環参照チェック（自分自身・子孫ノードを親に選択不可）
- **getDescendantIds**: 再帰CTEで子孫ノードIDを取得
- **getDescendantCount**: 子孫ノード数を返す（削除確認ダイアログで使用）

---

### 5.5 Context API（クライアントサイド状態管理）

#### `/components/organization/organization-context.tsx`（新規作成）
**責任**: 選択ノードの状態管理、コンポーネント間での共有

```typescript
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface OrganizationContextValue {
  selectedNode: OrganizationFlatNode | null;
  setSelectedNode: (node: OrganizationFlatNode | null) => void;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [selectedNode, setSelectedNode] = useState<OrganizationFlatNode | null>(null);

  return (
    <OrganizationContext.Provider value={{ selectedNode, setSelectedNode }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationSelection() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganizationSelection must be used within OrganizationProvider');
  }
  return context;
}
```

**インターフェース**:
- **OrganizationProvider**: 状態管理プロバイダー（ページコンポーネントでラップ）
- **useOrganizationSelection**: 選択ノードの状態とセッター関数を取得

---

## 6. Data Models

### 6.1 既存テーブル（拡張）

#### `organizations`テーブル
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()  -- 新規追加
);

CREATE INDEX idx_organizations_parent_id ON organizations(parent_id);
CREATE INDEX idx_organizations_level ON organizations(level);
```

**変更内容**:
- `updated_at`カラムを追加（マイグレーション必要）
- ON DELETE CASCADE制約は既存（確認済み: `drizzle/0000_charming_brood.sql:9`）

---

### 6.2 Drizzleスキーマ拡張

#### `/db/schema.ts`（既存ファイルを拡張）
```typescript
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    parentId: uuid("parent_id").references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    level: integer("level").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(), // 新規追加
  },
  (table) => ({
    parentIdIndex: index("idx_organizations_parent_id").on(table.parentId),
    levelIndex: index("idx_organizations_level").on(table.level),
  })
);

// 型エクスポート
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type UpdateOrganization = Partial<Omit<NewOrganization, 'id' | 'createdAt'>>;
```

---

### 6.3 マイグレーションファイル

#### `/drizzle/XXXX_add_updated_at_to_organizations.sql`（新規作成）
```sql
-- Add updated_at column to organizations table
ALTER TABLE organizations
ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**実行コマンド**:
```bash
pnpm db:generate  # Drizzleスキーマからマイグレーション生成
pnpm db:migrate   # マイグレーション実行
```

---

### 6.4 型定義

#### `/lib/organizations/types.ts`（拡張）
```typescript
// 既存型（変更なし）
export interface OrganizationTree {
  id: string;
  name: string;
  level: number;
  children: OrganizationTree[];
}

export interface OrganizationFlatNode {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  createdAt: Date;
  updatedAt: Date; // 新規追加
}

// 新規型: Server Action入力
export interface CreateOrganizationInput {
  name: string;
  parentId: string | null;
}

export interface UpdateOrganizationInput {
  id: string;
  name: string;
  parentId: string | null;
}
```

---

## 7. Error Handling

### 7.1 エラー分類

#### クライアントサイドエラー
- **バリデーションエラー**: フォーム入力不正（空文字列、最大文字数超過）
- **表示方法**: フォーム下部に赤文字でエラーメッセージ表示

#### サーバーサイドエラー
- **権限エラー**: `Error("Forbidden")` - 管理者権限なし
- **バリデーションエラー**: 循環参照、階層レベル制約違反
- **データベースエラー**: DB制約違反、接続エラー
- **戻り値**: `ActionResult` - `{ success: false, error: "エラーメッセージ" }`

#### システムエラー
- **認証エラー**: `redirect('/login')` - 未認証ユーザー
- **データ取得エラー**: `error.tsx` - データベース接続失敗、RPC関数エラー

---

### 7.2 エラーメッセージ定義

```typescript
export const ERROR_MESSAGES = {
  // バリデーション
  NAME_REQUIRED: '名称は必須です',
  NAME_TOO_LONG: '名称は255文字以内で入力してください',
  CIRCULAR_REFERENCE: '親組織に自分自身または子部署は選択できません',
  MAX_LEVEL_EXCEEDED: '課／チーム配下には追加できません',
  CANNOT_DELETE_ROOT: 'ルートノードは削除できません',

  // 権限
  UNAUTHORIZED: 'ログインが必要です',
  FORBIDDEN: '管理者権限が必要です',

  // データベース
  NOT_FOUND: '組織が見つかりません',
  CREATE_FAILED: '追加に失敗しました',
  UPDATE_FAILED: '更新に失敗しました',
  DELETE_FAILED: '削除に失敗しました',
  FETCH_FAILED: 'データの取得に失敗しました。再読み込みしてください。',
} as const;
```

---

### 7.3 エラーハンドリング戦略

#### Server Actions内でのエラーキャッチ
```typescript
export async function createOrganizationAction(data: CreateOrganizationInput): Promise<ActionResult> {
  try {
    // 権限チェック
    await checkAdminPermission();

    // バリデーション
    // ... （省略）

    // データベース操作
    await db.insert(organizations).values({ ... });

    revalidatePath('/admin/organizations');
    return { success: true };
  } catch (error) {
    console.error('createOrganizationAction error:', error);

    // エラー詳細をログ出力（本番環境では詳細を隠す）
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack trace:', error);
    }

    return { success: false, error: ERROR_MESSAGES.CREATE_FAILED };
  }
}
```

#### クライアント側でのエラー表示
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);

  // クライアントサイドバリデーション
  if (!name.trim()) {
    setError(ERROR_MESSAGES.NAME_REQUIRED);
    return;
  }

  // Server Action呼び出し
  startTransition(async () => {
    const result = await updateOrganizationAction({ id, name, parentId });

    if (!result.success) {
      setError(result.error || ERROR_MESSAGES.UPDATE_FAILED);
    } else {
      // 成功時はトースト通知またはメッセージ表示
      toast.success('組織を更新しました');
    }
  });
};
```

---

## 8. Testing Strategy

### 8.1 テストレベル

#### Unit Tests
**対象**: バリデーションロジック、ヘルパー関数
**ファイル**: `/lib/organizations/validation.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { validateParentSelection, getDescendantIds } from './service';

describe('validateParentSelection', () => {
  it('should reject when parent is self', async () => {
    const result = await validateParentSelection('node-1', 'node-1');
    expect(result).toBe(false);
  });

  it('should reject when parent is descendant', async () => {
    // node-1 → node-2 → node-3 の階層
    const result = await validateParentSelection('node-1', 'node-3');
    expect(result).toBe(false);
  });

  it('should accept valid parent', async () => {
    const result = await validateParentSelection('node-3', 'node-1');
    expect(result).toBe(true);
  });
});
```

---

#### Component Tests
**対象**: UIコンポーネント（リスト表示、フォーム入力、ダイアログ）
**ファイル**: `/components/organization/organization-edit-form.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OrganizationEditForm } from './organization-edit-form';

describe('OrganizationEditForm', () => {
  const mockNode = {
    id: 'org-1',
    name: 'テスト組織',
    parentId: null,
    level: 1,
  };

  it('should display organization name', () => {
    render(<OrganizationEditForm node={mockNode} />);
    expect(screen.getByDisplayValue('テスト組織')).toBeInTheDocument();
  });

  it('should show validation error for empty name', async () => {
    render(<OrganizationEditForm node={mockNode} />);

    const nameInput = screen.getByLabelText('名称');
    fireEvent.change(nameInput, { target: { value: '' } });

    const submitButton = screen.getByText('更新');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('名称は必須です')).toBeInTheDocument();
    });
  });

  it('should call updateOrganizationAction on submit', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ success: true });
    vi.mock('./actions', () => ({
      updateOrganizationAction: mockUpdate,
    }));

    render(<OrganizationEditForm node={mockNode} />);

    const nameInput = screen.getByLabelText('名称');
    fireEvent.change(nameInput, { target: { value: '更新後の名称' } });

    const submitButton = screen.getByText('更新');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        id: 'org-1',
        name: '更新後の名称',
        parentId: null,
      });
    });
  });
});
```

---

#### Integration Tests
**対象**: Server Actionsとデータベース連携
**ファイル**: `/lib/organizations/actions.integration.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { createOrganizationAction, updateOrganizationAction, deleteOrganizationAction } from './actions';
import { getUser } from '@/lib/supabase-auth/auth';
import { getProfileByUserId } from '@/lib/profiles/service';

// モック
vi.mock('@/lib/supabase-auth/auth', () => ({
  getUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
}));
vi.mock('@/lib/profiles/service', () => ({
  getProfileByUserId: vi.fn().mockResolvedValue({ id: 'profile-1', role: 'admin' }),
}));

describe('Organization Actions Integration', () => {
  let testOrgId: string;

  beforeEach(async () => {
    // テストデータ作成
    const result = await db.insert(organizations).values({
      name: 'テスト会社',
      parentId: null,
      level: 1,
    }).returning();
    testOrgId = result[0].id;
  });

  afterEach(async () => {
    // テストデータクリーンアップ
    await db.delete(organizations).where(eq(organizations.id, testOrgId));
  });

  it('should create new organization', async () => {
    const result = await createOrganizationAction({
      name: 'テスト本部',
      parentId: testOrgId,
    });

    expect(result.success).toBe(true);

    // データベース検証
    const newOrg = await db.query.organizations.findFirst({
      where: eq(organizations.name, 'テスト本部'),
    });
    expect(newOrg).toBeDefined();
    expect(newOrg?.level).toBe(2);
  });

  it('should update organization with level recalculation', async () => {
    // 子ノード作成
    const child = await db.insert(organizations).values({
      name: 'テスト本部',
      parentId: testOrgId,
      level: 2,
    }).returning();
    const childId = child[0].id;

    // 親ノードをnullに変更（ルート化）
    const result = await updateOrganizationAction({
      id: childId,
      name: 'テスト本部',
      parentId: null,
    });

    expect(result.success).toBe(true);

    // レベルが1に更新されているか確認
    const updatedOrg = await db.query.organizations.findFirst({
      where: eq(organizations.id, childId),
    });
    expect(updatedOrg?.level).toBe(1);
  });

  it('should delete organization with descendants (ON DELETE CASCADE)', async () => {
    // 子ノード作成
    const child = await db.insert(organizations).values({
      name: 'テスト本部',
      parentId: testOrgId,
      level: 2,
    }).returning();
    const childId = child[0].id;

    // 親ノード削除
    const result = await deleteOrganizationAction(testOrgId);

    expect(result.success).toBe(true);

    // 子ノードも連動削除されているか確認
    const deletedChild = await db.query.organizations.findFirst({
      where: eq(organizations.id, childId),
    });
    expect(deletedChild).toBeUndefined();
  });
});
```

---

#### Performance & SEO Tests
**対象**: パフォーマンス、アクセシビリティ、SEO検証
**ツール**: Lighthouse CI、axe-core

```typescript
import { describe, it, expect } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';
import { OrganizationListView } from './organization-list-view';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <OrganizationListView organizations={mockOrganizations} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

---

### 8.2 テストコマンド

```bash
# 全テスト実行（ウォッチモード）
pnpm test

# 全テスト実行（1回のみ）
pnpm test:run

# カバレッジレポート
pnpm test:coverage

# UIモード（ビジュアルテストランナー）
pnpm test:ui
```

---

## 9. Implementation Phases

### Phase 1: MVP（最小限の機能実装）

#### 目標
- 管理者権限チェック機能
- 組織階層データの取得・表示（シンプルなリスト）
- CRUD操作のServer Actions実装
- 編集フォーム + 削除確認ダイアログ

#### タスクリスト
1. **マイグレーション**: `updated_at`カラム追加
2. **Server Actions**: `createOrganizationAction`, `updateOrganizationAction`, `deleteOrganizationAction`
3. **Service Layer拡張**: `validateParentSelection`, `getDescendantIds`
4. **UIコンポーネント**:
   - `OrganizationListView`（階層インデント表示）
   - `OrganizationListItem`
   - `OrganizationEditPanel`
   - `OrganizationEditForm`
   - `DeleteOrganizationDialog`
5. **Context API**: `OrganizationProvider`, `useOrganizationSelection`
6. **ページコンポーネント**: `/app/admin/organizations/page.tsx`
7. **テスト**: Unit Tests、Component Tests、Integration Tests

#### 完了条件
- 管理者が組織の追加・編集・削除を実行できる
- バリデーション（循環参照チェック、階層レベル制約）が動作する
- 全テストがパスする

#### Effort
M（3-7日）、Risk: Low

---

### Phase 2: ツリービュー実装（UX改善）

#### 目標
- ファイルエクスプローラー風ツリービュー
- 展開/折りたたみ機能
- キーボードナビゲーション（矢印キー、Tab、Enter）
- ARIA属性によるアクセシビリティ対応

#### タスクリスト
1. **ツリービューライブラリ評価**: `react-arborist` vs `rc-tree` vs 自作
2. **ツリービューコンポーネント実装**:
   - `OrganizationTreeView`（展開状態管理）
   - `OrganizationTreeNode`（展開/折りたたみアイコン、選択ハイライト）
3. **キーボードナビゲーション実装**: `onKeyDown`イベントハンドラー
4. **ARIA属性追加**: `role="tree"`, `role="treeitem"`, `aria-expanded`, `aria-selected`
5. **Phase 1のリスト表示コンポーネントをツリービューに置き換え**
6. **テスト**: Component Tests、Accessibility Tests

#### 完了条件
- ツリービューで階層構造を視覚的に把握できる
- 展開/折りたたみ、キーボード操作が動作する
- アクセシビリティテスト（axe-core）がパスする

#### Effort
M（3-7日）、Risk: Medium

---

## 10. Performance & Security Considerations

### パフォーマンス最適化

#### Server Components優先
- ページコンポーネント（`page.tsx`）はServer Component
- データフェッチはサーバーサイドで完結（SSR）
- クライアントバンドルサイズを最小化

#### データフェッチ最適化
- RPC関数（`get_org_hierarchy()`）で階層データを一括取得
- N+1問題を回避（再帰CTEで一度にツリー構造取得）

#### 仮想スクロール（Phase 2以降）
- 組織ノード数が多い場合、ツリービューに仮想スクロールを導入
- ライブラリ: `react-arborist`（仮想スクロール対応）

---

### セキュリティ対策

#### 権限チェック
- **ページレベル**: サーバーサイドで管理者権限を検証（`page.tsx`）
- **Server Actionsレベル**: 各Server Action内で`checkAdminPermission()`を実行
- **二重チェック**: クライアント・サーバー両方で権限を確認

#### バリデーション
- **クライアントサイド**: ユーザー体験向上のため即座にエラー表示
- **サーバーサイド**: 最終的なバリデーションをServer Actions内で実施（クライアント側のバリデーション結果を信頼しない）

#### SQL Injection対策
- **Drizzle ORM**: パラメータ化クエリで自動エスケープ
- **RPC関数**: Supabaseのセキュアなクエリ実行

#### XSS対策
- **React**: 自動エスケープ（`dangerouslySetInnerHTML`を使用しない）
- **入力サニタイゼーション**: 名称フィールドのトリミング、最大文字数制限

---

## 11. Non-Functional Requirements

### レスポンシブデザイン
- **デスクトップ（>= 1024px）**: 2カラムレイアウト（左30% / 右70%）
- **タブレット（768px - 1024px）**: 2カラムレイアウト（左40% / 右60%）
- **モバイル（< 768px）**: 縦方向レイアウト（ツリービュー上部、編集フォームモーダル）

### アクセシビリティ
- **WCAG 2.1 Level AA準拠**
- **キーボードナビゲーション**: Tab、Enter、矢印キー対応
- **ARIA属性**: `role="tree"`, `role="treeitem"`, `aria-expanded`, `aria-selected`
- **フォーカスインジケーター**: 明確なアウトライン表示

### SEO
- **`noindex, nofollow`**: 管理画面のため検索エンジンのインデックス無効化
- **ページタイトル**: 「組織管理 | Peer Search」

### エラー処理
- **ローディング状態**: スピナーまたはスケルトンUI表示
- **エラー状態**: エラーメッセージ + 再試行ボタン
- **トースト通知**: 成功メッセージをトースト表示（例: `sonner`ライブラリ）

---

## 12. Rollout & Deployment Strategy

### Phase 1 ロールアウト
1. **デプロイ前準備**:
   - マイグレーション実行（`updated_at`カラム追加）
   - テスト実行（`pnpm test:run`）
   - Lintチェック（`pnpm lint`）
2. **デプロイ**:
   - Vercelへプッシュ（`git push origin main`）
   - 自動デプロイ実行
3. **デプロイ後確認**:
   - `/admin/organizations`ページにアクセス
   - 管理者アカウントでCRUD操作を実行
   - エラー監視（Sentry等）

### Phase 2 ロールアウト
1. **Feature Flag導入**:
   - 環境変数`ENABLE_TREE_VIEW`でツリービューの有効/無効を切り替え
   - Phase 1のリスト表示をフォールバックとして保持
2. **段階的有効化**:
   - ステージング環境でツリービューを有効化
   - ユーザーフィードバック収集
   - 本番環境へ展開
3. **ロールバック戦略**:
   - 環境変数を無効化することでリスト表示に戻す
   - データベース変更なし（Phase 1と互換性あり）

---

## 13. Success Metrics

### 機能性
- ✅ 管理者が組織の追加・編集・削除を実行できる
- ✅ バリデーション（循環参照、階層レベル制約）が動作する
- ✅ ON DELETE CASCADEで子孫ノードが連動削除される

### パフォーマンス
- ✅ 初期表示時間 < 1秒（SSR）
- ✅ Server Action実行時間 < 500ms（CRUD操作）

### アクセシビリティ
- ✅ axe-coreテスト 0 violations
- ✅ キーボードナビゲーション動作確認

### テストカバレッジ
- ✅ 全テストパス（Unit、Component、Integration）
- ✅ カバレッジ > 80%（Server Actions、Service Layer）

---

## Summary

### Phase 1（MVP）
- **目標**: 管理者によるCRUD操作の実現
- **UI**: シンプルなリスト表示 + 編集フォーム
- **技術**: Server Actions、Drizzle ORM、shadcn/ui
- **Effort**: M（3-7日）、Risk: Low

### Phase 2（エンハンスメント）
- **目標**: 直感的なツリービューUI
- **UI**: ファイルエクスプローラー風ツリービュー
- **技術**: ツリービューライブラリ（`react-arborist`候補）、ARIA属性
- **Effort**: M（3-7日）、Risk: Medium

### 次のステップ
1. Phase 1の実装タスクを生成（`/kiro:spec-tasks admin-org-editor`）
2. マイグレーション実行（`updated_at`カラム追加）
3. Server Actions実装
4. UIコンポーネント実装
5. テスト実装・実行
6. Phase 1デプロイ
