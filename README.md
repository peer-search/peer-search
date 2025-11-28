# peer-search-re

Next.js 16 + React 19 + Supabaseを使用したWebアプリケーション

## 技術スタック

### フロントエンド
- **Next.js 16.0.1** (App Router)
- **React 19.2**
- **TypeScript 5**
- **Tailwind CSS 4**
- **shadcn/ui** - UIコンポーネントライブラリ

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
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# データベース接続URL (Supabase Settings > Database > Connection string > URI)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres

# AWS S3設定（社員写真等の静的ファイル管理）
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=your-bucket-name

# CloudFront CDN（オプション）
CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net
```

> **注意**: `.env.local`は`.gitignore`に含まれており、Gitにコミットされません。本番環境ではVercel Environment Variablesで設定してください。

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
├── components/
│   └── ui/                   # shadcn/ui コンポーネント
├── lib/
│   ├── supabase-auth/        # Supabase認証関連
│   │   ├── auth.ts           # 認証ユーティリティ
│   │   ├── authGoogle.ts     # Google認証
│   │   ├── middleware.ts     # 認証ミドルウェア
│   │   └── server.ts         # サーバーサイド認証
│   └── utils.ts              # ユーティリティ関数 (cn等)
├── db/
│   ├── schema.ts             # Drizzleスキーマ定義
│   └── index.ts              # DB接続設定
├── middleware.ts             # Next.jsミドルウェア (認証チェック)
├── tailwind.config.ts        # Tailwind CSS設定
├── components.json           # shadcn/ui設定
└── drizzle.config.ts         # Drizzle設定
```

## 主要機能

### 社員一覧画面 (`/employees`)

組織内の社員情報を検索・閲覧するための画面です。

**主な機能**:
- 社員情報のカード形式表示
- 氏名・社員番号・入社年による検索
- 組織階層画面からの部署フィルタリング
- ソート機能（氏名かな、社員番号、入社年）
- AWS S3からの社員写真表示
- 社員詳細画面への遷移

**技術的特徴**:
- React Server Componentsによるサーバーサイドレンダリング
- Next.js 16のApp Router活用
- Drizzle ORMによる型安全なデータベース操作
- レスポンシブデザイン（デスクトップ・タブレット・モバイル対応）

**詳細ドキュメント**:
- [パフォーマンステスト](docs/PERFORMANCE_TESTING.md)
- [アクセシビリティ監査](docs/ACCESSIBILITY_AUDIT.md)
- [セキュリティレビュー](docs/SECURITY_REVIEW.md)

### UI コンポーネント
- shadcn/ui による再利用可能なコンポーネント
- Tailwind CSS 4 ベースのスタイリング
- ダークモード対応

### 認証
- Supabase + Google OAuth認証
- 環境に応じた動的リダイレクトURL設定
- proxy.ts（Next.js 16）による認証チェック

### データベース
- PostgreSQL (Supabaseホスト)
- Drizzle ORMによるマイグレーション管理
- テーブル: `profiles`, `employees`, `employee_organizations`, `organizations`

### 静的ファイル管理
- AWS S3による画像・ファイル保管
- CloudFront CDN対応（オプション）
- Next.js Imageコンポーネントによる自動最適化

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

# テスト
pnpm test              # Watch mode
pnpm test:run          # Run once
pnpm test:ui           # UI mode (visual test runner)
pnpm test:coverage     # Coverage report

# データベースマイグレーション生成
pnpm db:generate

# マイグレーション実行
pnpm db:migrate

# スキーマをDBにプッシュ
pnpm db:push

# Drizzle Studio起動 (DBのGUI管理)
pnpm db:studio

# shadcn/uiコンポーネント追加
pnpm dlx shadcn@latest add [component-name]

# パフォーマンステスト（社員検索）
node scripts/load-env.mjs scripts/test-employee-performance.ts

# インデックス検証
node scripts/load-env.mjs scripts/verify-employee-indexes.ts
```

## コーディング規約

- **リンター/フォーマッター**: Biomeを使用
- **プレコミット**: Huskyによる自動リント・フォーマット
- コミット前に自動的に`biome check --write`が実行されます

## shadcn/ui の使い方

### コンポーネントの追加

shadcn/uiのコンポーネントは必要に応じて追加します：

```bash
# 単一コンポーネント
pnpm dlx shadcn@latest add button

# 複数コンポーネント
pnpm dlx shadcn@latest add card input label dialog
```

### 使用例

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>タイトル</CardTitle>
        <CardDescription>説明文</CardDescription>
      </CardHeader>
      <CardContent>
        <Button>クリック</Button>
      </CardContent>
    </Card>
  );
}
```

### インストール済みコンポーネント

- `button` - ボタン
- `card` - カード
- `input` - 入力フィールド
- `label` - ラベル

その他のコンポーネントは[shadcn/ui公式サイト](https://ui.shadcn.com/docs/components)から確認できます。

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
