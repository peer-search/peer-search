# Product Overview

peer-search-reは、Next.js 16、React 19、Supabaseをベースにした最新技術スタックを用いたWebアプリケーション開発プロジェクトです。

## Core Capabilities

- **ユーザー認証** - Supabase + Google OAuthによるセキュアな認証システム、役割ベースアクセス制御（RBAC）
- **データ永続化** - PostgreSQL + Drizzle ORMによるタイプセーフなデータベース操作
- **組織階層管理** - 再帰的なツリー構造で4階層の組織データを管理（会社→本部→部署→課/チーム）
- **社員検索システム** - 氏名・社員番号・入社年・組織による多軸検索、ソート機能
- **静的ファイル管理** - AWS S3統合によるPresigned URL方式での画像・ファイル管理
- **モダンUI** - shadcn/uiとTailwind CSS 4による再利用可能なコンポーネントシステム、レスポンシブ対応
- **自動テスト** - Vitest + React Testing Libraryによるユニット・コンポーネントテスト

## Target Use Cases

- Next.js App Routerを活用したサーバーサイドレンダリングアプリケーション
- Supabaseエコシステムを用いたフルスタック開発
- TypeScript strictモードによる型安全な開発

## Value Proposition

最新のReact Server Components (RSC)とNext.js 16の機能を活用し、パフォーマンスと開発体験を両立させます。Supabaseによる認証・データベース・リアルタイム機能の統合により、バックエンドインフラの構築を最小限に抑えます。

---
_Focus on patterns and purpose, not exhaustive feature lists_
