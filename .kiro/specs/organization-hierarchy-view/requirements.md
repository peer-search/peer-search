# Requirements Document

## Project Description (Input)
画面A：部署一覧画面（トップページ /）
目的
組織階層（会社 → 本部 → 部署 → 課／チーム）をカード内包レイアウトで視覚的に表示
特定のノードをクリックして社員一覧（画面B）へ遷移
カード内包レイアウト表示
会社 → 本部 → 部署 → 課／チームの階層をカードで表現
画面Aには 社員カードは表示しない
ノードクリック挙動
クリックした階層に所属する社員のみを社員一覧で表示
遷移後、カード内では全所属（affiliations）表示

**注記**: ヘッダー検索機能は本仕様の範囲外とする

## Introduction
本仕様は、組織階層（会社 → 本部 → 部署 → 課／チーム）を視覚的に表示し、各階層ノードから社員一覧画面へ遷移可能なトップページ画面を定義します。カード内包レイアウトにより直感的な組織構造の把握を実現します。

## Requirements

### Requirement 1: ページルーティングと基本構造
**Objective:** As a ユーザー, I want トップページ（`/`）にアクセスする, so that 組織階層を一覧表示できる

#### Acceptance Criteria
1. The Organization Hierarchy Page shall トップページルート（`/`）にマウントされる
2. The Organization Hierarchy Page shall Next.js App Routerの`/app/page.tsx`として実装される
3. The Organization Hierarchy Page shall React Server Componentとして実装され、初期データをサーバーサイドで取得する

### Requirement 2: 組織階層データの取得と表示
**Objective:** As a ユーザー, I want 会社・本部・部署・課／チームの4階層構造を視覚的に確認する, so that 組織全体の構造を把握できる

#### Acceptance Criteria
1. When ページが読み込まれた, the Organization Hierarchy Page shall Supabaseから組織階層データ（会社、本部、部署、課／チーム）を取得する
2. The Organization Hierarchy Page shall Drizzle ORMを使用してタイプセーフに組織データを取得する
3. The Organization Hierarchy Page shall 階層データを親子関係（会社 → 本部 → 部署 → 課／チーム）に基づいてツリー構造に変換する
4. The Organization Hierarchy Page shall 階層データにはノードID、ノード名、親ノードID、階層レベルを含む
5. If 組織データの取得に失敗した, then the Organization Hierarchy Page shall エラー状態を表示し、ユーザーにエラーメッセージを提示する

### Requirement 3: カード内包レイアウトの実装
**Objective:** As a ユーザー, I want 組織階層をカード形式で入れ子構造として表示する, so that 階層関係を直感的に理解できる

#### Acceptance Criteria
1. The Organization Hierarchy Page shall shadcn/uiの`Card`コンポーネントを使用して各階層ノードを表示する
2. The Organization Hierarchy Page shall 会社カード内に本部カード、本部カード内に部署カード、部署カード内に課／チームカードを内包する形式でレイアウトする
3. The Organization Hierarchy Page shall 各カードには階層ノード名を表示する
4. The Organization Hierarchy Page shall 各カードはクリック可能なインタラクティブ要素として実装する
5. The Organization Hierarchy Page shall Tailwind CSS 4を使用してレスポンシブなカードレイアウトを実装する
6. The Organization Hierarchy Page shall 社員カードを表示しない（組織階層ノードのみ表示）

### Requirement 4: 階層ノードクリック挙動
**Objective:** As a ユーザー, I want 特定の階層ノード（会社・本部・部署・課／チーム）をクリックする, so that その階層に所属する社員一覧を表示できる

#### Acceptance Criteria
1. When ユーザーが階層ノードカードをクリックした, the Organization Hierarchy Page shall `/employees?org_id={node_id}`にクエリパラメータ付きで遷移する
2. The Organization Hierarchy Page shall クリックされたノードのIDを`org_id`パラメータとしてURLに含める
3. The Organization Hierarchy Page shall Next.js App Routerの`useRouter`または`<Link>`コンポーネントを使用してクライアントサイドルーティングを実行する
4. The Organization Hierarchy Page shall 遷移先（`/employees`）では、`org_id`に基づいて該当階層に所属する社員のみをフィルタリング表示する
5. The Organization Hierarchy Page shall 遷移先の社員カードでは、各社員の全所属（affiliations）を表示する

### Requirement 5: UIインタラクションとアクセシビリティ
**Objective:** As a ユーザー, I want 視覚的フィードバックとキーボードアクセシビリティを提供される, so that 快適かつアクセシブルに操作できる

#### Acceptance Criteria
1. When ユーザーがカードにホバーした, the Organization Hierarchy Page shall ホバー状態のスタイル（背景色変化、影の強調など）を適用する
2. When ユーザーがカードにフォーカスした, the Organization Hierarchy Page shall フォーカス状態のアウトラインを表示する
3. The Organization Hierarchy Page shall 各カードに適切なARIA属性（`role="button"`, `aria-label`）を付与する
4. The Organization Hierarchy Page shall キーボード操作（Tabキーでのフォーカス移動、Enterキーでのクリック）をサポートする

### Requirement 6: データモデルとデータベーススキーマ
**Objective:** As a 開発者, I want 組織階層データを効率的に取得・管理する, so that パフォーマンスとメンテナンス性を確保できる

#### Acceptance Criteria
1. The Organization Hierarchy Page shall Drizzleスキーマで組織階層テーブル（例: `organizations`）を定義する
2. The Organization Hierarchy Page shall 組織階層テーブルには以下のカラムを含む：`id` (UUID), `name` (text), `parent_id` (UUID, nullable), `level` (integer), `created_at` (timestamp)
3. The Organization Hierarchy Page shall `parent_id`で親子関係を表現し、`level`で階層レベル（1:会社、2:本部、3:部署、4:課／チーム）を区別する
4. The Organization Hierarchy Page shall 再帰的なクエリまたは階層的なJOINを使用して、全階層データを一度に取得する
5. The Organization Hierarchy Page shall 取得したデータをキャッシュ可能な形式で保持する（Next.js Server Componentsのキャッシング機能を活用）

### Requirement 7: エラーハンドリングとローディング状態
**Objective:** As a ユーザー, I want データ取得中やエラー時に適切なフィードバックを受け取る, so that システムの状態を理解できる

#### Acceptance Criteria
1. While 組織階層データを取得中, the Organization Hierarchy Page shall ローディングインジケーター（スピナーまたはスケルトンUI）を表示する
2. If 組織階層データの取得に失敗した, then the Organization Hierarchy Page shall エラーメッセージ「データの取得に失敗しました。再読み込みしてください。」を表示する
3. The Organization Hierarchy Page shall Next.jsの`loading.tsx`と`error.tsx`を使用してローディング・エラー状態を管理する
4. If 組織階層データが空（階層が存在しない）, then the Organization Hierarchy Page shall 「組織データがありません」のメッセージを表示する

### Requirement 8: レスポンシブデザイン
**Objective:** As a ユーザー, I want モバイル・タブレット・デスクトップで適切にレイアウトされた画面を利用する, so that デバイスに関わらず快適に閲覧できる

#### Acceptance Criteria
1. The Organization Hierarchy Page shall Tailwind CSSのレスポンシブユーティリティ（`sm:`, `md:`, `lg:`）を使用して画面幅に応じたレイアウトを実装する
2. While 画面幅がモバイルサイズ（< 640px）, the Organization Hierarchy Page shall カードを縦方向に積み重ねて表示する
3. While 画面幅がタブレットサイズ（640px - 1024px）, the Organization Hierarchy Page shall カードを2カラムグリッドで表示する
4. While 画面幅がデスクトップサイズ（>= 1024px）, the Organization Hierarchy Page shall カードを3カラム以上のグリッドで表示する

### Requirement 9: パフォーマンスとSEO
**Objective:** As a 開発者, I want 初期表示を高速化し、SEOを最適化する, so that ユーザー体験と検索エンジン評価を向上させる

#### Acceptance Criteria
1. The Organization Hierarchy Page shall React Server Componentsを使用してサーバーサイドで組織階層データを取得する
2. The Organization Hierarchy Page shall 初期HTMLに組織階層データを含めてレンダリングする（SSR）
3. The Organization Hierarchy Page shall ページメタデータ（`<title>`, `<meta name="description">`）を適切に設定する
4. The Organization Hierarchy Page shall Next.jsの`metadata` APIを使用してSEOメタデータを定義する
5. The Organization Hierarchy Page shall 画像アセット（会社ロゴなど、オプション）にはNext.js `<Image>`コンポーネントを使用して最適化する

