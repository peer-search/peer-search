# Implementation Tasks

## Task 1: S3インフラストラクチャの準備と検証

### 1.1 S3バケットのCORS設定を確認・設定する (P) ✅
- **Requirements**: 7.1, 7.2
- **Implementation Notes**:
  - AWS ConsoleまたはCLIでS3バケットのCORS設定を確認
  - クライアント直接アップロードのため、許可オリジン、メソッド（PUT, POST）、ヘッダー（Content-Type, x-amz-*）を設定
  - 最大有効期限3600秒を設定
  - 設定JSONは`design.md`の「Supporting References」セクションを参照
- **Dependencies**: なし
- **Acceptance**: CORSが正しく設定され、クライアントからのPUTリクエストが許可される
- **Status**: ✅ 完了 - CORS設定手順を`docs/s3-setup.md`に文書化

### 1.2 S3ライフサイクルポリシーを設定する (P) ✅
- **Requirements**: 3.6
- **Implementation Notes**:
  - `employee-photos/`プレフィックス配下のオブジェクトに対して30日後自動削除ルールを設定
  - 孤立ファイル（削除失敗時のファイル）の自動クリーンアップを実現
  - 設定JSONは`design.md`の「Supporting References」セクションを参照
- **Dependencies**: なし
- **Acceptance**: ライフサイクルポリシーが設定され、30日経過後のオブジェクトが自動削除される
- **Status**: ✅ 完了 - ライフサイクルポリシー設定手順を`docs/s3-setup.md`に文書化

### 1.3 環境変数とS3接続を検証する (P) ✅
- **Requirements**: 7.5, 7.6
- **Implementation Notes**:
  - `.env.local`ファイルで`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`の設定を確認
  - 既存の`lib/s3/client.ts`が正しく動作することを確認（環境変数未設定時のエラーハンドリング含む）
  - テスト用にPresigned GET URLを生成し、S3接続が正常であることを確認
- **Dependencies**: なし
- **Acceptance**: すべての環境変数が設定され、S3クライアントが正常に動作する
- **Status**: ✅ 完了 - `scripts/test-s3-connection.ts`でS3接続テスト成功、環境変数検証完了

## Task 2: ファイルバリデーションサービスの実装 (P) ✅

### 2.1 写真ファイルバリデーション関数を実装する ✅
- **Requirements**: 1.3, 1.4, 6.7
- **Implementation Notes**:
  - `lib/employees/validation.ts`に`validatePhotoFile`関数を追加
  - 許可MIMEタイプ（image/jpeg, image/png, image/gif, image/webp）をホワイトリスト検証
  - ファイルサイズ上限10MB（10,485,760 bytes）を検証
  - クライアント側（File.type, File.size）とサーバー側（mimeType, fileSize）両対応
  - `ValidationResult`型を返却（既存パターン踏襲）
  - 定数は`design.md`の「File Size Constants」セクションを参照
- **Dependencies**: なし
- **Acceptance**:
  - 許可形式のファイルで`success: true`を返却
  - 不許可形式で`fieldErrors.photo`にエラーメッセージを返却
  - 10MB超過で`fieldErrors.photo`にエラーメッセージを返却
- **Status**: ✅ 完了 - `validatePhotoFile`関数実装、定数定義完了

### 2.2 バリデーション関数のユニットテストを実装する ✅
- **Requirements**: 1.3, 1.4, 6.7
- **Implementation Notes**:
  - `lib/employees/validation.test.ts`にテストケースを追加
  - 許可形式すべて（JPEG, PNG, GIF, WebP）でsuccess: trueを検証
  - 不許可形式（BMP, SVG, PDF等）でfieldErrorsを検証
  - サイズ境界値（9.9MB, 10MB, 10.1MB）を検証
  - エッジケース（空ファイル、MIMEタイプ未定義）を検証
- **Dependencies**: Task 2.1
- **Acceptance**: すべてのテストケースがパスする
- **Status**: ✅ 完了 - 22個のテストケース追加、全テスト（39/39）パス

## Task 3: Presigned PUT URL発行APIの実装 (P)

### 3.1 PUT用Presigned URL発行APIエンドポイントを実装する
- **Requirements**: 1.5, 6.2, 6.4, 6.5, 6.6, 6.7
- **Implementation Notes**:
  - `app/api/s3/upload/presign/route.ts`を新規作成
  - `getUser()`で認証チェック（401 Unauthorized）
  - `checkAdminPermission()`で権限チェック（403 Forbidden）
  - ファイル名サニタイズ（特殊文字除去）
  - MIMEタイプホワイトリスト検証（400 Bad Request）
  - S3キー生成（`employee-photos/{uuid}.{ext}`形式、`crypto.randomUUID()`使用）
  - `generatePresignedPutUrl()`でPresigned URL生成（有効期限1時間）
  - API ContractとError Responsesは`design.md`の「API Layer」セクションを参照
- **Dependencies**: Task 2.1（バリデーション関数を利用）
- **Acceptance**:
  - 認証済み管理者が正しいリクエストで`{uploadUrl, s3Key}`を受け取る
  - 未認証ユーザーに401エラーを返却
  - 非管理者に403エラーを返却
  - 不正なMIMEタイプに400エラーを返却

### 3.2 Presigned URL発行APIの統合テストを実装する
- **Requirements**: 1.5, 6.2, 6.4, 6.5
- **Implementation Notes**:
  - 認証・権限チェックの統合検証
  - S3キーフォーマットの検証（UUID形式、拡張子マッピング）
  - 生成されたPresigned URLの有効性検証（実際にS3へPUTリクエスト可能か）
  - エラーレスポンスの検証
- **Dependencies**: Task 3.1
- **Acceptance**: すべての統合テストがパスする

## Task 4: S3削除ユーティリティの実装 (P)

### 4.1 S3オブジェクト削除関数を実装する
- **Requirements**: 3.5, 3.6, 4.4, 4.6
- **Implementation Notes**:
  - `lib/s3/delete.ts`を新規作成
  - `deleteS3Object(s3Key: string)`関数を実装
  - `DeleteObjectCommand`を使用してS3オブジェクトを削除
  - 削除失敗時はエラーログ記録（`console.error`）のみで例外スローしない
  - 戻り値は`Promise<boolean>`（成功: true, 失敗: false）
  - Service Interfaceは`design.md`の「Service Layer」セクションを参照
- **Dependencies**: なし
- **Acceptance**:
  - 正常削除時に`true`を返却
  - S3エラー時に`false`を返却し、エラーログが記録される
  - 例外をスローしない

### 4.2 S3削除関数のユニットテストを実装する
- **Requirements**: 3.6, 4.6
- **Implementation Notes**:
  - S3クライアントをモックし、削除成功・失敗シナリオをテスト
  - エラーログ記録の確認（モックで検証）
  - 例外がスローされないことを確認
- **Dependencies**: Task 4.1
- **Acceptance**: すべてのユニットテストがパスする

## Task 5: EmployeeFormコンポーネントの拡張

### 5.1 写真アップロードUIの基本実装
- **Requirements**: 1.1, 1.2, 3.1, 3.2, 4.1
- **Implementation Notes**:
  - `components/employee/employee-form.tsx`を拡張
  - Client Componentとして`"use client"`ディレクティブ確認
  - ファイル選択UI（`<input type="file" accept="image/*">`）を追加
  - プレビュー表示用の状態管理（`selectedFile`, `previewUrl`, `uploading`, `uploadedS3Key`, `error`）を追加
  - 選択ファイルのプレビュー表示（`<img>`タグまたはNext.js Image）
  - 写真変更ボタン（編集モード時）
  - 写真削除ボタン（編集モード時）と確認ダイアログ
  - State Modelは`design.md`の「EmployeeForm (拡張)」セクションを参照
- **Dependencies**: なし
- **Acceptance**:
  - ファイル選択UIが表示され、ファイル選択ダイアログが開く
  - 選択された画像のプレビューが表示される
  - 編集モード時に写真変更・削除ボタンが表示される

### 5.2 クライアントサイドバリデーションの実装
- **Requirements**: 1.3, 1.4, 8.4, 8.5
- **Implementation Notes**:
  - `validatePhotoFile`関数をクライアント側で呼び出し
  - ファイル選択時に即座バリデーション実行（UX向上）
  - バリデーションエラー時は選択をキャンセルし、エラーメッセージ表示
  - エラーメッセージは`design.md`の「Error Categories and Responses」セクションを参照
- **Dependencies**: Task 2.1, Task 5.1
- **Acceptance**:
  - 不正なファイル形式選択時にエラーメッセージが表示される
  - 10MB超過ファイル選択時にエラーメッセージが表示される
  - バリデーション成功時のみプレビューが表示される

### 5.3 S3直接アップロードロジックの実装
- **Requirements**: 1.5, 1.6, 1.7, 1.8, 3.4, 8.1, 8.2, 8.3
- **Implementation Notes**:
  - 保存ボタンクリック時、まずPresigned PUT URLを取得（`POST /api/s3/upload/presign`）
  - Fetch APIでS3へ直接PUT（`Content-Type`ヘッダー設定）
  - `uploading`状態でプログレスインジケーター表示
  - S3アップロード成功後、`uploadedS3Key`を`hidden input`または状態に保存
  - ネットワークエラー時はリトライオプション提供
  - アップロード完了後、Server Actionへフォーム送信（`photoS3Key`含む）
  - System Flowは`design.md`の「写真アップロードフロー（新規登録時）」を参照
- **Dependencies**: Task 3.1, Task 5.1
- **Acceptance**:
  - Presigned URL取得後、S3へ直接アップロードされる
  - アップロード中にプログレスインジケーターが表示される
  - アップロード成功時に成功メッセージが表示される
  - ネットワークエラー時にエラーメッセージとリトライオプションが表示される

### 5.4 写真削除ロジックの実装
- **Requirements**: 4.1, 4.2, 4.3, 4.5
- **Implementation Notes**:
  - 写真削除ボタンクリック時に確認ダイアログ表示
  - 削除確認後、`photoS3Key`を`null`に設定してServer Action送信
  - プレビューをデフォルトアバターに切り替え
- **Dependencies**: Task 5.1
- **Acceptance**:
  - 削除ボタンクリック時に確認ダイアログが表示される
  - 削除確認後、デフォルトアバターが表示される

## Task 6: Server Actionsの拡張

### 6.1 createEmployeeActionを拡張する
- **Requirements**: 1.7, 5.1
- **Implementation Notes**:
  - `lib/employees/actions.ts`の`createEmployeeAction`を拡張
  - `CreateEmployeeInput`型に`photoS3Key?: string`フィールドを追加（`lib/employees/types.ts`）
  - `formData`から`photoS3Key`を抽出
  - `photoS3Key`をデータベースに保存（`createEmployee`関数経由）
  - 既存のエラーハンドリングパターン（`ActionResult<T>`）を維持
  - Service Interfaceは`design.md`の「createEmployeeAction (拡張)」を参照
- **Dependencies**: Task 5.3（アップロードロジックから`photoS3Key`を受け取る）
- **Acceptance**:
  - 写真付き社員登録時に`photoS3Key`がDBに保存される
  - 写真なし社員登録時も正常動作する（後方互換性）
  - バリデーションエラー時に適切な`ActionResult`を返却する

### 6.2 updateEmployeeActionを拡張する
- **Requirements**: 3.4, 3.5, 3.6, 4.3, 4.4, 4.6, 5.1
- **Implementation Notes**:
  - `lib/employees/actions.ts`の`updateEmployeeAction`を拡張
  - `UpdateEmployeeInput`型に`photoS3Key?: string | null`フィールドを追加（`lib/employees/types.ts`）
  - `photoS3Key`が更新される場合、古い`photoS3Key`をDB取得
  - DB更新後、`deleteS3Object(oldS3Key)`で古い写真を削除（ベストエフォート）
  - S3削除失敗時もDB更新は成功扱い（要件3.6準拠）
  - `photoS3Key`が`null`の場合、写真削除として扱う
  - Service Interfaceは`design.md`の「updateEmployeeAction (拡張)」を参照
- **Dependencies**: Task 4.1（S3削除関数を利用）、Task 5.3（アップロードロジック）
- **Acceptance**:
  - 写真更新時に新しい`photoS3Key`がDBに保存され、古いS3オブジェクトが削除される
  - 古いS3オブジェクト削除失敗時もDB更新が成功する
  - `photoS3Key`を`null`に設定すると写真が削除される

### 6.3 Server Actionsの統合テストを実装する
- **Requirements**: 1.7, 3.4, 3.5, 4.3
- **Implementation Notes**:
  - 写真アップロードフロー統合テスト（Presigned URL取得 → S3アップロード → DB保存）
  - 写真更新フロー統合テスト（新規アップロード → DB更新 → 古い写真削除）
  - 写真削除フロー統合テスト（`photoS3Key`をnullに更新 → S3削除）
  - 古い写真削除失敗時もDB更新成功を検証
  - バリデーションエラー統合検証
- **Dependencies**: Task 6.1, Task 6.2
- **Acceptance**: すべての統合テストがパスする

## Task 7: 写真表示機能の検証と調整

### 7.1 既存の写真表示コンポーネントの動作確認
- **Requirements**: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
- **Implementation Notes**:
  - `components/employee/employee-photo.tsx`（一覧用）の動作確認
  - `components/employee/employee-detail-photo.tsx`（詳細用）の動作確認
  - `usePresignedUrl`フックの自動リフレッシュ動作確認
  - デフォルトアバター（`/placeholder-avatar.svg`）の表示確認
  - スケルトンローディングの表示確認
  - Next.js Imageの最適化確認
  - Presigned URL有効期限切れ時の自動再取得確認
- **Dependencies**: Task 6.1, Task 6.2（写真登録・更新が実装済み）
- **Acceptance**:
  - 社員詳細画面で写真が正しく表示される
  - 社員一覧画面で写真サムネイルが正しく表示される
  - 写真未登録時にデフォルトアバターが表示される
  - ローディング中にスケルトンが表示される
  - 1時間経過後も写真が正しく表示される（自動再取得）

### 7.2 写真表示のE2Eテストを実装する
- **Requirements**: 2.1, 2.2, 2.3, 2.4, 2.6
- **Implementation Notes**:
  - 社員一覧画面での写真サムネイル表示E2Eテスト
  - 社員詳細画面での写真拡大表示E2Eテスト
  - Presigned URL有効期限切れシナリオのE2Eテスト
- **Dependencies**: Task 7.1
- **Acceptance**: すべてのE2Eテストがパスする

## Task 8: エンドツーエンドテストとドキュメント

### 8.1 社員写真機能のE2Eテストを実装する
- **Requirements**: 1, 2, 3, 4, 8
- **Implementation Notes**:
  - 社員新規登録 + 写真アップロードのE2Eテスト
  - 社員情報編集 + 写真変更のE2Eテスト
  - 写真削除のE2Eテスト
  - バリデーションエラー表示のE2Eテスト
  - 写真表示のE2Eテスト
  - E2E/UI Testsは`design.md`の「Testing Strategy」セクションを参照
- **Dependencies**: Task 5, Task 6, Task 7
- **Acceptance**: すべてのE2Eテストがパスし、ユーザーパスが正常動作する

### 8.2 パフォーマンステストを実施する
- **Requirements**: 1.6, 2.6
- **Implementation Notes**:
  - 大容量ファイル（10MB）アップロードの時間測定（目標30秒以内）
  - 一覧画面での複数Presigned URL取得時間測定（50件想定）
  - 同時アップロード負荷テスト（10ユーザー同時）
  - Presigned URL有効期限切れシナリオの影響測定
  - Performance/Load Testsは`design.md`の「Testing Strategy」セクションを参照
- **Dependencies**: Task 8.1
- **Acceptance**:
  - 10MBアップロードが30秒以内に完了する
  - 50件一覧表示が許容範囲内の速度で動作する
  - 同時アップロードが正常処理される

### 8.3 実装ドキュメントを更新する
- **Requirements**: All
- **Implementation Notes**:
  - README.mdに社員写真機能の説明を追加
  - S3バケット設定手順を記録（CORS、ライフサイクルポリシー）
  - 環境変数設定手順を記録
  - トラブルシューティングガイドを追加（よくあるエラーと対処法）
- **Dependencies**: Task 8.1, Task 8.2
- **Acceptance**: ドキュメントが完全で、新規開発者が機能をセットアップ可能

## Requirements Coverage

| Requirement | Tasks |
|-------------|-------|
| 1.1 - 1.4 | 2.1, 2.2, 5.1, 5.2 |
| 1.5 - 1.7 | 3.1, 3.2, 5.3, 6.1 |
| 1.8 | 5.3 |
| 2.1 - 2.6 | 7.1, 7.2 |
| 3.1 - 3.3 | 5.1, 5.2 |
| 3.4 - 3.6 | 4.1, 4.2, 6.2, 6.3 |
| 4.1 - 4.6 | 5.1, 5.4, 6.2, 6.3 |
| 5.1 | 6.1, 6.2 |
| 6.2 - 6.7 | 2.1, 3.1, 3.2 |
| 7.1 - 7.6 | 1.1, 1.2, 1.3 |
| 8.1 - 8.7 | 5.2, 5.3, 8.1 |

## Parallel Execution Notes

以下のタスクは並行実装可能です（`(P)`マーク）:
- Task 1.1, 1.2, 1.3（S3インフラ準備は相互独立）
- Task 2（ファイルバリデーション）とTask 3（Presigned URL API）とTask 4（S3削除）は相互独立
- Task 2.2とTask 3.2とTask 4.2（各ユニットテスト）は実装完了後に並行実行可能
