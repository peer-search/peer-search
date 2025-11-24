# 実装ギャップ分析: 社員詳細画面

## 分析サマリ

### スコープ
動的ルート `/employees/[employeeId]` における社員詳細情報の表示機能。左側3:4写真表示、右側情報カードの2カラムレイアウト。既存の社員一覧画面（`employee-list-view`）との連携を前提とする。

### 主要な課題
1. **動的ルーティング**: Next.js App Router Dynamic Routesの実装（`[employeeId]`ディレクトリ作成）
2. **個別社員データ取得関数の欠如**: `lib/employees/service.ts`には`searchEmployees`のみ存在し、単一社員取得関数が未実装
3. **写真表示の要件差異**: 一覧画面は`object-cover`だが、詳細画面は`object-contain` + 3:4アスペクト比固定が必要
4. **情報カードの詳細度**: 一覧画面より情報量が多い（入社年の抽出、所属の複数行表示強調）

### 推奨アプローチ
**Option B: Create New Components** を基本とし、既存コンポーネント・ユーティリティの再利用を最大化する**Hybrid Approach**を推奨。

---

## 1. 現状調査

### 既存アセット

#### データレイヤー
- **`lib/employees/service.ts`**:
  - `searchEmployees()`: 複数社員検索（WHERE条件、JOIN、集約処理実装済み）
  - `buildOrganizationPath()`: 組織階層パス生成（WITH RECURSIVE使用）
  - `getDescendantOrganizationIds()`: 組織配下ID取得
  - ❌ **欠如**: 単一社員取得関数（`getEmployeeById()`相当）

- **`db/schema.ts`**:
  - `employees`: 社員テーブル定義（id, employeeNumber, nameKanji, nameKana, photoS3Key, mobilePhone, email, hireDate等）
  - `employeeOrganizations`: 社員-組織中間テーブル
  - `organizations`: 組織テーブル
  - インデックス: `idx_employees_name_kana`, `idx_employees_employee_number`, `idx_employees_hire_date`

#### UIコンポーネント
- **`components/employee/employee-card.tsx`**:
  - 一覧画面用カード（`Link`でラップ、`/employees/${employee.id}`へ遷移）
  - 写真: `EmployeePhoto`（3:4、`object-cover`）
  - 情報: 氏名、社員番号、携帯、メール、所属一覧
  - shadcn/ui `Card`使用

- **`components/employee/employee-photo.tsx`**:
  - Client Component（`usePresignedUrl`フック使用）
  - 3:4アスペクト比、`object-cover`
  - プレースホルダー対応、ローディング状態
  - **差異**: 詳細画面は`object-contain`が要件

- **`lib/s3/use-presigned-url.ts`**:
  - カスタムフック: Client Componentで`/api/s3/presign`を呼び出し
  - ローディング、エラー状態管理

- **`lib/s3/presigned-url.ts`**:
  - `generatePresignedGetUrl()`: サーバーサイドでPresigned URL生成（1時間有効）
  - `generatePresignedPutUrl()`: アップロード用

- **`app/api/s3/presign/route.ts`**:
  - POST API: S3キーからPresigned URL生成（認証チェック付き）

#### レイアウト・エラーハンドリング
- **`app/employees/page.tsx`**:
  - RSC、`getUser()`で認証確認
  - `searchEmployees()`でデータ取得
  - `EmployeeCardList`でカード一覧表示

- **`app/employees/loading.tsx`**:
  - スケルトンカード6枚のローディング表示

- **`app/employees/error.tsx`**:
  - Client Component、エラーメッセージ + 再試行ボタン

- **`app/layout.tsx`**:
  - `PageHeaderWrapper`統合（ログインページ以外）
  - `getUser()`でキャッシュ

#### 認証
- **`lib/supabase-auth/auth.ts`**:
  - `getUser()`: サーバーサイド認証確認（キャッシュ付き）
- **`proxy.ts`**:
  - 全ルート認証チェック（Next.js 16 proxy pattern）

### 既存の規約・パターン

#### ディレクトリ構成
- **App Router**: `/app/employees/[employeeId]/page.tsx`（動的ルート）
- **Feature Components**: `/components/employee/`配下に機能コンポーネント配置
- **Service Layer**: `/lib/employees/service.ts`にデータ取得ロジック
- **S3 Utilities**: `/lib/s3/`にS3関連ユーティリティ

#### 命名規則
- React Components: PascalCase（`EmployeeDetailCard.tsx`）
- Utility files: camelCase（`service.ts`）
- Route segments: kebab-case（動的ルートは`[employeeId]`）
- Database tables: snake_case

#### スタイリング
- Tailwind CSS 4使用
- shadcn/ui Cardコンポーネント
- レスポンシブ: `md:`, `lg:`ブレークポイント

#### テストコロケーション
- `.test.tsx`をコンポーネントと同じディレクトリに配置

---

## 2. 要件フィージビリティ分析

### 技術的ニーズ（要件ベース）

#### 要件1: 動的ルーティングとデータフェッチ
**ニーズ**:
- Next.js Dynamic Routes: `/app/employees/[employeeId]/page.tsx`
- 単一社員取得関数: `getEmployeeById(employeeId: string)`
- RSC、Drizzle ORM、JOIN（employees + employeeOrganizations + organizations）
- 404対応: `notFound()`

**ギャップ**:
- ❌ **Missing**: `getEmployeeById()`関数（`lib/employees/service.ts`に追加）
- ✅ **Exists**: `searchEmployees()`の検索ロジック再利用可能
- ✅ **Exists**: `buildOrganizationPath()`で階層パス生成

**制約**:
- `searchEmployees()`はWHERE条件で複数社員対応だが、単一社員取得に最適化されていない（集約処理が不要に複雑）
- JOINロジックは再利用可能だが、単一ID検索に特化したシンプル版が望ましい

#### 要件2-3: 2カラムレイアウト + 写真表示
**ニーズ**:
- Tailwind CSS Grid/Flexbox
- レスポンシブ（md未満: 縦1カラム、md以上: 左右2カラム）
- 写真: 3:4アスペクト比、`object-contain`、中央配置、白背景
- Next.js Image最適化

**ギャップ**:
- ✅ **Exists**: `EmployeePhoto`コンポーネント（3:4アスペクト比、Presigned URL統合）
- ❌ **Conflict**: `EmployeePhoto`は`object-cover`だが、要件は`object-contain`
- ✅ **Exists**: `usePresignedUrl`フック、`generatePresignedGetUrl()`

**制約**:
- `EmployeePhoto`を拡張すると、一覧画面との互換性が崩れる可能性
- 新規コンポーネント（`EmployeeDetailPhoto`）を作成し、`object-contain`専用にする方が安全

#### 要件4-5: 社員情報カード + 所属一覧
**ニーズ**:
- shadcn/ui Card
- 情報: 氏名（漢字+かな）、社員番号、入社年、携帯、メール、所属一覧
- 入社年抽出: `new Date(hireDate).getFullYear()`
- メール: `mailto:`リンク
- 所属: 複数行、役職括弧表示

**ギャップ**:
- ✅ **Exists**: shadcn/ui Card
- ✅ **Exists**: `EmployeeCard`コンポーネントに類似ロジック
- ❌ **Difference**: 一覧カードより情報量が多い（入社年、強調表示）
- ✅ **Exists**: 所属一覧フォーマットは`EmployeeCard`で実装済み

**制約**:
- `EmployeeCard`は一覧用で`Link`でラップされている
- 詳細画面カードは独立コンポーネント（`EmployeeDetailCard`）が望ましい

#### 要件6: ナビゲーション
**ニーズ**:
- `PageHeader`統合（既にRootLayoutで実装済み）
- ブラウザ履歴管理（自動）

**ギャップ**:
- ✅ **Exists**: `PageHeaderWrapper`がRootLayoutで統合済み
- ✅ **Exists**: ヘッダーロゴ、検索バー機能実装済み

#### 要件7: 認証とアクセス制御
**ニーズ**:
- `getUser()`、`proxy.ts`による認証チェック

**ギャップ**:
- ✅ **Exists**: `getUser()`、`proxy.ts`実装済み
- ✅ **Exists**: `app/employees/page.tsx`で認証パターン確立

#### 要件8: パフォーマンスとSEO
**ニーズ**:
- RSC、`generateMetadata()`、Next.js Image

**ギャップ**:
- ✅ **Exists**: RSCパターン確立
- ❌ **Missing**: 動的メタデータ生成関数（`generateMetadata()`）
- ✅ **Exists**: Next.js Image使用例

#### 要件9: エラーハンドリング
**ニーズ**:
- `error.tsx`、`loading.tsx`、404対応（`notFound()`）

**ギャップ**:
- ✅ **Exists**: `app/employees/error.tsx`, `loading.tsx`パターン
- ❌ **Missing**: 動的ルート用の`error.tsx`, `loading.tsx`, `not-found.tsx`

#### 要件10: レスポンシブデザイン
**ニーズ**:
- Tailwind CSS `md:`、`lg:`ブレークポイント

**ギャップ**:
- ✅ **Exists**: Tailwind CSS 4設定済み
- ✅ **Exists**: レスポンシブパターン（`EmployeeCard`、`PageHeader`）

---

## 3. 実装アプローチオプション

### Option A: 既存コンポーネント拡張

**拡張対象**:
- `lib/employees/service.ts`: `getEmployeeById()`追加
- `components/employee/employee-photo.tsx`: `objectFit`プロップ追加（"cover" | "contain"）
- `components/employee/employee-card.tsx`: `variant`プロップ追加（"list" | "detail"）

**互換性評価**:
- `EmployeePhoto`: `objectFit`プロップで分岐可能だが、一覧画面の既存実装に影響なし（デフォルト"cover"）
- `EmployeeCard`: `variant`で分岐すると、条件分岐が増加し単一責任原則違反

**複雑度と保守性**:
- 🟡 **Medium**: 既存ファイルが複雑化、条件分岐増加
- 🟡 **Medium**: テストケース追加必要（両バリアント）

**トレードオフ**:
- ✅ 新規ファイル最小（1関数追加のみ）
- ✅ 既存パターン活用
- ❌ `EmployeeCard`が肥大化（一覧用と詳細用の混在）
- ❌ 条件分岐による複雑化

**推奨度**: ❌ **非推奨** - `EmployeeCard`の責任範囲が不明確になる

---

### Option B: 新規コンポーネント作成

**新規作成ファイル**:
1. **`app/employees/[employeeId]/page.tsx`**: 詳細ページコンポーネント（RSC）
2. **`app/employees/[employeeId]/loading.tsx`**: ローディング画面
3. **`app/employees/[employeeId]/error.tsx`**: エラー画面
4. **`app/employees/[employeeId]/not-found.tsx`**: 404画面
5. **`lib/employees/service.ts`**: `getEmployeeById()`関数追加
6. **`components/employee/employee-detail-photo.tsx`**: `object-contain`専用写真コンポーネント
7. **`components/employee/employee-detail-card.tsx`**: 詳細情報カード（shadcn/ui Card使用）

**統合ポイント**:
- `getEmployeeById()`: `searchEmployees()`のJOINロジック再利用、`WHERE id = $1`で最適化
- `employee-detail-photo.tsx`: `usePresignedUrl`フック、`generatePresignedGetUrl()`再利用
- `employee-detail-card.tsx`: 所属一覧フォーマットは`EmployeeCard`から参考（コピーではなく類似実装）

**責任境界**:
- `EmployeeDetailPhoto`: 詳細画面専用写真表示（3:4、`object-contain`、白背景）
- `EmployeeDetailCard`: 詳細情報表示（入社年抽出、メールリンク、所属強調）
- `page.tsx`: データフェッチ、レイアウト構築、認証チェック

**トレードオフ**:
- ✅ 責任分離明確（一覧 vs 詳細）
- ✅ 既存コンポーネントに影響なし
- ✅ テスト独立性
- ❌ ファイル数増加（7ファイル）
- ❌ 類似ロジックの重複（所属表示、写真表示）

**推奨度**: ✅ **推奨** - クリーンな分離、将来の拡張性

---

### Option C: ハイブリッドアプローチ

**戦略**:
- **拡張**: `lib/employees/service.ts`に`getEmployeeById()`追加
- **新規作成**: 詳細画面専用UIコンポーネント（`employee-detail-photo.tsx`, `employee-detail-card.tsx`）
- **再利用**: S3ユーティリティ（`usePresignedUrl`, `generatePresignedGetUrl()`）、shadcn/ui Card
- **段階実装**:
  1. Phase 1: `getEmployeeById()`、動的ルート、基本UI（写真+情報カード）
  2. Phase 2: メタデータ生成、404/エラーハンドリング改善
  3. Phase 3: テスト追加、パフォーマンス最適化

**コンポーネント分担**:
| コンポーネント | 役割 | 再利用元 |
|---|---|---|
| `page.tsx` | データフェッチ、レイアウト | `app/employees/page.tsx`パターン |
| `employee-detail-photo.tsx` | 写真表示（contain） | `usePresignedUrl`フック |
| `employee-detail-card.tsx` | 情報カード | shadcn/ui Card |
| `getEmployeeById()` | データ取得 | `searchEmployees()`JOIN再利用 |

**リスク緩和**:
- 既存コンポーネント（`EmployeeCard`, `EmployeePhoto`）は変更しない → 一覧画面への影響ゼロ
- `getEmployeeById()`は`searchEmployees()`から独立 → 検索機能への影響なし

**トレードオフ**:
- ✅ 既存パターン最大活用
- ✅ 段階的実装可能
- ✅ リスク分散
- ❌ 複数フェーズで完成度向上（初期MVP後に改善）

**推奨度**: ✅ **推奨** - 実用性と保守性のバランス

---

## 4. 実装複雑度とリスク

### 工数見積り
**サイズ**: **M（3～7日）**

**根拠**:
- 動的ルート作成: 0.5日
- `getEmployeeById()`実装: 0.5日
- 詳細画面UIコンポーネント: 1.5日（写真+情報カード）
- レスポンシブレイアウト調整: 1日
- エラーハンドリング、メタデータ: 1日
- テスト作成: 1～2日
- 統合テスト: 0.5～1日

**前提**:
- Next.js 16 Dynamic Routesに精通
- Drizzle ORMのJOINクエリ経験あり
- shadcn/ui使用経験あり

### リスク評価
**リスクレベル**: **Low（低）**

**根拠**:
- ✅ 既存パターン確立（RSC、Drizzle ORM、Presigned URL）
- ✅ 類似機能実装済み（一覧画面）
- ✅ 技術スタック統一（Next.js 16、React 19、Drizzle、S3）
- ✅ 明確な責任分離（新規コンポーネント作成）

**リスク要因**:
- 🟡 **写真アスペクト比制約**: `object-contain`での中央配置、余白処理（軽微）
- 🟡 **入社年抽出**: `hireDate`から年のみ抽出（JavaScriptで対応可能）
- 🟢 **動的ルート404**: `notFound()`で標準対応

**緩和策**:
- 写真レイアウト: Tailwind CSS `aspect-ratio`、`object-contain`、`bg-white`で確実に実装
- 404対応: Next.js公式ドキュメント参照、`not-found.tsx`作成

---

## 5. 設計フェーズへの推奨事項

### 推奨アプローチ
**Option C: Hybrid Approach**

**理由**:
- 既存コードへの影響を最小化しつつ、クリーンな分離を実現
- `getEmployeeById()`は`searchEmployees()`から独立実装（最適化）
- 詳細画面UIコンポーネントは新規作成（責任明確）
- S3ユーティリティ、認証ロジックは再利用

### 主要決定事項

1. **データ取得関数**: `lib/employees/service.ts`に`getEmployeeById()`追加
   - Drizzle ORM: `db.select().from(employees).leftJoin(...).where(eq(employees.id, employeeId))`
   - 所属組織: `buildOrganizationPath()`で階層パス生成
   - 型: `Employee`（既存型再利用）

2. **写真コンポーネント**: `components/employee/employee-detail-photo.tsx`新規作成
   - `object-contain`、3:4アスペクト比、白背景
   - `usePresignedUrl`フック再利用
   - プレースホルダー対応

3. **情報カード**: `components/employee/employee-detail-card.tsx`新規作成
   - shadcn/ui Card
   - 入社年: `new Date(hireDate).getFullYear()`
   - メール: `<a href={`mailto:${email}`}>`
   - 所属: `map((org) => <li>{org.organizationPath} ({org.position})</li>)`

4. **レイアウト**: `app/employees/[employeeId]/page.tsx`
   - Grid/Flexbox（md未満: 縦1カラム、md以上: 左右2カラム）
   - 左: `EmployeeDetailPhoto`、右: `EmployeeDetailCard`

5. **エラーハンドリング**:
   - `error.tsx`: 一覧画面パターン踏襲
   - `loading.tsx`: 写真+カードのスケルトン
   - `not-found.tsx`: 404メッセージ + ホームリンク

6. **メタデータ**: `generateMetadata()`関数追加
   - タイトル: `"${employee.nameKanji} - 社員詳細 - peer-search"`

### リサーチ項目

1. **Next.js 16 Dynamic Metadata**: `generateMetadata()`の実装パターン確認
   - 参考: [Next.js公式ドキュメント - Metadata](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)

2. **Tailwind CSS aspect-ratio + object-contain**: 中央配置、余白の実装例確認
   - 検証: `aspect-[3/4]`, `object-contain`, `flex items-center justify-center`

3. **UUID検証**: `employeeId`パラメータの検証方法（Next.js Dynamic Routesでの型チェック）
   - 検討: `notFound()`呼び出しタイミング（DB取得前 vs 後）

---

## 6. 要件-アセットマッピング

| 要件 | 既存アセット | ギャップ | 対応 |
|---|---|---|---|
| **要件1: 動的ルーティング** | - | Missing: 動的ルートディレクトリ | 新規: `/app/employees/[employeeId]/` |
| **要件1: データフェッチ** | `searchEmployees()` | Missing: `getEmployeeById()` | 拡張: `lib/employees/service.ts` |
| **要件2: 2カラムレイアウト** | - | Missing: レイアウト実装 | 新規: `page.tsx`（Grid/Flexbox） |
| **要件3: 写真表示（contain）** | `EmployeePhoto` | Conflict: `object-cover` | 新規: `employee-detail-photo.tsx` |
| **要件3: Presigned URL** | `usePresignedUrl`, `generatePresignedGetUrl()` | ✅ Exists | 再利用 |
| **要件4: 情報カード** | `EmployeeCard` | Difference: 一覧用 | 新規: `employee-detail-card.tsx` |
| **要件4: shadcn/ui Card** | `Card` | ✅ Exists | 再利用 |
| **要件5: 所属一覧** | `buildOrganizationPath()` | ✅ Exists | 再利用 |
| **要件6: PageHeader** | `PageHeaderWrapper` | ✅ Exists | 再利用（RootLayout統合済み） |
| **要件7: 認証** | `getUser()`, `proxy.ts` | ✅ Exists | 再利用 |
| **要件8: メタデータ** | - | Missing: `generateMetadata()` | 新規: `page.tsx`内 |
| **要件9: error.tsx** | `app/employees/error.tsx` | Missing: 動的ルート用 | 新規: `[employeeId]/error.tsx` |
| **要件9: loading.tsx** | `app/employees/loading.tsx` | Missing: 動的ルート用 | 新規: `[employeeId]/loading.tsx` |
| **要件9: not-found.tsx** | - | Missing: 404画面 | 新規: `[employeeId]/not-found.tsx` |
| **要件10: レスポンシブ** | Tailwind CSS設定 | ✅ Exists | 再利用 |

---

## 7. 実装推奨事項

### フェーズ1: MVP（必須機能）
1. `lib/employees/service.ts`に`getEmployeeById()`追加
2. `/app/employees/[employeeId]/page.tsx`作成（RSC、2カラムレイアウト）
3. `components/employee/employee-detail-photo.tsx`作成（`object-contain`）
4. `components/employee/employee-detail-card.tsx`作成（情報表示）
5. `[employeeId]/loading.tsx`、`[employeeId]/error.tsx`作成

### フェーズ2: 品質向上
6. `[employeeId]/not-found.tsx`作成（404対応）
7. `generateMetadata()`実装（動的SEO）
8. コンポーネントテスト作成（`employee-detail-photo.test.tsx`, `employee-detail-card.test.tsx`）
9. サービステスト作成（`getEmployeeById.test.ts`）

### フェーズ3: 最適化（オプション）
10. 画像ローディング最適化（`priority`, `placeholder="blur"`）
11. パフォーマンス計測（`performance.now()`で`getEmployeeById()`実行時間）
12. アクセシビリティ監査（ARIA属性、キーボードナビゲーション）

---

## 8. 結論

**実装複雑度**: M（3～7日）
**リスクレベル**: Low（低）
**推奨アプローチ**: Hybrid Approach（Option C）

**主要判断根拠**:
- 既存コードへの影響最小化（新規コンポーネント作成）
- S3ユーティリティ、認証ロジック、組織階層パスの再利用
- クリーンな責任分離（一覧画面 vs 詳細画面）
- Next.js 16、Drizzle ORM、Tailwind CSSの既存パターン活用

**次のステップ**:
設計フェーズ（`/kiro:spec-design employee-detail-view`）でAPI設計、コンポーネント仕様、データフロー図を詳細化してください。
