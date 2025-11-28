# 技術選定ドキュメント

## プロジェクト概要

**peer-search-re** は、ピアサーチ機能を提供する Next.js ベースの Web アプリケーションです。モダンなフロントエンド技術と、スケーラブルなバックエンドインフラを組み合わせた構成となっています。

---

## フロントエンド

### Next.js 16.0.1

**選定理由:**
- React Server Components (RSC) による高速なページレンダリング
- App Router による直感的なルーティングとレイアウトシステム
- ビルトインの最適化機能（画像最適化、フォント最適化など）
- サーバーサイドレンダリング (SSR) とスタティックサイト生成 (SSG) の柔軟な選択
- Vercel との統合による簡単なデプロイメント

**技術的メリット:**
- TypeScript との完全な統合
- ファイルベースルーティングによる開発効率の向上
- Middleware によるリクエスト処理のカスタマイズ
- API Routes による BFF (Backend for Frontend) パターンの実装

**設定詳細:**
```typescript
// next.config.ts
- 現在デフォルト設定を使用
- 将来的な拡張性を確保
```

### React 19.2

**選定理由:**
- 最新の React 機能へのアクセス
- Server Components のネイティブサポート
- 改善されたパフォーマンスと開発体験
- Suspense と Concurrent Features の安定版

**技術的メリット:**
- use フックによる非同期処理の簡素化
- より効率的な再レンダリング最適化
- TypeScript との強化された型推論

### TypeScript 5

**選定理由:**
- 型安全性による開発時のバグ削減
- IntelliSense による開発効率の向上
- リファクタリングの安全性確保
- チーム開発でのコミュニケーションコスト削減

**設定詳細:**
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "strict": true,
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./*"]  // パスエイリアスによる import の簡素化
    }
  }
}
```

**技術的メリット:**
- strict モードによる堅牢な型チェック
- Next.js プラグインによる型生成の自動化
- JSX の型推論サポート

### Tailwind CSS 4

**選定理由:**
- ユーティリティファーストによる高速な UI 開発
- PostCSS との統合による最新 CSS 機能の利用
- デザインシステムの一貫性確保
- 未使用スタイルの自動削除によるバンドルサイズの最適化

**技術的メリット:**
- JIT (Just-In-Time) コンパイルによる開発速度の向上
- カスタマイズ可能なデザイントークン
- レスポンシブデザインの簡単な実装
- ダークモード対応の簡素化

**関連ツール:**
- `tailwind-merge`: クラス名の競合解決
- `class-variance-authority`: コンポーネントバリアントの型安全な管理
- `tw-animate-css`: Tailwind ベースのアニメーション

### shadcn/ui

**選定理由:**
- Radix UI をベースにした高品質なコンポーネント
- アクセシビリティへの配慮
- カスタマイズ性の高さ
- コピー＆ペーストによる依存関係の最小化

**導入済みコンポーネント:**
- Button: プライマリアクション用
- Card: コンテンツグループ化
- Input: フォーム入力
- Label: フォームラベル

**技術的メリット:**
- Radix UI による WAI-ARIA 準拠
- Tailwind CSS ベースのスタイリング
- TypeScript による型安全性
- lucide-react による統一されたアイコンシステム

---

## バックエンド・インフラ

### Supabase

**選定理由:**
- PostgreSQL ベースのフルマネージド BaaS (Backend as a Service)
- リアルタイム機能のビルトインサポート
- Row Level Security (RLS) による細かいアクセス制御
- 開発環境から本番環境へのシームレスな移行

**使用機能:**
- **認証 (Auth)**: Google OAuth 統合
- **データベース**: PostgreSQL インスタンス
- **ストレージ**: 将来的なファイルアップロード対応

**パッケージ構成:**
- `@supabase/supabase-js`: クライアント SDK
- `@supabase/ssr`: Next.js App Router 対応の SSR ヘルパー

**技術的メリット:**
- クライアント・サーバー両方でのシームレスな認証
- Cookie ベースのセッション管理
- 環境に応じた動的なリダイレクト URL 設定
- Middleware での認証チェック統合

**実装詳細:**
```typescript
// lib/supabase-auth/
├── auth.ts          // クライアントサイド認証
├── authGoogle.ts    // Google OAuth 実装
├── server.ts        // サーバーサイド認証
└── middleware.ts    // 認証ミドルウェア
```

### PostgreSQL (via Supabase)

**選定理由:**
- 業界標準の RDBMS
- JSON/JSONB サポートによる柔軟なデータ構造
- 強力な拡張エコシステム
- トランザクションサポート

**技術的メリット:**
- ACID 特性による信頼性
- 複雑なクエリへの対応
- フルテキスト検索のビルトインサポート
- PostGIS による地理空間データ対応（将来的な拡張）

### Drizzle ORM 0.44.7

**選定理由:**
- TypeScript ファーストの型安全な ORM
- 軽量で高速な実行時パフォーマンス
- SQL ライクな API による学習コストの低さ
- マイグレーション管理の簡潔性

**設定詳細:**
```typescript
// drizzle.config.ts
{
  out: "./drizzle",           // マイグレーションファイル出力先
  schema: "./db/schema.ts",   // スキーマ定義
  dialect: "postgresql"
}
```

**技術的メリット:**
- Zod との統合による入力バリデーション
- 型推論によるクエリの安全性
- 直感的なスキーマ定義
- Drizzle Kit によるマイグレーション自動生成

**スキーマ構成:**
```typescript
// db/schema.ts
profiles テーブル: ユーザープロファイル情報
```

**運用コマンド:**
```bash
pnpm db:generate  # マイグレーションファイル生成
pnpm db:migrate   # マイグレーション実行
pnpm db:push      # スキーマを DB に直接反映
pnpm db:studio    # Drizzle Studio で DB 確認
```

---

## 開発ツール・品質管理

### Biome 2.2.0

**選定理由:**
- ESLint + Prettier の代替として単一ツールで統一
- Rust 製による高速な実行速度
- 設定の簡潔性
- Next.js と React の専用ルールセット

**設定詳細:**
```json
{
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "rules": { "recommended": true },
    "domains": {
      "next": "recommended",
      "react": "recommended"
    }
  }
}
```

**技術的メリット:**
- VCS (Git) 統合による変更ファイルのみの処理
- インポートの自動整理
- Next.js 固有のベストプラクティスチェック
- 未知のファイルタイプの自動スキップ

### Husky + lint-staged

**選定理由:**
- Git フック管理の自動化
- コミット前の品質チェック強制
- 変更ファイルのみの処理による高速化

**設定詳細:**
```json
{
  "lint-staged": {
    "*.{js,ts,tsx,jsx,json}": [
      "biome check --write --no-errors-on-unmatched"
    ]
  }
}
```

**技術的メリット:**
- チーム全体でのコード品質統一
- レビュー時の指摘事項の削減
- CI/CD パイプラインの実行時間短縮

### pnpm

**選定理由:**
- npm/yarn より高速なインストール
- ディスク容量の効率的な使用
- monorepo 対応の容易性
- 厳密な依存関係管理

**技術的メリット:**
- Content-addressable storage による重複排除
- ハードリンクによる高速なインストール
- Phantom dependencies の防止

---

## 認証・セキュリティ

### Google OAuth (via Supabase Auth)

**選定理由:**
- ユーザーの利便性向上（既存アカウントの利用）
- セキュアなパスワード管理の不要化
- OAuth 2.0 標準プロトコルの採用

**実装詳細:**
- クライアントサイド: `signInWithOAuth()` による認証フロー開始
- サーバーサイド: `/api/auth/callback` でのコードエクスチェンジ
- Middleware: `updateSession()` による認証状態の維持

**環境別設定:**
```typescript
// 開発環境: localhost:3000
// 本番環境: 動的に環境変数から取得
redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`
```

### Row Level Security (RLS)

**選定理由:**
- データベースレベルでのアクセス制御
- アプリケーションコードでの漏洩リスク軽減
- きめ細かい権限管理

**今後の実装予定:**
- profiles テーブルへの RLS ポリシー適用
- ユーザー自身のデータのみアクセス可能な制約

---

## プロジェクト構造

```
peer-search-re/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   └── auth/callback/        # OAuth コールバック
│   ├── login/                    # ログインページ
│   ├── layout.tsx                # ルートレイアウト
│   ├── page.tsx                  # ホームページ
│   └── globals.css               # グローバルスタイル
├── components/                   # React コンポーネント
│   └── ui/                       # shadcn/ui コンポーネント
├── lib/                          # 共通ライブラリ
│   ├── supabase-auth/            # 認証ロジック
│   └── utils.ts                  # ユーティリティ関数
├── db/                           # データベース
│   ├── schema.ts                 # Drizzle スキーマ定義
│   └── index.ts                  # DB 接続設定
├── docs/                         # ドキュメント
├── .kiro/                        # Kiro Spec-Driven Development
│   ├── steering/                 # プロジェクト全体の指針
│   └── specs/                    # 機能仕様書
├── middleware.ts                 # Next.js Middleware
├── drizzle/                      # マイグレーションファイル
└── 設定ファイル群
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── biome.json
    └── drizzle.config.ts
```

---

## パフォーマンス最適化

### ビルド最適化
- **Next.js の自動最適化**
  - Code Splitting: ページ単位の自動分割
  - Tree Shaking: 未使用コードの削除
  - Minification: JavaScript/CSS の圧縮

### ランタイム最適化
- **React Server Components**
  - サーバーサイドでのデータフェッチ
  - クライアントバンドルサイズの削減
  - 初期表示の高速化

### キャッシング戦略
- **Next.js のキャッシング**
  - Full Route Cache: ビルド時の静的ページ生成
  - Data Cache: fetch() の自動キャッシング
  - Router Cache: クライアント側のナビゲーションキャッシュ

---

## 開発ワークフロー

### ローカル開発
```bash
# 開発サーバー起動
pnpm dev

# コード品質チェック
pnpm lint

# フォーマット
pnpm format

# データベース操作
pnpm db:generate  # スキーマからマイグレーション生成
pnpm db:push      # 開発環境へのスキーマ反映
pnpm db:studio    # Drizzle Studio でデータ確認
```

### Git ワークフロー
1. ブランチ作成・切り替え
2. コード変更
3. `git add` 実行
4. **自動実行**: Husky により pre-commit フック発火
5. **自動実行**: lint-staged により変更ファイルを Biome でチェック
6. チェック通過後にコミット完了

### デプロイメント
- **推奨プラットフォーム**: Vercel
- **CI/CD**: GitHub Actions との統合（今後実装予定）

---

## Spec-Driven Development (Kiro)

### 開発プロセス管理

**Kiro フレームワーク**の採用により、仕様駆動開発を実現:

#### Phase 0: プロジェクト指針の設定
- `.kiro/steering/`: プロジェクト全体のルールとコンテキスト
  - `product.md`: 製品仕様
  - `tech.md`: 技術方針
  - `structure.md`: プロジェクト構造

#### Phase 1: 仕様策定
1. **要件定義**: `/kiro:spec-init`, `/kiro:spec-requirements`
2. **ギャップ分析**: `/kiro:validate-gap` （既存コードベース対象）
3. **設計**: `/kiro:spec-design`
4. **設計レビュー**: `/kiro:validate-design`
5. **タスク分解**: `/kiro:spec-tasks`

#### Phase 2: 実装
- `/kiro:spec-impl`: TDD ベースの実装
- `/kiro:validate-impl`: 実装検証

**技術的メリット:**
- 人間によるレビュー必須の 3 フェーズ承認ワークフロー
- 各フェーズでの明確な成果物
- ステアリングドキュメントとの整合性保証

---

## 環境変数管理

### 必須環境変数

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=         # Supabase プロジェクト URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase 匿名キー

# Database
DATABASE_URL=                     # PostgreSQL 接続文字列

# Application
NEXT_PUBLIC_SITE_URL=             # サイト URL（OAuth リダイレクト用）
```

### 環境別設定
- **開発環境**: `.env.local`
- **本番環境**: Vercel 環境変数
- **CI/CD**: GitHub Secrets

---

## スケーラビリティの考慮事項

### 水平スケーリング
- **Next.js**: ステートレスな設計により複数インスタンスでの実行が容易
- **Supabase**: マネージドサービスによる自動スケーリング

### 垂直スケーリング
- **PostgreSQL**: Supabase のプラン変更で対応
- **Edge Functions**: Vercel Edge Runtime の活用（今後）

### データベース最適化
- **インデックス戦略**: 頻繁にクエリされるカラムへのインデックス追加
- **コネクションプーリング**: Drizzle + Supabase の自動プーリング
- **読み取りレプリカ**: Supabase Pro プラン以上で対応可能

---

## 今後の拡張予定

### 機能面
- [ ] リアルタイム通信（Supabase Realtime）
- [ ] ファイルアップロード（Supabase Storage）
- [ ] 全文検索機能（PostgreSQL FTS）
- [ ] ユーザー通知システム

### 技術面
- [ ] E2E テスト（Playwright）
- [ ] ユニットテスト（Vitest）
- [ ] CI/CD パイプライン構築
- [ ] Monitoring & Logging（Sentry, LogRocket）
- [ ] パフォーマンス監視（Vercel Analytics）

### インフラ面
- [ ] CDN 最適化
- [ ] Edge Functions 導入
- [ ] バックグラウンドジョブ処理（Inngest）
- [ ] Feature Flags（Vercel Flags）

---

## 参考リンク

### 公式ドキュメント
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Biome Documentation](https://biomejs.dev)
- [shadcn/ui Documentation](https://ui.shadcn.com)

### チュートリアル・ガイド
- [Next.js + Supabase Auth](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Drizzle with Supabase](https://orm.drizzle.team/docs/get-started-postgresql#supabase)
- [shadcn/ui Installation](https://ui.shadcn.com/docs/installation/next)

---

## まとめ

本プロジェクトは、**モダンで型安全なフルスタック Web アプリケーション**として設計されています。

### 主要な技術的決定
1. **Next.js 16 + React 19**: 最新の React 機能とパフォーマンス最適化
2. **TypeScript**: 型安全性による開発効率とコード品質の向上
3. **Supabase**: フルマネージド BaaS による迅速な開発とスケーラビリティ
4. **Drizzle ORM**: 型安全なデータベース操作と保守性
5. **Tailwind CSS**: 高速な UI 開発と一貫したデザインシステム
6. **Biome**: 単一ツールによるコード品質管理の簡素化

### 開発哲学
- **型安全性**: TypeScript を軸とした堅牢な開発
- **パフォーマンス**: RSC、キャッシング戦略による高速化
- **開発者体験**: モダンなツールチェーンによる効率化
- **保守性**: 明確なプロジェクト構造と Spec-Driven Development
- **スケーラビリティ**: マネージドサービスとステートレス設計

この技術スタックにより、迅速な開発と長期的な保守性を両立した、拡張性の高いアプリケーション構築を実現しています。
