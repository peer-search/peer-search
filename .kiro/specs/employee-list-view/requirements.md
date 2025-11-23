# 要件定義書: 社員一覧画面

## 導入

### 概要
社員一覧画面（`/employees`）は、組織内の社員情報を検索・閲覧するための画面です。氏名、社員番号、入社年による検索機能、組織階層画面からの部署フィルタリング、およびソート機能を提供します。

### 目的
- 社員情報の効率的な検索と閲覧を実現する
- 組織階層画面との連携により、部署単位での社員確認を可能にする
- 複数所属を持つ社員の情報を適切に表示する
- 社員詳細画面へのシームレスな遷移を提供する

### スコープ
- **対象機能**: 社員一覧表示、検索、フィルタリング、ソート、社員カード表示
- **対象外**: 社員情報の編集、写真アップロード（別機能として実装）

### ユーザーストーリー
- **社員として**: 組織内の他の社員を氏名や社員番号で検索し、連絡先情報を確認したい
- **管理者として**: 特定の部署に所属する社員を一覧し、組織構成を把握したい
- **人事担当として**: 入社年でフィルタリングし、特定年度の新入社員を確認したい

---

## 要件

### 要件1: 社員一覧表示機能

**目的**: ユーザーとして、社員を一覧形式で表示し、基本情報を確認できるようにする

#### 受入基準
1. When ユーザーが`/employees`にアクセスした場合、The 社員一覧画面 shall 全社員をカード形式で表示する
2. When 社員データが存在しない場合、The 社員一覧画面 shall "社員が見つかりませんでした"メッセージを表示する
3. While データ取得中、The 社員一覧画面 shall ローディングインジケーターを表示する
4. The 社員一覧画面 shall 1社員につき1枚のカードを表示する（employeeId単位で集約）
5. The 社員一覧画面 shall Server Componentsを使用してサーバーサイドでデータをフェッチする

---

### 要件2: 社員カード表示機能

**目的**: ユーザーとして、社員の基本情報を視覚的に分かりやすく表示する

#### 受入基準
1. The 社員カード shall 以下の情報を表示する:
   - 写真（S3から取得）
   - 氏名（漢字）
   - 社員番号
   - 携帯電話番号
   - メールアドレス
   - 所属一覧（会社 本部 部署 課 チーム（役職）形式）
2. When 社員が複数の組織に所属している場合、The 社員カード shall 所属情報を複数行で表示する
3. When 社員の写真が存在しない場合、The 社員カード shall デフォルトのプレースホルダー画像を表示する
4. The 社員カード shall shadcn/ui Cardコンポーネントを使用して実装する
5. When 社員カードにホバーした場合、The 社員カード shall 視覚的なフィードバック（影の拡大等）を提供する
6. The 社員カード shall クリック可能なインタラクティブ要素として実装する

---

### 要件3: 検索機能

**目的**: ユーザーとして、特定の条件で社員を検索し、必要な社員情報を素早く見つける

#### 受入基準
1. When ユーザーが氏名で検索した場合、The 社員一覧画面 shall 氏名（漢字またはかな）に部分一致する社員を表示する
2. When ユーザーが社員番号で検索した場合、The 社員一覧画面 shall 完全一致する社員を表示する
3. When ユーザーが入社年で検索した場合、The 社員一覧画面 shall 指定された年に入社した社員を表示する
4. When 検索条件に一致する社員が存在しない場合、The 社員一覧画面 shall "検索条件に一致する社員が見つかりませんでした"メッセージを表示する
5. The 検索機能 shall URL Search Paramsを使用して検索状態を管理する（`name`, `employee_number`, `hire_year`）
6. When ユーザーが共通ヘッダーの検索バーから検索した場合、The 社員一覧画面 shall `/employees?name={検索語}`へ遷移する

---

### 要件4: 組織フィルタ機能

**目的**: ユーザーとして、特定の組織に所属する社員のみを絞り込んで表示する

#### 受入基準
1. When 組織階層画面から`org_id`パラメータ付きで遷移した場合、The 社員一覧画面 shall 指定された組織に所属する社員のみを表示する
2. When 組織フィルタが適用されている場合、The 社員一覧画面 shall フィルタ適用中であることを視覚的に示す（例: "〇〇部署の社員"）
3. The 組織フィルタ shall Employee_Organizationsテーブルを使用して多対多リレーションから社員を取得する
4. When 指定された組織に所属する社員が存在しない場合、The 社員一覧画面 shall "この組織に所属する社員が見つかりませんでした"メッセージを表示する

---

### 要件5: ソート機能

**目的**: ユーザーとして、社員一覧を任意の項目で昇順・降順にソートして表示する

#### 受入基準
1. The 社員一覧画面 shall 以下の項目でソートできる:
   - 氏名（かな）
   - 社員番号
   - 入社年
2. When ユーザーがソート項目を選択した場合、The 社員一覧画面 shall 選択された項目で昇順にソートする
3. When ユーザーが同じソート項目を再度選択した場合、The 社員一覧画面 shall ソート順を降順に切り替える
4. The ソート機能 shall URL Search Paramsを使用してソート状態を管理する（`sort`, `order`）
5. When ソートが適用されている場合、The 社員一覧画面 shall 現在のソート項目と順序を視覚的に示す

---

### 要件6: 社員詳細画面への遷移

**目的**: ユーザーとして、社員カードをクリックして詳細情報を確認する

#### 受入基準
1. When ユーザーが社員カードをクリックした場合、The アプリケーション shall `/employees/[employeeId]`へ遷移する
2. The 社員カード shall Next.js Linkコンポーネントを使用してクライアントサイドナビゲーションを実現する
3. The 社員カード shall キーボード操作（Enterキー）でも遷移可能にする
4. The 社員カード shall ARIA属性を適切に設定してアクセシビリティを確保する

---

### 要件7: データモデル（Employees テーブル）

**目的**: システムとして、社員情報を適切に格納・管理する

#### 受入基準
1. The Employeesテーブル shall 以下のカラムを持つ:
   - `id` (UUID, Primary Key)
   - `employee_number` (Text, NOT NULL, UNIQUE) - 社員番号
   - `name_kanji` (Text, NOT NULL) - 氏名（漢字）
   - `name_kana` (Text, NOT NULL) - 氏名（かな）
   - `photo_s3_key` (Text, NULLABLE) - 写真のS3オブジェクトキー
   - `mobile_phone` (Text, NULLABLE) - 携帯電話番号
   - `email` (Text, NOT NULL, UNIQUE) - メールアドレス
   - `hire_date` (Date, NOT NULL) - 入社日
   - `created_at` (Timestamp, NOT NULL, DEFAULT NOW())
   - `updated_at` (Timestamp, NOT NULL, DEFAULT NOW())
2. The Employeesテーブル shall `name_kana` にインデックスを作成し、検索パフォーマンスを最適化する
3. The Employeesテーブル shall `employee_number` にユニーク制約を設定する
4. The Employeesテーブル shall `email` にユニーク制約を設定する
5. The Employeesテーブル shall Drizzle ORMでスキーマを定義し、TypeScript型を自動生成する

---

### 要件8: データモデル（Employee_Organizations テーブル）

**目的**: システムとして、社員と組織の多対多リレーションを管理する

#### 受入基準
1. The Employee_Organizationsテーブル shall 以下のカラムを持つ:
   - `employee_id` (UUID, NOT NULL, FK → Employees.id)
   - `organization_id` (UUID, NOT NULL, FK → Organizations.id)
   - `position` (Text, NULLABLE) - 役職（例: "課長"、"主任"）
   - `created_at` (Timestamp, NOT NULL, DEFAULT NOW())
2. The Employee_Organizationsテーブル shall `(employee_id, organization_id)` の組み合わせをPrimary Keyとする
3. The Employee_Organizationsテーブル shall `employee_id` にインデックスを作成する
4. The Employee_Organizationsテーブル shall `organization_id` にインデックスを作成する
5. When Employeesレコードが削除された場合、The データベース shall 関連するEmployee_Organizationsレコードを CASCADE削除する
6. When Organizationsレコードが削除された場合、The データベース shall 関連するEmployee_Organizationsレコードを CASCADE削除する

---

### 要件9: 写真表示機能（S3統合）

**目的**: システムとして、社員の写真をAWS S3から効率的に取得・表示する

#### 受入基準
1. The 写真表示機能 shall S3オブジェクトキー（`photo_s3_key`）からURLを生成する`getS3Url()`ユーティリティを使用する
2. The 写真表示機能 shall Next.js Imageコンポーネントを使用して画像を最適化する
3. When CloudFront環境変数が設定されている場合、The 写真表示機能 shall CloudFront URLを生成する
4. When CloudFront環境変数が未設定の場合、The 写真表示機能 shall S3直接URLを生成する
5. If 写真の読み込みに失敗した場合、The 写真表示機能 shall デフォルトのプレースホルダー画像を表示する
6. The 写真表示機能 shall 遅延読み込み（lazy loading）を実装し、パフォーマンスを最適化する

---

### 要件10: レスポンシブデザイン

**目的**: ユーザーとして、デスクトップ・タブレット・モバイルのあらゆるデバイスで快適に利用する

#### 受入基準
1. The 社員一覧画面 shall デスクトップ（1024px以上）で3カラムのグリッドレイアウトを使用する
2. The 社員一覧画面 shall タブレット（768px〜1023px）で2カラムのグリッドレイアウトを使用する
3. The 社員一覧画面 shall モバイル（767px以下）で1カラムのレイアウトを使用する
4. The 社員カード shall すべてのデバイスで読みやすいフォントサイズとスペーシングを維持する
5. The 検索フィルタUI shall モバイルでは折りたたみ可能なドロワーまたはモーダルとして表示する

---

### 要件11: パフォーマンス要件

**目的**: システムとして、高速なレスポンスと優れたユーザー体験を提供する

#### 受入基準
1. The 社員一覧画面 shall 初回ページロード時にFCP（First Contentful Paint）を2秒以内に達成する
2. The 社員一覧画面 shall データベースクエリの実行時間を500ms以内に抑える
3. When 1000人以上の社員データが存在する場合、The 社員一覧画面 shall ページネーションまたは仮想スクロールを実装する（将来拡張）
4. The 社員一覧画面 shall React Server Componentsを使用してクライアントバンドルサイズを最小化する
5. The 写真読み込み shall 並列で最大6枚まで同時読み込みし、その後はキューイングする

---

### 要件12: アクセシビリティ

**目的**: システムとして、すべてのユーザーが社員一覧画面を利用できるようにする

#### 受入基準
1. The 社員カード shall `role="button"` または適切なARIA属性を設定する
2. The 社員カード shall `aria-label` で社員名を含む説明的なラベルを提供する
3. The ソートボタン shall `aria-sort` 属性で現在のソート状態を示す
4. The 検索フォーム shall `<label>` 要素で各入力フィールドにラベルを付ける
5. The 社員一覧画面 shall キーボード操作のみで全機能にアクセス可能にする
6. The 社員一覧画面 shall WCAG 2.1 Level AA基準のカラーコントラスト比を満たす

---

### 要件13: エラーハンドリング

**目的**: システムとして、エラー発生時に適切なフィードバックを提供する

#### 受入基準
1. If データベース接続エラーが発生した場合、The 社員一覧画面 shall "データの取得に失敗しました。しばらくしてから再度お試しください"メッセージを表示する
2. If 認証エラーが発生した場合、The アプリケーション shall 自動的にログイン画面へリダイレクトする
3. If 存在しない組織IDでフィルタした場合、The 社員一覧画面 shall "指定された組織が見つかりませんでした"メッセージを表示する
4. If ネットワークエラーが発生した場合、The 社員一覧画面 shall リトライボタンを含むエラーメッセージを表示する
5. The エラーメッセージ shall Next.js error.tsxを使用してユーザーフレンドリーなUIで表示する

---

### 要件14: セキュリティ

**目的**: システムとして、社員情報へのアクセスを適切に制御する

#### 受入基準
1. The 社員一覧画面 shall 認証済みユーザーのみがアクセスできるように制御する
2. The アプリケーション shall `proxy.ts`（Next.js 16）で全リクエストの認証状態を検証する
3. The 社員一覧画面 shall `getUser()`を使用してサーバーサイドで認証情報を取得する
4. The データベースクエリ shall SQLインジェクション攻撃を防ぐため、Drizzle ORMのパラメータ化クエリを使用する
5. If 未認証ユーザーがアクセスした場合、The アプリケーション shall ログイン画面へリダイレクトする

---

### 要件15: テスト可能性

**目的**: 開発チームとして、機能の正確性を自動テストで検証する

#### 受入基準
1. The 社員カードコンポーネント shall Vitestを使用したユニットテストを持つ
2. The 社員カードコンポーネント shall React Testing Libraryを使用したコンポーネントテストを持つ
3. The データ取得ロジック shall モック可能な形で分離する
4. The ビジネスロジック（フィルタ、ソート） shall 純粋関数として実装し、ユニットテストでカバーする
5. The テスト shall テストファイルをコンポーネントと同じディレクトリに`.test.tsx`として配置する

---

## 非機能要件

### パフォーマンス
- **応答時間**: ページロード2秒以内、データベースクエリ500ms以内
- **スケーラビリティ**: 10,000人の社員データまで対応（ページネーション導入で拡張可能）
- **並行処理**: 100同時リクエストまで対応

### 互換性
- **ブラウザ**: Chrome、Firefox、Safari、Edge（最新2バージョン）
- **モバイル**: iOS 15+、Android 11+
- **画面サイズ**: 320px〜4K解像度まで対応

### 保守性
- **コード品質**: TypeScript strict mode、Biome linter、80%以上のテストカバレッジ
- **ドキュメント**: 各コンポーネントにJSDocコメント、README更新
- **依存関係**: プロジェクトの既存パターン（steering documents）に準拠

### セキュリティ
- **認証**: Supabase認証必須、セッション有効期限24時間
- **データ保護**: HTTPS通信、個人情報の適切な取り扱い
- **監査ログ**: （将来拡張）アクセスログの記録

---

## 用語集

- **社員カード**: 1人の社員の基本情報を表示するUIコンポーネント
- **組織階層画面**: 会社・本部・部署・課/チームの4階層構造を表示する画面（既存機能）
- **S3オブジェクトキー**: AWS S3上のファイルを一意に識別するパス（例: `employees/photos/uuid.jpg`）
- **Server Components**: Next.js 16/React 19のサーバーサイドレンダリングコンポーネント
- **EARS**: Easy Approach to Requirements Syntax（要件記述フォーマット）
- **Drizzle ORM**: TypeScript-firstなPostgreSQL ORM
- **shadcn/ui**: Tailwind CSSベースのUIコンポーネントライブラリ

---

## 依存関係

### 既存機能
- **組織階層画面** (`organization-hierarchy-view`): 組織カードから社員一覧へ遷移
- **共通ヘッダー**: 検索バーから社員一覧へ遷移
- **認証システム**: Supabase + `proxy.ts` による認証制御

### 新規作成が必要なもの
- Employeesテーブル（データベーススキーマ）
- Employee_Organizationsテーブル（データベーススキーマ）
- 社員データ取得RPC関数またはDrizzleクエリ
- S3統合ユーティリティ（`lib/s3/url.ts`） - 既存パターンに準拠
- 社員カードコンポーネント
- 社員一覧ページ（`/app/employees/page.tsx`）

### ブロッカー
なし（すべての依存技術が既に導入済み）

---

**Phase**: Requirements Generated
**Created**: 2025-01-21
**Language**: Japanese
