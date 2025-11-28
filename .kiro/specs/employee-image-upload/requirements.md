# Requirements Document

## Project Description (Input)
社員の追加編集画面で社員の写真を登録・更新する機能を追加したい

## Introduction

本仕様では、既存の社員管理システムに社員写真のアップロード機能を追加します。AWS S3を使用したPresigned URL方式での直接アップロードパターンを採用し、社員の追加・編集画面から写真の登録・更新・削除を可能にします。認証されたユーザーのみがアクセス可能なプライベートファイルとして管理し、適切な権限制御とバリデーションを実装します。

## Requirements

### Requirement 1: 社員写真のアップロード機能

**Objective:** 管理者として、社員の追加・編集画面から社員の写真をアップロードできるようにし、社員情報を視覚的に管理できるようにする

#### Acceptance Criteria

1. When 社員追加・編集画面で写真選択UIをクリックした場合, the Employee Form shall ファイル選択ダイアログを表示する
2. When ユーザーが画像ファイルを選択した場合, the Employee Form shall 選択された画像のプレビューを表示する
3. If 選択されたファイルが画像形式（JPEG, PNG, GIF, WebP）でない場合, then the Employee Form shall エラーメッセージを表示し、アップロードを中止する
4. If 選択されたファイルサイズが10MBを超える場合, then the Employee Form shall エラーメッセージを表示し、アップロードを中止する
5. When 社員情報の保存ボタンがクリックされた場合, the Upload Service shall API経由でPresigned URLを取得する
6. When Presigned URLを取得した場合, the Upload Service shall クライアントから直接S3へ画像をアップロードする
7. When S3へのアップロードが完了した場合, the Upload Service shall S3オブジェクトキーをデータベースに保存する
8. If S3へのアップロード中にネットワークエラーが発生した場合, then the Upload Service shall ユーザーにエラーメッセージを表示し、再試行オプションを提供する

### Requirement 2: 社員写真の表示機能

**Objective:** ユーザーとして、社員の詳細画面や一覧画面で社員の写真を表示できるようにし、社員を視覚的に識別できるようにする

#### Acceptance Criteria

1. When 社員詳細画面を表示した場合, the Employee Detail View shall S3から社員写真をPresigned URL経由で取得し表示する
2. When 社員一覧画面を表示した場合, the Employee List View shall 各社員カードに写真のサムネイルを表示する
3. If 社員に写真が登録されていない場合, then the Employee View shall デフォルトのアバターアイコンを表示する
4. When 写真の読み込みが完了していない場合, the Employee View shall スケルトンローディングを表示する
5. The Employee Photo Component shall Next.js Imageコンポーネントを使用して画像最適化を適用する
6. When Presigned URLの有効期限が切れた場合, the Employee Photo Component shall 自動的に新しいPresigned URLを再取得する

### Requirement 3: 社員写真の更新機能

**Objective:** 管理者として、既存の社員写真を新しい写真に更新できるようにし、常に最新の社員情報を保持できるようにする

#### Acceptance Criteria

1. When 社員編集画面で既存の写真が表示されている場合, the Employee Form shall 写真変更ボタンを表示する
2. When 写真変更ボタンがクリックされた場合, the Employee Form shall 新しい画像ファイルの選択ダイアログを表示する
3. When 新しい画像が選択された場合, the Employee Form shall 新しい画像のプレビューを表示し、既存の写真を置き換える
4. When 更新された社員情報を保存した場合, the Update Service shall 新しい画像をS3にアップロードし、データベースのS3キーを更新する
5. When データベースのS3キーが更新された場合, the Update Service shall 古いS3オブジェクトを削除する
6. If 古いS3オブジェクトの削除に失敗した場合, then the Update Service shall エラーをログに記録するが、更新処理は正常完了とする

### Requirement 4: 社員写真の削除機能

**Objective:** 管理者として、社員の写真を削除できるようにし、不要な画像を管理できるようにする

#### Acceptance Criteria

1. When 社員編集画面で写真が表示されている場合, the Employee Form shall 写真削除ボタンを表示する
2. When 写真削除ボタンがクリックされた場合, the Employee Form shall 削除確認ダイアログを表示する
3. When 削除が確認された場合, the Delete Service shall データベースから写真レコードを削除する
4. When データベースから写真レコードが削除された場合, the Delete Service shall S3から対応するオブジェクトを削除する
5. When 削除が完了した場合, the Employee Form shall デフォルトのアバターアイコンを表示する
6. If S3からのオブジェクト削除に失敗した場合, then the Delete Service shall エラーをログに記録するが、削除処理は正常完了とする

### Requirement 5: データベーススキーマの拡張

**Objective:** 開発者として、社員写真情報を永続化するためのデータベーススキーマを定義し、S3との連携を実現する

#### Acceptance Criteria

1. The Database Schema shall employeesテーブルに`photo_s3_key`カラム（text型、nullable）を追加する
2. The Database Schema shall employeesテーブルに`photo_file_name`カラム（text型、nullable）を追加する
3. The Database Schema shall employeesテーブルに`photo_file_size`カラム（integer型、nullable）を追加する
4. The Database Schema shall employeesテーブルに`photo_content_type`カラム（text型、nullable）を追加する
5. The Database Schema shall employeesテーブルに`photo_uploaded_at`カラム（timestamp型、nullable）を追加する
6. When 社員レコードが削除された場合, the Database Schema shall ON DELETE CASCADEにより関連する写真メタデータも自動削除される

### Requirement 6: セキュリティとアクセス制御

**Objective:** セキュリティ担当者として、社員写真が適切なアクセス制御の下で管理されることを保証し、不正アクセスを防止する

#### Acceptance Criteria

1. The S3 Bucket shall デフォルトでプライベート設定とし、パブリックアクセスを禁止する
2. When Presigned URLを生成する場合, the Presign Service shall 認証済みユーザーのみがリクエストできるように制限する
3. The Presigned URL shall 1時間の有効期限を持つ
4. When ファイルアップロードAPIにリクエストがあった場合, the Upload API shall ユーザーの認証状態を検証する
5. When ファイルアップロードAPIにリクエストがあった場合, the Upload API shall ユーザーが社員管理権限を持つことを検証する
6. The Upload API shall ファイル名に特殊文字が含まれている場合、サニタイズ処理を実行する
7. The Upload API shall MIMEタイプをサーバーサイドで検証し、許可された画像形式のみを受け入れる

### Requirement 7: S3インフラストラクチャの設定

**Objective:** インフラ担当者として、AWS S3バケットとIAMポリシーを適切に設定し、アプリケーションからの安全なアクセスを実現する

#### Acceptance Criteria

1. The S3 Bucket shall `employee-photos`というプレフィックスを持つオブジェクトキーでファイルを保存する
2. The S3 Bucket shall バージョニングを有効化し、誤削除からの復旧を可能にする
3. The IAM Policy shall アプリケーションに対してPutObject、GetObject、DeleteObject権限を付与する
4. The IAM Policy shall アプリケーションに対してPresigned URL生成権限（s3:GetObject、s3:PutObject）を付与する
5. The Environment Configuration shall AWS_REGION、AWS_ACCESS_KEY_ID、AWS_SECRET_ACCESS_KEY、S3_BUCKET_NAMEを必須環境変数として定義する
6. If 環境変数が設定されていない場合, then the Application shall 起動時にエラーメッセージを表示し、サーバーを起動しない

### Requirement 8: エラーハンドリングとユーザーフィードバック

**Objective:** ユーザーとして、アップロード処理の進行状況やエラーを明確に理解できるようにし、適切な対処ができるようにする

#### Acceptance Criteria

1. When ファイルアップロードが開始された場合, the Upload UI shall プログレスインジケーターを表示する
2. When ファイルアップロードが完了した場合, the Upload UI shall 成功メッセージを表示する
3. If ネットワークエラーが発生した場合, then the Upload UI shall 「ネットワークエラーが発生しました。もう一度お試しください。」というメッセージを表示する
4. If ファイルサイズ超過エラーが発生した場合, then the Upload UI shall 「ファイルサイズが10MBを超えています。」というメッセージを表示する
5. If 不正なファイル形式エラーが発生した場合, then the Upload UI shall 「JPEG, PNG, GIF, WebP形式の画像ファイルのみアップロード可能です。」というメッセージを表示する
6. If サーバーエラーが発生した場合, then the Upload UI shall 「サーバーエラーが発生しました。しばらくしてからもう一度お試しください。」というメッセージを表示する
7. The Error Logging Service shall 全てのエラーをサーバーサイドでログに記録する
