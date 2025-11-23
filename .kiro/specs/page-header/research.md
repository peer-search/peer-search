# Research & Design Decisions

## Summary
- **Feature**: `page-header`
- **Discovery Scope**: Extension（既存システムへの共通UIコンポーネント追加）
- **Key Findings**:
  - shadcn/uiの既存コンポーネント（Select, DropdownMenu, Avatar, Input, Button, Link）を活用可能
  - React Server ComponentsとClient Componentsの責務分離パターンが確立済み
  - Supabase認証の統合パターン（getUser()関数）が整備済み
  - profilesテーブルが存在せず、管理者権限の判定機構が未実装

## Research Log

### shadcn/uiコンポーネントの利用可能性
- **Context**: ヘッダーUIの実装に必要なコンポーネントの調査
- **Sources Consulted**:
  - https://ui.shadcn.com/docs/components/select
  - https://ui.shadcn.com/docs/components/dropdown-menu
  - https://ui.shadcn.com/docs/components/avatar
  - プロジェクト内の既存コンポーネント（components/ui/）
- **Findings**:
  - **Select**: 検索種別ドロップダウンに利用可能（SelectTrigger, SelectContent, SelectItem）
  - **DropdownMenu**: ユーザーメニューに利用可能（DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem）
  - **Avatar**: GoogleアカウントアイコンにAvatarコンポーネント利用可能（AvatarImage, AvatarFallback）
  - **Input / Button**: 既存のshadcn/ui Input, Buttonコンポーネントを検索バーに活用
  - **Link**: Next.jsの`<Link>`コンポーネントとの統合パターンが確立
- **Implications**: 新規コンポーネントの追加は不要。shadcn/uiの標準コンポーネントで全要件を実現可能。

### 既存の認証パターンとコンポーネント構造
- **Context**: Supabase認証とReact Server Componentsの統合方法の確認
- **Sources Consulted**:
  - lib/supabase-auth/auth.ts
  - app/layout.tsx
  - components/employee/search-form.tsx
- **Findings**:
  - **認証取得パターン**: サーバーサイドで`getUser()`関数（React cacheでキャッシュ済み）を使用し、認証済みユーザー情報を取得
  - **Server Component優先**: デフォルトでServer Components、インタラクション部分のみClient Components（`"use client"`）
  - **コンポーネント分離**: 検索フォーム（SearchForm）のように、機能ごとにファイル分割し、テストとコロケーション
  - **Sheet/Drawer**: モバイル対応にshadcn/uiの`Sheet`コンポーネントを使用（SearchFormの実装例あり）
- **Implications**:
  - ページヘッダーもServer Componentとして実装し、認証情報の取得はサーバーサイドで完結
  - ユーザーメニューの開閉などインタラクション部分のみClient Componentに分離
  - レスポンシブ対応にSheetコンポーネントを検討可能

### 管理者権限の判定機構
- **Context**: ユーザーメニューに管理者限定メニューを表示する要件（Requirement 8）
- **Sources Consulted**:
  - db/schema.ts
  - Supabase Auth APIドキュメント
- **Findings**:
  - **現状**: `profiles`テーブルが存在しない。schema.tsには`organizations`, `employees`, `employee_organizations`のみ定義
  - **Gap**: 要件では`profiles.role`フィールドによる権限判定を想定しているが、現在のDBスキーマには存在しない
  - **Supabase Auth標準機能**:
    - `user.app_metadata`にカスタムロール情報を保存可能
    - または`profiles`テーブルを新規作成し、`auth.users.id`と紐付け
- **Implications**:
  - **Design Decision Required**: 権限管理の実装方法を設計で明確化する必要がある
    - Option A: `profiles`テーブルを新規作成（`id`, `user_id`, `role`, `created_at`）
    - Option B: Supabase Authの`app_metadata.role`を利用（DBスキーマ変更不要）
  - 本設計ではOption Aを採用し、`profiles`テーブルを新規作成する方針とする

### Next.js 16 App RouterとRSCのベストプラクティス
- **Context**: React Server Components環境でのヘッダーコンポーネント実装
- **Sources Consulted**:
  - Next.js 16公式ドキュメント
  - プロジェクトのapp/layout.tsx
- **Findings**:
  - **Root Layoutでの共通コンポーネント配置**: app/layout.tsxにヘッダーコンポーネントを追加し、全ページで共通表示
  - **認証状態のキャッシュ**: `getUser()`をReact cacheでラップし、複数コンポーネントでの呼び出しを最適化
  - **Client Boundary最小化**: インタラクティブな部分のみClient Componentとし、残りはServer Componentでサーバーサイドレンダリング
- **Implications**:
  - PageHeaderコンポーネントはapp/layout.tsx内でchildren前に配置
  - サーバーサイドで認証情報とprofilesデータを取得し、Client Componentにpropsとして渡す

### Supabase認証とGoogleアバター画像の取得
- **Context**: ユーザーアイコンにGoogleアカウントのアバター画像を表示する要件（Requirement 6）
- **Sources Consulted**:
  - Supabase Auth公式ドキュメント
  - lib/supabase-auth/authGoogle.ts
- **Findings**:
  - **Googleアバター取得**: `user.user_metadata.avatar_url`にGoogleアカウントのアバター画像URLが格納される
  - **フォールバック処理**: 画像取得失敗時は`AvatarFallback`でイニシャル表示（shadcn/ui標準機能）
  - **認証状態**: `getUser()`で取得したuserオブジェクトから直接アクセス可能
- **Implications**:
  - `user.user_metadata.avatar_url`を`<AvatarImage src={...} />`に渡すだけで実装完了
  - フォールバック表示は`<AvatarFallback>{user.email[0].toUpperCase()}</AvatarFallback>`で対応

### 検索バーのURL生成とクエリパラメータ設計
- **Context**: 検索バーから/employeesへのナビゲーション仕様（Requirement 4, 5）
- **Sources Consulted**:
  - 要件書（requirements.md）
  - components/employee/search-form.tsx（既存実装）
- **Findings**:
  - **既存実装**: SearchFormでは`name`, `employee_number`, `hire_year`のクエリパラメータを使用
  - **要件との差異**: 要件書では`type`パラメータで検索種別を指定（`type=name&q=山田`形式）
  - **検索ロジック**: 検索バーは検索条件を渡すのみ。実際の検索処理は/employeesページおよび社員サービス層の責務
- **Implications**:
  - **Design Decision Required**: SearchFormとPageHeaderの検索バーで統一仕様にするか、別仕様にするかを設計で明確化
  - **推奨アプローチ**: 要件書に従い、ヘッダーの検索バーは`type`と`q`パラメータを使用し、シンプルな単一検索を提供
  - SearchFormは詳細検索フォームとして機能分離（複数条件の同時指定可能）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Server Component + Client Component分離 | ヘッダー本体はServer Component、ユーザーメニューの開閉状態管理のみClient Component | 初期HTML生成が高速、SEO対応、認証情報の取得がサーバーサイドで完結 | Client Boundaryの境界設計が必要 | 既存のプロジェクトパターンと一致。推奨。 |
| Full Client Component | ヘッダー全体をClient Componentで実装 | 実装がシンプル | 初期レンダリングが遅延、バンドルサイズ増加 | Next.js 16 App RouterのRSC原則に反する。非推奨。 |
| Route Groupsで/login除外 | Route Groupsを使用してログインページのみヘッダーを非表示 | Next.jsの標準機能で制御可能 | ディレクトリ構造の変更が必要 | app/layout.tsx内で条件分岐する方がシンプル。検討不要。 |

## Design Decisions

### Decision: 権限管理の実装方法

- **Context**: 要件8で管理者限定メニューの表示制御が必要だが、現在のDBスキーマに`profiles`テーブルが存在しない
- **Alternatives Considered**:
  1. **Option A: profilesテーブルを新規作成** — `profiles`テーブル（`id`, `user_id`, `role`, `created_at`）を作成し、`auth.users.id`と紐付け
  2. **Option B: Supabase Authのapp_metadataを利用** — `user.app_metadata.role`にロール情報を保存（DBスキーマ変更不要）
- **Selected Approach**: Option A — profilesテーブルを新規作成
- **Rationale**:
  - 将来的にユーザープロフィール情報（表示名、所属部署、アバター画像など）の拡張が想定される
  - `app_metadata`はSupabase管理コンソールでの手動設定が必要で、アプリケーション側からの動的な権限管理が困難
  - 既存のemployeesテーブルとの連携（user_id ↔ employee_id）も考慮しやすい
- **Trade-offs**:
  - **Benefits**: DBスキーマで権限管理を一元化、Drizzle ORMで型安全なクエリ実行可能、将来の拡張性が高い
  - **Compromises**: マイグレーション作業が必要、初期データのシード処理が必要
- **Follow-up**:
  - マイグレーションでprofilesテーブル作成
  - Supabase Auth callbackでユーザー登録時にprofilesレコードを自動作成（デフォルトrole: 'user'）
  - 管理者ユーザーの初期データシード（data/profiles-seed.csv + scripts/seed-profiles.ts）

### Decision: 検索バーとSearchFormの機能分離

- **Context**: ヘッダーの検索バーと既存のSearchFormで仕様が異なる可能性
- **Alternatives Considered**:
  1. **Option A: ヘッダー検索バーを独立した仕様で実装** — `type`と`q`パラメータを使用（要件書準拠）
  2. **Option B: SearchFormの仕様に統一** — `name`, `employee_number`, `hire_year`パラメータを使用
- **Selected Approach**: Option A — ヘッダー検索バーを独立した仕様で実装
- **Rationale**:
  - ヘッダーの検索バーは「クイック検索」としてシンプルな単一条件検索を提供
  - SearchFormは「詳細検索」として複数条件の同時指定を可能にする
  - UX上、2つの検索インターフェースで異なる目的を持たせることで使い分けが明確化
- **Trade-offs**:
  - **Benefits**: 検索UIの役割分担が明確、要件書に忠実な実装
  - **Compromises**: /employeesページで2種類のクエリパラメータ形式を処理する必要がある
- **Follow-up**:
  - /employeesページのサーバーサイドで`type`+`q`形式と`name`+`employee_number`+`hire_year`形式の両方をサポート
  - 社員サービス層（lib/employees/service.ts）で統一的な検索ロジックを実装

### Decision: Server ComponentとClient Componentの境界設計

- **Context**: React Server Components環境でのヘッダーコンポーネント実装
- **Alternatives Considered**:
  1. **Option A: ヘッダー全体をServer Component、ユーザーメニューのみClient Component** — 認証情報の取得をサーバーサイドで完結
  2. **Option B: ヘッダー全体をClient Component** — 実装がシンプルだがRSCの利点を活かせない
- **Selected Approach**: Option A — ヘッダー全体をServer Component、ユーザーメニューのみClient Component
- **Rationale**:
  - Next.js 16 App RouterのRSC原則に従い、サーバーサイドファーストの設計
  - 認証情報の取得とprofilesデータの取得をサーバーサイドで完結し、XSSリスクを最小化
  - インタラクション部分のみをClient Componentに分離し、JavaScriptバンドルサイズを最小化
- **Trade-offs**:
  - **Benefits**: 初期HTML生成が高速、SEO対応、認証情報の取得がサーバーサイドで完結
  - **Compromises**: Server ComponentとClient Componentの境界設計が必要、propsの受け渡しが必要
- **Follow-up**:
  - PageHeaderコンポーネント（RSC）でgetUser()とprofilesクエリを実行
  - UserMenuコンポーネント（Client Component）に認証済みユーザー情報と権限情報をpropsとして渡す

## Risks & Mitigations

- **Risk 1: profilesテーブルが存在しないため、管理者権限判定が実装できない** — Mitigation: 設計フェーズでprofilesテーブルのスキーマ定義を明確化し、タスク生成フェーズでマイグレーションタスクを追加
- **Risk 2: ヘッダー検索バーとSearchFormで検索仕様が異なり、/employeesページの実装が複雑化** — Mitigation: 社員サービス層で統一的な検索ロジックを実装し、クエリパラメータ形式の差異を吸収
- **Risk 3: Googleアバター画像の取得に失敗した場合、UXが低下する** — Mitigation: AvatarFallbackでイニシャル表示を実装し、視覚的なフィードバックを提供

## References

- [shadcn/ui Select Component](https://ui.shadcn.com/docs/components/select) — 検索種別ドロップダウンの実装パターン
- [shadcn/ui DropdownMenu Component](https://ui.shadcn.com/docs/components/dropdown-menu) — ユーザーメニューの実装パターン
- [shadcn/ui Avatar Component](https://ui.shadcn.com/docs/components/avatar) — Googleアカウントアイコンの実装パターン
- [Next.js 16 Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components) — RSCの設計原則
- [Supabase Auth API](https://supabase.com/docs/reference/javascript/auth-getuser) — 認証情報の取得パターン
