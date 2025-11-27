# Gap Analysis: employee-query-optimization

## 1. Current State Investigation

### 1.1 Key Files and Modules

**主要な関連ファイル:**

- **`lib/employees/service.ts`** (436行) - 社員データ取得の中核サービス
  - `buildOrganizationPath()` (12-44行): 単一組織の階層パス生成（N+1問題の原因）
  - `searchEmployees()` (118-267行): 社員一覧取得とN+1クエリ実行箇所（258-264行）
  - `getEmployeeById()` (276-349行): 社員詳細取得とN+1クエリ実行箇所（343-346行）

- **`app/employees/page.tsx`** - 社員一覧ページ（`searchEmployees()` 呼び出し）
- **`app/employees/[employeeId]/page.tsx`** - 社員詳細ページ
  - `generateMetadata()` (18-27行): 1回目の `getEmployeeById()` 呼び出し
  - `EmployeeDetailPage` (29-96行): 2回目の `getEmployeeById()` 呼び出し（重複）

- **`db/schema.ts`** - データベーススキーマ定義
  - `organizations` テーブル (23-42行): 階層構造、インデックス定義済み
  - `employees` テーブル (53-75行): 社員情報、インデックス定義済み
  - `employeeOrganizations` テーブル (83-107行): 多対多リレーション、インデックス定義済み

**テストファイル:**

- **`lib/employees/service.test.ts`** - 既存のユニットテスト（型定義検証のみ、モック使用）
- **`lib/employees/integration.test.ts`** - 統合テスト（存在確認済み）
- その他: `actions.test.ts`, `validation.test.ts`, `performance-seo-validation.test.ts` など

### 1.2 Architecture Patterns

**データアクセスパターン:**

- **Drizzle ORM使用**: TypeScriptファーストなORM、型安全なクエリビルダー
- **生SQLサポート**: `db.execute()` + `sql` テンプレートタグで `WITH RECURSIVE` 実行
- **Server Components**: Next.js App RouterのRSCでサーバーサイドデータフェッチ
- **Server Actions**: データ変更操作は `lib/employees/actions.ts` で実装（今回は対象外）

**既存のパフォーマンス計測:**

- `searchEmployees()` 内で `performance.now()` による実行時間計測実装済み（203-217行）
- 500ms超過時に警告ログ出力
- パラメータ情報をログに含める

**コーディング規約:**

- **関数の可視性**: 内部関数は `async function` で定義（エクスポートなし）
- **型定義**: インターフェースをエクスポート（`Employee`, `EmployeeOrganization`, `SearchEmployeesParams`）
- **エラーハンドリング**: try-catch は呼び出し側で実施
- **命名規則**: camelCase、動詞+名詞パターン（`buildOrganizationPath`, `getEmployeeById`）

### 1.3 Integration Surfaces

**データモデル（既存）:**

```typescript
// 変更不可の既存型定義
export interface EmployeeOrganization {
  organizationId: string;
  organizationName: string;
  organizationPath: string; // ← 一括取得の対象
  position: string | null;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  nameKanji: string;
  nameKana: string;
  photoS3Key: string | null;
  mobilePhone: string | null;
  email: string;
  hireDate: Date;
  organizations: EmployeeOrganization[];
}
```

**データベーススキーマ:**

- `organizations` テーブル: `id` (PK), `parent_id` (FK, インデックス済み), `level`, `name`
- `employee_organizations` テーブル: `employee_id` (FK, インデックス済み), `organization_id` (FK, インデックス済み)
- **すべての必要なインデックスが既に存在** - Requirement 6の検証は容易

**認証・権限:**

- `getUser()` でSupabase認証確認（Next.js proxyパターン）
- 今回のパフォーマンス最適化では権限ロジックは変更不要

## 2. Requirements Feasibility Analysis

### 2.1 Technical Needs Mapping

| Requirement | 必要な技術要素 | 既存資産 | Gap |
|------------|------------|--------|-----|
| **Req 1: 組織階層パス一括取得** | WITH RECURSIVEで複数組織を一括処理する新関数 | `buildOrganizationPath()` の単一版あり | **Missing**: 一括取得版の実装 |
| **Req 2: 社員一覧最適化** | `searchEmployees()` の修正、一括取得関数の呼び出し | 既存の `searchEmployees()` | **Extend**: ループ部分（258-264行）を置き換え |
| **Req 3: 社員詳細最適化** | `getEmployeeById()` の修正、一括取得関数の呼び出し | 既存の `getEmployeeById()` | **Extend**: ループ部分（343-346行）を置き換え |
| **Req 4: データ取得重複解消** | React `cache()` または Next.js `unstable_cache` | 現在キャッシュなし | **Missing**: キャッシュ実装 |
| **Req 5: パフォーマンス計測** | 実行時間計測、ログ出力 | 既に `searchEmployees()` で実装済み | **Extend**: 新関数にも同様のロジック追加 |
| **Req 6: インデックス検証** | DBスキーマ確認、必要に応じてマイグレーション | 全インデックス存在 (`db/schema.ts:38,40,71-73,99-105`) | **None**: 検証のみで追加不要 |
| **Req 7: 後方互換性** | 既存テストのパス、型定義維持 | 既存テスト8ファイル | **Constraint**: 既存インターフェース変更禁止 |
| **Req 8: テストカバレッジ** | 新関数のユニットテスト、既存テスト更新 | テストフレームワーク整備済み（Vitest） | **Missing**: 新関数のテスト作成 |

### 2.2 Identified Gaps and Constraints

**Missing Capabilities:**

1. **組織階層パス一括取得関数** - 複数組織IDを受け取り、1回のWITH RECURSIVEクエリで全組織の階層パスを返す新関数が必要
2. **React cache機能の適用** - `getEmployeeById()` をキャッシュでラップする実装が必要

**Constraints:**

1. **型定義の不変性** - `Employee` および `EmployeeOrganization` インターフェースは変更不可
2. **既存テストの維持** - すべての既存テストが引き続きパスする必要がある
3. **UIの不変性** - 社員一覧・詳細ページのレンダリング結果は変更不可

**Unknowns / Research Needed:**

1. **React 19の `cache()` 動作** - Next.js 16 + React 19環境でのcache()の正確な挙動（特にgenerateMetadataとの組み合わせ）
   - 調査観点: キャッシュスコープ、キャッシュキー生成、リクエストライフサイクル
2. **WITH RECURSIVEの一括クエリ最適化** - 複数組織を一度に処理する最適なSQL構造
   - 調査観点: UNION ALLによる複数起点の再帰、パフォーマンス特性

### 2.3 Complexity Signals

**タスクの性質:**

- **アルゴリズム最適化** - N+1問題の解決（単純→一括への変換）
- **データアクセス改善** - クエリ削減とキャッシング
- **既存コードの修正** - 新規機能追加ではなく、既存関数の最適化

**複雑度の低い要因:**

- 明確な問題箇所（258-264行、343-346行）
- 既存の WITH RECURSIVE パターンが利用可能
- データベーススキーマ変更不要（インデックス完備）
- 既存のパフォーマンス計測パターンが参考可能

**複雑度の高い要因:**

- React 19 `cache()` の挙動検証が必要
- 一括クエリのSQL最適化（複数起点の再帰CTE）
- 既存テストのモック構造への影響

## 3. Implementation Approach Options

### Option A: Extend Existing Components (推奨)

**アプローチ:**

既存の `lib/employees/service.ts` に新関数を追加し、`searchEmployees()` と `getEmployeeById()` を修正。

**Which files to extend:**

1. **`lib/employees/service.ts`**:
   - 新関数 `buildOrganizationPathsBatch(orgIds: string[]): Promise<Map<string, string>>` を追加
   - `searchEmployees()` の258-264行を一括取得ロジックに置き換え
   - `getEmployeeById()` の343-346行を一括取得ロジックに置き換え

2. **`app/employees/[employeeId]/page.tsx`**:
   - `getEmployeeById()` を React 19 `cache()` でラップ
   - `generateMetadata()` と `EmployeeDetailPage` で同じキャッシュされた関数を使用

**Compatibility Assessment:**

- ✅ 既存の `Employee` / `EmployeeOrganization` 型定義は変更なし
- ✅ 公開APIインターフェース（`searchEmployees`, `getEmployeeById`）のシグネチャは不変
- ✅ 既存の呼び出し元（ページコンポーネント）は変更不要（cache適用以外）
- ✅ 内部実装のみ変更のため、破壊的変更なし

**Complexity and Maintainability:**

- **認知負荷**: 低 - 既存パターン（WITH RECURSIVE）の拡張
- **単一責任原則**: 維持 - service.tsの責務は「社員データ取得」のまま
- **ファイルサイズ**: 許容範囲 - 新関数50行程度追加で~500行（管理可能）

**Trade-offs:**

- ✅ 最小限の変更で最大の効果
- ✅ 既存のパフォーマンス計測パターンをそのまま適用可能
- ✅ テスト影響範囲が限定的
- ✅ デプロイリスクが低い
- ❌ service.tsの行数が若干増加（ただし許容範囲）

### Option B: Create New Components

**アプローチ:**

組織階層パス取得専用のサービスモジュール `lib/organizations/hierarchy-path.ts` を新規作成。

**Which files to create:**

1. **`lib/organizations/hierarchy-path.ts`**:
   - `buildOrganizationPath(orgId: string): Promise<string>` - 既存関数を移動
   - `buildOrganizationPathsBatch(orgIds: string[]): Promise<Map<string, string>>` - 新関数

2. **`lib/organizations/hierarchy-path.test.ts`**:
   - 新モジュールのユニットテスト

**Integration Points:**

- `lib/employees/service.ts` から `hierarchy-path.ts` をインポート
- 既存の `buildOrganizationPath()` 呼び出しを新モジュール経由に変更

**Responsibility Boundaries:**

- **`hierarchy-path.ts`**: 組織階層パスの生成ロジックのみ担当
- **`service.ts`**: 社員データ取得ロジックに集中

**Trade-offs:**

- ✅ 関心の分離が明確
- ✅ 組織関連ロジックが集約される
- ✅ 将来的な拡張（組織サービスの充実）に有利
- ❌ ファイル数が増加（2ファイル追加）
- ❌ インポート依存関係が増える
- ❌ 既存の `buildOrganizationPath()` の移動が必要（影響範囲拡大）

### Option C: Hybrid Approach

**アプローチ:**

フェーズ1で Option A を実施し、将来的にリファクタリングでOption B に移行。

**Phase 1: 最小変更（Option A）**

- `lib/employees/service.ts` に一括取得関数を追加
- N+1問題を即座に解決
- キャッシュ適用

**Phase 2: リファクタリング（Option B）**

- 組織階層パス関連ロジックを `lib/organizations/` に移動
- コードの整理と関心の分離

**Trade-offs:**

- ✅ 段階的な実装でリスク分散
- ✅ 早期にパフォーマンス改善を実現
- ✅ 将来的な保守性向上の余地を残す
- ❌ 2段階の作業が必要（初期実装 + リファクタリング）
- ❌ Phase 2の実施タイミングが不明確

## 4. Implementation Complexity & Risk Assessment

### 4.1 Effort Estimation

**S (1-3 days)** ✅ **推奨範囲**

**根拠:**

- 新関数は既存の `buildOrganizationPath()` パターンの拡張（WITH RECURSIVEの複数起点化）
- 修正箇所が明確（service.ts の2箇所のループ）
- React `cache()` の適用は1ファイル（page.tsx）のみ
- データベーススキーマ変更なし、インデックス追加不要
- 既存テストの大部分がモックベース（影響小）

**作業内訳:**

- 新関数 `buildOrganizationPathsBatch()` の実装: 0.5日
- `searchEmployees()` の最適化: 0.3日
- `getEmployeeById()` の最適化: 0.3日
- React `cache()` 適用: 0.2日
- ユニットテスト作成・更新: 0.5日
- 統合テスト検証: 0.3日
- パフォーマンス検証とログ調整: 0.2日
- ドキュメント更新: 0.2日

**合計**: 2.5日

### 4.2 Risk Assessment

**Medium Risk** ⚠️

**リスク要因:**

1. **React 19 `cache()` の挙動（Medium Risk）**
   - Next.js 16 + React 19 は最新スタック
   - `cache()` と `generateMetadata()` の組み合わせ実績が少ない
   - **緩和策**: 公式ドキュメント精読、簡易検証コード作成、フォールバック案（`unstable_cache`）準備

2. **一括WITH RECURSIVEの最適化（Low-Medium Risk）**
   - 複数組織起点の再帰CTEの実装経験が必要
   - パフォーマンス特性の事前検証が重要
   - **緩和策**: 設計フェーズでSQLプロトタイプ作成、EXPLAIN ANALYZEで検証

3. **既存テストのモック影響（Low Risk）**
   - 既存テストは `db.execute()` をモック
   - 新関数も `db.execute()` を使用するため、モック構造は変更不要
   - **緩和策**: テスト実行で早期検出可能

**リスクが低い要因:**

- データベーススキーマ変更なし
- 型定義変更なし（後方互換性が保証される）
- 影響範囲が限定的（service.tsとpage.tsx）
- ロールバックが容易（修正箇所が少ない）

## 5. Recommendations for Design Phase

### 5.1 Preferred Approach

**Option A: Extend Existing Components** を推奨

**理由:**

1. **最小限の変更で最大の効果** - N+1問題解決に集中できる
2. **既存パターンの活用** - `buildOrganizationPath()` のWITH RECURSIVEロジックを拡張
3. **デプロイリスクが低い** - 影響範囲が明確で、ロールバックが容易
4. **短期間で実装可能** - 2.5日程度で完了見込み

### 5.2 Key Design Decisions

設計フェーズで決定すべき事項：

1. **一括取得関数のSQL構造**
   - 複数組織IDを引数として受け取るWITH RECURSIVEクエリの最適な実装
   - UNION ALLでの複数起点処理 vs IN句での条件分岐
   - パフォーマンス検証（EXPLAIN ANALYZE）

2. **React cache() の適用方法**
   - `cache(getEmployeeById)` vs カスタムラッパー関数
   - キャッシュキーの生成戦略
   - `generateMetadata()` との統合方法

3. **エラーハンドリング戦略**
   - 一括取得で一部の組織が見つからない場合の挙動
   - 空の階層パスの扱い（空文字列 vs null vs デフォルト値）

4. **パフォーマンス計測の詳細**
   - 新関数でのログ出力フォーマット
   - 計測ポイント（クエリ実行時間、全体処理時間）
   - 本番環境でのログレベル制御

### 5.3 Research Items

設計フェーズで調査・検証すべき項目：

1. **React 19 `cache()` の公式ドキュメント精読**
   - Next.js 16での推奨パターン
   - `generateMetadata()` との組み合わせ事例
   - キャッシュの有効範囲（リクエストスコープ）

2. **複数起点WITH RECURSIVEのSQLプロトタイピング**
   - 実データに近いサンプルデータでの性能検証
   - UNION ALLアプローチのクエリプラン分析
   - インデックス効果の確認

3. **Drizzle ORMでの型安全な一括クエリ**
   - `db.execute<T>()` の型定義とResult型のマッピング
   - `Map<string, string>` への変換パターン

## 6. Requirement-to-Asset Map

| Requirement | 既存資産 | Gap | 実装アプローチ |
|------------|--------|-----|--------------|
| **Req 1: 組織階層パス一括取得** | `buildOrganizationPath()` の単一版 | **Missing**: 一括版実装 | `buildOrganizationPathsBatch()` 新規追加 |
| **Req 2: 社員一覧最適化** | `searchEmployees()` 既存 | **Extend**: 258-264行のループ置き換え | 一括取得関数を呼び出し |
| **Req 3: 社員詳細最適化** | `getEmployeeById()` 既存 | **Extend**: 343-346行のループ置き換え | 一括取得関数を呼び出し |
| **Req 4: データ取得重複解消** | キャッシュなし | **Missing**: React `cache()` 適用 | `getEmployeeById` をキャッシュでラップ |
| **Req 5: パフォーマンス計測** | 既存計測ロジックあり（203-217行） | **Extend**: 新関数に同様の計測追加 | 既存パターンを踏襲 |
| **Req 6: インデックス検証** | 全インデックス存在 | **None**: 検証のみ | スキーマ確認で完了 |
| **Req 7: 後方互換性** | 既存テスト8ファイル | **Constraint**: 型定義・インターフェース不変 | 変更箇所を最小化 |
| **Req 8: テストカバレッジ** | Vitestフレームワーク整備済み | **Missing**: 新関数のテスト | ユニットテスト新規作成 |

---

## Summary

### 分析概要

- **スコープ**: 社員一覧・詳細ページのN+1クエリ問題解決とデータ取得重複解消
- **主要な課題**: 組織階層パス生成の一括処理化、React `cache()` によるキャッシング
- **推奨アプローチ**: 既存の `lib/employees/service.ts` を拡張し、新関数を追加（Option A）

### 実装の複雑度とリスク

- **Effort**: S (2.5日) - 既存パターンの拡張で対応可能
- **Risk**: Medium - React 19 `cache()` の挙動検証が必要、SQL最適化の事前検証推奨

### 次のステップ

ギャップ分析が完了しました。設計フェーズに進んでください：

```bash
/kiro:spec-design employee-query-optimization
```

設計フェーズでは以下を詳細化します：

1. `buildOrganizationPathsBatch()` の具体的なSQL実装とパフォーマンス検証
2. React 19 `cache()` の適用パターンと統合方法
3. テスト戦略の詳細化
