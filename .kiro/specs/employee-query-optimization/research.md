# Research & Design Decisions

## Summary
- **Feature**: `employee-query-optimization`
- **Discovery Scope**: Extension（既存システムの最適化）
- **Key Findings**:
  - React 19 の `cache()` は関数レベルのメモ化を提供し、同一リクエスト内で重複呼び出しを防止
  - PostgreSQL の WITH RECURSIVE は UNION ALL で複数起点を統合でき、一括階層取得が可能
  - 既存の全インデックスが存在し、追加のマイグレーション不要

## Research Log

### React 19 `cache()` 関数の動作

- **Context**: 社員詳細ページで `generateMetadata()` とページコンポーネントが同じ `getEmployeeById()` を重複呼び出ししている問題を解決する必要
- **Sources Consulted**:
  - React 19公式ドキュメント（cache APIリファレンス）
  - Next.js 16 App Router ドキュメント（generateMetadata + cache パターン）
  - プロジェクト内の既存実装（.kiro/specs/*/design.md）
- **Findings**:
  - React 19 の `cache(fn)` は関数をラップし、同一引数での呼び出しを同一リクエストスコープ内でメモ化
  - Next.js 16 では `generateMetadata()` とServer Componentは同一リクエストコンテキストを共有
  - キャッシュキーは引数のシリアライズ結果から自動生成される
  - 非同期関数（Promiseを返す関数）に対して適用可能
- **Implications**:
  - `getEmployeeById()` を `cache()` でラップすることで、`generateMetadata()` での取得結果がページコンポーネントでも再利用される
  - 型安全性が保たれる（`cache<T>` はジェネリック関数）
  - 追加のキャッシュキー管理が不要

### PostgreSQL WITH RECURSIVE 複数起点クエリ

- **Context**: 複数の組織IDから階層パスを一括取得する必要
- **Sources Consulted**:
  - PostgreSQL公式ドキュメント（WITH RECURSIVE構文）
  - 既存の `buildOrganizationPath()` 実装（lib/employees/service.ts:12-44）
  - db/schema.ts のインデックス定義
- **Findings**:
  - WITH RECURSIVE は UNION ALL で複数の非再帰項（ベースケース）を結合可能
  - 各組織IDを起点とする再帰CTEを1つのクエリにまとめることが可能
  - `organizations.parent_id` にインデックスが存在し、再帰クエリが最適化される
  - 結果を `GROUP BY organization_id` で集約し、`STRING_AGG(name, ' ' ORDER BY level ASC)` で階層パスを生成
- **Implications**:
  - N回のクエリが1回に削減される
  - 既存の `buildOrganizationPath()` のロジック（level順ソート、半角スペース区切り）を維持可能
  - Drizzle ORM の `db.execute<T>(sql`...`)` で型安全に実装できる

### Drizzle ORM での生SQL型定義

- **Context**: 一括取得関数の戻り値型を型安全に定義する必要
- **Sources Consulted**:
  - Drizzle ORM公式ドキュメント（execute + sqlテンプレート）
  - 既存の `buildOrganizationPath()` 実装
  - プロジェクトのtech.md（Drizzle ORMパターン）
- **Findings**:
  - `db.execute<RowType>(sql`...`)` でRowTypeを指定可能
  - 戻り値は `RowType[]` として型推論される
  - `Map<string, string>` への変換は TypeScript で安全に実装可能
- **Implications**:
  - `buildOrganizationPathsBatch()` の戻り値型を `Promise<Map<string, string>>` として明示
  - 内部的には `{ organization_id: string; path: string }[]` を取得後、Mapに変換

### 既存パフォーマンス計測パターン

- **Context**: 新関数にも同様のパフォーマンス計測を追加する必要
- **Sources Consulted**:
  - lib/employees/service.ts:203-217（既存の計測実装）
- **Findings**:
  - `performance.now()` を使用した実行時間計測
  - 500ms超過時に警告ログ、それ以外は通常ログ
  - ログメッセージにパラメータ情報を含める
- **Implications**:
  - 同じパターンを `buildOrganizationPathsBatch()` にも適用
  - ログに組織ID数を含めることで、一括取得のスケール感を把握可能

## Architecture Pattern Evaluation

既存システムの拡張のため、新規のアーキテクチャパターン評価は不要。既存パターン（Service Layer Pattern）を踏襲。

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存service.ts拡張 | `lib/employees/service.ts` に新関数を追加 | 最小限の変更、既存パターン踏襲、影響範囲が明確 | service.tsの行数増加（~50行） | ギャップ分析のOption A、推奨アプローチ |
| 新モジュール作成 | `lib/organizations/hierarchy-path.ts` を新規作成 | 関心の分離が明確、将来の拡張性 | ファイル数増加、既存関数の移動が必要 | ギャップ分析のOption B、過剰設計の可能性 |

**選択**: 既存service.ts拡張（Option A）を採用。理由: 最小変更で最大効果、デプロイリスク低減。

## Design Decisions

### Decision: 一括取得関数のSQL構造

- **Context**: 複数組織IDの階層パスを1回のクエリで取得する必要
- **Alternatives Considered**:
  1. **UNION ALL アプローチ** - 各組織IDを起点とする再帰CTEをUNION ALLで結合
  2. **IN句 + 再帰** - WHERE句で `id IN (...)` を使用し、すべての組織を同時に再帰処理
- **Selected Approach**: UNION ALL アプローチ
  - 各組織IDに対して非再帰項（ベースケース）を生成
  - UNION ALL で結合し、1つの再帰CTEとして処理
  - 最後に GROUP BY + STRING_AGG で階層パスを生成
- **Rationale**:
  - PostgreSQLのWITH RECURSIVEは複数起点をサポート
  - 既存の `buildOrganizationPath()` のロジックと一貫性が高い
  - インデックス（`organizations.parent_id`）が効果的に使用される
- **Trade-offs**:
  - **Benefits**: N+1問題の完全解決、クエリ数の大幅削減、型安全性の維持
  - **Compromises**: SQL が若干複雑化（ただし既存パターンの拡張で理解しやすい）
- **Follow-up**: 実装後に EXPLAIN ANALYZE でクエリプランを検証

### Decision: React `cache()` の適用方法

- **Context**: 社員詳細ページで `getEmployeeById()` が2回呼ばれる問題
- **Alternatives Considered**:
  1. **関数全体をcache()でラップ** - `const cachedGetEmployeeById = cache(getEmployeeById)`
  2. **ページ側で独自のキャッシュ実装** - 状態管理やContext APIを使用
- **Selected Approach**: 関数全体をcache()でラップ
  - `app/employees/[employeeId]/page.tsx` で `import { cache } from 'react'`
  - `const cachedGetEmployeeById = cache(getEmployeeById)`
  - `generateMetadata()` と `EmployeeDetailPage` の両方で `cachedGetEmployeeById()` を使用
- **Rationale**:
  - React 19の標準機能を活用
  - 型安全性が自動的に保たれる
  - Next.js 16 のApp Routerと完全互換
  - 最小限のコード変更
- **Trade-offs**:
  - **Benefits**: シンプル、メンテナンス性高い、追加の状態管理不要
  - **Compromises**: リクエストスコープ外（異なるユーザー）でのキャッシュ共有はない（意図的な設計）
- **Follow-up**: 実装後にログでキャッシュヒット率を確認

### Decision: 型定義の不変性保証

- **Context**: 既存の `Employee` および `EmployeeOrganization` 型定義を変更してはならない（後方互換性要件）
- **Alternatives Considered**:
  1. **型定義を拡張** - 新しいプロパティを追加
  2. **型定義を変更せず実装のみ最適化** - インターフェース不変
- **Selected Approach**: 型定義を変更せず実装のみ最適化
  - `Employee` および `EmployeeOrganization` の型定義は完全に維持
  - `organizationPath: string` の生成方法のみを変更（個別→一括）
- **Rationale**:
  - 後方互換性の確保（既存の呼び出し元が影響を受けない）
  - 型チェックによる破壊的変更の防止
  - テストの変更が最小限
- **Trade-offs**:
  - **Benefits**: 安全なデプロイ、ロールバックが容易
  - **Compromises**: なし（要件通り）
- **Follow-up**: 既存テストの全パスを確認

## Risks & Mitigations

- **リスク1: React `cache()` のキャッシュキー衝突**
  - 軽減策: `employeeId` が一意であることを前提とし、引数のシリアライズで自動的にキーが生成される。ログで動作を確認。

- **リスク2: 一括WITH RECURSIVEのパフォーマンス劣化**
  - 軽減策: EXPLAIN ANALYZE で検証、組織ID数が多い場合のパフォーマンステストを実施。500ms超過時の警告ログで監視。

- **リスク3: 空の組織ID配列や存在しない組織IDの扱い**
  - 軽減策: 関数仕様で明示（空配列→空Map、存在しないID→空文字列）、ユニットテストでカバー。

- **リスク4: 既存テストのモック構造への影響**
  - 軽減策: 既存テストは `db.execute()` をモック。新関数も同じため影響は最小限。テスト実行で早期検出。

## References

- [React 19 Documentation - cache](https://react.dev/reference/react/cache) — React 19 の cache API リファレンス
- [Next.js 16 Documentation - generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) — generateMetadata と cache の統合パターン
- [PostgreSQL Documentation - WITH Queries](https://www.postgresql.org/docs/current/queries-with.html) — WITH RECURSIVE 構文の公式ドキュメント
- [Drizzle ORM Documentation - Raw SQL](https://orm.drizzle.team/docs/sql) — Drizzle での生SQL実行パターン
- gap-analysis.md — 既存実装の詳細分析とアプローチ選択の根拠
