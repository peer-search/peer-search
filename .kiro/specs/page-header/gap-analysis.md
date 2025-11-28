# Implementation Gap Analysis - Page Header

## 分析概要

page-header機能の実装ギャップ分析を実施しました。既存コードベースは社員一覧・組織階層管理機能を持ち、shadcn/uiベースのコンポーネントライブラリ、Supabase認証、S3画像管理が実装済みです。ページヘッダーは**新規作成が必要**ですが、既存の認証インフラ・UIコンポーネント・検索ロジックを活用できます。

**主要な発見:**
- ✅ 認証インフラ完備: `getUser()`、`signOut()` が実装済み
- ✅ shadcn/uiコンポーネント: Button、Input、Card、Label、Sheet が利用可能
- ⚠️ 未実装shadcn/ui: Avatar、Select、DropdownMenu が必要
- ✅ 既存検索ロジック: `SearchForm`コンポーネントが類似機能を実装済み
- ❌ 権限管理未実装: `profiles`テーブルとrole判定ロジックが未定義
- ⚠️ Root Layoutへの統合: 現在は`{children}`のみ表示、ヘッダー未配置

## 1. Current State Investigation

### 1.1 既存アセット

#### 認証関連 (`/lib/supabase-auth/`)
- **`auth.ts`**: `getUser()` - キャッシュ済みユーザー情報取得関数 ✅
- **`authGoogle.ts`**: `signOut()` - ログアウト関数、`/login`へリダイレクト ✅
- **`server.ts`**: Supabase SSRクライアント作成 ✅
- **統合状況**: proxy.ts (Next.js 16) で全ルート認証チェック済み

#### UIコンポーネント (`/components/ui/`)
- **実装済み**: `button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`, `sheet.tsx`
- **未実装**: `avatar.tsx` (ユーザーアイコン用)、`select.tsx` (検索種別選択用)、`dropdown-menu.tsx` (ユーザーメニュー用)
- **インストール方法**: `npx shadcn@latest add avatar select dropdown-menu`

#### 既存検索機能 (`/components/employee/search-form.tsx`)
- **実装内容**:
  - 氏名・社員番号・入社年の3項目検索フォーム
  - Client Componentとして実装、`useRouter`でナビゲーション
  - クエリパラメータ: `name`, `employee_number`, `hire_year`
  - デスクトップ/モバイル対応 (Sheet使用)
- **ヘッダー検索との違い**:
  - 現行: 複数フィールド+送信ボタン (Sheet内表示)
  - 要件: 検索種別ドロップダウン+単一テキスト入力+検索ボタン (ヘッダー常設)
  - **統合戦略**: 新規SearchBarコンポーネント作成、既存SearchFormは詳細検索として残す

#### Root Layout (`app/layout.tsx`)
- **現在の構成**:
  ```tsx
  export default async function RootLayout({ children }) {
    await getUser(); // 認証情報キャッシュ
    return (
      <html lang="ja">
        <body>{children}</body>
      </html>
    );
  }
  ```
- **ギャップ**: `/login`以外でヘッダー表示するための条件分岐が未実装

#### データベーススキーマ (`db/schema.ts`)
- **既存テーブル**: `organizations`, `employees`, `employee_organizations`
- **ギャップ**:
  - ❌ `profiles`テーブルが未定義
  - ❌ ユーザー権限(`role`フィールド)の管理機構なし
  - 要件8では「管理者権限を持つユーザーのみ社員追加/部署編集メニューを表示」と定義されているが、権限判定のためのデータモデルが存在しない

### 1.2 既存パターン・規約

#### コンポーネント配置規約
- **機能別コンポーネント**: `/components/{feature}/` (例: `employee/`, `organization/`)
- **共通UIコンポーネント**: `/components/ui/`
- **提案**: `/components/layout/` または `/components/header/` にpage-header関連コンポーネントを配置

#### Server/Client Component分離パターン
- **Server Component**: データフェッチ、認証情報取得 (例: `app/employees/page.tsx`)
- **Client Component**: インタラクション、状態管理 (例: `search-form.tsx`, `employee-photo.tsx`)
- **適用**: PageHeader (Server)、SearchBar (Client)、UserMenu (Client) の3層構成

#### 画像表示パターン (`employee-photo.tsx`)
- **S3 Presigned URL**: `usePresignedUrl`フックでクライアントサイド取得
- **フォールバック**: `/placeholder-avatar.svg`
- **最適化**: `loading="lazy"`, `placeholder="blur"`
- **適用**: Googleアバター表示にも同様のパターン適用可能 (ただしS3ではなく外部URL)

#### ナビゲーションパターン
- **Server Action**: `signOut()` (authGoogle.ts) - Server Action + `redirect()`
- **Client Navigation**: `useRouter().push()` (search-form.tsx)
- **適用**: ログアウトはServer Action、検索実行とメニュー遷移はClient Navigation

## 2. Requirements Feasibility Analysis

### 2.1 技術要件マッピング

| 要件エリア | 必要技術 | 既存アセット | ギャップ/制約 |
|---------|---------|------------|-------------|
| **Req 1-2: ヘッダー共通表示・ロゴナビゲーション** | Server Component, Next.js Link | `app/layout.tsx`, `getUser()` | **Missing**: Root Layoutへの統合ロジック、`/login`除外条件 |
| **Req 3-5: 検索バー** | Client Component, Select, Input, Button, useRouter | `search-form.tsx`, `input.tsx`, `button.tsx` | **Missing**: `select.tsx` (shadcn/ui), 検索種別ドロップダウンUI |
| **Req 6: ユーザーアイコン** | Avatar, Googleアバター表示 | `employee-photo.tsx` (参考パターン) | **Missing**: `avatar.tsx` (shadcn/ui), Google OAuth user.user_metadata.avatar_url取得 |
| **Req 7: ユーザーメニュー開閉** | DropdownMenu, Client Component | `sheet.tsx` (類似UI) | **Missing**: `dropdown-menu.tsx` (shadcn/ui) |
| **Req 8: 権限制御** | profiles.role, 権限判定ロジック | - | **Critical Missing**: `profiles`テーブル未定義、role管理機構なし |
| **Req 9-10: メニュー遷移** | Next.js Link | - | **Unknown**: `/employees/new`, `/admin/departments` ページ未確認 |
| **Req 11: ログアウト** | Server Action, signOut() | `authGoogle.ts` - `signOut()` ✅ | **None** - 既存実装をそのまま使用可能 |
| **Req 12: レスポンシブ** | Tailwind CSS breakpoints | 既存コンポーネントで実践済み ✅ | **None** |
| **Req 14: アクセシビリティ** | ARIA属性, semantic HTML | - | **Research Needed**: shadcn/uiコンポーネントのARIA対応状況確認 |
| **Req 15: パフォーマンス** | Server Components, lazy loading | 既存で実践済み ✅ | **None** |

### 2.2 ギャップ詳細

#### Critical Gap 1: 権限管理機構の欠如
- **影響範囲**: 要件8 (ユーザーメニュー項目の権限制御)
- **詳細**:
  - 要件では「管理者権限を持つユーザーのみに『社員追加』『部署編集』メニューを表示」と定義
  - 現在のSupabase認証では`user.id`と`user.email`のみ取得可能
  - `profiles`テーブルおよび`role`フィールドが未定義
- **実装オプション**:
  1. **Supabase Auth metadata利用**: `user.app_metadata.role` に権限情報を格納 (推奨)
  2. **profiles テーブル作成**: `profiles(id, user_id, role, ...)` テーブルを新規作成
  3. **ハードコード管理者リスト**: 環境変数でadminメールアドレスリスト管理 (簡易版)
- **推奨アプローチ**: オプション1 (Supabase Auth metadata) - 既存の認証フローを変更せず、Supabase Dashboardで管理者ユーザーにroleを付与

#### Critical Gap 2: shadcn/ui未実装コンポーネント
- **必要コンポーネント**: Avatar, Select, DropdownMenu
- **解決方法**: `npx shadcn@latest add avatar select dropdown-menu` で即座にインストール可能
- **リスク**: 低 (shadcn/uiは既に使用実績あり、インストールのみで解決)

#### Minor Gap: Root Layoutでの条件付き表示
- **現在**: `<body>{children}</body>` のみ
- **必要**: `/login`ルート判定とPageHeaderの条件付きレンダリング
- **実装例**:
  ```tsx
  export default async function RootLayout({ children }) {
    const user = await getUser();
    const isLoginPage = /* パス判定ロジック */;

    return (
      <html lang="ja">
        <body>
          {!isLoginPage && user && <PageHeader user={user} />}
          {children}
        </body>
      </html>
    );
  }
  ```
- **課題**: Server Component内でのパス判定方法 (Research Needed)

#### Unknown: ターゲットページの存在
- **要件9**: 社員追加ページ (`/employees/new`)
- **要件10**: 部署編集ページ (`/admin/departments`)
- **現状**: これらのページの存在未確認
- **影響**: ナビゲーション先が404になる可能性
- **推奨**: 設計フェーズでページ存在を確認、未実装の場合はスタブページ作成

### 2.3 複雑性シグナル

- **アーキテクチャ**: シンプル (既存パターンの組み合わせ)
- **外部統合**: Supabase Auth (既に統合済み), AWS S3 (Googleアバターは外部URL、Presigned URL不要)
- **ビジネスロジック**: 最小限 (検索クエリ構築、権限判定のみ)
- **非機能要件**: レスポンシブ、アクセシビリティ、パフォーマンス (既存パターンで対応可能)

## 3. Implementation Approach Options

### Option A: Extend Existing Components (非推奨)
**適用可能性**: ❌ 既存コンポーネントと責務が異なるため不適切

**理由**:
- `search-form.tsx`は詳細検索用の複数フィールドフォーム (Sheet UI)
- ヘッダー検索は単一入力+検索種別ドロップダウンのコンパクトUI
- 両者を統合すると複雑性が増し、保守性が低下

**Trade-offs**:
- ❌ 既存SearchFormの責務が肥大化
- ❌ ヘッダーとページ内検索の異なるUX要件を1コンポーネントで管理
- ❌ コードの可読性低下

### Option B: Create New Components (推奨)
**適用可能性**: ✅ 最適

**新規作成コンポーネント**:
1. **`/components/layout/page-header.tsx`** (Server Component)
   - 役割: ヘッダー全体のレイアウト、認証情報取得
   - 依存: `getUser()`, SearchBar, UserMenu
   - 統合先: `app/layout.tsx`

2. **`/components/layout/search-bar.tsx`** (Client Component)
   - 役割: 検索種別選択+テキスト入力+検索ボタン
   - 依存: shadcn/ui (Select, Input, Button), `useRouter`
   - ナビゲーション: `/employees?type={type}&q={query}`

3. **`/components/layout/user-menu.tsx`** (Client Component)
   - 役割: ユーザーアイコン+ドロップダウンメニュー
   - 依存: shadcn/ui (Avatar, DropdownMenu), `signOut` Server Action
   - 権限制御: props経由で`isAdmin`を受け取る

**統合ポイント**:
- `app/layout.tsx`: PageHeaderをRoot Layoutに配置、`/login`除外
- `lib/users/` (新規): 権限判定ロジック `getUserRole(user)` ユーティリティ

**責務分離**:
| コンポーネント | 責務 | Server/Client |
|--------------|------|--------------|
| PageHeader | ヘッダー全体レイアウト、認証情報渡し | Server |
| SearchBar | 検索UI、ナビゲーション | Client |
| UserMenu | メニューUI、ログアウト実行 | Client |

**Trade-offs**:
- ✅ 明確な責務分離、高い保守性
- ✅ 既存SearchFormと共存可能
- ✅ テスト容易性 (各コンポーネント独立)
- ❌ 新規ファイル数増加 (3ファイル + テスト3ファイル)
- ❌ 初期実装コスト増

### Option C: Hybrid Approach (検討可能)
**適用可能性**: △ 特定条件下で有効

**ハイブリッド戦略**:
- **Phase 1**: Option Bで完全実装
- **Phase 2**: 既存SearchFormとSearchBarのロジック共通化 (リファクタリング)
  - 共通hooks: `useEmployeeSearch()` - 検索パラメータ構築ロジック抽出
  - 両コンポーネントから再利用

**適用条件**:
- 検索ロジックの重複が顕著になった場合のみ
- Phase 1完了後の最適化タスクとして実施

**Trade-offs**:
- ✅ 将来的なコード重複削減
- ✅ 段階的リファクタリング可能
- ❌ 初期実装時には過剰設計
- ❌ Phase 2実施の優先度は低い

**推奨**: Phase 1 (Option B) のみ実装、Phase 2は保留

## 4. Research Items for Design Phase

以下の項目は設計フェーズで詳細調査が必要:

### R1: Root Layoutでのパス判定方法
- **課題**: Server Component内で現在のパスを取得し、`/login`を判定する方法
- **候補アプローチ**:
  1. `headers()`から`referer`または`x-pathname`取得
  2. 専用Layoutファイル分離 (`app/(authenticated)/layout.tsx`)
  3. Middleware経由でヘッダー注入
- **調査内容**: Next.js 16 App Routerでの推奨パターン確認

### R2: Supabase Auth metadataでのrole管理
- **課題**: 管理者権限をどのように定義・取得するか
- **調査内容**:
  - `user.app_metadata.role`の設定方法 (Supabase Dashboard or Auth Hook)
  - `getUser()`の戻り値に`app_metadata`が含まれるか確認
  - セキュリティ考慮: クライアント改ざん防止 (サーバーサイド判定必須)

### R3: Googleアバター画像の取得とフォールバック
- **課題**: `user.user_metadata.avatar_url`の信頼性
- **調査内容**:
  - Google OAuth認証時に確実にアバターURLが取得できるか
  - 画像読み込み失敗時のフォールバック戦略 (イニシャル表示、デフォルトアイコン)
  - Next.js Imageコンポーネントでの外部URL設定 (`next.config.js` - `images.domains`)

### R4: shadcn/ui新規コンポーネントのアクセシビリティ対応
- **課題**: Avatar, Select, DropdownMenuのARIA属性サポート状況
- **調査内容**:
  - デフォルトでARIA属性が付与されているか
  - キーボードナビゲーション (Tab, Enter, Escape) のサポート
  - スクリーンリーダー対応の追加実装が必要か

### R5: ターゲットページの実装状況
- **確認項目**:
  - `/employees/new` ページの存在
  - `/admin/departments` ページの存在
  - 未実装の場合、スタブページ作成の優先度

## 5. Implementation Complexity & Risk Assessment

### 5.1 工数見積もり

**Effort: M (Medium - 3~7日間)**

**内訳**:
- shadcn/uiコンポーネントインストール: 0.5日
- PageHeader実装 (Server Component): 1日
- SearchBar実装 (Client Component): 1.5日
- UserMenu実装 (Client Component + 権限制御): 2日
- Root Layout統合 + パス判定: 1日
- ユニット・コンポーネントテスト作成: 1日
- アクセシビリティ対応・レスポンシブ調整: 1日

**前提条件**:
- 権限管理はSupabase Auth metadata利用 (Dashboardで手動設定)
- ターゲットページ (`/employees/new`, `/admin/departments`) は別タスクで実装

### 5.2 リスク評価

**Risk: Medium (中リスク)**

**リスク要因**:
1. **権限管理機構の未定義** (High Impact, Medium Probability)
   - 影響: 要件8が完全に実装できない
   - 軽減策: 設計フェーズでSupabase Auth metadata方式を確定、Dashboard設定手順を文書化
   - 代替案: 初期リリースでは全ユーザーに全メニュー表示、権限制御は第2フェーズで実装

2. **Root Layoutでのパス判定** (Medium Impact, Low Probability)
   - 影響: `/login`でヘッダーが表示される
   - 軽減策: Layout分離パターン (`(authenticated)/layout.tsx`) 適用
   - 代替案: `usePathname()`をClient Componentで使用し、ヘッダー内で条件表示

3. **Googleアバター画像の読み込み失敗** (Low Impact, Medium Probability)
   - 影響: ユーザーアイコンが表示されない
   - 軽減策: イニシャル表示フォールバック実装
   - 代替案: デフォルトアバターアイコン (`/placeholder-avatar.svg`)

4. **shadcn/ui新規コンポーネントの統合** (Low Impact, Low Probability)
   - 影響: スタイリングの不整合、アクセシビリティ不足
   - 軽減策: 既存のbutton/input/cardと同様のパターン踏襲
   - テスト: コンポーネントテストでARIA属性・キーボードナビゲーション検証

**総合リスク評価**: Medium
- 技術スタック自体は確立済み (Next.js 16, Supabase, shadcn/ui)
- 主要リスクは「権限管理の設計決定」に集中
- 軽減策が明確で、代替案も用意可能

## 6. Recommendations for Design Phase

### 6.1 推奨実装アプローチ

**Option B: Create New Components** を採用

**理由**:
1. 責務分離により保守性・テスト容易性が向上
2. 既存SearchFormとの共存が可能
3. 将来的なリファクタリングの柔軟性確保

### 6.2 設計フェーズでの重点事項

#### 優先度 HIGH
1. **権限管理方式の決定** (R2)
   - Supabase Auth metadataを使用し、`app_metadata.role`で管理
   - Supabase Dashboard設定手順の文書化
   - サーバーサイド権限判定ユーティリティ (`getUserRole()`) の仕様定義

2. **Root Layout統合戦略** (R1)
   - Layout分離パターン (`app/(authenticated)/layout.tsx`) の適用検証
   - `/login`除外ロジックの実装方式決定

3. **shadcn/ui新規コンポーネント仕様** (R4)
   - Avatar, Select, DropdownMenuのインストールとカスタマイズ方針
   - アクセシビリティ要件の確認

#### 優先度 MEDIUM
4. **Googleアバター表示戦略** (R3)
   - `user.user_metadata.avatar_url`取得確認
   - フォールバック実装 (イニシャル or デフォルトアイコン)
   - `next.config.js`画像ドメイン設定

5. **ターゲットページ確認** (R5)
   - `/employees/new`, `/admin/departments`の実装状況確認
   - 未実装の場合、スタブページ作成タスク追加

#### 優先度 LOW
6. **検索ロジック共通化** (Option C Phase 2)
   - 初期実装後の最適化タスクとして保留
   - SearchBarとSearchFormの重複コード評価

### 6.3 技術的決定事項

| 決定事項 | 推奨アプローチ | 根拠 |
|---------|---------------|------|
| コンポーネント配置 | `/components/layout/` | 共通レイアウトコンポーネントとして明確化 |
| 権限管理 | Supabase Auth metadata (`app_metadata.role`) | 既存認証フローを変更せず、Dashboard管理可能 |
| Root Layout統合 | Layout分離パターン | Next.js App Routerの推奨プラクティス |
| 画像フォールバック | イニシャル表示 + デフォルトアイコン | UX向上、既存`employee-photo.tsx`パターン踏襲 |
| テスト戦略 | Vitest + React Testing Library | 既存プロジェクト標準に準拠 |

### 6.4 次ステップ

設計フェーズでは以下を実施:

1. **コンポーネント詳細設計**:
   - PageHeader, SearchBar, UserMenuのインターフェース定義
   - Props、型定義、状態管理方針

2. **統合設計**:
   - Root Layoutへの組み込み仕様
   - 認証フローとの連携

3. **データフロー設計**:
   - 認証情報 → 権限判定 → メニュー表示の流れ
   - 検索クエリ構築 → ナビゲーションの流れ

4. **非機能要件設計**:
   - レスポンシブデザイン (Tailwind breakpoints)
   - アクセシビリティ実装計画
   - パフォーマンス最適化戦略

5. **未解決事項の解決**:
   - R1~R5のResearch Items調査と結論

---

**分析完了日**: 2025-11-23
**分析者**: Claude (AI Assistant)
**次フェーズ**: `/kiro:spec-design page-header` で技術設計ドキュメント生成
