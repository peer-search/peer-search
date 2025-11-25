# Implementation Plan

## Phase 1: MVP実装（基本CRUD機能）

### 1. データベースマイグレーション準備
- [x] 1.1 (P) organizationsテーブルにupdated_atカラムを追加
  - マイグレーションファイルを作成し、`updated_at`カラム（TIMESTAMP NOT NULL DEFAULT NOW()）を追加
  - 自動更新トリガー関数（`update_updated_at_column()`）を作成
  - `BEFORE UPDATE` トリガーを設定し、更新時に`updated_at`を自動更新
  - `pnpm db:generate`でマイグレーションを生成後、`pnpm db:migrate`で実行
  - _Requirements: 13.2_

### 2. 型定義とスキーマ拡張
- [x] 2.1 (P) Drizzleスキーマに`updated_at`カラムを追加
  - `db/schema.ts`の`organizations`テーブル定義に`updatedAt: timestamp("updated_at").defaultNow().notNull()`を追加
  - `Organization`, `NewOrganization`, `UpdateOrganization`型を更新
  - _Requirements: 13.2_

- [x] 2.2 (P) 組織管理用の型定義を拡張
  - `lib/organizations/types.ts`に`CreateOrganizationInput`, `UpdateOrganizationInput`型を追加
  - `OrganizationFlatNode`に`updatedAt: Date`フィールドを追加（`parent_id` → `parentId`にリネーム）
  - Server Action戻り値用の`ActionResult<T>`型を定義
  - _Requirements: 13.2, 14.3_

### 3. Service Layer拡張（バリデーション・ヘルパー関数）
- [x] 3.1 循環参照検証ロジックを実装
  - `lib/organizations/service.ts`に`validateParentSelection(nodeId, parentId)`関数を追加
  - 親が自分自身でないかチェック
  - 親が子孫ノードでないかチェック（`getDescendantIds()`を利用）
  - _Requirements: 7.3, 9.3_

- [x] 3.2 子孫ノード取得機能を実装
  - `getDescendantIds(nodeId)`関数を追加し、再帰CTEで子孫ノードIDを取得
  - `getDescendantCount(nodeId)`関数を追加し、子孫ノード数を返す（削除確認用）
  - _Requirements: 8.3, 8.5_

### 4. Server Actions実装
- [x] 4.1 管理者権限チェックヘルパーを作成
  - `lib/organizations/actions.ts`を新規作成し、`"use server"`ディレクティブを追加
  - `checkAdminPermission()`関数を実装（`lib/employees/actions.ts`のパターンを再利用）
  - `getUser()`でユーザー取得、`getProfileByUserId()`で権限確認
  - 権限なしの場合、`Error("Forbidden")`をスロー
  - _Requirements: 2.4, 14.2_

- [x] 4.2 組織追加のServer Actionを実装
  - `createOrganizationAction(data: CreateOrganizationInput)`を追加
  - 名称バリデーション（空文字列チェック、255文字制限）
  - 親組織の階層レベル取得と新規ノードのレベル計算（親のレベル+1）
  - 階層制約チェック（レベル4に子追加不可）
  - Drizzle ORMで`organizations`テーブルに挿入
  - `revalidatePath('/admin/organizations')`実行
  - _Requirements: 6.2, 6.3, 6.7, 9.1, 9.2, 9.4, 14.1, 14.4_

- [x] 4.3 組織編集のServer Actionを実装
  - `updateOrganizationAction(data: UpdateOrganizationInput)`を追加
  - 名称バリデーション（空文字列チェック、255文字制限）
  - 循環参照チェック（`validateParentSelection()`を利用）
  - 親組織変更時の階層レベル再計算（新しい親のレベル+1）
  - 子孫ノードの階層レベルを連動更新（トランザクション内で一括更新）
  - `revalidatePath('/admin/organizations')`実行
  - _Requirements: 7.2, 7.3, 7.4, 7.8, 9.1, 9.2, 9.3, 9.5, 14.1, 14.4_

- [x] 4.4 組織削除のServer Actionを実装
  - `deleteOrganizationAction(id: string)`を追加
  - ルートノード削除チェック（level === 1の場合エラー）
  - Drizzle ORMで`organizations`テーブルから削除（ON DELETE CASCADEで子孫も連動削除）
  - `revalidatePath('/admin/organizations')`実行
  - _Requirements: 8.1, 8.4, 8.5, 8.9, 14.1, 14.4_

### 5. クライアントサイド状態管理（Context API）
- [x] 5.1 (P) 選択ノード管理のContext APIを実装
  - `components/organization/organization-context.tsx`を新規作成
  - `OrganizationProvider`コンポーネントで選択ノード状態を管理
  - `useOrganizationSelection()`フックで選択ノードの取得・更新を提供
  - _Requirements: 5.1, 5.3_

### 6. UIコンポーネント実装（Phase 1: リスト表示）
- [ ] 6.1 組織リストビューコンポーネントを実装
  - `components/organization/organization-list-view.tsx`を新規作成（Client Component）
  - `organizations`プロップからフラット配列に変換（`flattenTree()`ヘルパー使用）
  - 選択ノード状態を管理し、各ノードに`onSelect`コールバックを渡す
  - _Requirements: 4.1, 4.4, 5.1_

- [ ] 6.2 個別組織リストアイテムを実装
  - `components/organization/organization-list-item.tsx`を新規作成
  - 階層レベルに応じたインデント表示（`level * 20px`）
  - 選択状態のハイライト表示（背景色・枠線）
  - ホバー・フォーカス状態のスタイル適用
  - _Requirements: 4.4, 4.5, 4.6, 5.1, 10.1, 10.2_

- [ ] 6.3 編集パネルコンポーネントを実装
  - `components/organization/organization-edit-panel.tsx`を新規作成
  - `useOrganizationSelection()`で選択ノード取得
  - 未選択時は「組織を選択してください」メッセージを表示
  - 選択時は`OrganizationEditForm`を表示
  - _Requirements: 5.2, 5.4_

- [ ] 6.4 編集フォームコンポーネントを実装
  - `components/organization/organization-edit-form.tsx`を新規作成（Client Component）
  - 名称入力フィールド（`maxLength={255}`）
  - 親組織選択フィールド（循環参照を除外したリスト表示）
  - クライアントサイドバリデーション（空文字列チェック、最大文字数）
  - `useTransition()`で`updateOrganizationAction()`呼び出し
  - エラーメッセージ表示（フォーム下部）
  - _Requirements: 7.1, 7.2, 7.3, 9.1, 9.2, 9.6, 10.5, 11.3_

- [ ] 6.5 削除確認ダイアログコンポーネントを実装
  - `components/organization/delete-organization-dialog.tsx`を新規作成
  - shadcn/uiの`AlertDialog`を使用
  - 子ノード存在時の警告メッセージ表示（`getDescendantCount()`利用）
  - `useTransition()`で`deleteOrganizationAction()`呼び出し
  - _Requirements: 8.1, 8.2, 8.3, 11.3_

### 7. ページコンポーネント実装
- [ ] 7.1 管理者専用組織管理ページを作成
  - `/app/admin/organizations/page.tsx`を新規作成（Server Component）
  - `getUser()`で認証チェック、未認証時は`/login`にリダイレクト
  - `getProfileByUserId()`で管理者権限チェック、権限なしの場合403エラー
  - `getOrganizationHierarchy()`で組織階層データ取得
  - `OrganizationProvider`でラップし、2カラムレイアウト（左: リスト、右: 編集パネル）を表示
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 15.1, 15.2_

- [ ] 7.2 (P) ローディング状態ページを作成
  - `/app/admin/organizations/loading.tsx`を新規作成
  - ローディングインジケーター（スピナーまたはスケルトンUI）を表示
  - _Requirements: 11.1, 11.4_

- [ ] 7.3 (P) エラー状態ページを作成
  - `/app/admin/organizations/error.tsx`を新規作成（Client Component）
  - エラーメッセージ表示と再試行ボタンを実装
  - _Requirements: 11.2, 11.4_

- [ ] 7.4 (P) ページメタデータを設定
  - `page.tsx`に`metadata`エクスポートを追加
  - `title: "組織管理 | Peer Search"`, `robots: "noindex, nofollow"`を設定
  - _Requirements: 15.3, 15.4, 15.5_

### 8. レスポンシブデザイン対応
- [ ] 8.1 2カラムレイアウトのレスポンシブ対応を実装
  - Tailwind CSSの`md:flex-row`（デスクトップ）、`flex-col`（モバイル）を適用
  - デスクトップ（>= 1024px）: 左30% / 右70%
  - タブレット（768px - 1024px）: 左40% / 右60%
  - モバイル（< 768px）: 縦方向レイアウト（ツリービュー上部、編集フォームモーダル）
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

### 9. ユニットテスト実装
- [ ] 9.1* バリデーションロジックのユニットテストを作成
  - `lib/organizations/service.test.ts`を新規作成
  - `validateParentSelection()`のテスト（自分自身、子孫ノード、有効な親のケース）
  - `getDescendantIds()`のテスト（再帰CTEの動作確認）
  - _Requirements: 7.3, 9.3_

### 10. コンポーネントテスト実装
- [ ] 10.1* 編集フォームコンポーネントのテストを作成
  - `components/organization/organization-edit-form.test.tsx`を新規作成
  - 初期表示テスト（組織名表示確認）
  - バリデーションエラー表示テスト（空文字列入力時）
  - Server Action呼び出しテスト（モック使用）
  - _Requirements: 7.1, 7.2, 9.1, 9.2_

- [ ] 10.2* リストアイテムコンポーネントのテストを作成
  - `components/organization/organization-list-item.test.tsx`を新規作成
  - 階層インデント表示テスト（`level * 20px`）
  - 選択状態ハイライトテスト
  - ホバー・フォーカス状態テスト
  - _Requirements: 4.4, 4.5, 10.1, 10.2_

### 11. 統合テスト実装
- [ ] 11.1* Server Actionsの統合テストを作成
  - `lib/organizations/actions.integration.test.ts`を新規作成
  - 組織追加テスト（データベース検証含む）
  - 組織編集テスト（階層レベル再計算確認）
  - 組織削除テスト（ON DELETE CASCADE確認）
  - テストデータのセットアップ・クリーンアップ
  - _Requirements: 6.3, 6.4, 7.4, 7.5, 8.4, 8.6, 14.1, 14.4_

### 12. Phase 1 動作確認・統合
- [ ] 12.1 Phase 1機能の動作確認
  - `/admin/organizations`にアクセスし、管理者権限チェック動作確認
  - 組織の追加・編集・削除が正常に動作することを確認
  - バリデーション（循環参照チェック、階層レベル制約）が動作することを確認
  - レスポンシブデザインが各画面サイズで適切に表示されることを確認
  - _Requirements: 1.1, 2.1, 6.1, 7.1, 8.1, 12.1_

---

## Phase 2: ツリービューUI実装（将来のエンハンスメント）

### 13. ツリービューライブラリ評価
- [ ] 13.1 ツリービューライブラリの選定
  - `react-arborist`, `rc-tree`, 自作の3候補を評価
  - パフォーマンス、アクセシビリティ、カスタマイズ性を比較
  - プロジェクトに最適なライブラリを選定し、依存関係に追加
  - _Requirements: 4.1, 4.2, 4.3_

### 14. ファイルエクスプローラー風ツリービュー実装
- [ ] 14.1 ツリービューコンポーネントを実装
  - `components/organization/organization-tree-view.tsx`を新規作成
  - 選定したライブラリを使用してツリービューを構築
  - 展開/折りたたみ機能を実装
  - 選択状態管理とハイライト表示
  - _Requirements: 4.1, 4.2, 4.3, 4.6_

- [ ] 14.2 ツリーノードコンポーネントを実装
  - `components/organization/organization-tree-node.tsx`を新規作成
  - アイコン（フォルダアイコン）とノード名を表示
  - 展開/折りたたみアイコンのインタラクション
  - 選択状態のハイライト
  - _Requirements: 4.5, 4.6_

### 15. キーボードナビゲーション実装
- [ ] 15.1 キーボード操作のサポートを追加
  - 矢印キー（上下左右）でのノード移動
  - Tabキーでのフォーカス移動
  - Enterキーでのノード選択
  - `onKeyDown`イベントハンドラーを実装
  - _Requirements: 10.4_

### 16. アクセシビリティ対応
- [ ] 16.1 ARIA属性を追加
  - ツリービューに`role="tree"`を付与
  - 各ノードに`role="treeitem"`, `aria-expanded`, `aria-selected`を付与
  - フォーカス状態のアウトライン表示
  - _Requirements: 10.3, 10.4, 10.5_

### 17. Phase 2 動作確認・統合
- [ ] 17.1 Phase 2機能の動作確認
  - ツリービューで階層構造を視覚的に把握できることを確認
  - 展開/折りたたみ、キーボード操作が動作することを確認
  - アクセシビリティテスト（axe-core）を実行し、0 violationsを確認
  - _Requirements: 4.1, 4.2, 4.3, 10.3, 10.4_

---

## Requirements Coverage

### Phase 1（MVP）で実装する要件
- **Requirement 1**: ページルーティングと基本構造（タスク7.1, 12.1）
- **Requirement 2**: アクセス制御と認証（タスク4.1, 7.1, 12.1）
- **Requirement 3**: 組織階層データの取得と表示（タスク7.1）
- **Requirement 4**: ファイルエクスプローラー風ツリービュー（Phase 1ではリスト表示で代替、タスク6.1, 6.2）
- **Requirement 5**: 組織ノードの選択と詳細表示（タスク5.1, 6.3, 12.1）
- **Requirement 6**: 組織ノードの追加（タスク4.2, 12.1）
- **Requirement 7**: 組織ノードの編集（タスク3.1, 4.3, 6.4, 12.1）
- **Requirement 8**: 組織ノードの削除（タスク3.2, 4.4, 6.5, 12.1）
- **Requirement 9**: バリデーションとデータ整合性（タスク3.1, 4.2, 4.3, 6.4, 12.1）
- **Requirement 10**: UIインタラクションとアクセシビリティ（タスク6.2, 6.4）
- **Requirement 11**: エラーハンドリングとローディング状態（タスク6.4, 6.5, 7.2, 7.3）
- **Requirement 12**: レスポンシブデザイン（タスク8.1, 12.1）
- **Requirement 13**: データモデルとデータベーススキーマ（タスク1.1, 2.1）
- **Requirement 14**: Server Actionsの実装（タスク4.1, 4.2, 4.3, 4.4）
- **Requirement 15**: パフォーマンスとSEO（タスク7.1, 7.4）

### Phase 2（エンハンスメント）で実装する要件
- **Requirement 4**: ファイルエクスプローラー風ツリービュー（完全実装、タスク13.1, 14.1, 14.2, 17.1）
- **Requirement 10**: キーボードナビゲーションとARIA属性（タスク15.1, 16.1, 17.1）

### 全要件カバレッジ
✅ 15個の全要件がタスクにマッピングされています（Phase 1で基本機能、Phase 2でUX改善）
