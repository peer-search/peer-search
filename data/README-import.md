# サンプルデータインポート手順

## 前提条件

- マイグレーション `0001_furry_doctor_faustus.sql` が実行済み
- `employees` テーブルと `employee_organizations` テーブルが作成済み
- Supabase ダッシュボードにアクセス可能

## インポート手順

### 1. Employees テーブルのインポート

1. Supabase ダッシュボードにログイン
2. プロジェクトを選択
3. 左メニューから「Table Editor」を選択
4. `employees` テーブルを選択
5. 「Insert」→「Import data via CSV」を選択
6. `data/employees-sample.csv` をアップロード
7. カラムマッピングを確認:
   - `employee_number` → `employee_number`
   - `name_kanji` → `name_kanji`
   - `name_kana` → `name_kana`
   - `email` → `email`
   - `hire_date` → `hire_date` (日付形式: YYYY-MM-DD)
   - `mobile_phone` → `mobile_phone` (NULL許容)
   - `photo_s3_key` → `photo_s3_key` (NULL許容、空欄の場合はNULL)
8. `id`, `created_at`, `updated_at` は自動生成されるため、マッピング不要
9. 「Import」をクリック

### 2. Employee_Organizations テーブルのインポート

**重要**: このCSVファイルは、実際の `employee_id` と `organization_id` (UUID) に置き換える必要があります。

#### 手順

1. Supabase ダッシュボードで `employees` テーブルを開く
2. インポートした社員の `id` (UUID) をコピー
3. `data/employee-organizations-sample.csv` を編集:
   - `[employee_id_for_E001]` → 山田太郎の実際のUUID
   - `[employee_id_for_E002]` → 佐藤花子の実際のUUID
   - 以下同様...
4. `organizations` テーブルを開き、既存の組織の `id` をコピー
5. `[organization_id_1]`, `[organization_id_2]`, `[organization_id_3]` を実際のUUIDに置き換え
6. 編集したCSVファイルを保存
7. Supabase ダッシュボードで `employee_organizations` テーブルを選択
8. 「Insert」→「Import data via CSV」を選択
9. 編集した CSV をアップロード
10. カラムマッピングを確認:
    - `employee_id` → `employee_id`
    - `organization_id` → `organization_id`
    - `position` → `position` (NULL許容)
11. `created_at` は自動生成されるため、マッピング不要
12. 「Import」をクリック

### 3. データ整合性確認

インポート後、以下のSQLで確認:

```sql
-- 社員数確認
SELECT COUNT(*) FROM employees;
-- 期待値: 10件

-- 所属関係確認
SELECT COUNT(*) FROM employee_organizations;
-- 期待値: 11件

-- 複数所属の社員確認（山田太郎）
SELECT
  e.name_kanji,
  o.name AS organization_name,
  eo.position
FROM employees e
LEFT JOIN employee_organizations eo ON e.id = eo.employee_id
LEFT JOIN organizations o ON eo.organization_id = o.id
WHERE e.employee_number = 'E001';
-- 期待値: 2行（2つの所属）

-- 外部キー制約確認
SELECT
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name IN ('employees', 'employee_organizations');
```

### 4. トラブルシューティング

#### エラー: UNIQUE constraint violation on employee_number

- 原因: 既に同じ社員番号が存在する
- 対処: 既存データを削除するか、CSVの社員番号を変更

#### エラー: FOREIGN KEY constraint violation

- 原因: `employee_id` または `organization_id` が存在しない
- 対処: UUIDの置き換えが正しいか確認

#### エラー: Invalid date format

- 原因: hire_date の形式が不正
- 対処: `YYYY-MM-DD` 形式（例: 2020-04-01）に修正

## サンプルデータの特徴

- **社員数**: 10名
- **複数所属**: E001（山田太郎）が2つの組織に所属
- **役職あり**: 部長、課長、係長、主任など
- **役職なし**: 一般社員として登録
- **携帯電話なし**: E010（加藤さくら）は携帯電話番号なし
- **写真なし**: 全員 `photo_s3_key` が NULL（プレースホルダー画像表示テスト用）

## 次のステップ

1. ブラウザで `/employees` にアクセス
2. 社員一覧が表示されることを確認
3. 検索・フィルタ・ソート機能の動作確認
