# peer-search-re

Next.js 16 + React 19 + Supabaseを使用したWebアプリケーション

## 技術スタック

### フロントエンド
- **Next.js 16.0.1** (App Router)
- **React 19.2**
- **TypeScript 5**
- **Tailwind CSS 4**

### バックエンド
- **Supabase** (認証・データベース)
- **PostgreSQL** + **Drizzle ORM**

### 開発ツール
- **Biome** - リンター/フォーマッター
- **Husky** + **lint-staged** - プレコミットフック
- **pnpm** - パッケージマネージャー

## セットアップ

### 前提条件
- Node.js 22以上
- pnpm

### 環境変数の設定

`.env.local`ファイルをプロジェクトルートに作成し、以下の情報を設定してください：

```env
# Supabase環境変数
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# データベース接続URL (Supabase Settings > Database > Connection string > URI)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

### インストール

```bash
pnpm install
```

### 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## プロジェクト構造

```
peer-search-re/
├── app/                      # Next.js App Router
│   ├── api/auth/callback/    # Supabase認証コールバック
│   ├── login/                # ログインページ
│   ├── layout.tsx            # ルートレイアウト
│   ├── page.tsx              # ホームページ
│   └── globals.css           # グローバルスタイル
├── lib/
│   └── supabase-auth/        # Supabase認証関連
│       ├── auth.ts           # 認証ユーティリティ
│       ├── authGoogle.ts     # Google認証
│       ├── middleware.ts     # 認証ミドルウェア
│       └── server.ts         # サーバーサイド認証
├── db/
│   ├── schema.ts             # Drizzleスキーマ定義
│   └── index.ts              # DB接続設定
├── middleware.ts             # Next.jsミドルウェア (認証チェック)
└── drizzle.config.ts         # Drizzle設定
```

## 主要機能

### 認証
- Supabase + Google OAuth認証
- 環境に応じた動的リダイレクトURL設定
- ミドルウェアでの認証チェック

### データベース
- PostgreSQL (Supabaseホスト)
- Drizzle ORMによるマイグレーション管理
- `profiles`テーブル実装済み

## 開発コマンド

```bash
# 開発サーバー
pnpm dev

# プロダクションビルド
pnpm build

# プロダクションサーバー起動
pnpm start

# リント
pnpm lint

# フォーマット
pnpm format

# データベースマイグレーション生成
pnpm db:generate

# マイグレーション実行
pnpm db:migrate

# スキーマをDBにプッシュ
pnpm db:push

# Drizzle Studio起動 (DBのGUI管理)
pnpm db:studio
```

## コーディング規約

- **リンター/フォーマッター**: Biomeを使用
- **プレコミット**: Huskyによる自動リント・フォーマット
- コミット前に自動的に`biome check --write`が実行されます

## データベース管理

### マイグレーションの作成

1. `db/schema.ts`でスキーマを変更
2. マイグレーションファイルを生成:
   ```bash
   pnpm db:generate
   ```
3. マイグレーションを実行:
   ```bash
   pnpm db:migrate
   ```

### Drizzle Studioでの確認

```bash
pnpm db:studio
```

ブラウザでデータベースの内容を確認・編集できます。

## 認証フロー

1. ユーザーが`/login`にアクセス
2. Google認証ボタンをクリック
3. Googleでの認証完了後、`/api/auth/callback`にリダイレクト
4. セッション確立後、ホームページにリダイレクト
5. `middleware.ts`で保護されたルートへのアクセスを制御

## トラブルシューティング

### データベース接続エラー
- `.env.local`の`DATABASE_URL`が正しく設定されているか確認
- Supabaseプロジェクトが稼働中か確認

### 認証エラー
- Supabaseの設定で、Google認証が有効になっているか確認
- リダイレクトURLが正しく設定されているか確認 (Supabase Dashboard > Authentication > URL Configuration)

## 参考リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Biome Documentation](https://biomejs.dev)
