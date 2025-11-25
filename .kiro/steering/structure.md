# Project Structure

## Organization Philosophy

Next.js App Routerの規約に従った機能ベースの構成。UIコンポーネント、ビジネスロジック、データレイヤーを明確に分離。

## Directory Patterns

### App Router (`/app/`)
**Purpose**: ルーティングとページコンポーネント
**Pattern**: ファイルシステムベースのルーティング
**Example**:
```
/app/
  layout.tsx                  # Root layout (RSC)
  page.tsx                    # Home page
  login/page.tsx              # /login route
  employees/
    page.tsx                  # /employees route (list view)
    new/page.tsx              # /employees/new (create)
    [employeeId]/page.tsx     # /employees/:id (detail/edit)
  api/
    auth/callback/            # OAuth callback
    s3/presign/               # S3 presigned URL API
```

### UI Components (`/components/ui/`)
**Purpose**: 再利用可能なデザインシステムコンポーネント
**Pattern**: shadcn/uiで管理、1コンポーネント1ファイル
**Example**: `button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `skeleton.tsx`, `select.tsx`, `checkbox.tsx`, `radio-group.tsx`, `dropdown-menu.tsx`, `avatar.tsx`, `sheet.tsx`

### Feature Components (`/components/{feature}/`)
**Purpose**: 機能固有のビジネスコンポーネント
**Pattern**: 機能ごとにサブディレクトリ化、テストとコロケーション
**Example**:
```
/components/
  organization/
    organization-card.tsx
    organization-card.test.tsx
    organization-card-list.tsx
    organization-card-list.test.tsx
  employee/
    employee-card.tsx
    employee-card.test.tsx
    employee-card-list.tsx
    employee-detail-card.tsx      # Detail view card
    employee-detail-photo.tsx     # Detail view photo
    employee-form.tsx             # Create/Edit form
    employee-photo.tsx            # Photo component
    delete-employee-dialog.tsx    # Delete confirmation
    search-form.tsx
    sort-controls.tsx
  layout/
    page-header.tsx
    search-bar.tsx
    user-menu.tsx
```

### Library Utils (`/lib/`)
**Purpose**: 共通ユーティリティとサービスロジック
**Pattern**: 機能ごとにサブディレクトリ化、型定義とテストを含む
**Example**:
```
/lib/
  utils.ts             # Common utilities (cn, etc.)
  supabase-auth/       # Auth utilities
    auth.ts
    server.ts
    middleware.ts
    authGoogle.ts
  organizations/       # Organization logic
    types.ts
    service.ts
    tree.ts
    tree.test.ts
  employees/           # Employee CRUD & search logic
    service.ts
    service.test.ts
    actions.ts           # Server Actions (create/update/delete)
    actions.test.ts
    validation.ts        # Validation logic
    validation.test.ts
    types.ts             # Employee type definitions
    integration.test.ts  # Integration tests
  profiles/            # User profile & permissions
    service.ts
    service.test.ts
  s3/                  # AWS S3 utilities
    client.ts
    presigned-url.ts
    url.ts
    use-presigned-url.ts
```

### Database Layer (`/db/`, `/drizzle/`)
**Purpose**: Drizzleスキーマとデータベース設定
**Pattern**:
- `schema.ts`でスキーマ定義、型エクスポート
- `index.ts`でDB接続
- マイグレーションファイルにCHECK制約とRPC関数を追加
**Example**:
```
/db/
  schema.ts   # pgTable definitions with type exports
  index.ts    # DB connection
/drizzle/
  0000_*.sql  # Generated migrations + manual RPC functions
```
**Database Patterns**:
- Self-referencing tables: `parent_id` → `id` (ON DELETE CASCADE)
- Recursive CTE: `WITH RECURSIVE` for tree traversal
- Supabase RPC: Postgres関数をRPCとして呼び出し

### Scripts & Data (`/scripts/`, `/data/`)
**Purpose**: データベースシード、テストスクリプト、サンプルデータ
**Pattern**: TypeScriptスクリプトとCSVデータ
**Example**:
```
/scripts/
  load-env.mjs           # Environment loader
  seed-organizations.ts  # DB seed scripts
  test-rpc-hierarchy.ts  # RPC testing
/data/
  organizations-sample.csv
```
**Execution**: `node scripts/load-env.mjs scripts/{script}.ts`

## Naming Conventions

- **React Components**: PascalCase (`Button.tsx`, `LoginPage.tsx`)
- **Utility files**: camelCase (`auth.ts`, `utils.ts`)
- **Route segments**: kebab-case (`/api/auth/callback/`)
- **Database tables**: snake_case (`profiles`, `created_at`)

## Import Organization

```typescript
// External dependencies first
import type { NextRequest } from "next";
import { Geist, Geist_Mono } from "next/font/google";

// Absolute imports with @/ alias
import { getUser } from "@/lib/supabase-auth/auth";
import { Button } from "@/components/ui/button";

// Relative imports for local files
import "./globals.css";
```

**Path Aliases** (tsconfig.json):
- `@/*`: Project root (`./*`)

**Import Ordering**: Biomeが自動整理 (`assist.actions.source.organizeImports`)

## Code Organization Principles

### Server-First Pattern
- デフォルトでServer Components使用
- Client Componentsは明示的に`"use client"`宣言
- データフェッチはサーバーサイドで完結
- Server Actionsでデータ変更操作（CRUD）を実装（`"use server"`ディレクティブ）

### Auth Layer Separation
- 認証ロジックは`/lib/supabase-auth/`に集約
- `proxy.ts` (Next.js 16) で全ルートの認証チェック
- `getUser()`でキャッシュされた認証情報を取得

### UI Component Isolation
- shadcn/uiコンポーネントは`/components/ui/`に配置
- ビジネスロジックを含まない純粋なUIコンポーネント
- TypeScript interfaceを同じファイルにエクスポート

### Test Collocation
- コンポーネントテストは同じディレクトリに `.test.tsx` として配置
- ユニットテストは同じディレクトリに `.test.ts` として配置
- `tests/` ディレクトリにはテスト設定とドキュメントを配置

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
