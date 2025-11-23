# Requirements Document

## Project Description (Input)

2. 共通 UI 仕様(ヘッダー)

### 2.1 ページヘッダー(ログイン画面以外で共通表示)
/login 以外のすべての画面に共通表示されるヘッダー。
共通表示される画面例:トップ(部署一覧)、社員一覧、社員詳細、部署編集 など。

### 2.2 ヘッダー構成

#### 2.2.1 左側:ロゴ / システム名
クリックするとトップページ(/)へ遷移。

#### 2.2.2 中央:検索バー(全画面共通)
- 検索種別を選択できるドロップダウンを追加
  - 選択肢:
    - 氏名(デフォルト)
    - 社員番号
    - 入社年
- テキスト入力+検索ボタン
- 検索実行時の挙動:
  - /employees に遷移し、検索条件をクエリパラメータで渡す
  - 例:/employees?type=name&q=山田
- 検索内容の解釈:
  - 氏名:部分一致(漢字・カナ、姓末尾+名先頭またぎ一致OK)
  - 社員番号:完全一致
  - hireYear と一致した社員を抽出
  - ※ ソートは社員一覧画面で行う(検索バーでは行わない)

#### 2.2.3 右側:ログインユーザアイコン(Googleアカウント)
- Supabase Auth の Google アイコン(アバター)を表示。
- アイコンクリックで ユーザーメニュー を開閉。

### 2.3 ユーザーメニュー(アイコンクリックで開く)

#### 表示項目
- 社員追加(管理者のみ)
- 部署編集(管理者のみ)
- ログアウト(全ユーザー)

#### 各メニューの挙動
- 社員追加:社員新規作成用ページ(例:/employees/new)へ遷移
- 部署編集:部署編集ページ(/admin/departments)へ遷移
- ログアウト:Supabase Auth を signOut → /login へ遷移

## Introduction

本要件書は、peer-search-reアプリケーションにおける共通ページヘッダーコンポーネントの仕様を定義します。このヘッダーは `/login` を除く全ページで共通表示され、ナビゲーション、検索、ユーザーメニューの3つの主要機能を提供します。React Server Componentsを活用したNext.js 16 App Router環境で実装され、Supabase認証システムと統合されます。

## Requirements

### Requirement 1: ページヘッダーの共通表示
**Objective:** As a システムユーザー, I want すべてのページで一貫したヘッダーUIを表示したい, so that アプリケーション全体で統一された操作体験を得られる

#### Acceptance Criteria
1. The Page Header Component shall `/login` ルート以外のすべてのページで表示される
2. The Page Header Component shall トップページ(`/`)、社員一覧(`/employees`)、社員詳細(`/employees/:id`)、部署編集(`/admin/departments`)など、全認証済みルートで共通のレイアウトとして表示される
3. The Page Header Component shall 左側にロゴ/システム名、中央に検索バー、右側にユーザーアイコンの3要素を水平配置で表示する
4. The Page Header Component shall shadcn/uiコンポーネントとTailwind CSS 4を使用してスタイリングされる
5. The Page Header Component shall React Server Componentとして実装され、認証状態の取得はサーバーサイドで完結する

### Requirement 2: ロゴ/システム名によるホームナビゲーション
**Objective:** As a システムユーザー, I want ヘッダーのロゴをクリックしてトップページに戻りたい, so that どのページからでも簡単にホーム画面に戻れる

#### Acceptance Criteria
1. When ユーザーがヘッダー左側のロゴ/システム名をクリックする, the Page Header Component shall トップページ(`/`)へナビゲートする
2. The Page Header Component shall ロゴ/システム名を `<Link>` コンポーネントでラップし、視覚的にクリック可能であることを示す(hover効果を含む)
3. The Page Header Component shall ロゴ画像が存在しない場合、テキストベースのシステム名を表示する

### Requirement 3: 検索種別選択機能
**Objective:** As a システムユーザー, I want 検索バーで検索種別(氏名/社員番号/入社年)を選択したい, so that 目的に応じた検索方法を使い分けられる

#### Acceptance Criteria
1. The Search Bar Component shall 検索種別を選択するドロップダウンを検索入力欄の左側に表示する
2. The Search Bar Component shall ドロップダウンの選択肢として「氏名」「社員番号」「入社年」の3つを提供する
3. The Search Bar Component shall 初期状態で「氏名」がデフォルト選択された状態で表示される
4. When ユーザーがドロップダウンをクリックする, the Search Bar Component shall 選択可能な検索種別のリストを表示する
5. When ユーザーが検索種別を選択する, the Search Bar Component shall 選択された検索種別を視覚的に強調表示する
6. The Search Bar Component shall shadcn/uiの `<Select>` コンポーネントを使用してドロップダウンを実装する

### Requirement 4: 検索クエリ入力と実行
**Objective:** As a システムユーザー, I want 検索キーワードを入力して検索を実行したい, so that 目的の社員情報を迅速に見つけられる

#### Acceptance Criteria
1. The Search Bar Component shall テキスト入力フィールドと検索ボタンを水平配置で表示する
2. The Search Bar Component shall テキスト入力フィールドにプレースホルダーテキストを表示し、選択された検索種別に応じて適切なヒントを提示する
3. When ユーザーが検索ボタンをクリックする, the Search Bar Component shall `/employees?type={検索種別}&q={検索クエリ}` 形式のURLへナビゲートする
4. When ユーザーがテキスト入力フィールドでEnterキーを押す, the Search Bar Component shall 検索ボタンのクリックと同じ検索実行処理を行う
5. When 検索クエリが空文字列の状態で検索ボタンがクリックされる, the Search Bar Component shall クエリパラメータなしで `/employees` へナビゲートする
6. The Search Bar Component shall 検索実行時に選択された検索種別を `type` パラメータとして渡す(`name`、`employeeNumber`、`hireYear` のいずれか)
7. The Search Bar Component shall shadcn/uiの `<Input>` および `<Button>` コンポーネントを使用して実装される

### Requirement 5: 検索種別ごとの解釈ルール(仕様定義)
**Objective:** As a システムユーザー, I want 検索種別に応じた適切な検索ロジックが適用されることを理解したい, so that 期待通りの検索結果を得られる

#### Acceptance Criteria
1. The Search Bar Component shall 氏名検索(`type=name`)では部分一致検索を示すクエリパラメータを渡す
2. The Search Bar Component shall 社員番号検索(`type=employeeNumber`)では完全一致検索を示すクエリパラメータを渡す
3. The Search Bar Component shall 入社年検索(`type=hireYear`)では年度一致検索を示すクエリパラメータを渡す
4. The Search Bar Component shall 検索結果のソート処理は行わない(ソートは社員一覧画面の責務とする)

**Note:** 実際の検索ロジック(部分一致、完全一致、年度一致)の実装は `/employees` ページおよび社員サービス層の責務であり、ヘッダーコンポーネントはクエリパラメータの受け渡しのみを担当する

### Requirement 6: ユーザーアイコン表示と認証情報取得
**Objective:** As a 認証済みユーザー, I want 自分のGoogleアカウントアイコンがヘッダーに表示されることを確認したい, so that ログイン状態を視覚的に把握できる

#### Acceptance Criteria
1. The User Icon Component shall Supabase Authから取得したGoogleアカウントのアバターURLを表示する
2. The User Icon Component shall サーバーサイドで `getUser()` 関数を使用して認証済みユーザー情報を取得する
3. When Googleアバター画像の取得に失敗する, the User Icon Component shall デフォルトのユーザーアイコン画像またはイニシャル表示にフォールバックする
4. The User Icon Component shall 円形のアバター画像として表示し、shadcn/uiの `<Avatar>` コンポーネントを使用する
5. The User Icon Component shall アイコンにホバー時、視覚的なフィードバック(例:透明度変化)を提供する

### Requirement 7: ユーザーメニューの開閉
**Objective:** As a 認証済みユーザー, I want ユーザーアイコンをクリックしてメニューを開閉したい, so that ログアウトや管理機能にアクセスできる

#### Acceptance Criteria
1. When ユーザーがヘッダー右側のユーザーアイコンをクリックする, the User Menu Component shall ドロップダウンメニューを表示する
2. When ユーザーメニューが開いている状態でユーザーアイコンを再度クリックする, the User Menu Component shall メニューを閉じる
3. When ユーザーメニューが開いている状態でメニュー外の領域をクリックする, the User Menu Component shall メニューを閉じる
4. When ユーザーメニューが開いている状態でEscキーが押される, the User Menu Component shall メニューを閉じる
5. The User Menu Component shall shadcn/uiの `<DropdownMenu>` コンポーネントを使用して実装される
6. The User Menu Component shall Client Component (`"use client"`) として実装され、インタラクティブな開閉状態を管理する

### Requirement 8: ユーザーメニューの項目表示と権限制御
**Objective:** As a システムユーザー, I want 自分の権限に応じたメニュー項目のみを表示したい, so that 実行可能な操作のみが提示される

#### Acceptance Criteria
1. The User Menu Component shall 全ユーザーに対して「ログアウト」メニュー項目を表示する
2. When ログインユーザーが管理者権限を持つ, the User Menu Component shall 「社員追加」メニュー項目を表示する
3. When ログインユーザーが管理者権限を持つ, the User Menu Component shall 「部署編集」メニュー項目を表示する
4. When ログインユーザーが管理者権限を持たない, the User Menu Component shall 「社員追加」および「部署編集」メニュー項目を表示しない
5. The User Menu Component shall ユーザーの管理者権限をSupabase `profiles` テーブルの `role` フィールド(または同等のフィールド)から判定する
6. The User Menu Component shall 権限判定ロジックをサーバーサイドで実行し、結果をClient Componentにpropsとして渡す

### Requirement 9: 社員追加メニューの動作
**Objective:** As a 管理者ユーザー, I want 「社員追加」メニューをクリックして社員作成ページに遷移したい, so that 新規社員情報を登録できる

#### Acceptance Criteria
1. When 管理者が「社員追加」メニュー項目をクリックする, the User Menu Component shall `/employees/new` ページへナビゲートする
2. When 社員追加メニューがクリックされる, the User Menu Component shall ユーザーメニューを閉じる
3. The User Menu Component shall `<DropdownMenuItem>` をクリック可能なリンクまたはボタンとして実装する

### Requirement 10: 部署編集メニューの動作
**Objective:** As a 管理者ユーザー, I want 「部署編集」メニューをクリックして部署管理ページに遷移したい, so that 組織構造を編集できる

#### Acceptance Criteria
1. When 管理者が「部署編集」メニュー項目をクリックする, the User Menu Component shall `/admin/departments` ページへナビゲートする
2. When 部署編集メニューがクリックされる, the User Menu Component shall ユーザーメニューを閉じる
3. The User Menu Component shall `<DropdownMenuItem>` をクリック可能なリンクまたはボタンとして実装する

### Requirement 11: ログアウト機能
**Objective:** As a 認証済みユーザー, I want 「ログアウト」メニューをクリックしてセッションを終了したい, so that 安全にアプリケーションから離脱できる

#### Acceptance Criteria
1. When ユーザーが「ログアウト」メニュー項目をクリックする, the User Menu Component shall Supabase Authの `signOut()` メソッドを実行する
2. When `signOut()` が成功する, the User Menu Component shall ユーザーを `/login` ページへリダイレクトする
3. If `signOut()` が失敗する, then the User Menu Component shall エラーメッセージを表示し、ユーザーに再試行を促す
4. The User Menu Component shall ログアウト処理中、ローディング状態を視覚的に表示する(例:スピナー、ボタンの無効化)
5. The User Menu Component shall ログアウト処理はClient Component内で非同期関数として実装される

### Requirement 12: レスポンシブデザイン対応
**Objective:** As a モバイルデバイスユーザー, I want ヘッダーが画面サイズに応じて適切にレイアウト調整されることを確認したい, so that 小画面でも快適に操作できる

#### Acceptance Criteria
1. The Page Header Component shall デスクトップ画面(幅768px以上)では、ロゴ・検索バー・ユーザーアイコンを水平一列に配置する
2. The Page Header Component shall モバイル画面(幅768px未満)では、検索バーを2行目に配置し、ロゴとユーザーアイコンを1行目に配置する
3. The Search Bar Component shall モバイル画面では、検索種別ドロップダウンとテキスト入力フィールドの幅を画面幅に応じて調整する
4. The Page Header Component shall Tailwind CSSのレスポンシブユーティリティクラス(`sm:`、`md:`、`lg:`)を使用してレイアウトを制御する

### Requirement 13: コンポーネント構成とディレクトリ配置
**Objective:** As a 開発者, I want ヘッダーコンポーネントがプロジェクト構造規約に従って実装されることを確認したい, so that 保守性と一貫性が保たれる

#### Acceptance Criteria
1. The Page Header Component shall `/components/layout/page-header.tsx` に配置される(または同等の機能別ディレクトリ)
2. The Search Bar Component shall `/components/layout/search-bar.tsx` または `/components/search/search-bar.tsx` に分離される
3. The User Menu Component shall `/components/layout/user-menu.tsx` または `/components/auth/user-menu.tsx` に分離される
4. The Page Header Component shall Root Layout (`/app/layout.tsx`) 内で使用され、全ページで共通表示される
5. The Page Header Component shall テストファイル(`page-header.test.tsx`)を同じディレクトリにコロケーションする
6. The Page Header Component shall TypeScript strictモードに準拠し、型安全性を確保する

### Requirement 14: アクセシビリティ対応
**Objective:** As a スクリーンリーダーユーザー, I want ヘッダーの各要素が適切なARIA属性とセマンティックHTMLでマークアップされていることを確認したい, so that 支援技術を通じて操作できる

#### Acceptance Criteria
1. The Page Header Component shall `<header>` タグでラップし、`role="banner"` 属性を持つ
2. The Search Bar Component shall `<form>` タグでラップし、`role="search"` 属性を持つ
3. The Search Bar Component shall 検索入力フィールドに `aria-label="検索キーワード"` を設定する
4. The User Icon Component shall `aria-label="ユーザーメニューを開く"` を設定する
5. The User Menu Component shall `aria-haspopup="true"` および `aria-expanded` 属性でメニューの開閉状態を示す
6. The Page Header Component shall キーボードナビゲーション(Tab、Enter、Escape)で全操作が実行可能である

### Requirement 15: パフォーマンス最適化
**Objective:** As a エンドユーザー, I want ヘッダーコンポーネントが高速に表示され、ページ遷移に影響しないことを確認したい, so that スムーズな操作体験を得られる

#### Acceptance Criteria
1. The Page Header Component shall Server Componentとして実装され、初期HTMLにレンダリングされる
2. The User Menu Component shall Client Component部分を最小限に抑え、インタラクション部分のみをクライアントサイドで実行する
3. The User Icon Component shall Googleアバター画像に `loading="lazy"` 属性を設定する
4. The Page Header Component shall Next.jsの `<Link>` コンポーネントを使用し、プリフェッチによる高速なページ遷移を実現する
5. The Search Bar Component shall 検索実行時、不要な状態管理やリレンダリングを避ける

