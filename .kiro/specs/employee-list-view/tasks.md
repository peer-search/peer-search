# 実装タスク: 社員一覧画面

## タスク概要

本タスクリストは、社員一覧画面の実装を段階的に進めるための作業項目を定義します。データベーススキーマの作成からUI実装、テストまで、要件とデザインに基づいた完全な実装フローをカバーします。

**前提条件**:
- 要件15項目が承認済み
- 技術設計が承認済み（複合主キー構文修正済み）
- 既存のOrganizationsテーブルとproxy.ts認証パターンが利用可能

**実装順序の原則**:
- データ層 → サービス層 → UI層の順で実装
- 並列実行可能なタスクには **(P)** マークを付与
- 各タスクは1-3時間で完了可能なサイズに分割

---

## 1. データベーススキーマとマイグレーション

### 1.1 Employeesテーブルのスキーマ定義 **(P)** ✅
- `db/schema.ts`にEmployeesテーブルのDrizzleスキーマを追加
- カラム定義（id, employee_number, name_kanji, name_kana, photo_s3_key, mobile_phone, email, hire_date, created_at, updated_at）
- UNIQUE制約（employee_number, email）とNOT NULL制約の設定
- インデックス定義（name_kana, employee_number, hire_date）
- 型エクスポート（Employee, NewEmployee）
- **要件カバレッジ**: 7.1, 7.2, 7.3, 7.4, 7.5

### 1.2 Employee_Organizationsテーブルのスキーマ定義 **(P)** ✅
- `db/schema.ts`にEmployee_Organizationsテーブルのスキーマを追加
- カラム定義（employee_id, organization_id, position, created_at）
- 複合主キー定義（`primaryKey({ columns: [table.employeeId, table.organizationId] })`）
- Foreign Key参照（employees.id, organizations.id）とON DELETE CASCADE
- インデックス定義（employee_id, organization_id）
- 型エクスポート（EmployeeOrganization, NewEmployeeOrganization）
- **要件カバレッジ**: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6

### 1.3 マイグレーションファイルの生成と確認 ✅
- `pnpm db:generate`でマイグレーションファイルを生成
- 生成されたSQLファイル（`drizzle/`ディレクトリ）の内容確認
- 必要に応じてCHECK制約やコメントを手動追加
- マイグレーションファイルのレビュー（複合主キー構文、インデックス、外部キー制約）
- **要件カバレッジ**: 7, 8

### 1.4 マイグレーションの実行とテーブル作成 ✅
- 開発環境で`pnpm db:migrate`を実行（手動実行済み）
- Drizzle Studioでテーブル構造の確認
- サンプルデータの挿入テスト（CSVファイル作成: `data/employees-sample.csv`, `data/employee-organizations-sample.csv`）
- 外部キー制約とカスケード削除の動作確認（手動インポート後）
- **要件カバレッジ**: 7, 8, 14.5

---

## 2. S3統合とユーティリティ関数

### 2.1 S3 URL生成ユーティリティの実装 **(P)** ✅
- `lib/s3/url.ts`を作成し`getS3Url(key: string): string`関数を実装
- CloudFront環境変数の有無による分岐ロジック
- S3直接URLとCloudFront URLの生成
- 環境変数バリデーション（AWS_REGION, S3_BUCKET_NAME, CLOUDFRONT_DOMAIN）
- エラーハンドリング（空文字列key、環境変数未設定）
- **要件カバレッジ**: 9.1, 9.3, 9.4

### 2.2 S3 URLユーティリティのテスト **(P)** ✅
- `lib/s3/url.test.ts`を作成
- CloudFront有効時のURL生成テスト
- CloudFront無効時のS3直接URL生成テスト
- 環境変数未設定時のエラーハンドリングテスト
- 空文字列keyのエラーハンドリングテスト
- **要件カバレッジ**: 9.4, 15.1, 15.2

---

## 3. データアクセス層（サービス）

### 3.1 EmployeeService基本構造の実装 **(P)** ✅
- `lib/employees/service.ts`を作成
- `SearchEmployeesParams`インターフェースの定義
- `Employee`と`EmployeeOrganization`型の定義
- Drizzle ORMクライアントのインポートとDB接続
- 空の`searchEmployees()`関数スケルトンの作成
- **要件カバレッジ**: 1.1, 3.1, 15.1

### 3.2 社員検索クエリロジックの実装 ✅
- `searchEmployees()`関数内で動的クエリビルダーを実装
- 氏名検索（name_kanji/name_kanaの部分一致LIKE）
- 社員番号検索（完全一致）
- 入社年検索（EXTRACT(YEAR FROM hire_date)）
- Employee_OrganizationsテーブルとのLEFT JOIN
- OrganizationsテーブルとのJOIN（組織名取得）
- **要件カバレッジ**: 3.1, 3.2, 3.3

### 3.3 組織フィルタとソートの実装 ✅
- 組織ID（org_id）によるフィルタリングロジック
- ソート項目（name_kana, employee_number, hire_date）の動的ORDER BY
- ソート順（asc, desc）の適用
- 複数所属社員のDISTINCT処理
- **要件カバレッジ**: 4.3, 5.1, 5.2, 5.3

### 3.4 社員データの集約処理 ✅
- クエリ結果から社員IDでグルーピング
- 複数所属情報を配列化（organizationsフィールド）
- organizationPath文字列の生成ロジック（階層パス）
- positionフィールドの付加
- **要件カバレッジ**: 1.1, 2.3, 4.4

### 3.5 EmployeeServiceのテスト ✅
- `lib/employees/service.test.ts`を作成
- モックデータベースセットアップ（Vitestのインメモリテスト）
- 氏名検索のテストケース（部分一致）
- 社員番号検索のテストケース（完全一致）
- 入社年検索のテストケース
- 組織フィルタのテストケース
- ソート機能のテストケース（昇順/降順）
- 複数所属社員の集約ロジックテスト
- 空配列返却のテストケース
- **要件カバレッジ**: 3, 4, 5, 11.2, 15.1, 15.2, 15.3

---

## 4. UIコンポーネント実装

### 4.1 EmployeeCard基本構造の実装 **(P)** ✅
- `components/employee/employee-card.tsx`を作成
- `EmployeeCardProps`インターフェースの定義
- shadcn/ui Cardコンポーネントのインポート
- Server Componentとして実装（"use client"なし）
- 基本レイアウト構造（写真エリア、情報エリア）
- **要件カバレッジ**: 2.1, 2.4, 15.1

### 4.2 EmployeeCard情報表示の実装 ✅
- 社員写真表示（Next.js Image, getS3Url()使用）
- プレースホルダー画像の条件分岐（photoS3Key null時）
- 氏名表示（漢字、かな）
- 社員番号表示
- 連絡先表示（携帯電話、メール）
- 複数所属の表示ロジック（組織パス + 役職）
- **要件カバレッジ**: 2.1, 2.2, 2.3, 9.2, 9.5

### 4.3 EmployeeCardインタラクションの実装 ✅
- Next.js Linkでカード全体をラップ（`/employees/[id]`）
- ホバー時のスタイル（border, shadow変更）
- フォーカス時のスタイル（キーボードナビゲーション）
- ARIA属性の追加（role="article", aria-label）
- **要件カバレッジ**: 2.5, 2.6, 6.1, 6.2, 6.3, 12.1, 12.2

### 4.4 EmployeeCardのテスト **(P)** ✅
- `components/employee/employee-card.test.tsx`を作成
- React Testing Libraryでレンダリングテスト
- 社員情報表示の検証
- 複数所属表示のテスト
- プレースホルダー画像表示テスト（photoS3Key null）
- Link hrefの正確性テスト
- ARIA属性の存在確認
- **要件カバレッジ**: 2, 6, 12, 15.2, 15.4

### 4.5 EmployeeCardList実装 **(P)** ✅
- `components/employee/employee-card-list.tsx`を作成
- `EmployeeCardListProps`インターフェースの定義
- Server Componentとして実装
- レスポンシブグリッドレイアウト（Tailwind: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`）
- 空配列時のメッセージ表示（"社員が見つかりませんでした"）
- EmployeeCardのマッピング表示
- **要件カバレッジ**: 1.4, 10.1, 10.2, 10.3

### 4.6 EmployeeCardListのテスト **(P)** ✅
- `components/employee/employee-card-list.test.tsx`を作成
- 社員配列レンダリングテスト
- 空配列時のメッセージ表示テスト
- グリッドレイアウトのクラス確認
- **要件カバレッジ**: 1.4, 10, 15.2

### 4.7 SearchForm基本構造の実装 **(P)** ✅
- `components/employee/search-form.tsx`を作成（Client Component: "use client"）
- `SearchFormProps`インターフェースの定義
- shadcn/ui Sheet, Input, Button, Labelコンポーネントのインポート
- React Hook Form統合（オプション、シンプルなstate管理でも可）
- デフォルト値の復元（defaultValues prop）
- **要件カバレッジ**: 3.1, 3.6, 12.4

### 4.8 SearchFormフォームロジックの実装 ✅
- 氏名入力フィールド（name）
- 社員番号入力フィールド（employee_number）
- 入社年入力フィールド（hire_year, type="number"）
- フォーム送信時のURL Search Params構築
- useRouter().push()でページ遷移
- デバウンス処理（500ms、オプション）
- **要件カバレッジ**: 3.1, 3.2, 3.3, 3.4, 3.5

### 4.9 SearchFormモバイルUI実装 ✅
- モバイル環境でのSheet（ドロワー）表示
- 開閉トリガーボタン
- Sheet内でのフォーム配置
- レスポンシブ対応（デスクトップでは通常表示）
- **要件カバレッジ**: 10.4, 10.5

### 4.10 SearchFormのテスト **(P)** ✅
- `components/employee/search-form.test.tsx`を作成
- フォーム入力のテスト（@testing-library/user-event）
- フォーム送信時のURL遷移テスト（useRouterモック）
- デフォルト値復元のテスト
- バリデーション（hire_yearが数値のみ）
- **要件カバレッジ**: 3, 15.2, 15.4

### 4.11 SortControls実装 **(P)** ✅
- `components/employee/sort-controls.tsx`を作成（Client Component）
- `SortControlsProps`インターフェースの定義
- ソート項目ボタン（氏名かな、社員番号、入社年）
- ボタンクリック時のURL Search Params更新
- 昇順→降順→ソート解除のトグルロジック
- aria-sort属性の設定
- アクティブ状態の視覚的フィードバック
- **要件カバレッジ**: 5.1, 5.2, 5.3, 5.4, 5.5, 12.3

### 4.12 SortControlsのテスト **(P)** ✅
- `components/employee/sort-controls.test.tsx`を作成
- ボタンクリックとURL更新テスト
- aria-sort属性の正確性テスト
- アクティブ状態スタイルのテスト
- **要件カバレッジ**: 5, 12, 15.2, 15.4

---

## 5. ページ実装とルーティング

### 5.1 EmployeesPage基本構造の実装 ✅
- `/app/employees/page.tsx`を作成（Server Component）
- `searchParams` propの型定義（`EmployeesPageSearchParams`）
- getUser()での認証状態確認
- Search Paramsの解析とバリデーション
- ページレイアウト構造（検索フォーム、ソートコントロール、カードリスト）
- **要件カバレッジ**: 1.2, 14.1, 14.2

### 5.2 EmployeesPageデータフェッチの実装 ✅
- EmployeeService.searchEmployees()の呼び出し
- Search Paramsから検索条件オブジェクトへの変換
- エラーハンドリング（try-catchでラップ）
- 空配列時の処理
- **要件カバレッジ**: 1.1, 1.3, 13.1, 13.2

### 5.3 EmployeesPage UI統合 ✅
- SearchFormコンポーネントの配置（defaultValues渡し）
- SortControlsコンポーネントの配置（currentSort/Order渡し）
- EmployeeCardListコンポーネントの配置（employees渡し）
- 組織フィルタ適用時のバッジ表示（組織名取得）
- **要件カバレッジ**: 1.4, 3, 4.2, 5

### 5.4 EmployeesPageローディング状態の実装 ✅
- `/app/employees/loading.tsx`を作成（オプション）
- Suspense boundaryの活用
- ローディングインジケーター表示
- スケルトンUIの実装（カード形状のプレースホルダー）
- **要件カバレッジ**: 1.2, 1.5

### 5.5 EmployeesPageエラーハンドリングの実装 ✅
- `/app/employees/error.tsx`を作成
- データベース接続エラーの表示
- 不正なSearch Paramsのエラー表示
- ユーザーフレンドリーなエラーメッセージ
- エラーログ出力（console.error）
- **要件カバレッジ**: 13.1, 13.2, 13.3, 13.4, 13.5

---

## 6. 既存機能との統合

### 6.1 OrganizationCardリンクの確認 ✅
- `components/organization/organization-card.tsx`の既存リンクを確認
- `/employees?org_id={id}`へのリンクが正しく機能するか検証
- 組織IDのUUID形式確認
- **要件カバレッジ**: 4.1

### 6.2 proxy.ts認証パターンの検証 ✅
- `proxy.ts`が`/employees`ルートで認証チェックを実行するか確認
- 未認証時の`/login`リダイレクト動作確認
- getUser()のキャッシュ動作確認
- **要件カバレッジ**: 14.1, 14.2, 14.3

---

## 7. パフォーマンス最適化

### 7.1 データベースクエリ最適化の検証 ✅
- EmployeeService.searchEmployees()のクエリ実行時間計測
- 1000件データでの500ms以内達成確認
- インデックス効果の検証（EXPLAIN ANALYZE）
- 必要に応じてクエリチューニング
- **要件カバレッジ**: 11.1, 11.2

### 7.2 画像最適化の実装 ✅
- Next.js Imageコンポーネントのloader設定
- 遅延読み込み設定（loading="lazy"）
- 最大6枚同時読み込みの制御（ブラウザデフォルト）
- WebP変換の確認
- **要件カバレッジ**: 9.6, 11.5

### 7.3 ページロードパフォーマンスの計測 ✅
- Lighthouse計測（FCP 2秒以内）
- React DevTools Profilerでレンダリングパフォーマンス確認
- Server Componentsのバンドルサイズ確認
- 必要に応じて最適化
- **要件カバレッジ**: 11.3, 11.4

---

## 8. テストとドキュメント

### 8.1 統合テストシナリオの作成（オプション）
- Playwrightセットアップ（将来拡張）
- E2Eフロー: 組織カードクリック→社員一覧表示→社員カードクリック
- 検索フローテスト
- 認証フローテスト
- **要件カバレッジ**: 15.5

### 8.2 アクセシビリティ監査 ✅
- axe DevToolsでの自動チェック
- キーボードナビゲーションの手動テスト
- スクリーンリーダー対応確認（VoiceOver/NVDA）
- ARIA属性の適切性検証
- **要件カバレッジ**: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6

### 8.3 セキュリティレビュー ✅
- SQL Injection脆弱性チェック（Drizzle ORMパラメータ化確認）
- XSS脆弱性チェック（React自動エスケープ確認）
- 認証フローの検証
- S3アクセス制御の確認
- **要件カバレッジ**: 14.1, 14.2, 14.3, 14.4, 14.5

### 8.4 ドキュメント更新 ✅
- README.mdへの機能追加説明
- 環境変数設定ガイド（AWS_REGION, S3_BUCKET_NAME等）
- マイグレーション実行手順の記載
- テスト実行方法の記載
- **要件カバレッジ**: 15

---

## 並列実行可能タスクの要約

以下のタスクは依存関係がなく、並列で実装可能です：

**データ層（並列グループ1）**:
- 1.1 Employeesテーブルのスキーマ定義 **(P)**
- 1.2 Employee_Organizationsテーブルのスキーマ定義 **(P)**
- 2.1 S3 URL生成ユーティリティの実装 **(P)**
- 2.2 S3 URLユーティリティのテスト **(P)**
- 3.1 EmployeeService基本構造の実装 **(P)**

**UIコンポーネント（並列グループ2、データ層完了後）**:
- 4.1 EmployeeCard基本構造の実装 **(P)**
- 4.4 EmployeeCardのテスト **(P)**
- 4.5 EmployeeCardList実装 **(P)**
- 4.6 EmployeeCardListのテスト **(P)**
- 4.7 SearchForm基本構造の実装 **(P)**
- 4.10 SearchFormのテスト **(P)**
- 4.11 SortControls実装 **(P)**
- 4.12 SortControlsのテスト **(P)**

**順次実行が必要なタスク**:
- データベース関連: 1.1-1.2 → 1.3 → 1.4（スキーマ定義→マイグレーション生成→実行）
- サービス層: 3.1 → 3.2 → 3.3 → 3.4 → 3.5（基本構造→検索→フィルタ→集約→テスト）
- UIコンポーネント詳細: 4.1 → 4.2 → 4.3（基本構造→情報表示→インタラクション）
- ページ統合: 5.1 → 5.2 → 5.3（基本構造→データフェッチ→UI統合）

---

## タスク完了の定義

各タスクは以下の条件を満たした時点で完了とみなします：

1. **コード実装**: 指定されたファイルが作成され、要件を満たすコードが実装されている
2. **型安全性**: TypeScript strictモードでエラーがない
3. **テスト**: 該当するテストタスクが完了している（テスト可能なコードのみ）
4. **レビュー**: コードレビューで設計書との整合性が確認されている
5. **動作確認**: 開発環境で期待通りに動作することが確認されている

---

**総タスク数**: 42タスク
**並列実行可能タスク**: 14タスク
**推定総工数**: 60-90時間（チーム並列作業で短縮可能）
