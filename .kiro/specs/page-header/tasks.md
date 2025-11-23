# 実装計画

## タスク概要

本ドキュメントは、page-header機能の実装タスクを定義します。全15の要件を8つの主要タスク（25のサブタスク）にマッピングし、段階的な実装を実現します。

## 実装タスク

### データベース層

- [x] 1. profilesテーブルとサービス層の構築
- [x] 1.1 (P) profilesテーブルのスキーマ定義とマイグレーション
  - Drizzle ORMでprofilesテーブルのスキーマを定義（id, user_id, role, created_at）
  - roleフィールドにCHECK制約を設定（'user' | 'admin'のみ許可）
  - user_idフィールドにUNIQUE制約と外部キー制約（auth.users.id参照、ON DELETE CASCADE）
  - user_idにB-treeインデックスを作成
  - `pnpm db:generate`でマイグレーションファイル生成
  - `pnpm db:migrate`でマイグレーション実行
  - _Requirements: 8.5, 8.6_

- [x] 1.2 (P) ProfilesServiceの実装
  - lib/profiles/service.tsにProfilesServiceを実装
  - getProfileByUserId(userId: string)メソッドを実装し、Drizzle ORMで型安全なクエリを実行
  - Supabase createClientでサーバーサイドクライアントを作成
  - profileが存在しない場合はnullを返す
  - TypeScript型定義（Profile型）をエクスポート
  - _Requirements: 8.5, 8.6_

- [x] 1.3 管理者ユーザーのシードデータ作成
  - data/profiles-seed.csvを作成し、CSVフォーマット（user_id, role）で管理者ユーザーを定義
  - scripts/seed-profiles.tsを作成し、CSVを読み込んでprofilesテーブルに一括挿入
  - `node scripts/load-env.mjs scripts/seed-profiles.ts`で実行可能にする
  - エラーハンドリング（重複挿入、無効なuser_idなど）を実装
  - _Requirements: 8.5, 8.6_

### コンポーネント層

- [x] 2. SearchBarコンポーネントの実装
- [x] 2.1 (P) SearchBarコンポーネントの基本実装
  - components/layout/search-bar.tsxにClient Componentとして実装（"use client"）
  - shadcn/uiのSelect、Input、Buttonコンポーネントを活用
  - 検索種別の選択状態（searchType: 'name' | 'employeeNumber' | 'hireYear'）をReact stateで管理
  - 検索クエリの入力状態（query: string）をReact stateで管理
  - デフォルトで検索種別は「氏名」を選択
  - `<form>`タグでラップし、role="search"属性を設定
  - _Requirements: 3.1, 3.2, 3.3, 3.6, 4.1, 4.7, 14.2_

- [x] 2.2 (P) 検索実行ロジックの実装
  - 検索ボタンクリック時、Next.js useRouterで`/employees?type={検索種別}&q={検索クエリ}`へナビゲート
  - Enterキー押下時、検索ボタンと同じ処理を実行（form onSubmit）
  - クエリが空文字列の場合、`/employees`へナビゲート（クエリパラメータなし）
  - 検索種別に応じてtypeパラメータを設定（name, employeeNumber, hireYear）
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4_

- [x] 2.3 (P) SearchBarのレスポンシブデザインとアクセシビリティ
  - Tailwind CSSでモバイル画面対応（検索種別ドロップダウンと入力フィールドの幅調整）
  - 検索入力フィールドにaria-label="検索キーワード"を設定
  - 選択された検索種別に応じてプレースホルダーテキストを動的に変更
  - キーボードナビゲーション対応（Tab、Enter）
  - _Requirements: 3.4, 3.5, 4.2, 12.3, 14.3, 15.5_

- [x] 3. UserMenuコンポーネントの実装
- [x] 3.1 (P) UserMenuコンポーネントの基本実装
  - components/layout/user-menu.tsxにClient Componentとして実装（"use client"）
  - shadcn/uiのDropdownMenu、Avatarコンポーネントを活用
  - メニューの開閉状態（isOpen: boolean）をReact stateで管理
  - ローディング状態（isLoading: boolean）をReact stateで管理
  - propsとしてuserオブジェクト（Googleアバター画像URL含む）とisAdminフラグを受け取る
  - _Requirements: 6.4, 7.5, 7.6, 14.5_

- [x] 3.2 (P) Googleアバターアイコンの表示
  - user.user_metadata.avatar_urlをAvatarImage srcに設定
  - AvatarFallbackでイニシャル表示を実装（user.emailの最初の文字を大文字化）
  - 円形のアバター画像として表示
  - ホバー時の視覚的フィードバック（透明度変化）を実装
  - aria-label="ユーザーメニューを開く"を設定
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 14.4, 15.3_

- [x] 3.3 (P) ドロップダウンメニューの開閉とキーボード操作
  - ユーザーアイコンクリックでメニューを開閉
  - メニュー外クリックで自動的に閉じる（shadcn/ui DropdownMenu標準機能）
  - Escキー押下でメニューを閉じる
  - aria-haspopup="true"およびaria-expanded属性を設定
  - キーボードナビゲーション対応（Tab、Enter、Escape）
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 14.5, 14.6_

- [x] 3.4 (P) 権限に応じたメニュー項目の表示制御
  - isAdminフラグがtrueの場合、「社員追加」「部署編集」メニュー項目を表示
  - isAdminフラグがfalseの場合、「ログアウト」メニュー項目のみ表示
  - 全ユーザーに「ログアウト」メニュー項目を表示
  - DropdownMenuItemをクリック可能なリンクまたはボタンとして実装
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6_

- [x] 3.5 管理者メニューのナビゲーション実装
  - 「社員追加」クリック時、Next.js useRouterで`/employees/new`へナビゲート
  - 「部署編集」クリック時、Next.js useRouterで`/admin/departments`へナビゲート
  - メニュー項目クリック後、メニューを自動的に閉じる
  - _Requirements: 9.1, 9.2, 9.3, 10.1, 10.2, 10.3_

- [x] 3.6 ログアウト機能の実装
  - 「ログアウト」クリック時、Supabase AuthのsignOut()を実行
  - ログアウト処理中、isLoadingをtrueに設定しボタンを無効化
  - signOut()成功後、Next.js useRouterで`/login`へリダイレクト
  - signOut()失敗時、エラーメッセージを表示し再試行を促す
  - 非同期関数として実装し、エラーハンドリングを含める
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 4. PageHeaderコンポーネントの実装
- [ ] 4.1 PageHeaderコンポーネントの基本実装
  - components/layout/page-header.tsxにServer Componentとして実装
  - `<header>`タグでラップし、role="banner"属性を設定
  - サーバーサイドでgetUser()を実行し、認証済みユーザー情報を取得
  - サーバーサイドでProfilesService.getProfileByUserId()を実行し、権限情報を取得
  - profileが存在しない場合、isAdmin=falseとしてデフォルト権限で処理
  - _Requirements: 1.1, 1.2, 1.5, 6.2, 8.5, 8.6, 14.1, 15.1_

- [ ] 4.2 PageHeaderレイアウトの実装
  - 左側にロゴ/システム名、中央にSearchBar、右側にUserMenuの3要素を水平配置
  - ロゴ/システム名をNext.js Linkコンポーネントでラップし、href="/"を設定
  - ロゴ画像が存在しない場合、テキストベースのシステム名を表示
  - ホバー時の視覚的フィードバック（hover効果）を実装
  - shadcn/uiとTailwind CSS 4でスタイリング
  - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.3_

- [ ] 4.3 PageHeaderのレスポンシブデザイン実装
  - デスクトップ画面（幅768px以上）では、ロゴ・検索バー・ユーザーアイコンを水平一列に配置
  - モバイル画面（幅768px未満）では、検索バーを2行目に配置し、ロゴとユーザーアイコンを1行目に配置
  - Tailwind CSSのレスポンシブユーティリティクラス（sm:、md:、lg:）を使用
  - _Requirements: 12.1, 12.2, 12.4_

- [ ] 4.4 PageHeaderをapp/layout.tsxに統合
  - app/layout.tsx内でPageHeaderコンポーネントをインポート
  - children前にPageHeaderを配置し、全ページで共通表示
  - `/login`ルートでは条件分岐でPageHeaderを非表示にする
  - Next.js Linkコンポーネントのプリフェッチ機能を活用
  - _Requirements: 1.1, 1.2, 13.4, 15.4_

### テストタスク

- [ ] 5. ProfilesServiceのユニットテスト
- [ ] 5.1 (P) ProfilesServiceのテスト実装
  - lib/profiles/service.test.tsを作成
  - getProfileByUserId()が正しいprofileオブジェクトを返すことを検証
  - user_idが存在しない場合、nullを返すことを検証
  - Vitestでテストランナーを実行
  - モックデータを使用してDrizzle ORMクエリをテスト
  - _Requirements: 8.5, 8.6_

- [ ] 6. SearchBarコンポーネントのテスト
- [ ] 6.1 (P) SearchBarコンポーネントのテスト実装
  - components/layout/search-bar.test.tsxを作成
  - React Testing Libraryでコンポーネントテスト
  - 検索種別ドロップダウンがデフォルトで「氏名」を選択していることを検証
  - 検索実行時に`/employees?type=name&q=山田`へナビゲートすることを検証
  - 空クエリの場合、`/employees`へナビゲートすることを検証
  - Enterキー押下で検索が実行されることを検証
  - _Requirements: 3.2, 3.3, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3_

- [ ] 7. UserMenuコンポーネントのテスト
- [ ] 7.1 (P) UserMenuコンポーネントのテスト実装
  - components/layout/user-menu.test.tsxを作成
  - React Testing Libraryでコンポーネントテスト
  - ユーザーアイコンクリック時にメニューが開くことを検証
  - 管理者ユーザーの場合、「社員追加」「部署編集」メニューが表示されることを検証
  - 一般ユーザーの場合、「ログアウト」メニューのみ表示されることを検証
  - ログアウトクリック時にsignOut()が実行され、`/login`へリダイレクトすることを検証
  - Supabase AuthのsignOut()をモック化
  - _Requirements: 6.1, 6.3, 7.1, 7.2, 8.1, 8.2, 8.3, 8.4, 11.1, 11.2_

- [ ] 8. PageHeaderコンポーネントのテスト
- [ ] 8.1* PageHeaderコンポーネントの基本テスト実装
  - components/layout/page-header.test.tsxを作成
  - React Testing Libraryでコンポーネントテスト
  - PageHeaderコンポーネントが3要素（ロゴ、検索バー、ユーザーアイコン）を表示することを検証
  - ロゴクリック時に`/`へナビゲートすることを検証
  - getUser()とProfilesService.getProfileByUserId()をモック化
  - _Requirements: 1.1, 1.2, 1.3, 2.1_

## タスク進行の注意事項

### 依存関係
- タスク1（profilesテーブルとサービス層）は、タスク4.1（PageHeaderでの権限情報取得）の前提条件
- タスク2（SearchBar）とタスク3（UserMenu）は並行実装可能（(P)マーク）
- タスク4.4（app/layout.tsx統合）は、タスク2、3、4.1-4.3の完了後に実施

### テスト戦略
- ユニットテスト（タスク5）は対応する実装タスク（タスク1.2）の完了後に実施可能（(P)マーク）
- コンポーネントテスト（タスク6、7）は対応するコンポーネント実装（タスク2、3）の完了後に実施可能（(P)マーク）
- タスク8.1（PageHeaderテスト）はMVP後に実施可能なオプションテスト（`*`マーク）

### 並行実装のポイント
- (P)マークのあるタスクは、並行実装が可能
- ファイル競合を避けるため、異なるコンポーネント（SearchBar, UserMenu, ProfilesService）は並行開発可能
- 統合タスク（4.4）は全コンポーネントの実装完了を待つ必要がある

## 要件カバレッジ

全15要件をカバー:
- Requirement 1: タスク4.1, 4.2, 4.4, 8.1
- Requirement 2: タスク4.2, 8.1
- Requirement 3: タスク2.1, 2.3, 6.1
- Requirement 4: タスク2.1, 2.2, 2.3, 6.1
- Requirement 5: タスク2.2, 6.1
- Requirement 6: タスク3.2, 4.1, 7.1
- Requirement 7: タスク3.3, 7.1
- Requirement 8: タスク1.1, 1.2, 1.3, 3.4, 4.1, 5.1, 7.1
- Requirement 9: タスク3.5
- Requirement 10: タスク3.5
- Requirement 11: タスク3.6, 7.1
- Requirement 12: タスク2.3, 4.3
- Requirement 13: タスク4.4（ディレクトリ配置は実装時に自然に満たされる）
- Requirement 14: タスク2.1, 2.3, 3.2, 3.3, 4.1
- Requirement 15: タスク2.3, 3.2, 4.1, 4.4
