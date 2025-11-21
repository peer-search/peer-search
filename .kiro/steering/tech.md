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

- **Test Runner**: Vitest 4.0.12 - 高速でVite互換のテストランナー
- **Component Testing**: React Testing Library 16.3.0 - ユーザー視点のコンポーネントテスト
- **DOM Environment**: happy-dom 20.0.10 - 軽量で高速なDOM環境（jsdomより高速）
- **Assertions**: @testing-library/jest-dom - DOM要素のマッチャー拡張
- **User Interaction**: @testing-library/user-event - ユーザーイベントのシミュレーション

**Test Commands**:
```bash
pnpm test              # Watch mode
pnpm test:run          # Run once
pnpm test:ui           # UI mode (visual test runner)
pnpm test:coverage     # Coverage report
```

**Test Strategy**:
- **Unit Tests**: ビジネスロジック・ユーティリティ関数（例: ツリー構造変換）
- **Component Tests**: React Componentsの描画・インタラクション（例: OrganizationCard）
- **Integration Tests**: 将来的にE2Eフレームワーク（Playwright等）の導入を検討

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

### Next.js 16 Proxy Pattern
`middleware.ts` から `proxy.ts` へ移行（Next.js 16の新規約）。`proxy()` 関数で全ルートの認証チェックを実行。

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
