# 実装タスク: 社員詳細画面

## タスク概要

社員詳細画面（`/employees/[employeeId]`）の実装タスクを定義します。Next.js 16 App Router Dynamic Routesを使用し、左側に3:4写真表示、右側に社員情報カードを配置する2カラムレイアウトを実装します。

---

## タスクリスト

### フェーズ1: データレイヤー実装

- [ ] 1. 単一社員取得機能の実装 (P)
- [ ] 1.1 (P) 単一社員データ取得関数の実装
  - `lib/employees/service.ts`に`getEmployeeById()`関数を追加
  - Drizzle ORMでemployees、employee_organizations、organizationsをLEFT JOINクエリ
  - `WHERE eq(employees.id, employeeId)`で単一レコード取得
  - `buildOrganizationPath()`を再利用して組織階層パス生成（WITH RECURSIVE）
  - 所属情報をMapで集約し、Employee型オブジェクトとして返却
  - 存在しないemployeeIdの場合は`null`を返却
  - _Requirements: 1.1, 1.6, 1.7_

- [ ] 1.2* (P) 単一社員取得関数のユニットテスト
  - `lib/employees/service.test.ts`にテストケース追加
  - 存在する社員IDで正しくデータ取得できることを検証
  - 存在しない社員IDで`null`が返却されることを検証
  - 所属情報の階層パスが正しく生成されることを検証
  - Drizzle ORMクエリビルダーと`buildOrganizationPath()`をモック
  - _Requirements: 1.1, 1.7_

### フェーズ2: ページコンポーネント実装

- [ ] 2. 動的ルートページの実装
- [ ] 2.1 動的ルートディレクトリ構造の作成
  - `app/employees/[employeeId]/`ディレクトリ作成
  - Next.js 16 App Router Dynamic Routesの規約に従う
  - _Requirements: 1.1_

- [ ] 2.2 メインページコンポーネントの実装
  - `app/employees/[employeeId]/page.tsx`を実装（RSC）
  - `params: Promise<{ employeeId: string }>`を受け取り、awaitで取得
  - `getUser()`で認証確認（未認証時はエラー）
  - `getEmployeeById(employeeId)`でデータ取得
  - データが`null`の場合は`notFound()`を呼び出し
  - 2カラムレイアウト構築（Tailwind Grid: `grid-cols-1 md:grid-cols-2`）
  - 左カラムに`EmployeeDetailPhoto`、右カラムに`EmployeeDetailCard`を配置
  - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.4, 7.2, 8.1, 10.1, 10.2_

- [ ] 2.3 動的メタデータ生成の実装
  - `generateMetadata()`関数を`page.tsx`に実装
  - `params.employeeId`をawaitで取得
  - `getEmployeeById(employeeId)`でデータ取得
  - データが`null`の場合は`notFound()`
  - Metadataオブジェクト生成: `title: "${employee.nameKanji} - 社員詳細 - peer-search"`
  - _Requirements: 8.2, 8.3_

- [ ] 2.4 (P) ローディング画面の実装
  - `app/employees/[employeeId]/loading.tsx`を実装（RSC）
  - shadcn/ui `Skeleton`コンポーネント使用
  - 2カラムレイアウトのスケルトン（写真エリア: 3:4アスペクト比、情報カード: 固定高さ）
  - _Requirements: 1.3_

- [ ] 2.5 (P) エラーページの実装
  - `app/employees/[employeeId]/error.tsx`を実装（Client Component）
  - `"use client"`宣言
  - Error Boundaryでエラーをキャッチしコンソールログにエラーメッセージ出力
  - shadcn/ui Cardでエラーメッセージ表示
  - 開発環境のみエラースタックトレース表示
  - 再試行ボタン（`reset()`呼び出し）
  - _Requirements: 1.4, 9.1, 9.5, 9.6_

- [ ] 2.6 (P) 404ページの実装
  - `app/employees/[employeeId]/not-found.tsx`を実装（RSC）
  - shadcn/ui Cardで404メッセージ表示
  - 社員一覧へのリンク（`/employees`）
  - _Requirements: 1.2, 9.3_

### フェーズ3: UIコンポーネント実装

- [ ] 3. 社員写真表示コンポーネントの実装 (P)
- [ ] 3.1 (P) 社員写真コンポーネントの実装
  - `components/employee/employee-detail-photo.tsx`を実装（Client Component）
  - `"use client"`宣言、Props型定義（`s3Key: string | null`）
  - `usePresignedUrl(s3Key)`フックでPresigned URL取得
  - 3:4アスペクト比固定（`aspect-[3/4]`）、白背景（`bg-white`）
  - `object-contain`で画像全体を枠内表示、中央配置（`flex items-center justify-center`）
  - ローディング中はスケルトン表示（`animate-pulse`）
  - `url`が`null`の場合はプレースホルダー画像（`/placeholder-avatar.svg`）
  - Next.js Imageコンポーネント使用（`fill`、`sizes="(max-width: 768px) 100vw, 50vw"`）
  - 角丸・影付き（`rounded-lg shadow-md`）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.10_

- [ ] 3.2* (P) 社員写真コンポーネントのテスト
  - `components/employee/employee-detail-photo.test.tsx`を実装
  - `usePresignedUrl`フックをモック
  - ローディング中にスケルトンが表示されることを検証
  - 写真URLが取得できたら画像が表示され、`object-contain`クラスが適用されることを検証
  - `s3Key`が`null`の場合にプレースホルダーが表示されることを検証
  - _Requirements: 3.2, 3.3, 3.4_

- [ ] 4. 社員情報カードコンポーネントの実装 (P)
- [ ] 4.1 (P) 社員情報カードコンポーネントの実装
  - `components/employee/employee-detail-card.tsx`を実装（Client Component）
  - `"use client"`宣言、Props型定義（`employee: Employee`）
  - shadcn/ui Card（CardHeader、CardContent）使用
  - 氏名（漢字）を見出しで強調表示（`text-2xl font-bold`）
  - フリガナを小さめフォントで表示（`text-sm text-gray-600`）
  - 社員番号、入社年（`new Date(hireDate).getFullYear()`で抽出）、携帯、メール表示
  - 携帯が`null`の場合は「未登録」表示
  - メールアドレスは`mailto:`リンク（`text-blue-600 hover:underline`）
  - 各情報項目はラベル付き表示（`text-sm font-semibold text-gray-700`）
  - 各項目間に余白（`space-y-4`）
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ] 4.2 (P) 所属一覧表示機能の実装
  - `employee-detail-card.tsx`内に所属一覧セクション追加
  - 所属が存在する場合は`ul`で複数行表示（`space-y-1`）
  - フォーマット: `{organizationPath}{position && ` (${position})`}`
  - 所属が存在しない場合は「所属情報なし」メッセージ（`text-sm text-gray-500`）
  - 各所属を箇条書きで視覚的に区切り（`li`要素、`text-sm`）
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 4.3* (P) 社員情報カードコンポーネントのテスト
  - `components/employee/employee-detail-card.test.tsx`を実装
  - モック社員データ作成（全フィールド含む）
  - 社員情報が正しく表示されることを検証（氏名、フリガナ、社員番号、入社年）
  - メールアドレスがリンクとして表示され、`mailto:`属性を持つことを検証
  - 所属情報が複数行で表示され、役職が括弧付きで表示されることを検証
  - 携帯電話が`null`の場合に「未登録」が表示されることを検証
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 5.1, 5.3, 5.4_

### フェーズ4: 統合 & エラーハンドリング

- [ ] 5. エラーハンドリングとレスポンシブ対応の統合
- [ ] 5.1 S3画像エラーハンドリングの統合
  - `EmployeeDetailPhoto`でPresigned URL取得エラー時にプレースホルダー表示を確認
  - `usePresignedUrl`フックのエラー状態でコンソールエラーログが出力されることを確認
  - エラー時もレイアウトが崩れないことを確認
  - _Requirements: 9.2, 9.4_

- [ ] 5.2 レスポンシブレイアウトの検証
  - デスクトップ（`md`以上）で左右2カラムレイアウトが表示されることを確認
  - モバイル（`md`未満）で縦1カラムレイアウト（写真が上、情報が下）が表示されることを確認
  - 写真表示エリアがモバイルで適切なサイズに調整されることを確認
  - 社員情報カードがモバイルで横幅100%になることを確認
  - 全ビューポートサイズで読みやすいフォントサイズと行間を確認
  - _Requirements: 2.1, 2.4, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 5.3 認証フローとナビゲーションの統合確認
  - `proxy.ts`による認証チェックが動作し、未認証時に`/login`へリダイレクトされることを確認
  - `getUser()`でサーバーサイド認証が確認されることを確認
  - PageHeaderが共通ヘッダーとして表示されることを確認（`app/layout.tsx`の`PageHeaderWrapper`統合）
  - ブラウザの戻るボタンで社員一覧画面に戻れることを確認
  - _Requirements: 6.1, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4_

### フェーズ5: パフォーマンス & 最終検証

- [ ] 6. パフォーマンスとSEO検証
- [ ] 6.1 サーバーサイドレンダリングの検証
  - React Server Components（RSC）が正しく動作し、サーバーサイドでデータフェッチが完了することを確認
  - クライアントサイドフェッチが不要であることを確認（初回表示時）
  - 動的メタデータ（`generateMetadata()`）が正しく生成され、ページタイトルが「社員名 - 社員詳細 - peer-search」形式になることを確認
  - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [ ] 6.2 画像最適化の検証
  - Next.js Imageコンポーネントが画像を最適化していることを確認（WebP変換、遅延ローディング）
  - Presigned URL生成がサーバーサイドで完了し、クライアントに完成したURLが渡されることを確認
  - 画像ローディング中にスケルトンが表示されることを確認
  - _Requirements: 3.8, 8.4, 8.6_

- [ ] 6.3 エンドツーエンドフロー検証
  - 社員一覧画面から社員カードをクリックして詳細画面に遷移できることを確認
  - 詳細画面で写真とカード情報が正しく表示されることを確認
  - 所属情報が複数行で表示されることを確認
  - メールリンクをクリックするとメーラーが起動することを確認
  - 存在しない社員IDで404ページが表示されることを確認
  - データベースエラー時にエラーページが表示され、再試行ボタンで再読み込みできることを確認
  - _Requirements: 1.2, 1.4, 4.5, 5.1, 9.1, 9.3_

---

## 要件カバレッジ

全10要件（要件1〜10）を以下のタスクでカバー:

- **要件1**: タスク1.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.3
- **要件2**: タスク2.2, 5.2
- **要件3**: タスク3.1, 3.2, 6.2
- **要件4**: タスク4.1, 4.3, 6.3
- **要件5**: タスク4.2, 4.3, 6.3
- **要件6**: タスク5.3
- **要件7**: タスク2.2, 5.3
- **要件8**: タスク2.2, 2.3, 6.1, 6.2
- **要件9**: タスク2.5, 2.6, 5.1, 6.3
- **要件10**: タスク2.2, 5.2

---

## 実装順序の推奨

1. **フェーズ1（データレイヤー）**: タスク1.1 → 1.2（並行可能）
2. **フェーズ2（ページコンポーネント）**: タスク2.1 → 2.2 → 2.3 → 2.4, 2.5, 2.6（2.4〜2.6は並行可能）
3. **フェーズ3（UIコンポーネント）**: タスク3.1, 4.1 → 4.2 → 3.2, 4.3（並行可能）
4. **フェーズ4（統合）**: タスク5.1, 5.2, 5.3（並行可能）
5. **フェーズ5（最終検証）**: タスク6.1 → 6.2 → 6.3

---

## 注意事項

- **既存コードへの影響ゼロ**: 既存の`EmployeeCard`、`EmployeePhoto`は変更しない
- **TypeScript strictモード**: 全コードでTypeScript strictモード遵守
- **テストコロケーション**: テストファイルはコンポーネントと同じディレクトリに配置
- **Biome自動整理**: コミット前にBiomeでコード整形とインポート整理
- **オプショナルテスト**: `*`マークのタスクはMVP後に実装可能（受入基準は実装で満たされる）
