# Requirements Document

## Project Description (Input)
このパフォーマンス問題を解決してください。推奨される修正アプローチをすべて計画してください

プロジェクト概要
社員データ取得における組織階層パスのN+1クエリ問題を解決し、データベースアクセスを最適化する。

## Introduction

本仕様は、社員一覧ページ（`app/employees/page.tsx`）および社員詳細ページ（`app/employees/[employeeId]/page.tsx`）におけるパフォーマンス問題を解決するためのデータベースクエリ最適化を定義します。

### 背景

現在の実装では以下のパフォーマンス問題が確認されています：

1. **N+1クエリ問題（社員一覧）**: `searchEmployees()` 関数内で、各社員の各所属組織に対して `buildOrganizationPath()` を個別に呼び出し、WITH RECURSIVEクエリを実行している（`lib/employees/service.ts:258-264`）
2. **N+1クエリ問題（社員詳細）**: `getEmployeeById()` 関数内で、各所属組織に対して `buildOrganizationPath()` を個別に呼び出している（`lib/employees/service.ts:343-346`）
3. **重複データ取得（社員詳細ページ）**: `generateMetadata()` とページコンポーネントで同じ `getEmployeeById()` を2回呼び出している（`app/employees/[employeeId]/page.tsx:18-27, 44-48`）

これらの問題により、社員数や所属組織数が増えるほどデータベースクエリ数が増大し、レスポンス時間が悪化します。

### 目標

- 社員一覧・詳細ページのデータベースクエリ数を最小化
- 組織階層パスの生成を一括処理に変更
- 社員詳細ページでのデータ取得の重複を解消
- 既存の機能・型定義・UIを維持したまま、パフォーマンスのみを改善

## Requirements

### Requirement 1: 組織階層パスの一括取得機能

**Objective:** 開発者として、複数の組織IDから階層パスを一度のクエリで取得できる機能が必要です。これにより、N+1クエリ問題を解決し、データベース負荷を削減できます。

#### Acceptance Criteria

1. When 組織IDの配列が与えられた場合、the Employee Service shall すべての組織の階層パスを1回のWITH RECURSIVEクエリで取得する
2. The Employee Service shall 組織ID → 階層パス のMapオブジェクトを返却する
3. If 空の配列が渡された場合、the Employee Service shall 空のMapオブジェクトを返す
4. The Employee Service shall 存在しない組織IDに対しては階層パスを空文字列として扱う
5. The Employee Service shall 既存の `buildOrganizationPath()` の出力形式（半角スペース区切り）と互換性を保つ

### Requirement 2: 社員一覧の組織階層パス最適化

**Objective:** ユーザーとして、社員一覧ページを開いた際に高速に表示されることを期待します。これにより、多数の社員データを効率的に閲覧できます。

#### Acceptance Criteria

1. When `searchEmployees()` が呼び出された場合、the Employee Service shall すべての社員の所属組織IDを収集する
2. When 組織IDが収集された場合、the Employee Service shall Requirement 1の一括取得機能を使用して全組織の階層パスを取得する
3. When 階層パスMapが取得された場合、the Employee Service shall 各社員の所属組織に階層パスを設定する
4. The Employee Service shall 既存の `Employee` および `EmployeeOrganization` 型定義を変更しない
5. When 100人の社員が各2組織に所属している場合、the Employee Service shall データベースクエリ数を201回から2回程度に削減する

### Requirement 3: 社員詳細の組織階層パス最適化

**Objective:** ユーザーとして、社員詳細ページを開いた際に高速に表示されることを期待します。これにより、個別の社員情報を効率的に確認できます。

#### Acceptance Criteria

1. When `getEmployeeById()` が呼び出された場合、the Employee Service shall 社員の所属組織IDを収集する
2. When 組織IDが収集された場合、the Employee Service shall Requirement 1の一括取得機能を使用して階層パスを取得する
3. The Employee Service shall 既存の `Employee` および `EmployeeOrganization` 型定義を変更しない
4. When 1人の社員が3組織に所属している場合、the Employee Service shall 組織階層取得のクエリ数を3回から1回に削減する

### Requirement 4: 社員詳細ページのデータ取得重複解消

**Objective:** 開発者として、社員詳細ページで同じデータを複数回取得しないようにしたい。これにより、無駄なデータベースアクセスを削減できます。

#### Acceptance Criteria

1. When 社員詳細ページがレンダリングされる場合、the Application shall `getEmployeeById()` を1回のみ呼び出す
2. When `generateMetadata()` で取得したデータがある場合、the Application shall ページコンポーネントでそのデータを再利用する
3. The Application shall React の `cache()` または Next.js の `unstable_cache` を使用してデータ取得をキャッシュする
4. The Application shall 既存の `generateMetadata()` の戻り値と型定義を変更しない
5. The Application shall 既存のページコンポーネントのprops定義を変更しない

### Requirement 5: パフォーマンス計測の改善

**Objective:** 開発者として、最適化の効果を定量的に確認できるようにしたい。これにより、パフォーマンス改善の検証とモニタリングが可能になります。

#### Acceptance Criteria

1. The Employee Service shall 組織階層パスの一括取得処理の実行時間を計測する
2. When クエリ実行時間が500msを超えた場合、the Employee Service shall 警告ログを出力する
3. The Employee Service shall ログメッセージに処理対象の組織ID数を含める
4. The Employee Service shall 既存の `searchEmployees()` のパフォーマンスログ機能（`lib/employees/service.ts:203-217`）を維持する
5. The Employee Service shall 本番環境で過度なログ出力を行わない

### Requirement 6: データベースインデックスの検証

**Objective:** 開発者として、クエリパフォーマンスを最大化するための適切なインデックスが存在することを確認したい。これにより、最適化の効果を最大限に引き出せます。

#### Acceptance Criteria

1. The Development Team shall `organizations` テーブルの `id` カラムに主キーインデックスが存在することを確認する
2. The Development Team shall `organizations` テーブルの `parent_id` カラムにインデックスが存在することを確認する
3. The Development Team shall `employee_organizations` テーブルの `employee_id` および `organization_id` カラムにインデックスが存在することを確認する
4. If 必要なインデックスが不足している場合、the Development Team shall Drizzle ORMを使用してマイグレーションファイルを生成する
5. The Development Team shall 既存のデータに影響を与えずにインデックスを追加する

### Requirement 7: 後方互換性の保証

**Objective:** 開発者として、最適化によって既存の機能が破壊されないことを保証したい。これにより、安全にパフォーマンス改善をデプロイできます。

#### Acceptance Criteria

1. The Employee Service shall 既存のすべてのユニットテストおよびコンポーネントテストをパスする
2. The Employee Service shall `Employee` および `EmployeeOrganization` の型定義を変更しない
3. The Employee Service shall 社員一覧・詳細ページのUIとインタラクションを変更しない
4. The Employee Service shall 既存のエラーハンドリングロジックを維持する
5. When 最適化後のコードがデプロイされた場合、the Application shall 既存の全画面が正常に動作する

### Requirement 8: テストカバレッジの維持

**Objective:** 開発者として、最適化後もコードの品質と信頼性を維持したい。これにより、将来的なメンテナンスが容易になります。

#### Acceptance Criteria

1. The Development Team shall 新規追加する組織階層パス一括取得関数のユニットテストを作成する
2. When 空の配列が渡された場合のテストケースが含まれる
3. When 複数の組織IDが渡された場合のテストケースが含まれる
4. When 存在しない組織IDが含まれる場合のテストケースが含まれる
5. The Development Team shall 既存の `searchEmployees()` および `getEmployeeById()` のテストを更新し、最適化後の動作を検証する
