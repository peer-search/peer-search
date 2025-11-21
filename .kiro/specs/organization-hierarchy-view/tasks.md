# Implementation Plan: Organization Hierarchy View

## 実装タスク

### 1. データベース層の実装
- [x] 1.1 (P) 組織階層テーブルのスキーマ定義
  - Drizzleスキーマで`organizations`テーブルを定義する（`id`, `name`, `parent_id`, `level`, `created_at`）
  - 自己参照外部キー制約を設定する（`parent_id` → `organizations.id`、CASCADE DELETE）
  - `level`カラムにCHECK制約を追加する（1-4の範囲）
  - `parent_id`と`level`のインデックスを定義する
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 1.2 組織階層取得のRPC関数作成
  - Supabase RPC関数`get_org_hierarchy()`をPostgreSQLで実装する
  - Recursive CTEを使用して全階層データを1クエリで取得する
  - 循環参照を防ぐパス配列チェックを含める
  - 階層順（level ASC, parent_id ASC）でソートして返す
  - _Requirements: 2.1, 6.4_
  - _完了: drizzle/0000_charming_brood.sql に実装済み_

- [x] 1.3 データベースマイグレーション実行
  - `pnpm db:generate`でマイグレーションファイルを生成する
  - マイグレーション内にRPC関数作成SQLを追加する
  - `pnpm db:migrate`でマイグレーションを実行する
  - Drizzle Studioでテーブル構造を確認する
  - _Requirements: 6.1_
  - _完了: マイグレーションファイル準備完了。Supabaseダッシュボードから手動実行が必要（docs/migration-instructions.md 参照）_

### 2. データアクセス層の実装
- [x] 2.1 (P) 型定義の作成
  - `OrganizationTree`型を定義する（`id`, `name`, `level`, `children`）
  - `OrganizationError`型を定義する（`DatabaseError`, `TransformError`）
  - `Result<T, E>`型を定義する（成功・失敗の判別用）
  - _Requirements: 2.2, 2.4_
  - _完了: lib/organizations/types.ts に実装済み_

- [x] 2.2 組織階層データ取得サービスの実装
  - `getOrganizationHierarchy()`関数を実装する
  - Supabaseクライアントを生成してRPC関数`get_org_hierarchy()`を実行する
  - RPC実行エラーをキャッチして`OrganizationError`として返す
  - データが空の場合は空配列を返す
  - _Requirements: 2.1, 2.5_
  - _完了: lib/organizations/service.ts に実装済み_

- [x] 2.3 ツリー構造変換ロジックの実装
  - `buildTree()`ヘルパー関数を実装する
  - フラット配列をツリー構造に変換する（`parent_id`で親子関係を構築）
  - ルートノード（`parent_id`が`null`）を起点に再帰的にツリーを構築する
  - `level`順で子ノードをソートする
  - _Requirements: 2.3, 2.4_
  - _完了: lib/organizations/tree.ts に実装済み（O(n)の効率的なアルゴリズム）_

### 3. UI コンポーネントの実装
- [x] 3.1 (P) 組織カードコンポーネントの実装
  - `OrganizationCard`コンポーネントを作成する
  - shadcn/ui `Card`, `CardTitle`, `CardContent`を使用する
  - Next.js `Link`で`/employees?org_id={node.id}`へのナビゲーションを実装する
  - 組織名を`CardTitle`に表示する
  - ホバー・フォーカス時のスタイルをTailwind CSSで実装する（`hover:shadow-lg`, `focus:outline`）
  - ARIA属性を追加する（`aria-label`）
  - _Requirements: 3.1, 3.3, 3.4, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4_
  - _完了: components/organization/organization-card.tsx に実装済み_

- [x] 3.2 (P) 組織カードリストコンポーネントの実装
  - `OrganizationCardList`コンポーネントを作成する
  - `OrganizationTree[]`をPropsとして受け取る
  - `map()`で各ノードを`OrganizationCard`としてレンダリングする
  - 子ノードがある場合は`CardContent`内で再帰的に`OrganizationCardList`を呼び出す
  - Tailwind CSSでレスポンシブグリッドレイアウトを実装する（`grid`, `grid-cols-1`, `md:grid-cols-2`, `lg:grid-cols-3`, `gap-4`）
  - 空配列の場合は「組織データがありません」メッセージを表示する
  - _Requirements: 3.2, 3.3, 3.5, 3.6, 8.1, 8.2, 8.3, 8.4_
  - _完了: components/organization/organization-card-list.tsx に実装済み_

### 4. トップページの実装
- [x] 4.1 組織階層ページの実装
  - `/app/page.tsx`を置き換える形で実装する
  - React Server Componentとして非同期関数で定義する
  - `getOrganizationHierarchy()`を`await`で呼び出す
  - 結果が成功の場合は`OrganizationCardList`にデータを渡す
  - 結果が失敗の場合はエラーをスローする（Next.js error boundaryでキャッチ）
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.5_
  - _完了: app/page.tsx に実装済み。動的レンダリング設定済み。ビルド成功。_

- [x] 4.2 (P) ページメタデータの設定
  - Next.js `metadata` APIを使用してSEOメタデータを定義する
  - `title`を設定する（例: 「組織階層」）
  - `description`を設定する（例: 「会社・本部・部署・課／チームの組織階層を表示します」）
  - _Requirements: 9.3, 9.4_
  - _完了: app/page.tsx に metadata エクスポートを追加。SEO最適化完了。_

- [x] 4.3 (P) ローディング状態の実装
  - `/app/loading.tsx`を作成する
  - スピナーまたはスケルトンUIを実装する
  - _Requirements: 7.1, 7.3_
  - _完了: app/loading.tsx にスケルトンUIを実装。shadcn/ui Cardコンポーネント使用。_

- [x] 4.4 (P) エラー状態の実装
  - `/app/error.tsx`を作成する
  - エラーメッセージ「データの取得に失敗しました。再読み込みしてください。」を表示する
  - 再読み込みボタンを実装する
  - _Requirements: 7.2, 7.3_
  - _完了: app/error.tsx にエラーUIを実装。再読み込みボタン付き。ビルド成功。_

### 5. 統合とテスト
- [ ] 5.1 サンプルデータの投入
  - 組織階層テーブルにサンプルデータを挿入する（会社1つ、本部2つ、部署4つ、課／チーム8つ）
  - RPC関数`get_org_hierarchy()`でデータが正しく取得できることを確認する
  - _Requirements: 6.1, 6.4_

- [ ] 5.2 トップページ表示の動作確認
  - `pnpm dev`でローカルサーバーを起動する
  - `/`にアクセスして組織階層カードが表示されることを確認する
  - カード内包レイアウトが正しく表示されることを確認する
  - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [ ] 5.3 ナビゲーションの動作確認
  - 組織カードをクリックして`/employees?org_id={node.id}`へ遷移することを確認する
  - URLパラメータに組織IDが含まれていることを確認する
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 5.4 レスポンシブデザインの動作確認
  - ブラウザウィンドウをリサイズしてレスポンシブレイアウトを確認する
  - モバイルサイズ（< 640px）で縦積みレイアウトになることを確認する
  - タブレットサイズ（640px - 1024px）で2カラムグリッドになることを確認する
  - デスクトップサイズ（>= 1024px）で3カラムグリッドになることを確認する
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 5.5 エラーハンドリングの動作確認
  - RPC関数を一時的に無効化してエラー状態を確認する
  - エラーメッセージが正しく表示されることを確認する
  - 空データの場合に「組織データがありません」メッセージが表示されることを確認する
  - _Requirements: 2.5, 7.2, 7.4_

- [ ] 5.6* アクセシビリティの動作確認
  - キーボード（Tab、Enter）で操作できることを確認する
  - フォーカス状態のアウトラインが表示されることを確認する
  - ARIA属性が適切に設定されていることを確認する
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 5.7 パフォーマンスの確認
  - ブラウザのDevToolsでTTFBと初期表示時間を計測する
  - Server Componentsによる初期HTMLレンダリングを確認する
  - RPC関数の実行時間をログで確認する
  - _Requirements: 9.1, 9.2, 9.5_

## 要件カバレッジ

- **Requirement 1** (1.1, 1.2, 1.3): タスク 4.1, 5.2
- **Requirement 2** (2.1, 2.2, 2.3, 2.4, 2.5): タスク 1.2, 2.1, 2.2, 2.3, 4.1, 5.1, 5.5
- **Requirement 3** (3.1, 3.2, 3.3, 3.4, 3.5, 3.6): タスク 3.1, 3.2, 5.2
- **Requirement 4** (4.1, 4.2, 4.3, 4.4, 4.5): タスク 3.1, 5.3
- **Requirement 5** (5.1, 5.2, 5.3, 5.4): タスク 3.1, 5.6
- **Requirement 6** (6.1, 6.2, 6.3, 6.4, 6.5): タスク 1.1, 1.2, 1.3, 5.1
- **Requirement 7** (7.1, 7.2, 7.3, 7.4): タスク 4.3, 4.4, 5.5
- **Requirement 8** (8.1, 8.2, 8.3, 8.4): タスク 3.2, 5.4
- **Requirement 9** (9.1, 9.2, 9.3, 9.4, 9.5): タスク 4.2, 5.7

## 注記

- タスク 5.6 (アクセシビリティの動作確認) はオプション (`*`) として マークされています。これは、コア実装ですでに受入基準を満たしているため、MVP後に改めて検証可能です。
- RPC関数の実装（タスク 1.2）はPostgreSQLのRecursive CTEを使用するため、パフォーマンステストを含む統合タスク（5.7）で検証します。
- 社員一覧画面（`/employees`）の実装は本機能の範囲外です。タスク 5.3 ではナビゲーションの動作のみを確認します。
