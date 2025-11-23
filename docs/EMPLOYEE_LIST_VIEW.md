# 社員一覧画面ドキュメント

## 概要

社員一覧画面（`/employees`）は、組織内の社員情報を検索・閲覧するための機能です。氏名、社員番号、入社年による検索、組織階層画面からの部署フィルタリング、ソート機能を提供します。

## 主な機能

### 1. 社員一覧表示

- Server Componentsによるサーバーサイドレンダリング
- カード形式での社員情報表示
- レスポンシブグリッドレイアウト（デスクトップ3列、タブレット2列、モバイル1列）

### 2. 検索機能

- **氏名検索**: 漢字またはかなで部分一致検索
- **社員番号検索**: 完全一致検索
- **入社年検索**: 指定年度の社員を検索

### 3. 組織フィルタ

- 組織階層画面から特定部署の社員のみを表示
- URL Search Params (`?org_id=uuid`)で組織IDを指定

### 4. ソート機能

- 氏名（かな）、社員番号、入社年でソート
- 昇順・降順の切り替え

### 5. 社員カード

各カードには以下の情報を表示:
- 写真（S3から取得、なければプレースホルダー）
- 氏名（漢字・かな）
- 社員番号
- 携帯電話番号
- メールアドレス
- 所属組織（複数所属対応）

### 6. 社員詳細への遷移

カードをクリックすると`/employees/[id]`へ遷移（将来実装）

## 技術スタック

| レイヤー | 技術 | 用途 |
|---------|------|------|
| Frontend | React 19 Server Components | サーバーサイドレンダリング |
| Frontend | Next.js 16 (App Router) | ルーティング・SSR |
| UI | shadcn/ui + Tailwind CSS 4 | UIコンポーネント・スタイリング |
| Data Layer | Drizzle ORM | タイプセーフなDB操作 |
| Database | PostgreSQL (Supabase) | データ永続化 |
| Storage | AWS S3 + CloudFront | 社員写真保管 |
| Auth | Supabase SSR + proxy.ts | 認証・セッション管理 |
| Testing | Vitest + React Testing Library | ユニット・コンポーネントテスト |

## アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│           Next.js 16 App Router                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  proxy.ts (認証チェック)                      │   │
│  └──────────────────┬───────────────────────────┘   │
│                     ▼                               │
│  ┌──────────────────────────────────────────────┐   │
│  │  /app/employees/page.tsx (RSC)               │   │
│  │  - Search Params解析                          │   │
│  │  - EmployeeService呼び出し                    │   │
│  │  - EmployeeCardList表示                       │   │
│  └──────────────────┬───────────────────────────┘   │
└────────────────────┼────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌──────────────────┐    ┌──────────────────┐
│ EmployeeService  │    │  S3 URL Utility  │
│ (lib/employees)  │    │  (lib/s3)        │
└────────┬─────────┘    └─────────┬────────┘
         │                        │
         ▼                        ▼
┌──────────────────┐    ┌──────────────────┐
│  Drizzle ORM     │    │    AWS S3        │
└────────┬─────────┘    └──────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  PostgreSQL (Supabase)           │
│  - employees                     │
│  - employee_organizations        │
│  - organizations                 │
└──────────────────────────────────┘
```

## データモデル

### Employees テーブル

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK | 社員ID |
| employee_number | TEXT | NOT NULL, UNIQUE | 社員番号 |
| name_kanji | TEXT | NOT NULL | 氏名（漢字） |
| name_kana | TEXT | NOT NULL | 氏名（かな） |
| photo_s3_key | TEXT | NULLABLE | 写真のS3オブジェクトキー |
| mobile_phone | TEXT | NULLABLE | 携帯電話番号 |
| email | TEXT | NOT NULL, UNIQUE | メールアドレス |
| hire_date | DATE | NOT NULL | 入社日 |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |

**インデックス**:
- `idx_employees_name_kana` (name_kana)
- `idx_employees_employee_number` (employee_number)
- `idx_employees_hire_date` (hire_date)

### Employee_Organizations テーブル

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| employee_id | UUID | PK, FK → employees.id | 社員ID |
| organization_id | UUID | PK, FK → organizations.id | 組織ID |
| position | TEXT | NULLABLE | 役職 |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |

**インデックス**:
- `idx_employee_organizations_employee_id` (employee_id)
- `idx_employee_organizations_organization_id` (organization_id)

**複合主キー**: `(employee_id, organization_id)`

**ON DELETE CASCADE**: 社員または組織が削除されると関連レコードも削除

## ファイル構成

```
.
├── app/
│   └── employees/
│       ├── page.tsx              # メインページ（RSC）
│       ├── loading.tsx           # ローディング状態
│       └── error.tsx             # エラーハンドリング
├── components/
│   ├── employee/
│   │   ├── employee-card.tsx            # 社員カード（RSC）
│   │   ├── employee-card.test.tsx       # カードテスト
│   │   ├── employee-card-list.tsx       # カード一覧（RSC）
│   │   ├── employee-card-list.test.tsx  # 一覧テスト
│   │   ├── search-form.tsx              # 検索フォーム（CC）
│   │   ├── search-form.test.tsx         # フォームテスト
│   │   ├── sort-controls.tsx            # ソートコントロール（CC）
│   │   └── sort-controls.test.tsx       # ソートテスト
│   └── web-vitals.tsx            # Web Vitals計測
├── lib/
│   ├── employees/
│   │   ├── service.ts            # データ取得サービス
│   │   └── service.test.ts       # サービステスト
│   └── s3/
│       ├── url.ts                # S3 URL生成
│       └── url.test.ts           # URLテスト
├── db/
│   └── schema.ts                 # Drizzleスキーマ定義
├── scripts/
│   ├── test-employee-performance.ts        # パフォーマンステスト
│   └── verify-employee-indexes.ts          # インデックス検証
├── docs/
│   ├── EMPLOYEE_LIST_VIEW.md     # この機能ドキュメント
│   ├── PERFORMANCE_TESTING.md    # パフォーマンステスト
│   ├── ACCESSIBILITY_AUDIT.md    # アクセシビリティ監査
│   └── SECURITY_REVIEW.md        # セキュリティレビュー
└── data/
    ├── employees-sample.csv              # サンプル社員データ
    ├── employee-organizations-sample.csv # サンプル所属データ
    └── README-import.md                  # データインポート手順
```

## 開発ワークフロー

### 1. セットアップ

```bash
# 依存パッケージのインストール
pnpm install

# 環境変数の設定
cp .env.example .env.local
# .env.localを編集してSupabase、AWS S3の情報を設定

# データベースマイグレーション
pnpm db:migrate

# サンプルデータのインポート（オプション）
# Drizzle Studioを使用
pnpm db:studio
```

### 2. 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで [http://localhost:3000/employees](http://localhost:3000/employees) を開く

### 3. テストの実行

```bash
# 全テスト実行
pnpm test:run

# カバレッジレポート
pnpm test:coverage

# パフォーマンステスト
node scripts/load-env.mjs scripts/test-employee-performance.ts
```

### 4. ビルド

```bash
pnpm build
```

## パフォーマンス要件

| 指標 | 目標値 | 確認方法 |
|------|--------|----------|
| FCP (First Contentful Paint) | 2秒以内 | Lighthouse, Web Vitals |
| データベースクエリ実行時間 | 500ms以内 | パフォーマンステストスクリプト |
| 写真読み込み | 遅延読み込み、最大6枚同時 | Chrome DevTools Network |

詳細は [PERFORMANCE_TESTING.md](PERFORMANCE_TESTING.md) を参照

## アクセシビリティ

### WCAG 2.1 Level AA 準拠

- キーボードナビゲーション対応
- スクリーンリーダー対応
- ARIA属性の適切な設定
- カラーコントラスト比の確保

### 主なアクセシビリティ機能

- `role="article"` による社員カードのセマンティクス
- `aria-label` による説明的なラベル
- `aria-sort` によるソート状態の通知
- `<label>` 要素による入力フィールドのラベリング
- フォーカスリング（`focus-within:ring-2`）

詳細は [ACCESSIBILITY_AUDIT.md](ACCESSIBILITY_AUDIT.md) を参照

## セキュリティ

### 主なセキュリティ対策

- **認証**: proxy.tsによる全ルート認証チェック
- **SQL Injection**: Drizzle ORMのパラメータ化クエリ
- **XSS**: React 19の自動エスケープ
- **CSRF**: Supabase SSRのCookie保護
- **データ保護**: HTTPS通信、個人情報の適切な取り扱い

詳細は [SECURITY_REVIEW.md](SECURITY_REVIEW.md) を参照

## トラブルシューティング

### 社員一覧が表示されない

1. 認証状態を確認（ログイン済みか）
2. データベースに社員データが存在するか確認
   ```sql
   SELECT COUNT(*) FROM employees;
   ```
3. ブラウザのコンソールでエラーを確認

### 写真が表示されない

1. S3バケットの設定を確認
   - バケット名とリージョンが環境変数に正しく設定されているか
   - バケットポリシーでパブリック読み取りが許可されているか
2. `photo_s3_key` の値が正しいか確認
3. Next.jsのImage設定でS3ドメインが許可されているか確認

### パフォーマンスが遅い

1. データベースインデックスが作成されているか確認
   ```bash
   node scripts/load-env.mjs scripts/verify-employee-indexes.ts
   ```
2. パフォーマンステストスクリプトで実行時間を計測
   ```bash
   node scripts/load-env.mjs scripts/test-employee-performance.ts
   ```
3. Lighthouseでパフォーマンススコアを確認

## 将来の拡張予定

- [ ] ページネーション（10,000人以上の社員データ対応）
- [ ] 詳細な権限管理（部門ごとのアクセス制御）
- [ ] 社員情報の編集機能
- [ ] 社員写真のアップロード機能
- [ ] CSV/Excelエクスポート機能
- [ ] 高度な検索（部署、役職、スキル等）
- [ ] 監査ログ機能
- [ ] リアルタイム更新（Supabase Realtime）

## 参考リンク

### 内部ドキュメント
- [パフォーマンステスト](PERFORMANCE_TESTING.md)
- [アクセシビリティ監査](ACCESSIBILITY_AUDIT.md)
- [セキュリティレビュー](SECURITY_REVIEW.md)
- [データインポート手順](../data/README-import.md)

### 外部ドキュメント
- [Next.js App Router](https://nextjs.org/docs/app)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [Drizzle ORM](https://orm.drizzle.team)
- [shadcn/ui](https://ui.shadcn.com)
- [Supabase](https://supabase.com/docs)
- [AWS S3](https://docs.aws.amazon.com/s3/)

---

**作成日**: 2025-01-22
**最終更新**: 2025-01-22
**バージョン**: 1.0.0
