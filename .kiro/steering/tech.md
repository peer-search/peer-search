# Technology Stack

## Architecture

Next.js App Routerベースのフルスタックアーキテクチャ。React Server Componentsを活用したサーバーサイドファーストの設計。

## Core Technologies

- **Language**: TypeScript 5 (strict mode)
- **Framework**: Next.js 16.0.1 (App Router)
- **Runtime**: Node.js 22+
- **UI Library**: React 19.2 (Server Components)

## Key Libraries

- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) - 認証・データベース
- **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`) - タイプセーフなDB操作
- **shadcn/ui** - 再利用可能なUIコンポーネントライブラリ
- **Tailwind CSS 4** - ユーティリティファーストCSSフレームワーク
- **Biome** - 高速なリンター/フォーマッター

## Development Standards

### Type Safety
- TypeScript strictモード有効
- `any`の使用禁止
- Drizzle ORMによるDB型生成

### Code Quality
- **Linter/Formatter**: Biome 2.2.0
- **Pre-commit hooks**: Husky + lint-staged
- **Import organization**: 自動整理 (`source.organizeImports`)
- **Recommended rules**: Next.js、React推奨ルール適用

### Testing
現状未設定（将来的に追加予定）

## Development Environment

### Required Tools
- Node.js 22以上
- pnpm (パッケージマネージャー)

### Common Commands
```bash
# Dev server
pnpm dev

# Build production
pnpm build

# Lint & format
pnpm lint
pnpm format

# Database operations
pnpm db:generate  # Generate migrations
pnpm db:migrate   # Run migrations
pnpm db:studio    # Launch Drizzle Studio
```

## Key Technical Decisions

### React 19 Server Components
最新のReact Server Componentsを採用し、サーバーサイドでのデータフェッチとレンダリングを実現。クライアントバンドルサイズを最小化。

### Supabase SSR
`@supabase/ssr`を使用したサーバーサイド認証。Cookieベースのセッション管理により、App Routerとの統合を実現。

### Drizzle ORM
PostgreSQLとの連携にDrizzle ORMを採用。TypeScript-firstなAPIと、マイグレーション管理の容易さが決め手。

### Biome over ESLint/Prettier
高速性とオールインワン設計を評価し、Biomeを採用。ESLintとPrettierの2ツール体制から移行。

---
_Document standards and patterns, not every dependency_
