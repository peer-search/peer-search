# 初期コンテキスト: 社員一覧画面

## ユーザー提供情報

### 画面B：社員一覧画面（/employees）

#### 3.2.1 目的
検索条件（名前 / 社員番号 / 入社年）＋部署一覧画面からのフィルタで社員を一覧表示

#### 3.2.2 ヘッダー（共通）
検索バーの検索実行により再度 /employees へ遷移して再検索

#### 3.2.3 ソート仕様（昇順／降順）
- 氏名（かな）
- 社員番号
- 入社年

#### 3.2.4 社員カード
- 写真
- 氏名（漢字）
- 社員番号
- 携帯
- メール
- 所属一覧

所属一覧は **会社 本部 部署 課 チーム（役職）** 形式
複数所属は複数行で表示

#### 3.2.5 1社員=1カード
employeeId単位でカードを集約

#### 3.2.6 遷移
クリックで `/employees/[employeeId]`（社員詳細）へ

## 既存実装の確認

### 関連する既存機能
1. **組織階層画面** (`organization-hierarchy-view`)
   - 実装済み: `/` ルート
   - 組織カードクリック → `/employees?org_id={id}` への遷移が期待される

2. **Supabase認証システム**
   - `proxy.ts` (Next.js 16) で認証チェック
   - `getUser()` でユーザー情報取得

3. **データベーススキーマ**
   - **Organizations テーブル**: 既存（4階層の組織データ）
   - **Employees テーブル**: **未実装** → 要作成
   - **Employee_Organizations テーブル**: **未実装** → 要作成

### 技術的前提条件
- Next.js 16 App Router
- React 19 Server Components
- Drizzle ORM + PostgreSQL
- shadcn/ui コンポーネントライブラリ
- TypeScript strict mode

## 検討事項

### データベース設計
1. Employees テーブルのスキーマ設計
   - `photo_s3_key`（Text）: S3オブジェクトキーのみを保存
2. Employee_Organizations の多対多リレーション設計
3. 写真データの保存方法
   - **決定事項**: AWS S3に直接保存（`.kiro/steering/static-files.md`のパターンに準拠）
   - URL生成は`lib/s3/url.ts`の`getS3Url()`を使用
   - アップロードはPresigned URLによるクライアント直接アップロード

### パフォーマンス最適化
1. 社員一覧のページネーション戦略
2. 複数所属データの効率的なクエリ（JOIN vs RPC）
3. 検索インデックスの設計

### UI/UX設計
1. 社員カードのレイアウトデザイン
2. レスポンシブ対応（モバイル・タブレット・デスクトップ）
3. ローディング状態の表示
4. 検索結果0件時の表示

### セキュリティ
1. 社員情報へのアクセス権限制御
2. 個人情報の適切な表示制御

## 参考実装

### 既存の組織階層ビュー実装
- **パス**: `.kiro/specs/organization-hierarchy-view/`
- **実装パターン**:
  - Server Components でデータフェッチ
  - RPC関数（`get_org_hierarchy()`）を使用
  - カード形式のUI（shadcn/ui Card）
  - テストファーストアプローチ

### 静的ファイル管理パターン
- **パス**: `.kiro/steering/static-files.md`
- **S3統合パターン**:
  - DBには`s3_key`のみを保存（完全なURLは保存しない）
  - URL生成は`lib/s3/url.ts`の`getS3Url(key)`で実行時に行う
  - Next.js Imageコンポーネントと統合
  - CloudFront対応（オプション）

このパターンを踏襲して実装することが推奨される。

---
**作成日**: 2025-01-21
