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
  layout.tsx           # Root layout (RSC)
  page.tsx             # Home page
  login/page.tsx       # /login route
  api/auth/callback/   # API route handlers
```

### UI Components (`/components/ui/`)
**Purpose**: 再利用可能なデザインシステムコンポーネント
**Pattern**: shadcn/uiで管理、1コンポーネント1ファイル
**Example**: `button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`

### Library Utils (`/lib/`)
**Purpose**: 共通ユーティリティとサービスロジック
**Pattern**: 機能ごとにサブディレクトリ化
**Example**:
```
/lib/
  utils.ts             # Common utilities (cn, etc.)
  supabase-auth/       # Auth utilities
    auth.ts
    server.ts
    middleware.ts
    authGoogle.ts
```

### Database Layer (`/db/`)
**Purpose**: Drizzleスキーマとデータベース設定
**Pattern**: `schema.ts`でスキーマ定義、`index.ts`で接続設定
**Example**:
```
/db/
  schema.ts   # pgTable definitions
  index.ts    # DB connection
```

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

### Auth Layer Separation
- 認証ロジックは`/lib/supabase-auth/`に集約
- `middleware.ts`で全ルートの認証チェック
- `getUser()`でキャッシュされた認証情報を取得

### UI Component Isolation
- shadcn/uiコンポーネントは`/components/ui/`に配置
- ビジネスロジックを含まない純粋なUIコンポーネント
- TypeScript interfaceを同じファイルにエクスポート

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
