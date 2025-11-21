# 機能概要: 社員一覧画面

## 目的

検索条件（氏名 / 社員番号 / 入社年）および組織階層画面からの部署フィルタを用いて、社員を一覧表示する画面を提供する。

## 主要機能

### 1. 検索・フィルタリング機能
- **検索条件**:
  - 氏名（部分一致）
  - 社員番号（完全一致）
  - 入社年（範囲指定可能）
- **組織フィルタ**: 組織階層画面からのクエリパラメータ `org_id` によるフィルタリング

### 2. ソート機能
以下の項目で昇順・降順のソートが可能:
- 氏名（かな）
- 社員番号
- 入社年

### 3. 社員カード表示
1社員 = 1カード形式で表示:
- **表示項目**:
  - 写真
  - 氏名（漢字）
  - 社員番号
  - 携帯電話番号
  - メールアドレス
  - 所属一覧（会社 本部 部署 課 チーム（役職）形式）
- **複数所属**: 複数行で表示

### 4. 遷移
- カードクリックで `/employees/[employeeId]` （社員詳細画面）へ遷移

## 画面構成

### URL
`/employees`

### クエリパラメータ
- `org_id`: 組織IDによるフィルタ（組織階層画面からの遷移時）
- `name`: 氏名検索（ヘッダー検索バーから）
- `employee_number`: 社員番号検索
- `hire_year`: 入社年フィルタ
- `sort`: ソート項目（`name_kana`, `employee_number`, `hire_year`）
- `order`: ソート順（`asc`, `desc`）

## 既存機能との関連

- **組織階層画面** (`/`): 組織カードクリックで `org_id` パラメータ付きで遷移
- **共通ヘッダー**: 検索バーの検索実行により `/employees` へ遷移
- **社員詳細画面** (`/employees/[employeeId]`): 社員カードクリックで遷移

## データモデル

### Employees テーブル（想定）
- `id`: UUID (Primary Key)
- `employee_number`: 社員番号
- `name_kanji`: 氏名（漢字）
- `name_kana`: 氏名（かな）
- `photo_s3_key`: 写真のS3オブジェクトキー（例: `employees/photos/uuid-photo.jpg`）
- `mobile_phone`: 携帯電話番号
- `email`: メールアドレス
- `hire_date`: 入社日
- `created_at`, `updated_at`: タイムスタンプ

**Note**: 写真はAWS S3に保存し、`photo_s3_key`にはS3オブジェクトキーのみを保存。URL生成は`getS3Url()`ユーティリティで実行時に行う（`.kiro/steering/static-files.md`参照）。

### Employee_Organizations テーブル（想定）
社員と組織の多対多リレーション:
- `employee_id`: 社員ID (FK → Employees)
- `organization_id`: 組織ID (FK → Organizations)
- `position`: 役職（例: "課長"、"主任"、null可）
- `created_at`: 所属開始日時

## 技術スタック

- **フロントエンド**: Next.js 16 App Router, React 19, TypeScript
- **UI**: shadcn/ui, Tailwind CSS 4
- **データフェッチ**: Supabase + Drizzle ORM
- **状態管理**: Server Components + URL Search Params

## 成功基準

1. ✅ 検索条件に基づいて社員を一覧表示できる
2. ✅ 組織階層画面からのフィルタリングが機能する
3. ✅ ソート機能が正常に動作する
4. ✅ 社員カードが仕様通りに表示される
5. ✅ 複数所属が正しく表示される
6. ✅ 社員詳細画面への遷移が正常に動作する

---
**Phase**: Initialized
**Created**: 2025-01-21
**Language**: Japanese
