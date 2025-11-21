# Research & Design Decisions

---
**Purpose**: 技術設計を支える調査結果、アーキテクチャ検討、設計根拠を記録する。
---

## Summary
- **Feature**: `organization-hierarchy-view`
- **Discovery Scope**: Extension (既存システムへの新規ページとデータモデル追加)
- **Key Findings**:
  - 既存のNext.js App Router + React Server Componentsパターンを踏襲
  - Drizzle ORMによる階層データモデルの追加が必要
  - shadcn/ui Cardコンポーネントの再利用により、デザインシステムの一貫性を維持

## Research Log

### 既存コードベースパターン分析
- **Context**: 既存のApp Routerページ構造とServer Componentsパターンの把握
- **Sources Consulted**:
  - `/app/page.tsx` - 既存のトップページ実装
  - `/app/login/page.tsx` - ページ構造の参考
  - `/db/schema.ts` - Drizzleスキーマ定義パターン
  - `/components/ui/card.tsx` - shadcn/ui Cardコンポーネント
  - `/lib/supabase-auth/server.ts` - Supabaseクライアント生成パターン
- **Findings**:
  - Server Componentsでの非同期データフェッチパターン確立済み (`getUser()`関数の使用)
  - Drizzleスキーマは`pgTable`を使用し、`uuid`, `text`, `timestamp`型を活用
  - shadcn/uiコンポーネントはForwardRefパターンで実装され、`cn()`ユーティリティでクラス結合
  - `@/`エイリアスによる絶対パスインポートが標準
- **Implications**:
  - 新しいページは`/app/page.tsx`を置き換える形で実装
  - 組織階層テーブルは既存の`profiles`テーブルと同様のDrizzleパターンで定義
  - Cardコンポーネントの入れ子構造は`CardContent`内で再帰的に実装可能

### 階層データモデル設計
- **Context**: 4階層（会社 → 本部 → 部署 → 課／チーム）をPostgreSQLで効率的に表現する方法
- **Findings**:
  - 自己参照テーブル設計（`parent_id`カラム）が最適
  - `level`カラムで階層レベルを明示的に保持（クエリ最適化）
  - PostgreSQLのRecursive CTE（WITH RECURSIVE）でツリー構造を効率的に取得可能
  - Drizzle ORMは再帰クエリをサポートしていないため、生SQLまたは手動クエリ構築が必要
- **Implications**:
  - Drizzleスキーマで`organizations`テーブルを定義
  - データ取得はDrizzle ORMの基本クエリまたはSupabase RPC関数を検討
  - クライアントサイドでのツリー構造変換ロジックが必要

### Next.js 16 App Router + React 19 Server Components
- **Context**: 最新のNext.js/Reactパターンとベストプラクティスの確認
- **Findings**:
  - React 19のServer Componentsはデフォルトで非同期関数をサポート
  - `loading.tsx`と`error.tsx`による自動ローディング・エラーハンドリング
  - `metadata` APIによるSEO最適化が標準
  - Client Componentsは`"use client"`ディレクティブで明示的に宣言
- **Implications**:
  - メインページは完全にServer Componentとして実装
  - クリック可能なカードは`<Link>`コンポーネントまたはClient Componentで実装
  - ローディング状態は`/app/loading.tsx`で一元管理

### Tailwind CSS 4とレスポンシブデザイン
- **Context**: カード内包レイアウトのレスポンシブ実装
- **Findings**:
  - Tailwind CSS 4はCSS Gridとflexboxのユーティリティが充実
  - `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`パターンでブレークポイント対応
  - `gap-4`, `p-4`などのスペーシングユーティリティで一貫性を保持
- **Implications**:
  - カード内包レイアウトは`grid`または`flex`で実装
  - モバイルファースト設計（デフォルト1カラム）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Server-First RSC | 全てをServer Componentで実装 | SEO最適、初期レンダリング高速 | インタラクション性に制約 | Linkコンポーネントで遷移可能 |
| Hybrid (RSC + Client) | データフェッチはRSC、UIインタラクションはClient Component | 柔軟性が高い | クライアントバンドル増加 | カード自体は静的なのでRSCのみで十分 |

**選択**: Server-First RSC - カードクリックは`<Link>`による遷移で実現可能

## Design Decisions

### Decision: 組織階層データの取得戦略
- **Context**: 4階層のツリー構造を効率的に取得し、フロントエンドで表示する
- **Alternatives Considered**:
  1. Recursive CTE（PostgreSQL） - 1クエリで全階層取得
  2. 複数クエリ（親→子を順次取得） - N+1問題のリスク
  3. Supabase RPC関数 - カスタムSQL実行
- **Selected Approach**: Supabase RPC関数でRecursive CTEを実行し、結果を1回のクエリで取得
- **Rationale**:
  - Drizzle ORMは再帰クエリを直接サポートしていない
  - Supabase RPC関数により、複雑なSQLをカプセル化可能
  - パフォーマンス最適（1往復でデータ取得）
- **Trade-offs**:
  - **Benefits**: 高パフォーマンス、型安全性（戻り値の型定義可能）
  - **Compromises**: RPC関数の定義が必要（マイグレーションに含める）
- **Follow-up**: RPC関数のテストとエラーハンドリング実装

### Decision: カードクリック時の遷移方法
- **Context**: 階層ノードカードをクリックして社員一覧画面へ遷移
- **Alternatives Considered**:
  1. Next.js `<Link>` - サーバーサイドルーティング
  2. `useRouter().push()` - クライアントサイドルーティング（Client Component必要）
  3. `<a>` - フルページリロード
- **Selected Approach**: Next.js `<Link>`コンポーネントによるServer Component内での宣言的遷移
- **Rationale**:
  - Server Componentのまま実装可能
  - プリフェッチとクライアントサイドナビゲーションのメリット
  - コード量が最小
- **Trade-offs**:
  - **Benefits**: シンプル、Server Component維持
  - **Compromises**: カスタムクリックハンドラーが使えない（現時点で不要）
- **Follow-up**: ホバー・フォーカスのアクセシビリティ対応

### Decision: データモデルのlevelカラム
- **Context**: 階層レベルを明示的に保持するかどうか
- **Alternatives Considered**:
  1. levelカラムを保持 - 明示的な階層識別
  2. parent_idのみで階層を推論 - データ正規化
- **Selected Approach**: `level`カラムを`integer`型で保持（1:会社、2:本部、3:部署、4:課／チーム）
- **Rationale**:
  - クエリの簡略化（WHERE level = 1で会社のみ取得）
  - UIレンダリングの効率化（レベル別スタイリング）
  - データ整合性の検証が容易
- **Trade-offs**:
  - **Benefits**: クエリ・UI実装の簡素化
  - **Compromises**: わずかなストレージ増加、更新時の整合性維持
- **Follow-up**: スキーマ制約でlevelの範囲（1-4）を検証

## Risks & Mitigations
- **Risk 1: Recursive CTEのパフォーマンス（大規模組織データ）** - インデックス設計（parent_id, level）とページネーション検討
- **Risk 2: カード内包レイアウトの深いネスト（DOM複雑化）** - レベル制限（最大4階層）とCSSの最適化
- **Risk 3: `/employees`ページが未実装** - 本機能では遷移先の実装は範囲外、URLパラメータ仕様のみ定義

## References
- [Next.js 16 App Router Documentation](https://nextjs.org/docs/app) - ルーティングとServer Components
- [React 19 Server Components](https://react.dev/reference/rsc/server-components) - 非同期データフェッチ
- [Drizzle ORM PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql) - スキーマ定義とクエリ
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions) - RPC関数の作成
- [shadcn/ui Card Component](https://ui.shadcn.com/docs/components/card) - コンポーネントAPI
- [Tailwind CSS Grid](https://tailwindcss.com/docs/grid-template-columns) - レスポンシブグリッド
