# Research & Design Decisions: employee-list-view

## Summary
- **Feature**: employee-list-view (社員一覧画面)
- **Discovery Scope**: Extension (既存システムの拡張)
- **Key Findings**:
  - 既存の組織階層管理機能との統合が必要（Organizations テーブル利用）
  - shadcn/ui Card コンポーネントの既存パターンを踏襲可能
  - Supabase 認証とproxy.tsパターンが確立済み
  - S3直接統合パターンが静的ファイル管理に確立済み

## Research Log

### 認証・セキュリティ統合
- **Context**: 社員情報へのアクセス制御方法の調査
- **Sources Consulted**:
  - `proxy.ts`: Next.js 16のproxy関数実装
  - `lib/supabase-auth/auth.ts`: getUser()実装
  - `lib/supabase-auth/middleware.ts`: updateSession()実装
- **Findings**:
  - proxy.tsが全ルートで認証チェックを実行（Next.js 16パターン）
  - getUser()がReact cacheを使用してサーバーコンポーネントで認証情報を取得
  - updateSession()がSupabase SSRセッション更新を処理
- **Implications**:
  - 社員一覧画面はServer Componentとして実装し、getUser()で認証状態を取得
  - 認証済みユーザーのみアクセス可能（proxy.tsが自動処理）

### 既存UIパターン分析
- **Context**: shadcn/uiコンポーネントの使用パターン調査
- **Sources Consulted**:
  - `components/organization/organization-card.tsx`: 既存組織カード実装
  - `components/ui/card.tsx`: shadcn/ui Card実装
- **Findings**:
  - Card, CardHeader, CardTitle, CardContentの組み合わせパターン確立
  - hover:shadow-lgとfocus-within:outlineによるインタラクティブフィードバック
  - Next.js Linkコンポーネントでのクライアントサイドナビゲーション
  - ARIA属性（aria-label）による明示的なアクセシビリティ対応
- **Implications**:
  - 社員カードは組織カードと同様のUIパターンを採用
  - インタラクティブ要素のスタイルと挙動を統一

### データモデル統合
- **Context**: 既存Organizationsテーブルとの連携方法
- **Sources Consulted**:
  - `db/schema.ts`: Drizzle ORMスキーマ定義
- **Findings**:
  - Organizationsテーブルが既に定義済み（id, name, parentId, level）
  - 4階層構造（会社→本部→部署→課/チーム）が確立
  - インデックスがparent_idとlevelに設定済み
- **Implications**:
  - 新規にEmployeesとEmployee_Organizationsテーブルを追加
  - Employee_Organizations.organization_idがOrganizations.idを参照（FK）
  - 多対多リレーションで複数所属に対応

### S3統合パターン
- **Context**: 社員写真のS3統合方法
- **Sources Consulted**:
  - `.kiro/steering/static-files.md`: S3統合パターン
- **Findings**:
  - S3オブジェクトキーのみをDBに保存（完全なURLではない）
  - URL生成はgetS3Url()ユーティリティで実行時に行う
  - CloudFront対応が想定された設計
  - Presigned URLパターンが確立（アップロード用）
- **Implications**:
  - Employees.photo_s3_keyカラムにS3キーを保存
  - lib/s3/url.tsにgetS3Url()ユーティリティを作成
  - Next.js Imageコンポーネントで最適化

### 検索・フィルタリング実装
- **Context**: URL Search Paramsによる状態管理
- **Sources Consulted**:
  - 要件3: 検索機能、要件4: 組織フィルタ機能、要件5: ソート機能
- **Findings**:
  - URL Search Paramsで検索状態を管理（name, employee_number, hire_year, org_id, sort, order）
  - 組織階層画面からの遷移時にorg_idパラメータを受け取る
  - ブラウザバック/フォワードで状態復元可能
- **Implications**:
  - Server ComponentでsearchParams propを受け取り、クエリパラメータを解析
  - Drizzle ORMのwhereクエリビルダーで動的にフィルタリング
  - ソート条件もクエリビルダーで動的に適用

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Server Components First | ページ全体をRSCで実装、データフェッチをサーバーサイドで完結 | バンドルサイズ最小化、SEO最適、FCP高速化 | クライアント側インタラクションが限定的 | 既存パターンに一致、Next.js 16推奨 |
| Client Components with API | ページをClient Componentで実装、API Routeからデータフェッチ | 豊富なインタラクション、リアルタイム更新容易 | バンドルサイズ増大、初回ロード遅延 | 本要件では不要（静的データ表示が主） |
| Hybrid (RSC + Client Islands) | ページはRSC、インタラクティブ部分のみClient Component | 最適なバランス、必要箇所のみクライアント化 | 境界設計が複雑化 | 検索フォームのみClient化で十分 |

**選択**: Server Components Firstアプローチ
- 社員一覧表示は主に静的データの表示であり、リアルタイム更新は不要
- 検索・フィルタリングはURL Search Paramsで管理し、ページ遷移で再レンダリング
- 必要に応じて検索フォームのみを"use client"でClient Component化

## Design Decisions

### Decision: Drizzle ORMによるクエリ構築パターン

- **Context**: 動的な検索条件とフィルタリングをどう実装するか
- **Alternatives Considered**:
  1. Supabase RPC関数 - PostgreSQL関数でクエリロジックを実装
  2. Drizzle ORM動的クエリ - TypeScriptでクエリビルダーを使用
  3. Raw SQL with Drizzle - 生SQLをDrizzle経由で実行
- **Selected Approach**: Drizzle ORM動的クエリ
  - `db.select().from(employees).where(...)` パターンを使用
  - 条件分岐でwhereクラウザを動的に構築
  - JOINでEmployee_OrganizationsとOrganizationsテーブルを結合
- **Rationale**:
  - TypeScript型安全性を維持
  - 既存コードベースのパターンに一致
  - テスタビリティが高い（モック容易）
- **Trade-offs**:
  - **Benefits**: 型安全、IDEサポート、リファクタリング容易
  - **Compromises**: 複雑なクエリはRPCの方が効率的な場合あり（本件では単純なJOINのみ）
- **Follow-up**: パフォーマンステストで500ms以内を検証

### Decision: 社員カードのUI構造

- **Context**: 複数所属情報をどう表示するか
- **Alternatives Considered**:
  1. 1カード1所属（社員IDで重複表示）
  2. 1カード1社員（所属を配列で表示）
  3. 1カード1社員（プライマリ所属のみ表示）
- **Selected Approach**: 1カード1社員（所属を配列で表示）
- **Rationale**:
  - 要件1.4「1社員につき1枚のカード（employeeId単位で集約）」に準拠
  - ユーザーが社員を重複なく一覧できる
  - 所属情報を複数行で表示することで情報量を維持
- **Trade-offs**:
  - **Benefits**: UIがシンプル、社員の重複表示なし
  - **Compromises**: 組織フィルタ時に複数所属が見えにくい可能性（「他にも所属あり」バッジで対応）
- **Follow-up**: ユーザーテストで複数所属の視認性を検証

### Decision: S3 URL生成の責務配置

- **Context**: S3オブジェクトキーからURLを生成する処理をどこに配置するか
- **Alternatives Considered**:
  1. データベース層（RPC関数で生成）
  2. ユーティリティ層（lib/s3/url.ts）
  3. コンポーネント層（コンポーネント内で生成）
- **Selected Approach**: ユーティリティ層（lib/s3/url.ts）
- **Rationale**:
  - 既存のstatic-files.mdパターンに準拠
  - 環境変数（CloudFront設定）の変更に柔軟に対応
  - 複数コンポーネントから再利用可能
- **Trade-offs**:
  - **Benefits**: 単一責任、テスト容易、環境変更に強い
  - **Compromises**: 環境変数アクセスが必要（サーバーサイド限定）
- **Follow-up**: lib/s3/url.tsユーティリティの実装とテスト

### Decision: 検索とフィルタリングのUI配置

- **Context**: 検索フォームとフィルタUIをどこに配置するか
- **Alternatives Considered**:
  1. ページ上部に固定配置
  2. サイドバーに配置
  3. モーダル/ドロワーで開閉式
- **Selected Approach**: ページ上部に固定配置（モバイルはドロワー）
- **Rationale**:
  - デスクトップでは常時アクセス可能
  - モバイルでは画面領域を節約
  - 要件10.5「モバイルでは折りたたみ可能なドロワー」に準拠
- **Trade-offs**:
  - **Benefits**: デスクトップで効率的、モバイルで省スペース
  - **Compromises**: レスポンシブ実装が必要（shadcn/ui Sheetコンポーネント活用）
- **Follow-up**: モバイルドロワーのインタラクションテスト

## Risks & Mitigations

- **Risk 1**: 大量の社員データ（10,000人以上）でのパフォーマンス劣化
  - **Mitigation**: データベースクエリに500ms制限、必要に応じてページネーション実装
- **Risk 2**: 複雑なJOINクエリによる遅延
  - **Mitigation**: Employee_Organizations.employee_idとorganization_idにインデックス作成
- **Risk 3**: S3写真の読み込み遅延
  - **Mitigation**: Next.js Imageの遅延読み込み、プレースホルダー画像、最大6枚同時読み込み制限
- **Risk 4**: 組織階層画面からのorg_idパラメータが不正な値
  - **Mitigation**: UUID検証、存在しない組織IDの場合はエラーメッセージ表示

## References
- [Next.js 16 Proxy Pattern](https://nextjs.org/docs/app/api-reference/config/proxy)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [Drizzle ORM Query Builder](https://orm.drizzle.team/docs/select)
- [shadcn/ui Card Component](https://ui.shadcn.com/docs/components/card)
- [AWS S3 SDK v3 for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/)
- [Next.js Image Optimization](https://nextjs.org/docs/app/api-reference/components/image)
