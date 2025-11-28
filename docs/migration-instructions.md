# データベースマイグレーション実行手順

## 概要
組織階層機能のデータベースマイグレーションを手動で実行する手順です。

## 前提条件
- Supabaseプロジェクトへのアクセス権限
- Supabaseダッシュボードへのログイン

## 手順

### 方法1: Supabaseダッシュボードから実行（推奨）

1. **Supabaseダッシュボードにアクセス**
   - https://supabase.com/dashboard にログイン
   - 対象プロジェクトを選択

2. **SQL Editorを開く**
   - 左サイドバーから「SQL Editor」を選択
   - 「New query」をクリック

3. **マイグレーションSQLを実行**
   - 以下のファイルの内容をコピー：
     ```
     drizzle/0000_charming_brood.sql
     ```
   - SQL Editorにペースト
   - 「Run」ボタンをクリックして実行

4. **実行結果の確認**
   - エラーがないことを確認
   - 「Table Editor」から`organizations`テーブルが作成されていることを確認
   - 以下のSQLで関数が作成されていることを確認：
     ```sql
     SELECT routine_name, routine_type
     FROM information_schema.routines
     WHERE routine_name = 'get_org_hierarchy';
     ```

### 方法2: psqlコマンドから実行

1. **PostgreSQL接続文字列を取得**
   - Supabaseダッシュボード > Settings > Database
   - 「Connection string」タブから「URI」をコピー
   - パスワードを実際の値に置換

2. **psqlで接続**
   ```bash
   psql "postgresql://postgres:[YOUR-PASSWORD]@db.gdxxxlwguoednonmwxvv.supabase.co:5432/postgres"
   ```

3. **マイグレーションファイルを実行**
   ```bash
   \i drizzle/0000_charming_brood.sql
   ```

4. **実行結果の確認**
   ```sql
   -- テーブル存在確認
   \dt organizations

   -- 関数存在確認
   \df get_org_hierarchy
   ```

### 方法3: Drizzle CLIから実行（トラブルシューティング）

接続エラーが発生した場合は、以下を確認してください：

1. **DATABASE_URLの確認**
   ```bash
   cat .env.local | grep DATABASE_URL
   ```

2. **接続タイプの変更**
   - 現在：プーリング接続（port 6543）
   - 試す：ダイレクト接続（port 5432）

   `.env.local`を編集：
   ```
   # プーリング接続（トランザクション用）
   DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true

   # ダイレクト接続（マイグレーション用）
   DIRECT_URL=postgresql://postgres:[PASSWORD]@db.gdxxxlwguoednonmwxvv.supabase.co:5432/postgres
   ```

3. **drizzle.config.tsを更新**
   ```typescript
   export default defineConfig({
     out: "./drizzle",
     schema: "./db/schema.ts",
     dialect: "postgresql",
     dbCredentials: {
       url: process.env.DIRECT_URL || process.env.DATABASE_URL,
     },
   });
   ```

4. **再度マイグレーション実行**
   ```bash
   pnpm db:migrate
   ```

## 検証

マイグレーション成功後、以下のSQLで動作確認：

```sql
-- テーブル構造の確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'organizations';

-- 制約の確認
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'organizations';

-- RPC関数のテスト（空データで実行）
SELECT * FROM get_org_hierarchy();
```

## トラブルシューティング

### エラー: "permission denied to create schema"
- 解決策: Supabaseダッシュボードから実行（方法1）を使用

### エラー: "relation already exists"
- 状態: テーブルは既に作成済み
- 対処: RPC関数のみを個別に実行
  ```sql
  CREATE OR REPLACE FUNCTION get_org_hierarchy()
  RETURNS TABLE (id uuid, name text, parent_id uuid, level integer)
  LANGUAGE sql
  STABLE
  AS $$
    WITH RECURSIVE org_tree AS (
      SELECT
        o.id,
        o.name,
        o.parent_id,
        o.level,
        ARRAY[o.id] AS path
      FROM organizations o
      WHERE o.parent_id IS NULL

      UNION ALL

      SELECT
        o.id,
        o.name,
        o.parent_id,
        o.level,
        ot.path || o.id
      FROM organizations o
      INNER JOIN org_tree ot ON o.parent_id = ot.id
      WHERE NOT o.id = ANY(ot.path)
    )
    SELECT id, name, parent_id, level
    FROM org_tree
    ORDER BY level, parent_id NULLS FIRST;
  $$;
  ```

### エラー: "ECONNREFUSED"
- 原因: ローカルからSupabaseへの接続が拒否された
- 解決策: 方法1（ダッシュボード）を使用

## 次のステップ

マイグレーション完了後：
1. サンプルデータを投入（タスク5.1）
2. アプリケーションから組織階層データを取得できることを確認
