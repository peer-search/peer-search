# Implementation Plan

## Task Overview

本実装計画は、社員データ取得におけるN+1クエリ問題を解決し、データベースアクセスを最適化するための実装タスクを定義します。PostgreSQLのWITH RECURSIVEとReact 19のcache()を活用し、既存の型定義とUIを維持したまま、パフォーマンスのみを改善します。

---

## Tasks

### Phase 1: 組織階層パス一括取得機能の実装

- [x] 1. 組織階層パス一括取得関数の実装
- [x] 1.1 (P) `buildOrganizationPathsBatch` 関数の実装
  - 複数の組織IDを受け取り、1回のWITH RECURSIVEクエリで全組織の階層パスを取得する関数を実装
  - PostgreSQLのUNION ALLを使用して複数起点の再帰CTEを構築
  - `GROUP BY organization_id` と `STRING_AGG(name, ' ' ORDER BY level ASC)` で階層パスを生成
  - Drizzle ORMの `db.execute<{ organization_id: string; path: string }>(sql`...`)` で型安全に実装
  - 組織ID → 階層パス の `Map<string, string>` を返却
  - 空配列が渡された場合は空Mapを返す
  - 存在しない組織IDの場合は階層パスを空文字列として扱う
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 1.2 (P) パフォーマンス計測とログ出力の実装
  - `buildOrganizationPathsBatch` 内で `performance.now()` を使用した実行時間計測を実装
  - 500ms超過時に警告ログを出力（既存の `searchEmployees()` パターンを踏襲）
  - ログメッセージに処理対象の組織ID数を含める
  - ログフォーマット: `[Performance Warning] Batch organization path query took Xms (threshold: 500ms) { organizationCount: N }`
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 1.3 (P) ユニットテストの実装
  - 空配列が渡された場合、空Mapを返すテストケースを作成
  - 単一組織IDの場合、正しい階層パスを返すテストケースを作成
  - 複数組織IDの場合、すべての階層パスを含むMapを返すテストケースを作成
  - 存在しない組織IDが含まれる場合、空文字列を値として返すテストケースを作成
  - 階層パスの形式が既存の `buildOrganizationPath()` と一致することを確認するテストケースを作成
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

### Phase 2: 社員一覧の最適化

- [ ] 2. 社員一覧取得の最適化
- [x] 2.1 `searchEmployees` 関数の最適化
  - `lib/employees/service.ts:258-264` の組織階層パス個別生成ループを削除
  - すべての社員の所属組織IDを収集（`Set<string>` で重複排除）
  - `buildOrganizationPathsBatch(Array.from(orgIdsSet))` を呼び出し、階層パスMapを取得
  - 各社員の所属組織に階層パスMapから値を設定
  - 既存の `Employee` および `EmployeeOrganization` 型定義を変更しない
  - 既存のパフォーマンス計測（203-217行）を維持
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.2, 7.4_

- [x] 2.2* (P) 既存テストの更新と検証
  - 既存の `searchEmployees()` のテストケースがすべてパスすることを確認
  - `buildOrganizationPathsBatch()` が適切に呼び出されることをモックで検証
  - 組織階層パスが正しく設定されることを検証するテストケースを追加
  - _Requirements: 7.1, 8.5_

- [ ] 2.3* (P) 統合テストの実装
  - 実際のデータベースを使用し、100人の社員 × 2組織のデータで検証する統合テストを作成
  - クエリ数が201回から2回程度に削減されることを確認
  - 結果の `organizationPath` が既存の出力と一致することを確認
  - _Requirements: 2.5, 7.1, 7.3, 8.5_

### Phase 3: 社員詳細の最適化

- [x] 3. 社員詳細取得の最適化
- [x] 3.1 `getEmployeeById` 関数の最適化
  - `lib/employees/service.ts:343-346` の組織階層パス個別生成ループを削除
  - 社員の所属組織IDを収集（`employee.organizations.map(o => o.organizationId)`）
  - `buildOrganizationPathsBatch(orgIds)` を呼び出し、階層パスMapを取得
  - 各所属組織に階層パスMapから値を設定
  - 既存の `Employee` および `EmployeeOrganization` 型定義を変更しない
  - 既存のnullチェック（306-308行）を維持
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.2, 7.4_

- [x] 3.2* (P) 既存テストの更新と検証
  - 既存の `getEmployeeById()` のテストケースがすべてパスすることを確認
  - `buildOrganizationPathsBatch()` が適切に呼び出されることをモックで検証
  - 組織階層パスが正しく設定されることを検証するテストケースを追加
  - _Requirements: 7.1, 8.5_

### Phase 4: データ取得重複解消

- [x] 4. 社員詳細ページのキャッシュ実装
- [x] 4.1 React cache() の適用
  - `app/employees/[employeeId]/page.tsx` の冒頭に `import { cache } from 'react'` を追加
  - `const cachedGetEmployeeById = cache(getEmployeeById)` を定義
  - `generateMetadata()` 内（20行）で `cachedGetEmployeeById(employeeId)` を使用
  - `EmployeeDetailPage` 内（45行）で `cachedGetEmployeeById(employeeId)` を使用
  - 既存のエラーハンドリング（`notFound()`）を維持
  - 既存の `generateMetadata()` の戻り値型と `Props` 定義を変更しない
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.2, 7.4_

- [x] 4.2* (P) キャッシュ動作の検証テスト
  - 同一リクエスト内で異なる `employeeId` を連続呼び出しした際のキャッシュ動作を検証
  - `generateMetadata()` とページコンポーネントで `getEmployeeById()` が1回のみ実行されることを確認
  - キャッシュが正しく機能していることをログで検証
  - 結果の `organizationPath` が既存の出力と一致することを確認
  - _Requirements: 4.1, 4.2, 7.1, 7.3_

### Phase 5: 検証と最適化

- [ ] 5. データベースインデックス検証
- [ ] 5.1 (P) インデックスの存在確認
  - `organizations` テーブルの `id` カラムに主キーインデックスが存在することを確認
  - `organizations` テーブルの `parent_id` カラムにインデックス（`idx_organizations_parent_id`）が存在することを確認
  - `employee_organizations` テーブルの `employee_id` および `organization_id` カラムにインデックスが存在することを確認
  - `db/schema.ts` のスキーマ定義で全インデックスが定義されていることを確認
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 5.2* (P) パフォーマンス検証テスト
  - 100人の社員データで最適化前後のレスポンスタイムを計測するテストを作成
  - 組織ID数を段階的に増やし（10, 50, 100, 200）、`buildOrganizationPathsBatch()` の実行時間を計測
  - EXPLAIN ANALYZEでクエリプランを確認し、インデックスが効果的に使用されていることを検証
  - 社員一覧ページのレスポンスタイムが500ms以内に収まることを確認
  - 社員詳細ページのレスポンスタイムが300ms以内に収まることを確認
  - _Requirements: 5.1, 5.2, 5.4, 6.1, 6.2, 6.3_

- [ ] 5.3* (P) E2Eテストの維持確認
  - 社員一覧ページの表示とフィルタリング機能が正常に動作することを確認
  - 社員詳細ページの表示と編集機能が正常に動作することを確認
  - UIの表示内容が最適化前後で変わらないことを確認
  - _Requirements: 7.1, 7.3, 7.5_

---

## Task Summary

- **Total Major Tasks**: 5
- **Total Sub-Tasks**: 13
- **Parallel Tasks**: 9 (marked with `(P)`)
- **Optional Test Tasks**: 6 (marked with `*`)
- **Requirements Coverage**: All 8 requirements (1.1-8.5) mapped to tasks

## Execution Notes

### Parallel Execution
- Tasks marked with `(P)` can be executed in parallel as they have no data dependencies
- Phase 1 tasks (1.1, 1.2, 1.3) are fully parallel and can be executed simultaneously
- Phase 2-4 tasks depend on Phase 1 completion but can run in parallel within each phase
- Phase 5 validation tasks can run in parallel after all implementation tasks complete

### Optional Test Tasks
- Tasks marked with `*` are optional test coverage tasks that can be deferred post-MVP
- These tasks validate acceptance criteria already satisfied by core implementation
- Prioritize implementation tasks (1.1, 2.1, 3.1, 4.1) for rapid delivery

### Task Dependencies
- **Phase 2** depends on Phase 1 (requires `buildOrganizationPathsBatch` function)
- **Phase 3** depends on Phase 1 (requires `buildOrganizationPathsBatch` function)
- **Phase 4** has no dependency on Phase 1 and can be executed independently
- **Phase 5** should run after all implementation phases complete for accurate validation

### Performance Targets
- 社員一覧ページ: クエリ数 201回 → 2回（目標: <5回）
- 社員詳細ページ: クエリ数 4-6回 → 2回（目標: <3回）
- 社員一覧ページ: レスポンスタイム ~2000ms → <500ms
- 社員詳細ページ: レスポンスタイム ~1000ms → <300ms
- `buildOrganizationPathsBatch()`: 実行時間 <200ms（警告閾値: 500ms）

---

## Requirements Traceability

| Requirement | Covered by Tasks | Status |
|-------------|------------------|--------|
| 1.1-1.5: 組織階層パス一括取得 | 1.1 | ✅ |
| 2.1-2.5: 社員一覧最適化 | 2.1, 2.2, 2.3 | ✅ |
| 3.1-3.4: 社員詳細最適化 | 3.1, 3.2 | ✅ |
| 4.1-4.5: データ取得重複解消 | 4.1, 4.2 | ✅ |
| 5.1-5.5: パフォーマンス計測 | 1.2, 5.2 | ✅ |
| 6.1-6.5: インデックス検証 | 5.1, 5.2 | ✅ |
| 7.1-7.5: 後方互換性 | 2.1, 2.2, 2.3, 3.1, 3.2, 4.1, 4.2, 5.3 | ✅ |
| 8.1-8.5: テストカバレッジ | 1.3, 2.2, 2.3, 3.2, 4.2, 5.2, 5.3 | ✅ |

---

_Generated: 2025-11-27_
