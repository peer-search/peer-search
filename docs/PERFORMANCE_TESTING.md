# パフォーマンステストガイド

## 概要

このドキュメントでは、社員一覧画面のパフォーマンス要件を満たしているかを検証する方法を説明します。

## パフォーマンス要件（要件11）

| 指標 | 目標値 | 検証方法 |
|------|--------|----------|
| FCP (First Contentful Paint) | 2秒以内 | Lighthouse, Web Vitals |
| データベースクエリ実行時間 | 500ms以内 | パフォーマンステストスクリプト |
| 写真読み込み | 遅延読み込み、最大6枚同時 | ブラウザDevTools Network |

## 1. Lighthouseによる計測

### Chrome DevToolsを使用

1. Chrome DevToolsを開く（F12またはCmd/Ctrl+Shift+I）
2. "Lighthouse"タブを選択
3. 以下の設定で実行:
   - Mode: Navigation
   - Device: Desktop/Mobile
   - Categories: Performance, Accessibility
4. "Analyze page load"をクリック

### 合格基準

- **Performance Score**: 90以上
- **FCP**: 2.0秒以内
- **LCP**: 2.5秒以内
- **TBT**: 200ms以内
- **CLS**: 0.1以下

### コマンドラインでの実行

```bash
# Lighthouse CLIのインストール
npm install -g lighthouse

# ローカル環境での計測
pnpm dev

# 別ターミナルで実行
lighthouse http://localhost:3000/employees --view --output html --output-path ./lighthouse-report.html
```

## 2. データベースパフォーマンステスト

### 実行方法

```bash
node scripts/load-env.mjs scripts/test-employee-performance.ts
```

### 確認ポイント

- 全テストが500ms以内で完了すること
- 複合検索（氏名+ソート）でも500ms以内であること
- コンソールに警告ログが出力されないこと

### インデックスの確認

```bash
node scripts/load-env.mjs scripts/verify-employee-indexes.ts
```

すべての必須インデックスが作成されていることを確認してください。

## 3. Web Vitals計測

### Next.js組み込みのWeb Vitals

アプリケーションには`useReportWebVitals`フックが統合されており、以下の指標を自動的に記録します:

- **CLS** (Cumulative Layout Shift)
- **FID** (First Input Delay)
- **FCP** (First Contentful Paint)
- **LCP** (Largest Contentful Paint)
- **TTFB** (Time to First Byte)
- **INP** (Interaction to Next Paint)

### ブラウザコンソールでの確認

1. 社員一覧画面にアクセス
2. ブラウザのコンソールを開く
3. Web Vitalsのログを確認

例:
```
[Web Vitals] FCP: 1234ms
[Web Vitals] LCP: 1567ms
[Web Vitals] CLS: 0.05
```

## 4. ネットワークパフォーマンス

### Chrome DevTools Networkタブでの確認

1. DevToolsを開き、"Network"タブを選択
2. "Disable cache"をチェック
3. ページをリロード（Cmd/Ctrl+R）
4. 以下を確認:
   - **Initial HTML load**: 500ms以内
   - **Images**: Lazy loadingが機能しているか（スクロール時に読み込まれるか）
   - **Concurrent requests**: 画像が6つ程度並列で読み込まれているか

### 画像最適化の確認

1. Networkタブでimageフィルターを適用
2. 画像のファイルタイプを確認
   - WebP形式が優先的に使用されていること
   - 必要に応じてAVIF形式も使用されていること
3. 画像のサイズを確認
   - 64pxのアバター画像が適切なサイズで配信されていること

## 5. Server Componentsのパフォーマンス

### React DevTools Profilerでの確認

1. React DevTools Profilerをインストール
2. "Profiler"タブを開く
3. ページナビゲーションを記録
4. コンポーネントのレンダリング時間を確認

### 確認ポイント

- Server Componentsがサーバーサイドでレンダリングされていること
- Client Components（SearchForm, SortControls）のバンドルサイズが最小化されていること

## 6. 本番環境でのテスト

### Vercelデプロイ後の検証

1. Vercelにデプロイ
2. Production URLでLighthouseを実行
3. Real User Monitoring（RUM）データを確認

### Vercel Analyticsの確認

Vercel Analyticsが有効な場合:
- Web Vitalsダッシュボードで実際のユーザー体験を確認
- P75（75パーセンタイル）の値を確認

## 7. 継続的な監視

### パフォーマンス劣化の検出

以下の場合にパフォーマンス劣化が疑われます:

- FCPが2秒を超える
- データベースクエリが500msを超える（コンソールに警告が出力される）
- Lighthouse Performance Scoreが90を下回る

### 改善アクション

1. **データベースクエリの最適化**
   - インデックスの追加・見直し
   - クエリの最適化（不要なJOINの削除）
   - ページネーションの導入（10,000人以上の場合）

2. **画像最適化**
   - S3 + CloudFront CDNの導入
   - Lambda@Edgeでの画像リサイズ
   - 適切なCache-Controlヘッダーの設定

3. **コード最適化**
   - 不要なClient Componentsの削除
   - Server Componentsへの移行
   - React.memoの活用（必要な場合のみ）

## 参考リンク

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/)
- [Vercel Analytics](https://vercel.com/docs/analytics)
