# Research & Design Decisions

---
**Purpose**: 社員写真アップロード機能の設計決定と技術調査の記録

**Usage**:
- ディスカバリーフェーズの調査結果を記録
- 設計上の重要な判断基準と根拠を文書化
- 将来の監査や再利用のための参照情報を提供
---

## Summary
- **Feature**: `employee-image-upload`
- **Discovery Scope**: Extension（既存システム拡張）
- **Key Findings**:
  - S3インフラストラクチャ完備（Presigned URL、クライアント、カスタムフック既存）
  - Next.js Image設定は既にS3対応済み（`*.s3.*.amazonaws.com`パターン登録済み）
  - データベーススキーマに`photoS3Key`カラム既存、追加メタデータカラムは不要と判断
  - 既存の`EmployeeForm`、Server Actions、バリデーションパターンを拡張可能

## Research Log

### S3インフラストラクチャ調査
- **Context**: 既存のS3統合状況とPresigned URLパターンの確認
- **Sources Consulted**:
  - `.kiro/steering/static-files.md`（S3管理パターン）
  - `lib/s3/presigned-url.ts`（既存実装）
  - `lib/s3/use-presigned-url.ts`（カスタムフック）
  - `app/api/s3/presign/route.ts`（GET用API）
- **Findings**:
  - Presigned URL生成関数（GET/PUT）が既に実装済み
  - S3クライアントのシングルトン実装あり（`lib/s3/client.ts`）
  - カスタムフック`usePresignedUrl`が写真表示に利用可能
  - GET用APIエンドポイント`/api/s3/presign`が認証済みユーザーのみアクセス可能
- **Implications**:
  - PUT用Presigned URL発行APIエンドポイント（`/app/api/s3/upload/presign/route.ts`）の新規作成のみ必要
  - S3削除ユーティリティ（`DeleteObjectCommand`）の追加必要
  - 既存パターンとの整合性維持可能

### Next.js Image設定確認
- **Context**: S3からの画像読み込みに必要なNext.js設定の確認
- **Sources Consulted**: `next.config.ts`
- **Findings**:
  - `remotePatterns`に`*.s3.*.amazonaws.com`が既に登録済み
  - CloudFrontドメイン対応も実装済み（環境変数`CLOUDFRONT_DOMAIN`）
  - 画像最適化設定（WebP、AVIF）有効化済み
- **Implications**: Next.js設定変更不要、そのまま利用可能

### データベーススキーマ調査
- **Context**: 社員写真情報の永続化に必要なスキーマ確認
- **Sources Consulted**:
  - `db/schema.ts`
  - `.kiro/steering/static-files.md`（キーのみ保存推奨）
  - ユーザーフィードバック「写真メタデータカラムの追加はなし」
- **Findings**:
  - `employees.photoS3Key`カラムが既に定義済み（NULLABLE）
  - ステアリング文書でも「S3キーのみをDBに保存」を推奨
  - メタデータ（`photo_file_name`, `photo_file_size`, `photo_content_type`, `photo_uploaded_at`）は不要
- **Implications**:
  - データベースマイグレーション不要
  - S3メタデータとPresigned URLでファイル情報を管理
  - YAGNIの原則に従い、最小限のスキーマ実装

### ファイルバリデーションパターン調査
- **Context**: 既存のバリデーションパターンとの整合性確認
- **Sources Consulted**: `lib/employees/validation.ts`
- **Findings**:
  - `ValidationResult`型で統一されたバリデーション戻り値
  - `fieldErrors`でフィールド単位のエラーメッセージ管理
  - 既存バリデーション関数は純粋関数として実装
- **Implications**:
  - 写真バリデーション関数も同様のパターンで実装
  - クライアント側（UX向上）とサーバー側（最終防衛線）で二重検証
  - `ValidationResult`型を再利用

### CORS設定調査（AWS S3）
- **Context**: クライアントから直接S3へアップロードするためのCORS設定確認必要性
- **Findings**:
  - S3バケットにCORS設定が必要（クライアント直接アップロード許可）
  - 許可ヘッダー: `Content-Type`, `x-amz-*`
  - 許可メソッド: `PUT`, `POST`
  - 実装フェーズでAWSコンソールまたはCLIで設定必要
- **Implications**: インフラ設定タスクとして文書化

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Option A: Extend Existing Components | `EmployeeForm`を拡張し、写真フィールドを直接追加 | 最小限のファイル変更、既存パターン継続 | フォーム肥大化（260行→300行超）、責任範囲拡大 | 初期実装として採用 |
| Option B: Create New Components | 写真アップロード専用コンポーネント分離 | 明確な責任分離、テスト容易性向上 | ファイル数増加、インターフェース設計複雑化 | Phase 2リファクタリング候補 |
| Option C: Hybrid Approach（選択） | Phase 1で拡張、Phase 2で分離 | 速度と品質のバランス、段階的改善 | リファクタリングスキップリスク | ギャップ分析推奨アプローチ |

## Design Decisions

### Decision: `photoS3Key`のみでメタデータカラムを省略

- **Context**: 要件5で`photo_file_name`, `photo_file_size`, `photo_content_type`, `photo_uploaded_at`が定義されているが、実際の使用シナリオが不明確
- **Alternatives Considered**:
  1. 要件通りメタデータカラムを追加 — 将来の拡張性を考慮
  2. `photoS3Key`のみで実装 — YAGNIの原則に従う
- **Selected Approach**: `photoS3Key`のみで実装（ユーザーフィードバックに基づく）
- **Rationale**:
  - ステアリング文書（`.kiro/steering/static-files.md`）でも「S3キーのみをDBに保存」を推奨
  - メタデータはS3に既に保存され、Presigned URLで取得可能
  - 現時点で元のファイル名やサイズを表示する要件なし
  - `employees.updated_at`で写真更新日時を把握可能
- **Trade-offs**:
  - **Benefits**: スキーマシンプル、マイグレーション不要、保守性向上
  - **Compromises**: 将来メタデータが必要になった場合、マイグレーション追加必要
- **Follow-up**: メタデータ必要性が発生した場合、マイグレーションで追加可能

### Decision: Hybrid Approach（段階的実装）

- **Context**: 既存フォームの複雑性と開発速度のトレードオフ
- **Alternatives Considered**:
  1. Option A: Extend Existing — 最速実装
  2. Option B: Create New Components — 最高品質
  3. Option C: Hybrid Approach — バランス型
- **Selected Approach**: Hybrid Approach（Phase 1で拡張、Phase 2で分離）
- **Rationale**:
  - 早期動作検証で要件適合性を確認
  - フォームが350行を超えた場合にリファクタリング判断
  - 既存パターンとの整合性維持
- **Trade-offs**:
  - **Benefits**: 速度と品質のバランス、リスク軽減
  - **Compromises**: Phase 2実施優先度低下リスク
- **Follow-up**: `EmployeeForm`の行数監視、リファクタリング判断基準の明確化

### Decision: S3キー命名規則

- **Context**: S3オブジェクトキーの一貫性とファイル管理
- **Alternatives Considered**:
  1. `employee-photos/{uuid}.{ext}` — シンプルな構造
  2. `employee-photos/{employeeId}/{timestamp}-{filename}` — 詳細な構造
  3. `employee-photos/{employeeId}.{ext}` — 社員IDベース（上書き型）
- **Selected Approach**: `employee-photos/{uuid}.{ext}`形式
- **Rationale**:
  - UUIDで一意性保証、衝突リスクゼロ
  - タイムスタンプ不要（`employees.updated_at`で管理）
  - ファイル名非保存によるセキュリティ向上
  - S3バケット内での検索・管理が容易
- **Trade-offs**:
  - **Benefits**: シンプル、安全、スケーラブル
  - **Compromises**: 元のファイル名情報なし（要件上問題なし）
- **Follow-up**: UUID生成ロジックの実装（`crypto.randomUUID()`使用）

### Decision: クライアントサイド直接アップロード

- **Context**: サーバー負荷軽減とパフォーマンス最適化
- **Alternatives Considered**:
  1. Server Upload — サーバー経由アップロード
  2. Client Direct Upload — クライアント直接アップロード
- **Selected Approach**: Client Direct Upload（Presigned URL方式）
- **Rationale**:
  - ステアリング文書（`.kiro/steering/static-files.md`）推奨パターン
  - サーバー帯域・メモリ消費回避
  - 大容量ファイル（10MB上限）に適合
  - 既存のPresigned URLインフラ活用
- **Trade-offs**:
  - **Benefits**: スケーラビリティ、パフォーマンス、コスト削減
  - **Compromises**: ネットワークエラーハンドリング複雑化
- **Follow-up**: リトライロジック、進行状況表示、エラーフィードバック実装

### Decision: 古いS3オブジェクト削除の失敗許容

- **Context**: 写真更新時の古いS3オブジェクト削除失敗処理
- **Alternatives Considered**:
  1. 削除失敗時にトランザクション全体ロールバック
  2. エラーログ記録のみで処理継続（要件6に適合）
  3. S3ライフサイクルポリシーで自動クリーンアップ
- **Selected Approach**: エラーログ記録 + S3ライフサイクルポリシー併用
- **Rationale**:
  - 要件3.6「エラーをログに記録するが、更新処理は正常完了とする」
  - 孤立ファイルリスクをライフサイクルポリシーで軽減
  - ユーザー体験優先（削除失敗でも写真更新成功）
- **Trade-offs**:
  - **Benefits**: ユーザー体験向上、可用性優先
  - **Compromises**: 短期的な孤立ファイル発生（30日後自動削除）
- **Follow-up**: S3ライフサイクルポリシー設定（30日後削除）、エラーログ監視

## Risks & Mitigations

- **リスク1: クライアントサイドS3直接アップロードのネットワークエラー**
  - **Mitigation**: Fetch API + AbortController、リトライロジック、ユーザーフィードバック実装

- **リスク2: CORS設定不備によるアップロード失敗**
  - **Mitigation**: インフラタスクでCORS設定を明示、実装前に検証環境でテスト

- **リスク3: Presigned URL有効期限切れ（1時間）**
  - **Mitigation**: 既存`usePresignedUrl`フックの自動再取得機能活用、エラー検出時リフレッシュ

- **リスク4: フォーム肥大化による保守性低下**
  - **Mitigation**: 350行を超えた場合にPhase 2リファクタリング実施、責任分離

- **リスク5: ファイル形式偽装（拡張子とMIMEタイプ不一致）**
  - **Mitigation**: サーバーサイドでMIMEタイプ検証、クライアント側はUX向上目的のみ

## References

- [AWS S3 Presigned URLs - Official Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [Next.js Image Optimization - Remote Patterns](https://nextjs.org/docs/app/api-reference/components/image#remotepatterns)
- [AWS SDK for JavaScript v3 - S3 Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/)
- `.kiro/steering/static-files.md` — S3統合パターンと設計原則
- `.kiro/steering/structure.md` — ファイル配置とコンポーネント規約
- `.kiro/steering/tech.md` — 技術スタックと開発標準
