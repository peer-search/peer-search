# Gap分析: 社員管理機能（追加・編集・削除）

## 1. 現状調査

### 1.1 既存の関連資産

#### ページコンポーネント
- **`app/employees/[employeeId]/page.tsx`** (RSC)
  - 社員詳細画面のメインページ
  - `getUser()`で認証確認、`getEmployeeById()`でデータ取得
  - 2カラムレイアウト（写真 + 情報カード）
  - 編集・削除ボタンは未実装

#### UIコンポーネント
- **`components/employee/employee-detail-card.tsx`** (Client Component)
  - 社員情報の表示専用コンポーネント
  - shadcn/ui `Card`を使用
  - 編集モード機能なし（現状は表示のみ）

- **`components/employee/search-form.tsx`** (Client Component)
  - 検索フォームの実装例
  - `useState`でフォーム状態管理
  - バリデーションとエラー表示のパターン
  - `Sheet`コンポーネント（モバイル対応）使用

- **`components/layout/page-header.tsx`**
  - `isAdmin`プロパティを受け取る仕組みが既に存在
  - 管理者向けリンク追加の準備が整っている

#### データレイヤー
- **`lib/employees/service.ts`**
  - `getEmployeeById()`: 単一社員取得（実装済み）
  - `searchEmployees()`: 検索機能（実装済み）
  - **未実装**: `createEmployee()`, `updateEmployee()`, `deleteEmployee()`

- **`lib/profiles/service.ts`**
  - `getProfileByUserId()`: ユーザー権限取得（実装済み）
  - `role`フィールド（`admin` / `user`）で権限判定可能

#### データベーススキーマ
- **`db/schema.ts`**
  - `employees`テーブル: 全フィールド定義済み
    - `employee_number`: UNIQUE制約
    - `email`: UNIQUE制約
    - `updated_at`: 自動更新（`$onUpdate`）
  - `employee_organizations`テーブル: CASCADE DELETE設定済み
  - `profiles`テーブル: `role`フィールド（CHECK制約: `admin` / `user`）

#### UIライブラリ
- **shadcn/ui コンポーネント**
  - `Input`, `Label`, `Button`: 実装済み
  - `Card`: 実装済み
  - `Sheet`: モバイル対応フォーム実装済み
  - **未実装**: `Dialog`, `AlertDialog`（削除確認ダイアログ用）

### 1.2 既存の規約とパターン

#### 認証・権限管理パターン
- `proxy.ts`で全ルート認証チェック（Next.js 16）
- `getUser()`でサーバーサイド認証情報取得
- `getProfileByUserId()`で権限情報取得
- PageHeaderに`isAdmin`を渡すパターン確立済み

#### フォーム管理パターン
- Client Componentで`useState`を使用
- `useRouter`でプログラマティックナビゲーション
- URLSearchParamsでクエリパラメータ管理
- shadcn/ui `Sheet`でモバイル対応

#### データ操作パターン
- Drizzle ORMの`insert()`, `update()`, `delete()`使用
- `eq()`, `and()`等のフィルタ関数
- 型安全な操作（TypeScript strict mode）

#### Server Actions
- **未使用**: プロジェクト内でServer Actionsの使用例なし
- **調査必要**: Next.js 16 + React 19でのServer Actions実装パターン

### 1.3 統合ポイント

#### 既存ページへの統合
- `app/employees/[employeeId]/page.tsx`: 編集・削除ボタン追加
- `components/layout/page-header.tsx`: 「新規社員追加」リンク追加（管理者のみ）
- `app/employees/page.tsx`: 削除後のリダイレクト先

#### 既存コンポーネント拡張
- `EmployeeDetailCard`: 表示モード/編集モードの切り替え機能追加
- 編集モード時にフォームフィールド表示、バリデーション適用

#### データベース制約
- `employee_number`と`email`のUNIQUE制約によりバリデーション
- `employee_organizations`のCASCADE DELETE利用

---

## 2. 要件実現性分析

### 2.1 技術要件マップ

| 要件 | 技術要素 | 既存実装 | Gap |
|------|----------|----------|-----|
| **要件1: 管理者権限チェック** | | | |
| - ロール取得 | `getProfileByUserId()` | ✅ 実装済み | なし |
| - 条件付きUI表示 | React条件レンダリング | ✅ パターン確立 | なし |
| - サーバーサイド権限チェック | RSCでのロール検証 | ⚠️ 検証ロジック未実装 | **新規実装** |
| - 403エラーページ | Next.js Error Handling | ✅ `error.tsx`パターン確立 | なし |
| **要件2: 新規社員追加** | | | |
| - `/employees/new`ルート | App Router | ❌ 未実装 | **新規ページ作成** |
| - フォームコンポーネント | shadcn/ui | ⚠️ 参考実装あり（`SearchForm`） | **新規作成（共通化可能）** |
| - バリデーション | クライアントサイド | ⚠️ パターン未確立 | **新規実装** |
| - `createEmployee()` | Drizzle ORM `insert()` | ❌ 未実装 | **新規関数** |
| - Server Actions | Next.js 16 | ❌ 未使用 | **調査 + 実装** |
| **要件3: 社員情報編集** | | | |
| - フォームモード切り替え | `useState` | ⚠️ パターン未確立 | **新規実装** |
| - クエリパラメータ管理 | `useSearchParams` | ✅ 実装例あり（`SearchForm`） | なし |
| - `updateEmployee()` | Drizzle ORM `update()` | ❌ 未実装 | **新規関数** |
| **要件4: 社員削除** | | | |
| - 確認ダイアログ | `Dialog` / `AlertDialog` | ❌ 未実装 | **shadcn/ui追加** |
| - `deleteEmployee()` | Drizzle ORM `delete()` | ❌ 未実装 | **新規関数** |
| - CASCADE DELETE | DB外部キー制約 | ✅ 設定済み | なし |
| **要件5: フォームUI** | | | |
| - shadcn/ui統一デザイン | `Input`, `Label`, `Button` | ✅ 実装済み | なし |
| - エラーメッセージ表示 | 条件レンダリング | ⚠️ パターン未確立 | **新規実装** |
| - ローディング状態 | `useState` + disabled | ⚠️ パターン未確立 | **新規実装** |
| **要件6: データ永続化** | | | |
| - 一意性検証 | DB UNIQUE制約 | ✅ 設定済み | なし |
| - バリデーション関数 | TypeScript関数 | ❌ 未実装 | **新規実装** |
| - トランザクション | Drizzle ORM `db.transaction()` | ❌ 未使用 | **調査 + 実装** |
| **要件7: ナビゲーション** | | | |
| - リダイレクト | `redirect()` / `router.push()` | ✅ 実装例あり | なし |
| - メタデータ生成 | `generateMetadata()` | ✅ 実装済み | なし |
| **要件8: エラーハンドリング** | | | |
| - エラーページ | `error.tsx` | ✅ 実装済み | なし |
| - トースト通知 | UI Library | ❌ 未実装 | **調査（shadcn/ui Toastなど）** |
| **要件9: パフォーマンス** | | | |
| - RSC | Server Components | ✅ 採用済み | なし |
| - Server Actions | Next.js 16 | ❌ 未使用 | **調査 + 実装** |
| **要件10: テスト** | | | |
| - Vitest + RTL | テスト環境 | ✅ 環境構築済み | なし |
| - テストパターン | `.test.tsx`ファイル | ✅ 多数の実装例あり | なし |

### 2.2 未解決事項と調査必要項目

#### 🔍 調査必要 (Research Needed)

1. **Next.js 16 Server Actions実装パターン**
   - 要件: フォーム送信にServer Actionsを使用
   - 現状: プロジェクト内で使用例なし
   - 調査内容:
     - `"use server"`ディレクティブの配置方法
     - フォームバリデーションとエラーハンドリング
     - リダイレクト処理の実装方法
     - TypeScript型定義のベストプラクティス

2. **Drizzle ORMトランザクション**
   - 要件: 複数テーブル書き込みの原子性保証
   - 現状: `db.transaction()`の使用例なし
   - 調査内容:
     - トランザクション内でのエラーハンドリング
     - ロールバック処理
     - TypeScript型推論の挙動

3. **shadcn/ui Dialog/AlertDialog**
   - 要件: 削除確認ダイアログ
   - 現状: プロジェクトに未追加
   - 調査内容:
     - インストール方法（`npx shadcn@latest add dialog`）
     - アクセシビリティ対応
     - Server Actionsとのインテグレーション

4. **トースト通知システム**
   - 要件: 削除エラー時のトースト表示
   - 現状: 通知システム未実装
   - 調査内容:
     - shadcn/ui Toastコンポーネント
     - React Context APIでのグローバル状態管理
     - サーバーサイドからのメッセージ伝達方法

### 2.3 制約と前提条件

#### 技術的制約
- **TypeScript strict mode**: `any`使用不可、全型定義必須
- **Biome準拠**: ESLintやPrettierの代わりにBiomeでコード品質管理
- **React 19**: 最新APIを活用（`use`フック、Server Actionsなど）
- **Next.js 16 App Router**: ファイルシステムベースルーティング、proxy.ts認証

#### アーキテクチャ制約
- **Server-First設計**: デフォルトはRSC、クライアントコンポーネントは最小限
- **認証レイヤー分離**: `proxy.ts`で全ルート保護、`getUser()`でサーバーサイド認証
- **データレイヤー分離**: `lib/employees/service.ts`でビジネスロジック集約

#### データベース制約
- **UNIQUE制約**: `employee_number`と`email`は変更時に一意性検証必要
- **CASCADE DELETE**: `employee_organizations`の関連レコード自動削除
- **CHECK制約**: `role IN ('admin', 'user')`をDB側で保証

---

## 3. 実装アプローチ オプション

### オプションA: 既存コンポーネント拡張アプローチ

#### 拡張対象ファイル
1. **`components/employee/employee-detail-card.tsx`**
   - 編集モード機能を追加
   - `mode`プロパティ（`view` | `edit`）でUI切り替え
   - フォームフィールドとバリデーションを統合

2. **`app/employees/[employeeId]/page.tsx`**
   - 編集・削除ボタンを追加（管理者のみ表示）
   - クエリパラメータ`?mode=edit`で編集モード切り替え
   - Server Actionsを呼び出し

3. **`lib/employees/service.ts`**
   - `createEmployee()`, `updateEmployee()`, `deleteEmployee()`を追加

4. **`components/layout/page-header.tsx`**
   - 「新規社員追加」リンクを追加（`isAdmin`条件）

#### 後方互換性評価
- ✅ `EmployeeDetailCard`に`mode`プロパティ追加は既存の表示に影響なし
- ✅ ページコンポーネントにボタン追加は既存レイアウトと共存可能
- ✅ `lib/employees/service.ts`への関数追加は既存関数に影響なし

#### 複雑性と保守性
- ⚠️ `EmployeeDetailCard`が肥大化（表示ロジック + フォームロジック）
- ⚠️ 単一コンポーネントが2つの責務を持つ（Single Responsibility Principle違反の可能性）
- ✅ ファイル数が最小限で済む

#### トレードオフ
- ✅ **メリット**:
  - 新規ファイル最小限（高速開発）
  - 既存パターンの活用
  - テスト影響範囲が限定的

- ❌ **デメリット**:
  - `EmployeeDetailCard`の複雑度増加
  - 編集モード特有のロジックが混在
  - 将来的な機能追加（例: 所属編集）で更に複雑化

---

### オプションB: 新規コンポーネント作成アプローチ

#### 新規作成ファイル
1. **`components/employee/employee-form.tsx`**
   - 新規追加・編集共通のフォームコンポーネント
   - バリデーションロジック内包
   - Server Actionsとの統合

2. **`app/employees/new/page.tsx`**
   - 新規社員追加ページ
   - `EmployeeForm`を空の初期値で使用

3. **`components/employee/delete-employee-dialog.tsx`**
   - 削除確認ダイアログコンポーネント
   - shadcn/ui `AlertDialog`使用

4. **`lib/employees/actions.ts`** (新規)
   - Server Actions専用ファイル
   - `createEmployeeAction()`, `updateEmployeeAction()`, `deleteEmployeeAction()`

5. **`lib/employees/validation.ts`** (新規)
   - バリデーションロジック専用ファイル
   - メール形式検証、日付検証など

#### 責務境界
- **`EmployeeForm`**: フォームUI + クライアントサイドバリデーション
- **`actions.ts`**: サーバーサイド処理 + データベース操作
- **`validation.ts`**: 共通バリデーションロジック（クライアント・サーバー共用）
- **`DeleteEmployeeDialog`**: 削除確認UI

#### 統合ポイント
- `app/employees/[employeeId]/page.tsx`: 編集モード時に`EmployeeForm`を表示
- `app/employees/new/page.tsx`: 新規追加時に`EmployeeForm`を表示
- `PageHeader`: 「新規社員追加」リンク追加

#### トレードオフ
- ✅ **メリット**:
  - 関心の分離（表示 vs フォーム）
  - フォームロジック再利用（新規 + 編集）
  - テスト分離（ユニットテストが書きやすい）
  - 将来の機能追加に対応しやすい

- ❌ **デメリット**:
  - ファイル数増加（ナビゲーションコスト）
  - インターフェース設計が必要
  - 初期開発時間が増加

---

### オプションC: ハイブリッドアプローチ（推奨）

#### 組み合わせ戦略

**フェーズ1: 最小限の拡張（MVP）**
1. `lib/employees/service.ts`に`createEmployee()`, `updateEmployee()`, `deleteEmployee()`追加
2. `lib/employees/actions.ts`（新規）でServer Actions実装
3. `app/employees/new/page.tsx`（新規）で新規追加ページ作成
   - シンプルなフォーム実装（shadcn/ui `Input`直接使用）
4. `app/employees/[employeeId]/page.tsx`に「削除」ボタン追加
   - shadcn/ui `AlertDialog`で確認ダイアログ

**フェーズ2: コンポーネント共通化（リファクタリング）**
1. `components/employee/employee-form.tsx`（新規）作成
   - 新規追加ページのフォームロジックを抽出
   - 編集モード対応
2. `app/employees/[employeeId]/page.tsx`で編集モード実装
   - `?mode=edit`時に`EmployeeForm`表示
3. バリデーションロジックを`lib/employees/validation.ts`に分離

**フェーズ3: UI最適化**
1. トースト通知システム導入
2. ローディング状態の改善
3. アクセシビリティ強化

#### 段階的実装理由
- **リスク軽減**: 小さな変更から開始、動作確認後に拡張
- **学習曲線**: Server Actions実装を小規模で試行
- **フィードバック反映**: ユーザーフィードバックを受けて最適化

#### トレードオフ
- ✅ **メリット**:
  - 段階的リリース可能
  - 各フェーズでテスト・検証
  - 技術的不確実性を早期解消
  - リファクタリングを後回しにできる

- ❌ **デメリット**:
  - 計画が複雑
  - 一時的なコードの重複
  - 全体完成まで時間がかかる

---

## 4. 実装複雑度とリスク評価

### 4.1 工数見積もり

#### オプションA: 既存拡張
- **工数**: M（5-7日）
- **内訳**:
  - データレイヤー実装（`createEmployee`, `updateEmployee`, `deleteEmployee`）: 2日
  - `EmployeeDetailCard`編集モード実装: 2日
  - 新規追加ページ実装: 1.5日
  - テスト実装: 1.5日

#### オプションB: 新規作成
- **工数**: L（7-10日）
- **内訳**:
  - データレイヤー + Server Actions: 3日
  - 共通フォームコンポーネント実装: 2.5日
  - 新規追加・編集ページ実装: 2日
  - 削除ダイアログ実装: 1日
  - テスト実装: 2.5日

#### オプションC: ハイブリッド（推奨）
- **工数**: L（8-12日、3フェーズ累計）
- **内訳**:
  - フェーズ1（MVP）: 4日
  - フェーズ2（共通化）: 3日
  - フェーズ3（最適化）: 2日
  - テスト実装（継続的）: 3日

### 4.2 リスク評価

| リスク要因 | リスクレベル | 根拠 | 軽減策 |
|-----------|-------------|------|--------|
| **Server Actions未使用** | 🟡 Medium | プロジェクト初使用、実装例なし | 小規模な実装から開始、公式ドキュメント参照、単体テスト充実 |
| **フォーム複雑度** | 🟢 Low | `SearchForm`の実装例あり、shadcn/uiで統一 | 既存パターン踏襲、段階的実装 |
| **バリデーション網羅性** | 🟡 Medium | クライアント・サーバー両側で検証必要 | 共通バリデーション関数作成、テストケース充実 |
| **既存機能への影響** | 🟢 Low | 表示機能と分離可能、後方互換性維持 | 段階的リリース、テスト充実 |
| **トランザクション実装** | 🟡 Medium | Drizzle ORM使用例なし | 公式ドキュメント参照、エラーハンドリング充実 |
| **権限チェック漏れ** | 🔴 High | セキュリティリスク、サーバーサイド検証必須 | 全エンドポイントで権限チェック、統合テスト実施 |
| **DB制約違反エラー処理** | 🟢 Low | UNIQUE制約が明確、エラーメッセージ定型化可能 | try-catchで制約違反キャッチ、ユーザーフレンドリーなメッセージ表示 |

### 4.3 総合リスク評価

- **総合リスク**: 🟡 **Medium**
- **最大リスク要因**: 権限チェック漏れ（セキュリティリスク）
- **軽減重点**: サーバーサイド権限検証の徹底、セキュリティテスト実施

---

## 5. 設計フェーズへの推奨事項

### 5.1 推奨アプローチ

**オプションC: ハイブリッドアプローチ**を推奨します。

#### 推奨理由
1. **技術的不確実性の早期解消**: Server Actions実装を小規模で試行し、フィードバックを得る
2. **段階的リリース**: フェーズ1でMVPをリリース、ユーザーフィードバックを反映
3. **コード品質維持**: フェーズ2でリファクタリング、関心の分離を実現
4. **リスク軽減**: 各フェーズでテスト・検証を実施、バグ混入リスクを低減

### 5.2 重点調査項目（設計フェーズ）

#### 必須調査
1. **Next.js 16 Server Actions実装パターン**
   - 公式ドキュメント: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
   - フォームバリデーション、エラーハンドリング、リダイレクト処理
   - TypeScript型定義のベストプラクティス

2. **Drizzle ORM トランザクション**
   - 公式ドキュメント: https://orm.drizzle.team/docs/transactions
   - エラーハンドリングとロールバック
   - 複数テーブルへの書き込み

3. **shadcn/ui Dialog/AlertDialog**
   - インストール: `npx shadcn@latest add dialog alert-dialog`
   - Server Actionsとの統合方法
   - アクセシビリティ対応

#### 推奨調査
4. **shadcn/ui Toastコンポーネント**
   - インストール: `npx shadcn@latest add toast`
   - React Context APIでのグローバル状態管理
   - サーバーサイドからのメッセージ伝達

### 5.3 設計時の決定事項

#### アーキテクチャ決定
- [ ] Server Actions配置場所（`lib/employees/actions.ts` vs `app/employees/actions.ts`）
- [ ] バリデーション関数配置場所（`lib/employees/validation.ts`）
- [ ] エラーメッセージの多言語化対応（将来的な国際化）

#### UI/UX決定
- [ ] 編集モード切り替え方法（クエリパラメータ vs 別ルート）
- [ ] 削除確認ダイアログのメッセージ内容
- [ ] ローディング状態の表示方法（Spinner vs Skeleton）
- [ ] エラーメッセージの表示場所（インライン vs トースト）

#### セキュリティ決定
- [ ] サーバーサイド権限チェックの実装場所（Server Actions内 vs ミドルウェア）
- [ ] CSRF保護の実装方法（Next.js 16のデフォルト動作を確認）
- [ ] 403エラーページのカスタマイズ

### 5.4 技術スタック追加

#### 必須追加
- shadcn/ui `Dialog` / `AlertDialog`コンポーネント

#### 推奨追加
- shadcn/ui `Toast`コンポーネント
- React Hook Form（フォームバリデーション強化、オプション）

---

## 6. まとめ

### 6.1 実装ギャップの総括

- **既存資産**: 認証・データレイヤー・UIコンポーネントの基盤が整備済み
- **主要ギャップ**: Server Actions、CRUD操作関数、フォームコンポーネント、削除ダイアログ
- **技術的課題**: Server Actions実装パターンの確立、トランザクション管理、権限チェックの徹底

### 6.2 実装の成功要因

1. **既存パターンの活用**: `SearchForm`等の実装例を参考にフォーム実装
2. **段階的実装**: ハイブリッドアプローチで技術的リスクを軽減
3. **セキュリティ優先**: サーバーサイド権限チェックを徹底、テスト充実
4. **テスト駆動**: 各フェーズでテストを実施、品質を保証

### 6.3 次のステップ

設計フェーズ（`/kiro:spec-design employee-management`）で以下を実施してください:

1. Server Actions実装パターンの調査と決定
2. コンポーネント設計（責務分離、インターフェース定義）
3. データフロー設計（フォーム → Server Actions → DB）
4. エラーハンドリング戦略の策定
5. セキュリティ検証計画の策定
