# Implementation Gap Analysis

## 1. Current State Investigation

### 既存資産の概要

#### S3インフラストラクチャ（既存）✅
- **lib/s3/client.ts**: S3クライアントのシングルトン実装（AWS SDK v3使用）
- **lib/s3/presigned-url.ts**: Presigned URL生成関数（GET/PUT）
- **lib/s3/use-presigned-url.ts**: Presigned URL取得用Reactカスタムフック
- **app/api/s3/presign/route.ts**: GET用Presigned URL発行APIエンドポイント（認証済み）

#### データベーススキーマ（部分的に存在）⚠️
- **db/schema.ts**: `employees`テーブルに`photoS3Key`カラムが既に定義済み
  - `photoS3Key: text("photo_s3_key")` - NULLABLE
- **未実装のカラム**: `photo_file_name`, `photo_file_size`, `photo_content_type`, `photo_uploaded_at`

#### 社員管理コンポーネント（既存）✅
- **components/employee/employee-form.tsx**: 社員追加・編集フォーム（写真フィールドなし）
- **components/employee/employee-photo.tsx**: 写真表示コンポーネント（一覧用、既存）
- **components/employee/employee-detail-photo.tsx**: 写真表示コンポーネント（詳細用、既存）
- **components/employee/employee-card.tsx**: 社員カード（写真表示あり）

#### Server Actions & Services（既存）✅
- **lib/employees/actions.ts**: 社員CRUD Server Actions（`createEmployeeAction`, `updateEmployeeAction`）
- **lib/employees/service.ts**: 社員データベース操作サービス
- **lib/employees/types.ts**: 型定義（`CreateEmployeeInput`, `UpdateEmployeeInput`）
- **lib/employees/validation.ts**: バリデーションロジック

#### 認証・権限管理（既存）✅
- **lib/supabase-auth/auth.ts**: 認証ヘルパー関数
- **lib/profiles/service.ts**: プロフィール・権限管理
- **actions.ts内の`checkAdminPermission()`**: 管理者権限チェック関数

### アーキテクチャパターンと規約

#### ファイル配置パターン
- **API Routes**: `/app/api/{service}/{action}/route.ts`
- **Components**: `/components/{feature}/{component-name}.tsx`
- **Library**: `/lib/{feature}/{module}.ts`
- **Tests**: コロケーション（同じディレクトリに`.test.ts`/`.test.tsx`）

#### Server Componentsパターン
- デフォルトでServer Components使用
- Client Componentsは`"use client"`ディレクティブで明示
- Server Actionsは`"use server"`ディレクティブで明示

#### 状態管理パターン
- `useActionState`フックでServer Actionsの状態管理
- `useEffect`でServer Actionの成功時リダイレクト
- `isPending`フラグでローディング状態管理

#### エラーハンドリングパターン
- `ActionResult<T>`型でサーバーアクションの戻り値を統一
- `fieldErrors`でフィールド単位のエラー表示
- `errors`で全体エラーメッセージ配列

## 2. Requirements Feasibility Analysis

### 技術的要件の分類

#### データモデル
- ✅ `employees.photoS3Key` - 既存
- ❌ `employees.photo_file_name` - 追加必要
- ❌ `employees.photo_file_size` - 追加必要
- ❌ `employees.photo_content_type` - 追加必要
- ❌ `employees.photo_uploaded_at` - 追加必要

#### API/サービス
- ✅ Presigned GET URL生成 - 既存（`/api/s3/presign`）
- ❌ Presigned PUT URL生成API - 新規作成必要
- ❌ S3オブジェクト削除サービス - 新規作成必要
- ❌ ファイルバリデーション（MIMEタイプ、サイズ） - 新規作成必要
- ❌ ファイル名サニタイズ - 新規作成必要

#### UI/コンポーネント
- ✅ 写真表示コンポーネント - 既存（`EmployeePhoto`, `EmployeeDetailPhoto`）
- ❌ 写真アップロードUIコンポーネント - 新規作成必要
- ❌ 画像プレビュー機能 - 新規作成必要
- ❌ プログレスインジケーター - 新規作成必要
- ❌ 写真削除ボタン・確認ダイアログ - 新規作成必要

#### ビジネスロジック/バリデーション
- ❌ ファイル形式検証（JPEG, PNG, GIF, WebP） - 新規作成必要
- ❌ ファイルサイズ検証（10MB上限） - 新規作成必要
- ❌ S3キー生成ロジック（`employee-photos/`プレフィックス） - 新規作成必要
- ✅ 管理者権限チェック - 既存（`checkAdminPermission()`）

#### 非機能要件
- ✅ **セキュリティ**: S3バケットはプライベート、Presigned URL認証済みユーザーのみ
- ✅ **パフォーマンス**: 直接S3アップロードによるサーバー負荷軽減
- ❌ **信頼性**: 古いS3オブジェクト削除の失敗ハンドリング - 実装必要

### ギャップと制約

#### Missing（実装不足）
1. **データベースマイグレーション**: 写真メタデータカラム追加（4カラム）
2. **Presigned PUT URL発行API**: `/api/s3/upload/presign` エンドポイント
3. **S3削除ユーティリティ**: `DeleteObjectCommand`を使用した削除関数
4. **ファイルバリデーション**: MIMEタイプ・サイズチェック関数
5. **写真アップロードUI**: `EmployeeForm`内の写真選択・プレビュー・削除UI
6. **アップロードロジック**: クライアントサイドでのS3直接アップロード処理
7. **Server Action拡張**: `CreateEmployeeInput`, `UpdateEmployeeInput`に写真フィールド追加

#### Unknown（調査必要）
1. **S3バケット設定**: バージョニング、ライフサイクルポリシー、CORS設定の確認必要
2. **環境変数**: S3_BUCKET_NAMEの実際の設定値確認必要
3. **Next.js Image設定**: `next.config.js`にS3ドメインのリモートパターン追加が必要か確認

#### Constraint（制約）
1. **既存のPresigned URL有効期限**: 現在1時間（3600秒）固定 - 要件に適合
2. **Drizzle ORMスキーマ変更**: マイグレーションファイル生成後、手動でCHECK制約を追加する必要がある場合あり
3. **Server Componentsの制約**: ファイル選択UIはClient Componentでのみ実装可能（`"use client"`必須）

### 複雑性シグナル

#### 実装タイプ
- **フォーム拡張**: 既存`EmployeeForm`に写真フィールド追加（中複雑度）
- **ファイルアップロードフロー**: Presigned URL取得 → S3直接PUT → DB保存（高複雑度）
- **エラーハンドリング**: ネットワークエラー、バリデーションエラー、S3エラーの多層ハンドリング（中複雑度）
- **外部統合**: AWS S3との連携（既存インフラ活用、低複雑度）

## 3. Implementation Approach Options

### Option A: Extend Existing Components（既存コンポーネント拡張）

#### 対象ファイル
- **components/employee/employee-form.tsx**: 写真アップロードUIを追加
- **lib/employees/actions.ts**: `createEmployeeAction`, `updateEmployeeAction`に写真処理を追加
- **lib/employees/types.ts**: `CreateEmployeeInput`, `UpdateEmployeeInput`に写真フィールド追加
- **lib/employees/validation.ts**: 写真バリデーションロジックを追加

#### 互換性評価
- ✅ 既存のServer Actionパターンと整合
- ✅ `ActionResult<T>`型でエラーハンドリング統一
- ✅ `useActionState`フックで状態管理継続
- ⚠️ `employee-form.tsx`がファイルサイズ大（260行）→ 写真UI追加で300行超え懸念

#### 複雑性と保守性
- **複雑性**: 中（既存ロジックに写真処理を組み込む）
- **保守性**: 中（フォームが肥大化、責任範囲が広がる）
- **テスト影響**: 既存のフォームテストにモックとバリデーションケース追加必要

#### Trade-offs
- ✅ 最小限の新規ファイル、開発速度重視
- ✅ 既存パターンとの一貫性維持
- ❌ `EmployeeForm`の責任範囲拡大（写真アップロードロジックを含む）
- ❌ ファイルサイズ増加によるコード可読性低下

### Option B: Create New Components（新規コンポーネント作成）

#### 新規作成対象
- **components/employee/employee-photo-upload.tsx**: 写真アップロード専用Client Component
  - ファイル選択UI、プレビュー、バリデーション、S3アップロード処理を独立実装
- **lib/employees/photo-service.ts**: 写真関連のビジネスロジック分離
  - S3キー生成、Presigned URL取得、アップロード実行、削除処理
- **app/api/s3/upload/presign/route.ts**: PUT用Presigned URL発行API（新規）
- **lib/s3/delete.ts**: S3オブジェクト削除ユーティリティ（新規）

#### 統合ポイント
- `EmployeeForm`から`EmployeePhotoUpload`コンポーネントを呼び出し
- `photo-service.ts`を`actions.ts`から利用
- 写真S3キーを`formData`または`hidden input`でServer Actionに渡す

#### 責任境界
- **EmployeeForm**: 社員基本情報の入力・バリデーション（写真以外）
- **EmployeePhotoUpload**: 写真選択・プレビュー・アップロード・削除
- **photo-service.ts**: 写真関連のS3操作とバリデーション
- **actions.ts**: 社員データベース操作（写真S3キーの保存・更新のみ）

#### Trade-offs
- ✅ 明確な責任分離（Single Responsibility Principle）
- ✅ 独立したテスト容易性
- ✅ 既存コンポーネントの複雑性増加を回避
- ❌ ファイル数増加（+4ファイル）
- ❌ コンポーネント間のPropsバケツリレー懸念
- ❌ インターフェース設計の慎重さ必要

### Option C: Hybrid Approach（ハイブリッドアプローチ）

#### 組み合わせ戦略
1. **Phase 1（最小実装）**: Extend Existing
   - `EmployeeForm`に写真アップロードUIを直接追加
   - 最小限の新規ファイル（`photo-service.ts`, `/api/s3/upload/presign`）のみ作成
   - 動作検証と要件充足を優先

2. **Phase 2（リファクタリング）**: Create New Components
   - フォームが肥大化した場合、`EmployeePhotoUpload`コンポーネントに分離
   - 写真関連ロジックを独立モジュール化
   - テストカバレッジ向上

#### 段階的実装
- **Sprint 1**: データベースマイグレーション、基本的なアップロード機能
- **Sprint 2**: エラーハンドリング、削除機能、プレビュー改善
- **Sprint 3（オプション）**: コンポーネント分離リファクタリング

#### リスク軽減
- ✅ 早期動作確認による要件適合性検証
- ✅ 段階的なコード品質改善
- ⚠️ リファクタリングフェーズがスキップされるリスク
- ⚠️ Phase 1で技術的負債が蓄積する可能性

#### Trade-offs
- ✅ 柔軟性とスピードのバランス
- ✅ 段階的な品質改善が可能
- ❌ 計画と調整の複雑性増加
- ❌ Phase 2実施の優先度低下リスク

## 4. Implementation Complexity & Risk

### Effort（工数見積もり）
**Size: M (3-7日)**

#### 根拠
- データベーススキーマ拡張: 0.5日（マイグレーション作成・実行・検証）
- S3インフラ関連（API Route、削除関数、バリデーション）: 1.5日
- UIコンポーネント（写真アップロード、プレビュー、削除UI）: 2日
- Server Action拡張とビジネスロジック統合: 1.5日
- テスト実装（ユニット、コンポーネント、統合）: 1.5日
- 合計: 7日

#### 調整要因
- **Option A採用**: -1日（コンポーネント分離不要）
- **Option B採用**: +1日（新規コンポーネント設計とインターフェース調整）
- **AWS S3設定調査**: +0.5日（バケット設定、CORS、環境変数確認）

### Risk（リスク評価）
**Level: Medium（中リスク）**

#### 根拠
- ✅ **Low Risk要素**:
  - S3インフラストラクチャ既存（Presigned URLパターン確立）
  - AWS SDK v3の使用実績あり
  - 明確な要件定義とEARS形式の受け入れ基準

- ⚠️ **Medium Risk要素**:
  - クライアントサイドでのS3直接アップロード処理（ネットワークエラーハンドリング複雑）
  - ファイルバリデーションの多層実装（クライアント・サーバー両方）
  - 古いS3オブジェクト削除の失敗時ハンドリング（孤立ファイルリスク）
  - Presigned URL有効期限切れの自動再取得ロジック

- ❌ **High Risk要素（該当なし）**:
  - 未知の技術スタック要素なし
  - アーキテクチャ変更不要

#### リスク軽減策
1. **S3アップロードエラー**: リトライロジックとユーザーフィードバック実装
2. **孤立ファイル**: S3ライフサイクルポリシーで30日後自動削除設定推奨
3. **バリデーション統一**: サーバーサイドを最終防衛線とし、クライアントはUX向上目的

## 5. Recommendations for Design Phase

### 推奨アプローチ
**Option C: Hybrid Approach（段階的実装）**

#### 理由
1. **速度と品質のバランス**: Phase 1で最小実装、Phase 2で品質改善
2. **既存パターン活用**: `EmployeeForm`拡張で既存の状態管理・エラーハンドリングパターン継続
3. **リファクタリングオプション**: 肥大化時にコンポーネント分離可能
4. **リスク管理**: 早期動作検証で要件適合性確認

### Phase 1: 最小実装（MVP）
#### 実装範囲
- データベースマイグレーション（4カラム追加）
- `/app/api/s3/upload/presign/route.ts`（PUT用Presigned URL発行）
- `lib/s3/delete.ts`（S3削除ユーティリティ）
- `lib/employees/validation.ts`（ファイルバリデーション追加）
- `components/employee/employee-form.tsx`（写真UI統合）
- `lib/employees/actions.ts`（写真処理統合）

#### 判断基準
- `EmployeeForm`が350行を超えた場合 → Phase 2リファクタリング実施

### Phase 2: リファクタリング（Optional）
#### 実装範囲
- `components/employee/employee-photo-upload.tsx`（独立コンポーネント）
- `lib/employees/photo-service.ts`（ビジネスロジック分離）
- `EmployeeForm`の責任範囲縮小

### 設計フェーズで決定すべき項目

#### 技術的決定事項
1. **S3キー命名規則**: `employee-photos/{employeeId}/{timestamp}-{filename}`形式とするか
2. **画像リサイズ戦略**: クライアントサイドでリサイズしてからアップロードするか
3. **プログレスインジケーター実装**: XMLHttpRequest or Fetch API + ReadableStreamか
4. **削除タイミング**: 即座削除 or 論理削除（S3オブジェクト残す）

#### 調査事項（Research Needed）
1. **S3バケット設定確認**:
   - バージョニング有効化状況
   - CORS設定（クライアント直接アップロード許可）
   - ライフサイクルポリシー（孤立ファイル自動削除）

2. **Next.js設定確認**:
   - `next.config.js`のImage remotePatterns設定
   - S3ドメインの追加必要性

3. **パフォーマンス検証**:
   - 10MB画像アップロードのネットワーク性能
   - 一覧画面での複数Presigned URL取得のボトルネック有無

### 主要な技術的課題

#### 課題1: クライアントサイドS3直接アップロード
- **問題**: ネットワークエラー、タイムアウト、進行状況表示
- **解決策**: Fetch API + AbortController、リトライロジック、進行状況フィードバック

#### 課題2: 古いS3オブジェクトの削除失敗
- **問題**: 更新時に古い画像削除失敗で孤立ファイル発生
- **解決策**:
  - エラーログ記録（要件適合）
  - S3ライフサイクルポリシーで自動削除（推奨）
  - 定期的なクリーンアップバッチジョブ（将来検討）

#### 課題3: Presigned URL有効期限切れ
- **問題**: 1時間後にURL無効化、画像が表示されない
- **解決策**:
  - `usePresignedUrl`フック内で有効期限追跡とリフレッシュ（既存実装拡張）
  - エラー検出時の自動再取得（`EmployeeDetailPhoto`で実装済みパターン活用）

## 6. Requirement-to-Asset Map

| Requirement | 既存Asset | Status | Gap Description |
|-------------|-----------|--------|-----------------|
| **Req 1: 写真アップロード** | `EmployeeForm` | 🔶 Extend | 写真選択UI、プレビュー、S3アップロードロジック追加 |
| Presigned PUT URL | `presigned-url.ts` | ✅ Exists | `generatePresignedPutUrl`関数既存 |
| PUT URL API | - | ❌ Missing | `/api/s3/upload/presign`エンドポイント新規作成 |
| ファイルバリデーション | - | ❌ Missing | MIMEタイプ・サイズチェック関数新規作成 |
| **Req 2: 写真表示** | `EmployeePhoto`, `EmployeeDetailPhoto` | ✅ Exists | 既存コンポーネント活用可能 |
| Presigned GET URL | `use-presigned-url.ts`, `/api/s3/presign` | ✅ Exists | 既存実装で要件充足 |
| デフォルトアバター | `EmployeePhoto` | ✅ Exists | `/placeholder-avatar.svg`既存 |
| スケルトンローディング | `EmployeeDetailPhoto` | ✅ Exists | `animate-pulse`実装済み |
| **Req 3: 写真更新** | `updateEmployeeAction` | 🔶 Extend | 写真処理ロジック追加 |
| 古いS3削除 | - | ❌ Missing | `DeleteObjectCommand`ユーティリティ新規作成 |
| **Req 4: 写真削除** | - | ❌ Missing | 削除ボタンUI、確認ダイアログ、削除処理追加 |
| **Req 5: DB拡張** | `db/schema.ts` | 🔶 Extend | 4カラム追加マイグレーション |
| `photoS3Key` | `employees` table | ✅ Exists | 既にNULLABLEカラム存在 |
| **Req 6: セキュリティ** | `checkAdminPermission`, `/api/s3/presign` | ✅ Exists | 認証・権限チェック実装済み |
| MIMEタイプ検証 | - | ❌ Missing | サーバーサイドバリデーション追加 |
| ファイル名サニタイズ | - | ❌ Missing | 特殊文字除去関数新規作成 |
| **Req 7: S3インフラ** | `lib/s3/client.ts` | ✅ Exists | S3クライアント初期化済み |
| 環境変数チェック | `getS3Client` | ✅ Exists | 起動時エラー検出実装済み |
| バケット設定 | - | 🔍 Unknown | バージョニング、CORS確認必要 |
| **Req 8: エラーハンドリング** | `ActionResult` type | ✅ Exists | 統一エラー型定義済み |
| プログレスUI | - | ❌ Missing | アップロード進行状況表示追加 |
| エラーメッセージ | - | ❌ Missing | 詳細なエラーメッセージ定義 |

### Legend
- ✅ **Exists**: 既存実装で要件充足
- 🔶 **Extend**: 既存ファイル拡張必要
- ❌ **Missing**: 新規実装必要
- 🔍 **Unknown**: 調査・確認必要
