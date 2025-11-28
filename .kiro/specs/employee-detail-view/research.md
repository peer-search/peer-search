# 研究 & 設計決定ログ

---
**目的**: ディスカバリー調査結果、アーキテクチャ調査、および技術設計を支える根拠を記録する。

**使用方法**:
- ディスカバリーフェーズでの研究活動と成果をログ化
- design.mdに含めるには詳細すぎる設計決定のトレードオフを文書化
- 将来の監査や再利用のための参照と証拠を提供
---

## サマリ
- **機能**: `employee-detail-view`
- **ディスカバリースコープ**: Extension（既存システムの拡張）
- **主要な発見**:
  - 既存の社員一覧画面パターン（RSC、Drizzle ORM、S3統合）を最大限再利用可能
  - 単一社員取得関数（`getEmployeeById()`）が欠如、`searchEmployees()`のJOINロジックを再利用して実装
  - 写真表示要件の差異（`object-cover` → `object-contain`）により、新規コンポーネント作成が必要
  - Next.js 16動的ルーティング、メタデータ生成、404対応の既存パターンが確立

## 研究ログ

### Next.js 16 動的ルーティングとメタデータ生成

**コンテキスト**: `/employees/[employeeId]`の動的ルート実装とSEO対応のための動的メタデータ生成が必要。

**参照元**: 既存コードベース（`app/employees/page.tsx`）、Next.js公式ドキュメント

**発見**:
- Next.js 16 App Routerでは`[employeeId]`ディレクトリを作成し、`page.tsx`、`loading.tsx`、`error.tsx`、`not-found.tsx`を配置
- `generateMetadata()`関数でページタイトルとメタデータを動的生成
  - 関数シグネチャ: `async function generateMetadata({ params }: { params: Promise<{ employeeId: string }> }): Promise<Metadata>`
  - `params`は非同期でawaitが必要（Next.js 16仕様）
- `notFound()`関数（`next/navigation`）を呼び出すことで404ページへリダイレクト
- `not-found.tsx`を配置することでカスタム404ページを表示

**実装への影響**:
- `app/employees/[employeeId]/page.tsx`: メインページコンポーネント（RSC）
- `app/employees/[employeeId]/loading.tsx`: ローディング画面
- `app/employees/[employeeId]/error.tsx`: エラー画面
- `app/employees/[employeeId]/not-found.tsx`: 404画面
- `generateMetadata()`で動的メタデータ生成: `"${employee.nameKanji} - 社員詳細 - peer-search"`

### Drizzle ORM JOINクエリパターン

**コンテキスト**: 単一社員の情報と所属組織を一度に取得するためのJOINクエリ実装が必要。

**参照元**: `lib/employees/service.ts`の`searchEmployees()`関数

**発見**:
- 既存の`searchEmployees()`は`employees LEFT JOIN employee_organizations LEFT JOIN organizations`を使用
- `buildOrganizationPath()`でWITH RECURSIVEを使用した組織階層パス生成
- 社員IDでの単一検索に最適化するには、`WHERE eq(employees.id, employeeId)`を追加
- 集約処理（Map使用）で複数所属を配列化

**実装への影響**:
- `getEmployeeById(employeeId: string): Promise<Employee | null>`関数を`lib/employees/service.ts`に追加
- JOINロジックは`searchEmployees()`から再利用、WHERE条件のみ変更
- 存在しない場合は`null`を返し、呼び出し側で`notFound()`を実行

### S3 Presigned URL統合

**コンテキスト**: 社員写真をS3から取得し、セキュアに表示する必要がある。

**参照元**: `lib/s3/presigned-url.ts`, `lib/s3/use-presigned-url.ts`, `app/api/s3/presign/route.ts`

**発見**:
- サーバーサイド: `generatePresignedGetUrl(key: string, expiresIn: number)`でPresigned URL生成（デフォルト1時間有効）
- クライアントサイド: `usePresignedUrl(s3Key: string | null)`フックで非同期URL取得
- API Route: `/api/s3/presign`（POST）で認証チェック後にPresigned URL発行
- プレースホルダー: `/placeholder-avatar.svg`

**実装への影響**:
- 詳細画面の写真コンポーネント（`EmployeeDetailPhoto`）は`usePresignedUrl`フックを再利用
- `object-contain`、3:4アスペクト比、白背景（`bg-white`）を適用
- Next.js Imageコンポーネントで最適化

### 写真表示要件の差異（object-cover vs object-contain）

**コンテキスト**: 一覧画面は`object-cover`だが、詳細画面は`object-contain`が要件。

**参照元**: `components/employee/employee-photo.tsx`、要件定義書

**発見**:
- 一覧画面: `object-cover`で写真を枠いっぱいに表示（トリミングあり）
- 詳細画面: `object-contain`でアスペクト比保持、枠内に全体表示（余白あり）
- 既存の`EmployeePhoto`を拡張すると条件分岐が増加し、単一責任原則違反

**実装への影響**:
- 新規コンポーネント`EmployeeDetailPhoto`作成（`object-contain`専用）
- `usePresignedUrl`フック、プレースホルダー処理は再利用
- Tailwind CSS: `aspect-[3/4]`, `object-contain`, `flex items-center justify-center`, `bg-white`

### shadcn/ui Cardコンポーネント

**コンテキスト**: 詳細情報カードのUI実装。

**参照元**: `components/employee/employee-card.tsx`, `components/ui/card.tsx`

**発見**:
- shadcn/ui `Card`, `CardHeader`, `CardContent`が既にインストール済み
- 一覧画面の`EmployeeCard`は`Link`でラップされており、詳細画面では不要
- 詳細画面カードは情報量が多い（入社年抽出、メールリンク、所属強調）

**実装への影響**:
- 新規コンポーネント`EmployeeDetailCard`作成（詳細表示専用）
- shadcn/ui Cardを使用、`Link`ラップなし
- 入社年: `new Date(employee.hireDate).getFullYear()`
- メール: `<a href={`mailto:${employee.email}`}>{employee.email}</a>`
- 所属一覧: `map((org) => <li>{org.organizationPath} {org.position && `(${org.position})`}</li>)`

## アーキテクチャパターン評価

| オプション | 説明 | 強み | リスク/制限 | 備考 |
|--------|-------------|-----------|---------------------|-------|
| Option A: 既存コンポーネント拡張 | `EmployeePhoto`, `EmployeeCard`に`variant`プロップ追加 | ファイル数最小、既存パターン活用 | 単一責任原則違反、条件分岐増加、テスト複雑化 | ❌ 非推奨 |
| Option B: 新規コンポーネント作成 | `EmployeeDetailPhoto`, `EmployeeDetailCard`を新規作成 | 責任分離明確、既存コンポーネントに影響なし、テスト独立性 | ファイル数増加（7ファイル）、類似ロジック重複 | ✅ 推奨 |
| Option C: ハイブリッドアプローチ | データレイヤー拡張 + 新規UIコンポーネント | 既存パターン最大活用、段階的実装可能、リスク分散 | 複数フェーズで完成度向上 | ✅ 推奨（採用） |

## 設計決定

### 決定: ハイブリッドアプローチの採用

**コンテキスト**: 既存コードへの影響を最小化しつつ、クリーンな分離を実現する必要がある。

**検討した代替案**:
1. Option A: 既存コンポーネント拡張 - 条件分岐増加、単一責任原則違反
2. Option B: 新規コンポーネント完全作成 - ファイル数増加、ユーティリティ重複
3. Option C: ハイブリッドアプローチ - データレイヤー拡張 + 新規UIコンポーネント

**選択したアプローチ**: Option C（ハイブリッド）

**根拠**:
- データレイヤー（`getEmployeeById()`）は`lib/employees/service.ts`に追加し、既存の`searchEmployees()`から独立
- UIコンポーネント（`EmployeeDetailPhoto`, `EmployeeDetailCard`）は新規作成で責任分離
- S3ユーティリティ（`usePresignedUrl`, `generatePresignedGetUrl()`）、認証ロジック（`getUser()`, `proxy.ts`）は再利用
- 既存コンポーネント（`EmployeeCard`, `EmployeePhoto`）は変更しない → 一覧画面への影響ゼロ

**トレードオフ**:
- ✅ 既存パターン最大活用、段階的実装可能、リスク分散
- ❌ ファイル数増加（7ファイル）、類似ロジックの部分的重複

**フォローアップ**:
- 実装時にテストケース追加（`getEmployeeById.test.ts`, `employee-detail-photo.test.tsx`, `employee-detail-card.test.tsx`）
- パフォーマンス計測（`getEmployeeById()`実行時間）

### 決定: データ取得関数の実装戦略

**コンテキスト**: 単一社員取得関数`getEmployeeById()`の実装方法。

**検討した代替案**:
1. `searchEmployees()`を内部呼び出し（WHERE条件に`id`を追加） - 既存ロジック再利用だが集約処理が不要に複雑
2. 新規JOINクエリ実装（`searchEmployees()`から独立） - 最適化されたシンプルなクエリ

**選択したアプローチ**: 新規JOINクエリ実装（独立関数）

**根拠**:
- 単一ID検索に特化したシンプルなクエリで可読性向上
- `searchEmployees()`の集約処理（Map使用）は複数検索結果前提で不要
- JOINロジック（`employees LEFT JOIN employee_organizations LEFT JOIN organizations`）は再利用

**トレードオフ**:
- ✅ シンプル、高速、可読性高い
- ❌ JOINロジックの部分的重複（許容範囲）

### 決定: 写真コンポーネントの分離

**コンテキスト**: 一覧画面（`object-cover`）と詳細画面（`object-contain`）で写真表示要件が異なる。

**検討した代替案**:
1. `EmployeePhoto`に`objectFit`プロップ追加 - 既存コンポーネント拡張
2. `EmployeeDetailPhoto`新規作成 - 責任分離

**選択したアプローチ**: `EmployeeDetailPhoto`新規作成

**根拠**:
- 一覧画面と詳細画面で責任が異なる（一覧: サムネイル、詳細: 全体表示）
- `object-contain`に加え、白背景、中央配置など詳細画面固有の要件がある
- 既存コンポーネントへの影響なし（一覧画面の動作保証）

**トレードオフ**:
- ✅ 責任明確、テスト独立、既存コンポーネントに影響なし
- ❌ ファイル1つ追加、`usePresignedUrl`フック呼び出しは重複

## リスクと緩和策

- **リスク1: 写真アスペクト比制約（object-contain）の実装誤り** → 緩和策: Tailwind CSS `aspect-[3/4]`, `object-contain`, `flex items-center justify-center`, `bg-white`で確実に実装、テストで確認
- **リスク2: 動的ルートでのUUID検証漏れ** → 緩和策: `getEmployeeById()`で存在チェック、`null`返却時に`notFound()`呼び出し、`not-found.tsx`で404ページ表示
- **リスク3: Presigned URL生成エラー** → 緩和策: エラー時にプレースホルダー画像表示、コンソールエラーログ出力、`error.tsx`でエラーページ表示
- **リスク4: 所属一覧の階層パス生成遅延** → 緩和策: `buildOrganizationPath()`のパフォーマンス監視（既存実装で問題なし）、必要に応じてキャッシュ検討

## 参考文献

- [Next.js 公式ドキュメント - Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes) - 動的ルーティング
- [Next.js 公式ドキュメント - Metadata](https://nextjs.org/docs/app/building-your-application/optimizing/metadata) - メタデータ生成
- [Next.js 公式ドキュメント - not-found.js](https://nextjs.org/docs/app/api-reference/file-conventions/not-found) - 404対応
- [Drizzle ORM 公式ドキュメント - Queries](https://orm.drizzle.team/docs/queries) - JOINクエリ
- [AWS SDK for JavaScript v3 - S3 Presigned URLs](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/modules/_aws_sdk_s3_request_presigner.html) - Presigned URL生成
- [Tailwind CSS 公式ドキュメント - Aspect Ratio](https://tailwindcss.com/docs/aspect-ratio) - アスペクト比
- [shadcn/ui 公式ドキュメント - Card](https://ui.shadcn.com/docs/components/card) - Cardコンポーネント
- 既存コードベース:
  - `app/employees/page.tsx` - RSCパターン
  - `lib/employees/service.ts` - Drizzle ORMクエリパターン
  - `lib/s3/presigned-url.ts` - S3統合パターン
  - `components/employee/employee-photo.tsx` - 写真表示パターン
