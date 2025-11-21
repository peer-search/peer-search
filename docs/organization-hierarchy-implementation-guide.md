# 組織階層ビュー実装ガイド

## 実装ステータス

### ✅ 完了したタスク

#### データベース層 (タスク 1.1 - 1.3)
- [x] 組織階層テーブルのスキーマ定義
- [x] RPC関数 `get_org_hierarchy()` の作成
- [x] マイグレーションファイルの準備

#### データアクセス層 (タスク 2.1 - 2.3)
- [x] 型定義の作成 (`lib/organizations/types.ts`)
- [x] 組織階層データ取得サービス (`lib/organizations/service.ts`)
- [x] ツリー構造変換ロジック (`lib/organizations/tree.ts`)

#### UIコンポーネント (タスク 3.1 - 3.2)
- [x] OrganizationCard コンポーネント
- [x] OrganizationCardList コンポーネント

#### トップページ (タスク 4.1 - 4.4)
- [x] 組織階層ページの実装 (`app/page.tsx`)
- [x] ページメタデータの設定
- [x] ローディング状態 (`app/loading.tsx`)
- [x] エラー状態 (`app/error.tsx`)

#### テストスクリプト (タスク 5.1)
- [x] サンプルデータ投入スクリプト (`scripts/seed-organizations.ts`)
- [x] RPC関数テストスクリプト (`scripts/test-rpc-hierarchy.ts`)

## 次のステップ: 動作確認 (タスク 5.2 - 5.7)

### 前提条件

1. **マイグレーションの実行**
   - `docs/migration-instructions.md` を参照してマイグレーションを実行してください
   - Supabaseダッシュボードから実行する方法を推奨

2. **環境変数の設定**
   - `.env` ファイルに `DATABASE_URL` が設定されていることを確認

### タスク 5.2: サンプルデータの投入

```bash
# 依存関係のインストール（未実施の場合）
npm install

# サンプルデータの投入
npm run seed:organizations

# RPC関数の動作確認
npm run test:rpc
```

**期待される結果**:
- 15件の組織データが投入される（会社1、本部2、部署4、課/チーム8）
- RPC関数が階層順にデータを返す

### タスク 5.3: トップページ表示の動作確認

```bash
# 開発サーバーの起動
npm run dev
```

ブラウザで http://localhost:3000 にアクセスし、以下を確認:

- [ ] 組織階層カードが表示される
- [ ] カード内包レイアウト（会社→本部→部署→課/チーム）が正しく表示される
- [ ] 各カードに組織名が表示される

### タスク 5.4: ナビゲーションの動作確認

- [ ] 組織カードをクリック
- [ ] `/employees?org_id={node_id}` に遷移する
- [ ] URLパラメータに組織IDが含まれている

**注意**: 社員一覧ページ (`/employees`) は未実装のため、404エラーになります。

### タスク 5.5: レスポンシブデザインの動作確認

ブラウザの開発者ツールでウィンドウをリサイズし、以下を確認:

- [ ] **モバイル (< 640px)**: カードが縦に積み重なる
- [ ] **タブレット (640px - 1024px)**: 2カラムグリッド
- [ ] **デスクトップ (>= 1024px)**: 3カラムグリッド

### タスク 5.6: エラーハンドリングの動作確認

#### 5.6.1 空データの確認

```bash
# データを一時的に削除
npm run seed:organizations # データを再投入して元に戻す
```

#### 5.6.2 RPC関数エラーの確認

Supabaseダッシュボードで `get_org_hierarchy` 関数を一時的に削除し、以下を確認:

- [ ] エラーメッセージ「データの取得に失敗しました。再読み込みしてください。」が表示される
- [ ] 再読み込みボタンが機能する

### タスク 5.7: アクセシビリティの動作確認

- [ ] **Tab キー**: カード間をフォーカス移動できる
- [ ] **Enter キー**: フォーカスされたカードをクリックできる
- [ ] **フォーカスアウトライン**: フォーカスされたカードにアウトラインが表示される
- [ ] **ARIA属性**: スクリーンリーダーで適切に読み上げられる

### タスク 5.8: パフォーマンスの確認

ブラウザの開発者ツール (Performance タブ) で以下を計測:

- [ ] **TTFB (Time To First Byte)**: < 1秒
- [ ] **RPC実行時間**: < 200ms (コンソールログで確認)
- [ ] **初期HTMLレンダリング**: サーバーサイドで組織階層データが含まれている

## 実装されたファイル

### スキーマ・マイグレーション
- `db/schema.ts` - Drizzle スキーマ定義
- `drizzle/0000_charming_brood.sql` - マイグレーションSQL

### サービス層
- `lib/organizations/types.ts` - 型定義
- `lib/organizations/service.ts` - データ取得サービス
- `lib/organizations/tree.ts` - ツリー変換ロジック
- `lib/organizations/index.ts` - エクスポート

### コンポーネント
- `components/organization/organization-card.tsx` - 組織カード
- `components/organization/organization-card-list.tsx` - カードリスト

### ページ
- `app/page.tsx` - トップページ
- `app/loading.tsx` - ローディングUI
- `app/error.tsx` - エラーUI

### スクリプト
- `scripts/seed-organizations.ts` - サンプルデータ投入
- `scripts/test-rpc-hierarchy.ts` - RPC関数テスト

### ドキュメント
- `docs/migration-instructions.md` - マイグレーション手順
- `docs/organization-hierarchy-implementation-guide.md` - 本ドキュメント

## トラブルシューティング

### ビルドエラー: "Can't resolve 'tw-animate-css'"

このエラーは既存の問題です。以下で回避できます:

```bash
npm install tw-animate-css
```

### データベース接続エラー

`docs/migration-instructions.md` の「方法3: トラブルシューティング」を参照してください。

### RPC関数が見つからない

マイグレーションが正しく実行されていない可能性があります。Supabaseダッシュボードから手動で関数を作成してください。

## 要件カバレッジ

すべての要件 (Requirement 1-9) がタスク 1.1 - 5.1 で実装されています。
タスク 5.2 - 5.8 は動作確認のみです。

## 参考資料

- [Requirements Document](./.kiro/specs/organization-hierarchy-view/requirements.md)
- [Design Document](./.kiro/specs/organization-hierarchy-view/design.md)
- [Task List](./.kiro/specs/organization-hierarchy-view/tasks.md)
