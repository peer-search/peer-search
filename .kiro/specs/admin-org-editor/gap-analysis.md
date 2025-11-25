# Implementation Gap Analysis

## 1. Current State Investigation

### 既存の組織関連アセット

#### データモデル
- **`db/schema.ts`**: `organizations`テーブルが既に定義済み
  - カラム: `id`, `name`, `parent_id`, `level`, `created_at`
  - `updated_at`カラムが**未定義**（要件では必要）
  - `parent_id`に外部キー制約とON DELETE CASCADE制約が**設定されていない可能性あり**（マイグレーションファイル確認必要）
  - インデックス: `parent_id`, `level`

#### ビジネスロジック
- **`lib/organizations/service.ts`**:
  - `getOrganizationHierarchy()` - 読み取り専用、RPC `get_org_hierarchy()`を使用
  - ツリー構造への変換機能あり
  - **CRUD操作（追加・編集・削除）の実装なし**

- **`lib/organizations/types.ts`**:
  - `OrganizationTree`, `OrganizationFlatNode`型定義あり
  - **編集用の型（UpdateOrganization等）が未定義**

- **`lib/organizations/tree.ts`**:
  - `buildTree()` - フラット配列からツリー構造への変換機能あり
  - **ツリーからフラット配列への逆変換機能なし**（編集時に必要な可能性）

#### UIコンポーネント
- **`components/organization/organization-card.tsx`**:
  - 読み取り専用のカード表示
  - クリックで社員一覧へ遷移（`/employees?org_id={id}`）
  - **編集機能なし**

- **`components/organization/organization-card-list.tsx`**:
  - カード内包レイアウトでの階層表示
  - **ツリービュー形式ではない**（ファイルエクスプローラー風UI未実装）

#### 認証・権限管理
- **`lib/profiles/service.ts`**: `getProfileByUserId()` - プロフィール取得機能あり
- **`lib/employees/actions.ts`**: `checkAdminPermission()` - 管理者権限チェックのヘルパー関数あり（再利用可能）
- **`app/employees/new/page.tsx`**: 管理者権限チェックの実装パターンあり（参考可能）

#### shadcn/uiコンポーネント
- **利用可能なコンポーネント**: `button`, `card`, `input`, `label`, `dialog`, `alert-dialog`, `select`, `skeleton`
- **ツリービュー専用コンポーネントなし**（要新規実装またはサードパーティライブラリ検討）

### 既存の規約とパターン

#### アーキテクチャパターン
- **Server-First**: デフォルトでServer Components、データフェッチはサーバーサイド
- **Server Actions**: `"use server"`ディレクティブでCRUD操作を実装
- **権限チェック**: ページコンポーネントとServer Actions両方で実施
- **Result型**: `{ success: boolean, data?: T, error?: E }` パターンを使用

#### ディレクトリ構造
- **ページ**: `/app/admin/organizations/page.tsx`（新規作成）
- **ビジネスロジック**: `/lib/organizations/` に集約
- **UIコンポーネント**: `/components/organization/` に配置
- **Server Actions**: `/lib/organizations/actions.ts`（新規作成）

#### 命名規約
- **React Components**: PascalCase (`OrganizationTreeView.tsx`)
- **Utility files**: camelCase (`actions.ts`, `validation.ts`)
- **Database tables**: snake_case (`organizations`, `updated_at`)

### 統合インターフェース

#### データベース
- **Drizzle ORM**: タイプセーフなDB操作
- **Supabase RPC**: `get_org_hierarchy()`が存在（読み取り専用）
- **ON DELETE CASCADE**: `parent_id`制約で子孫ノード連動削除が必要

#### 認証
- **Supabase Auth**: `getUser()`でユーザー情報取得
- **`proxy.ts`**: Next.js 16の認証チェック（全ルート自動適用）
- **`profiles`テーブル**: `role`カラムで権限管理（`admin` / `user`）

---

## 2. Requirements Feasibility Analysis

### 技術的ニーズ

#### データモデル
- ✅ `organizations`テーブル: 既存（一部カラム追加必要）
- ❌ `updated_at`カラム: 未定義（マイグレーション必要）
- **Research Needed**: ON DELETE CASCADE制約が既存マイグレーションで設定済みか確認

#### Server Actions（新規実装必要）
- ❌ `createOrganization()`: 新規ノード追加
- ❌ `updateOrganization()`: ノード編集（名称・親組織変更）
- ❌ `deleteOrganization()`: ノード削除
- ❌ バリデーション関数: 循環参照チェック、階層レベル制約チェック

#### UIコンポーネント（新規実装必要）
- ❌ `OrganizationTreeView`: ファイルエクスプローラー風ツリービュー
  - 展開/折りたたみ機能
  - 選択状態管理
  - キーボードナビゲーション（矢印キー、Tab、Enter）
- ❌ `OrganizationEditForm`: 編集フォーム（名称・親組織選択）
- ❌ `DeleteOrganizationDialog`: 削除確認ダイアログ（子ノード警告含む）
- ❌ ツリーノードコンポーネント: 個別ノードの表示・インタラクション

#### ビジネスロジック
- ✅ ツリー構造変換: `buildTree()`で実装済み
- ❌ 循環参照検証: 親組織選択時の子孫ノード除外ロジック
- ❌ 階層レベル自動再計算: 親組織変更時の連動更新
- ❌ 子孫ノード取得: 削除確認時に必要

#### セキュリティ・バリデーション
- ✅ 管理者権限チェック: `checkAdminPermission()`パターンあり（再利用可能）
- ❌ 名称バリデーション: 空文字列・最大文字数チェック
- ❌ 階層制約チェック: レベル4に子追加不可
- ❌ ルートノード削除禁止: レベル1の削除を防止

#### 非機能要件
- ✅ **パフォーマンス**: React Server Componentsで初期データ取得
- ✅ **SEO**: `metadata` APIで`noindex, nofollow`設定可能
- ❌ **アクセシビリティ**: ARIA属性（`role="tree"`, `role="treeitem"`, `aria-expanded`, `aria-selected`）の実装必要

### ギャップと制約

#### Missing（不足している機能）
1. **ツリービューUIコンポーネント**: ファイルエクスプローラー風の展開/折りたたみ可能なツリー
2. **組織CRUD Server Actions**: 追加・編集・削除の実装
3. **循環参照検証ロジック**: 親組織選択時の子孫ノード除外
4. **階層レベル自動再計算**: 親変更時の連動更新
5. **`updated_at`カラム**: データベーススキーマに追加

#### Unknown（調査が必要な項目）
1. **ON DELETE CASCADE制約**: 既存マイグレーションで設定済みか確認（`drizzle/`ディレクトリ）
2. **ツリービューライブラリ**: サードパーティライブラリ（例: `react-arborist`, `rc-tree`）を使用するか、自作するか
3. **状態管理**: クライアントサイドでの選択ノード・展開状態をどう管理するか（URL State vs React State）

#### Constraint（既存アーキテクチャの制約）
1. **Server Components優先**: ツリービューの展開/折りたたみはクライアントサイドで実装（`"use client"`必須）
2. **既存の組織データ構造**: `parent_id`, `level`ベースの階層構造を維持
3. **Next.js 16 Proxy Pattern**: 認証チェックは`proxy.ts`で自動実施（ページ個別実装も可能）

### 複雑性シグナル

- **Simple CRUD**: ✅ データベース操作は標準的なCRUD（Drizzle ORMでタイプセーフ）
- **Algorithmic Logic**: ⚠️ 循環参照検証、階層レベル再計算（中程度の複雑性）
- **Workflows**: ⚠️ 削除時の子孫ノード確認フロー（ON DELETE CASCADEで対応可能）
- **External Integrations**: ✅ なし（内部システムのみ）

---

## 3. Implementation Approach Options

### Option A: Extend Existing Components（既存コンポーネント拡張）

#### 対象ファイル
- **`lib/organizations/service.ts`**: CRUD関数を追加（`createOrganization`, `updateOrganization`, `deleteOrganization`）
- **`lib/organizations/types.ts`**: 編集用型定義を追加（`NewOrganization`, `UpdateOrganization`）
- **`components/organization/organization-card.tsx`**: 編集モード対応（読み取り専用モードと編集モードの切り替え）

#### 互換性評価
- **既存インターフェースへの影響**: ✅ 読み取り専用機能（`getOrganizationHierarchy`, `OrganizationCard`）は変更不要
- **後方互換性**: ✅ 既存のカード内包レイアウト表示は維持可能
- **テストカバレッジへの影響**: ⚠️ 既存テスト（`organization-card.test.tsx`）の更新必要

#### 複雑性と保守性
- **認知負荷**: ⚠️ `OrganizationCard`に編集モードを追加すると、単一責任原則が曖昧になる
- **ファイルサイズ**: ⚠️ `service.ts`にCRUD関数を追加すると、ファイルが肥大化（現在91行 → 200行超の可能性）
- **責任分離**: ❌ 読み取り専用UIと編集UIを同一コンポーネントに統合すると混乱

#### Trade-offs
- ✅ **メリット**: 新規ファイル最小限、既存パターンを活用
- ✅ **メリット**: 既存のツリー変換ロジックを再利用
- ❌ **デメリット**: `OrganizationCard`が複雑化（読み取り/編集モード混在）
- ❌ **デメリット**: ファイルエクスプローラー風UIには不適（カード内包レイアウトとツリービューは別UI）

---

### Option B: Create New Components（新規コンポーネント作成）

#### 新規作成の根拠
- **責任分離**: 読み取り専用UI（`OrganizationCard`）と編集UI（`OrganizationTreeView`）は異なるUI/UXパターン
- **既存コンポーネントの複雑性**: `OrganizationCard`は既にシンプルで明確な責任を持つ（拡張すると複雑化）
- **異なるライフサイクル**: ツリービューは状態管理（展開/折りたたみ、選択ノード）が必要だが、既存カードは状態を持たない

#### 統合ポイント
- **新規ページ**: `/app/admin/organizations/page.tsx`
- **新規Server Actions**: `/lib/organizations/actions.ts`
  - `createOrganization()`
  - `updateOrganization()`
  - `deleteOrganization()`
  - 内部で`lib/organizations/service.ts`の読み取り関数を再利用
- **新規UIコンポーネント**:
  - `components/organization/organization-tree-view.tsx` - ツリー全体のコンテナ
  - `components/organization/organization-tree-node.tsx` - 個別ノード（展開/折りたたみ、選択）
  - `components/organization/organization-edit-form.tsx` - 編集フォーム
  - `components/organization/delete-organization-dialog.tsx` - 削除確認ダイアログ

#### 責任境界
- **`OrganizationTreeView`**:
  - ツリー全体の状態管理（展開状態、選択ノード）
  - キーボードナビゲーション
  - ツリーノードのレンダリング
- **`OrganizationTreeNode`**:
  - 個別ノードの表示（アイコン、名称）
  - 展開/折りたたみアイコンのインタラクション
  - 選択状態のハイライト
- **`OrganizationEditForm`**:
  - フォーム入力（名称、親組織選択）
  - バリデーション表示
  - Server Action呼び出し
- **`DeleteOrganizationDialog`**:
  - 確認ダイアログ表示
  - 子ノード存在時の警告メッセージ
  - Server Action呼び出し

#### データフローと制御フロー
1. **初期表示**: Server Componentで`getOrganizationHierarchy()`を呼び出し、ツリーデータ取得
2. **ツリー表示**: `OrganizationTreeView`（Client Component）がツリーデータを受け取り、展開/折りたたみ状態を管理
3. **ノード選択**: ユーザーがノードをクリック → 選択状態を更新 → 右側に`OrganizationEditForm`を表示
4. **編集/削除**: Server Action呼び出し → `revalidatePath('/admin/organizations')` → ページ再レンダリング

#### Trade-offs
- ✅ **メリット**: 責任分離が明確（読み取り専用UI vs 編集UI）
- ✅ **メリット**: ツリービュー専用の最適化が可能（キーボードナビゲーション、ARIA属性）
- ✅ **メリット**: 既存コンポーネント（`OrganizationCard`）への影響なし
- ✅ **メリット**: テストが容易（新規コンポーネントは独立してテスト可能）
- ❌ **デメリット**: ファイル数が増加（ナビゲーションが複雑化）
- ❌ **デメリット**: 慎重なインターフェース設計が必要（ツリービュー ↔ 編集フォーム連携）

---

### Option C: Hybrid Approach（ハイブリッドアプローチ）

#### 組み合わせ戦略
- **Phase 1（MVP）**:
  - 新規ページ（`/app/admin/organizations/page.tsx`）とServer Actions（`lib/organizations/actions.ts`）を作成
  - 簡易的なフォームベースUI（リスト表示 + 編集フォーム）で最小限の機能を実装
  - ツリービューは後回し（フラットなリスト表示で対応）
- **Phase 2（ツリービュー実装）**:
  - `OrganizationTreeView`を実装
  - サードパーティライブラリ（`react-arborist`等）の評価・導入
  - キーボードナビゲーション、ARIA属性の追加
- **Phase 3（リファクタリング）**:
  - 必要に応じて既存コンポーネント（`OrganizationCard`）との統合検討
  - パフォーマンス最適化（仮想スクロール等）

#### 段階的実装
1. **Phase 1**: CRUD操作のみ実装（シンプルなフォームUI）
   - **Effort**: M（3-7日）
   - **Risk**: Low（既存パターンを活用）
2. **Phase 2**: ツリービューUI追加
   - **Effort**: M（3-7日）
   - **Risk**: Medium（ツリービューライブラリの評価・統合）
3. **Phase 3**: UX改善・最適化
   - **Effort**: S（1-3日）
   - **Risk**: Low

#### リスク軽減
- **段階的ロールアウト**: Phase 1でMVPをリリース、ユーザーフィードバックを収集
- **Feature Flag**: 環境変数でツリービューの有効/無効を切り替え可能に
- **Rollback Strategy**: Phase 1の実装は最小限のため、必要に応じて簡単にロールバック可能

#### Trade-offs
- ✅ **メリット**: 段階的にリリース可能（早期フィードバック）
- ✅ **メリット**: 各フェーズで技術的リスクを分散
- ⚠️ **デメリット**: 計画が複雑（各フェーズの境界を明確に定義する必要）
- ⚠️ **デメリット**: 一貫性の維持が課題（Phase 1とPhase 2でUIが大きく変わる可能性）

---

## 4. Implementation Complexity & Risk

### Effort（工数見積もり）

#### Option A: Extend Existing Components
- **Effort**: M（3-7日）
- **根拠**:
  - CRUD Server Actions実装: 2日
  - 既存コンポーネント拡張（編集モード追加）: 2-3日
  - バリデーション・テスト: 2日

#### Option B: Create New Components
- **Effort**: L（1-2週間）
- **根拠**:
  - Server Actions実装: 2日
  - ツリービューコンポーネント新規実装: 4-5日（キーボードナビゲーション、ARIA属性含む）
  - 編集フォーム・ダイアログ: 2-3日
  - 統合・テスト: 2-3日

#### Option C: Hybrid Approach（Phase 1のみ）
- **Effort**: M（3-7日）
- **根拠**:
  - Server Actions実装: 2日
  - シンプルなフォームUI: 2-3日
  - バリデーション・テスト: 2日

### Risk（リスク評価）

#### Option A: Extend Existing Components
- **Risk**: Medium
- **根拠**:
  - 既存コンポーネントへの影響範囲が不明瞭
  - カード内包レイアウトとツリービューUIの両立が技術的に困難
  - 既存テストの更新が必要（テストカバレッジ低下のリスク）

#### Option B: Create New Components
- **Risk**: Medium
- **根拠**:
  - ツリービューライブラリの選定・評価が必要（未知数）
  - キーボードナビゲーション・ARIA属性の実装が複雑（アクセシビリティ対応）
  - クライアントサイド状態管理（展開状態、選択ノード）の設計が必要

#### Option C: Hybrid Approach
- **Risk**: Low（Phase 1のみ）
- **根拠**:
  - Phase 1は既存パターンを踏襲（Server Actions + フォームUI）
  - ツリービューは後回し（リスクを分散）
  - 段階的リリースにより、早期フィードバックで方向修正可能

---

## 5. Recommendations for Design Phase

### 推奨アプローチ
**Option C: Hybrid Approach（Phase 1から開始）**

#### 理由
1. **早期価値提供**: Phase 1で最小限のCRUD機能を提供し、管理者の即時ニーズに対応
2. **リスク分散**: ツリービューUIの複雑性を後回しにし、技術的リスクを分散
3. **ユーザーフィードバック**: Phase 1のシンプルなUIでフィードバックを収集し、Phase 2の設計に反映
4. **段階的な品質向上**: 各フェーズでテスト・リファクタリングを実施し、品質を段階的に向上

### 主要な設計決定事項

#### Phase 1（MVP）
1. **ページ構成**: `/app/admin/organizations/page.tsx`（新規作成）
2. **Server Actions**: `/lib/organizations/actions.ts`（新規作成）
   - `createOrganizationAction()`
   - `updateOrganizationAction()`
   - `deleteOrganizationAction()`
3. **UI**: シンプルなリスト表示 + 編集フォーム
   - 左側: フラットなリスト表示（階層インデント表示）
   - 右側: 編集フォーム（名称、親組織選択）
4. **バリデーション**:
   - 名称必須チェック、最大文字数制限
   - 循環参照チェック（親組織選択時）
   - 階層レベル制約チェック（レベル4に子追加不可）

#### Phase 2（ツリービュー実装）
1. **ツリービューライブラリ評価**:
   - `react-arborist`（推奨）: 高機能、アクセシビリティ対応
   - `rc-tree`（代替案）: シンプル、カスタマイズ可能
   - 自作（最終手段）: 完全なコントロール、ただし工数増
2. **キーボードナビゲーション**: 矢印キー、Tab、Enter対応
3. **ARIA属性**: `role="tree"`, `role="treeitem"`, `aria-expanded`, `aria-selected`

### 設計フェーズで調査すべき項目

#### 必須調査事項（Research Needed）
1. **ON DELETE CASCADE制約の確認**:
   - 既存マイグレーションファイル（`drizzle/`）を確認
   - 未設定の場合、新規マイグレーションで追加
2. **ツリービューライブラリの評価**:
   - `react-arborist` vs `rc-tree` vs 自作
   - パフォーマンス、アクセシビリティ、カスタマイズ性を比較
3. **状態管理戦略**:
   - URL State（クエリパラメータで選択ノード管理）vs React State（コンポーネント内部管理）
   - 再レンダリングパフォーマンスへの影響

#### 任意調査事項（Nice-to-have）
1. **仮想スクロール**: 組織ノード数が多い場合のパフォーマンス最適化
2. **Drag & Drop**: 組織ノードのドラッグ&ドロップによる親変更（UX改善）
3. **一括操作**: 複数ノードの一括削除・移動（Phase 3以降）

---

## Summary

### スコープと課題
- **既存資産**: 組織データモデル、読み取り専用UI、権限チェック機能は実装済み
- **主要ギャップ**: ツリービューUI、CRUD Server Actions、循環参照検証、階層レベル再計算
- **技術的課題**: ツリービューライブラリの選定、キーボードナビゲーション実装、クライアントサイド状態管理

### 推奨事項
- **アプローチ**: Option C（Hybrid Approach）- Phase 1でMVP、Phase 2でツリービュー実装
- **Phase 1 Effort**: M（3-7日）、Risk: Low
- **Phase 2 Effort**: M（3-7日）、Risk: Medium
- **Total Effort**: L（1-2週間）、Risk: Low-Medium（段階的リリースによりリスク分散）

### Next Steps
設計フェーズ（`/kiro:spec-design admin-org-editor`）で以下を実施：
1. ON DELETE CASCADE制約の確認・追加（必須）
2. ツリービューライブラリの評価・選定（必須）
3. Phase 1の詳細設計（Server Actions、UIコンポーネント、バリデーション）
4. Phase 2の概要設計（ツリービューUI、キーボードナビゲーション、ARIA属性）
