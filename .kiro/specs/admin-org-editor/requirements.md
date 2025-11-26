# Requirements Document

## Project Description (Input)
3.5 画面E：部署編集ページ（/admin/organizations）
3.5.1 目的
部署情報の追加・編集・削除
3.5.2 UI構成
左：ファイルエクスプローラー風ツリー
右：選択ノードの詳細編集フォーム
3.5.3 操作
追加：子部署追加
編集：名称・親組織変更
削除：確認ダイアログ付き
3.5.4 アクセス制御
管理者のみアクセス可能

## Introduction
本仕様は、管理者が組織階層（会社 → 本部 → 部署 → 課／チーム）の追加・編集・削除を実行できる部署編集ページを定義します。ファイルエクスプローラー風のツリービューによる直感的な階層構造の把握と、選択ノードの詳細編集フォームによる効率的な組織管理を実現します。

## Requirements

### Requirement 1: ページルーティングと基本構造
**Objective:** As a 管理者, I want `/admin/organizations`にアクセスする, so that 組織階層を編集できる

#### Acceptance Criteria
1. The Admin Organization Editor shall `/admin/organizations`ルートにマウントされる
2. The Admin Organization Editor shall Next.js App Routerの`/app/admin/organizations/page.tsx`として実装される
3. The Admin Organization Editor shall React Server Componentとして実装され、初期データをサーバーサイドで取得する
4. The Admin Organization Editor shall 左側に組織ツリービュー、右側に詳細編集フォームの2カラムレイアウトで構成される

### Requirement 2: アクセス制御と認証
**Objective:** As a システム, I want 管理者権限を持つユーザーのみがアクセスできるようにする, so that 組織データの整合性とセキュリティを確保できる

#### Acceptance Criteria
1. When 非認証ユーザーが`/admin/organizations`にアクセスした, the Admin Organization Editor shall `/login`にリダイレクトする
2. When 管理者権限を持たないユーザーが`/admin/organizations`にアクセスした, then the Admin Organization Editor shall 403エラーページを表示する
3. The Admin Organization Editor shall `proxy.ts`（Next.js 16）による認証チェックを実行する
4. The Admin Organization Editor shall Supabaseの`profiles`テーブルから`role`カラムを参照し、`role = 'admin'`であることを確認する
5. The Admin Organization Editor shall ページレンダリング前にサーバーサイドで権限チェックを完了する

### Requirement 3: 組織階層データの取得と表示
**Objective:** As a 管理者, I want 会社・本部・部署・課／チームの4階層構造をツリービューで確認する, so that 組織全体の構造を把握できる

#### Acceptance Criteria
1. When ページが読み込まれた, the Admin Organization Editor shall Supabaseから組織階層データ（会社、本部、部署、課／チーム）を取得する
2. The Admin Organization Editor shall Drizzle ORMを使用してタイプセーフに組織データを取得する
3. The Admin Organization Editor shall 階層データを親子関係（会社 → 本部 → 部署 → 課／チーム）に基づいてツリー構造に変換する
4. The Admin Organization Editor shall 階層データにはノードID、ノード名、親ノードID、階層レベル（1:会社、2:本部、3:部署、4:課／チーム）を含む
5. If 組織データの取得に失敗した, then the Admin Organization Editor shall エラー状態を表示し、ユーザーにエラーメッセージを提示する

### Requirement 4: ファイルエクスプローラー風ツリービューの実装
**Objective:** As a 管理者, I want ファイルエクスプローラーのようなツリービューで組織階層を操作する, so that 直感的に階層構造を把握・操作できる

#### Acceptance Criteria
1. The Admin Organization Editor shall 画面左側（固定幅またはリサイズ可能）にツリービューコンポーネントを配置する
2. The Admin Organization Editor shall 各階層ノードを展開/折りたたみ可能なツリー形式で表示する
3. When ユーザーがノードの展開/折りたたみアイコンをクリックした, the Admin Organization Editor shall 子ノードの表示/非表示を切り替える
4. The Admin Organization Editor shall ノードのインデントレベルで階層の深さを視覚的に表現する
5. The Admin Organization Editor shall 各ノードにはアイコン（例: フォルダアイコン）とノード名を表示する
6. When ユーザーがノードをクリックした, the Admin Organization Editor shall 選択状態をハイライト表示し、右側に詳細編集フォームを表示する

### Requirement 5: 組織ノードの選択と詳細表示
**Objective:** As a 管理者, I want ツリービューで組織ノードを選択する, so that 右側に詳細情報を表示し編集できる

#### Acceptance Criteria
1. When ユーザーがツリービューのノードをクリックした, the Admin Organization Editor shall 選択されたノードをハイライト表示する
2. When ノードが選択された, the Admin Organization Editor shall 右側の詳細編集フォームに選択ノードの情報（ID、名称、親組織、階層レベル）を表示する
3. The Admin Organization Editor shall 同時に1つのノードのみ選択可能とする（単一選択）
4. The Admin Organization Editor shall 初期表示時にはルートノード（会社）を自動選択する
5. The Admin Organization Editor shall 選択状態は背景色・枠線などで視覚的に明示する

### Requirement 6: 組織ノードの追加
**Objective:** As a 管理者, I want 新しい組織ノード（子部署）を追加する, so that 組織階層を拡張できる

#### Acceptance Criteria
1. When ユーザーがツリービューで親ノードを選択し「子部署を追加」ボタンをクリックした, the Admin Organization Editor shall 新規ノード追加フォームを右側に表示する
2. The Admin Organization Editor shall 追加フォームには以下のフィールドを含む：名称（必須）、親組織（自動設定、読み取り専用）、階層レベル（自動計算、読み取り専用）
3. When ユーザーが追加フォームを送信した, the Admin Organization Editor shall Server Actionを使用して新規組織ノードをデータベースに保存する
4. When 追加が成功した, the Admin Organization Editor shall ツリービューを更新し、新規ノードを表示する
5. When 追加が成功した, the Admin Organization Editor shall 成功メッセージ「組織を追加しました」を表示する
6. If 追加が失敗した（バリデーションエラー、DB制約違反など）, then the Admin Organization Editor shall エラーメッセージをフォーム下部に表示する
7. The Admin Organization Editor shall 階層レベル4（課／チーム）に子ノードを追加できないようにする

### Requirement 7: 組織ノードの編集
**Objective:** As a 管理者, I want 既存の組織ノードの名称や親組織を変更する, so that 組織構造を柔軟に調整できる

#### Acceptance Criteria
1. When ユーザーがツリービューでノードを選択した, the Admin Organization Editor shall 右側に編集フォームを表示する
2. The Admin Organization Editor shall 編集フォームには以下のフィールドを含む：名称（必須）、親組織（選択式、階層制約あり）、階層レベル（読み取り専用）
3. The Admin Organization Editor shall 親組織選択フィールドでは、自分自身および子孫ノードを選択不可とする（循環参照防止）
4. When ユーザーが編集フォームを送信した, the Admin Organization Editor shall Server Actionを使用して組織ノードをデータベースで更新する
5. When 更新が成功した, the Admin Organization Editor shall ツリービューを更新し、変更を反映する
6. When 更新が成功した, the Admin Organization Editor shall 成功メッセージ「組織を更新しました」を表示する
7. If 更新が失敗した（バリデーションエラー、DB制約違反など）, then the Admin Organization Editor shall エラーメッセージをフォーム下部に表示する
8. When 親組織を変更した, the Admin Organization Editor shall 階層レベルを自動再計算し、子孫ノードの階層レベルも連動して更新する

### Requirement 8: 組織ノードの削除
**Objective:** As a 管理者, I want 不要な組織ノードを削除する, so that 組織構造を整理できる

#### Acceptance Criteria
1. When ユーザーがツリービューでノードを選択し「削除」ボタンをクリックした, the Admin Organization Editor shall 確認ダイアログを表示する
2. The Admin Organization Editor shall 確認ダイアログには「このノードを削除しますか？」のメッセージと「削除」「キャンセル」ボタンを含む
3. When ノードに子ノードが存在する, the Admin Organization Editor shall 確認ダイアログに「このノードには子部署が存在します。すべて削除されます。」の警告メッセージを追加表示する
4. When ユーザーが確認ダイアログで「削除」を選択した, the Admin Organization Editor shall Server Actionを使用して組織ノードをデータベースから削除する
5. The Admin Organization Editor shall データベースの`ON DELETE CASCADE`制約により、子孫ノードも連動して削除する
6. When 削除が成功した, the Admin Organization Editor shall ツリービューを更新し、削除されたノードを非表示にする
7. When 削除が成功した, the Admin Organization Editor shall 成功メッセージ「組織を削除しました」を表示する
8. If 削除が失敗した（外部キー制約違反、DB接続エラーなど）, then the Admin Organization Editor shall エラーメッセージ「削除に失敗しました」を表示する
9. The Admin Organization Editor shall ルートノード（階層レベル1の会社）は削除不可とする

### Requirement 9: バリデーションとデータ整合性
**Objective:** As a 開発者, I want 組織データの整合性を保証する, so that データベースの矛盾を防止できる

#### Acceptance Criteria
1. The Admin Organization Editor shall 名称フィールドに空文字列を許可しない（必須検証）
2. The Admin Organization Editor shall 名称フィールドの最大文字数を255文字に制限する
3. The Admin Organization Editor shall 親組織の選択時に、自分自身および子孫ノードを除外する（循環参照防止）
4. The Admin Organization Editor shall 階層レベル4（課／チーム）に子ノードを追加しようとした場合、エラーメッセージ「課／チーム配下には追加できません」を表示する
5. The Admin Organization Editor shall 親組織変更時に、階層レベルの自動再計算を実行する
6. The Admin Organization Editor shall サーバーサイドでバリデーションを実行し、クライアントサイドのバリデーション結果のみに依存しない

### Requirement 10: UIインタラクションとアクセシビリティ
**Objective:** As a 管理者, I want 視覚的フィードバックとキーボードアクセシビリティを提供される, so that 快適かつアクセシブルに操作できる

#### Acceptance Criteria
1. When ユーザーがツリービューのノードにホバーした, the Admin Organization Editor shall ホバー状態のスタイル（背景色変化）を適用する
2. When ユーザーがノードにフォーカスした, the Admin Organization Editor shall フォーカス状態のアウトラインを表示する
3. The Admin Organization Editor shall 各ノードに適切なARIA属性（`role="treeitem"`, `aria-expanded`, `aria-selected`）を付与する
4. The Admin Organization Editor shall キーボード操作（Tabキーでのフォーカス移動、Enterキーでの選択、矢印キーでの展開/折りたたみ）をサポートする
5. The Admin Organization Editor shall ボタンやフォーム要素に適切な`aria-label`または`<label>`要素を付与する

### Requirement 11: エラーハンドリングとローディング状態
**Objective:** As a 管理者, I want データ取得中やエラー時に適切なフィードバックを受け取る, so that システムの状態を理解できる

#### Acceptance Criteria
1. While 組織階層データを取得中, the Admin Organization Editor shall ローディングインジケーター（スピナーまたはスケルトンUI）を表示する
2. If 組織階層データの取得に失敗した, then the Admin Organization Editor shall エラーメッセージ「データの取得に失敗しました。再読み込みしてください。」を表示する
3. While Server Actionが実行中（追加・編集・削除処理中）, the Admin Organization Editor shall フォーム送信ボタンを無効化し、ローディング状態を表示する
4. The Admin Organization Editor shall Next.jsの`loading.tsx`と`error.tsx`を使用してローディング・エラー状態を管理する
5. If 組織階層データが空（階層が存在しない）, then the Admin Organization Editor shall 「組織データがありません」のメッセージを表示する

### Requirement 12: レスポンシブデザイン
**Objective:** As a 管理者, I want デスクトップとタブレットで適切にレイアウトされた画面を利用する, so that デバイスに関わらず快適に編集できる

#### Acceptance Criteria
1. The Admin Organization Editor shall Tailwind CSSのレスポンシブユーティリティ（`md:`, `lg:`）を使用して画面幅に応じたレイアウトを実装する
2. While 画面幅がデスクトップサイズ（>= 1024px）, the Admin Organization Editor shall 左側ツリービュー（30%）と右側編集フォーム（70%）の2カラムレイアウトを表示する
3. While 画面幅がタブレットサイズ（768px - 1024px）, the Admin Organization Editor shall 左側ツリービュー（40%）と右側編集フォーム（60%）の2カラムレイアウトを表示する
4. While 画面幅がモバイルサイズ（< 768px）, the Admin Organization Editor shall ツリービューと編集フォームを縦方向に配置し、選択ノードの詳細をモーダルまたはスライドインパネルで表示する

### Requirement 13: データモデルとデータベーススキーマ
**Objective:** As a 開発者, I want 組織階層データを効率的に管理する, so that パフォーマンスとメンテナンス性を確保できる

#### Acceptance Criteria
1. The Admin Organization Editor shall Drizzleスキーマで組織階層テーブル（`organizations`）を既存スキーマのまま使用する
2. The Admin Organization Editor shall 組織階層テーブルには以下のカラムを含む：`id` (UUID), `name` (text), `parent_id` (UUID, nullable), `level` (integer), `created_at` (timestamp), `updated_at` (timestamp)
3. The Admin Organization Editor shall `parent_id`で親子関係を表現し、`level`で階層レベル（1:会社、2:本部、3:部署、4:課／チーム）を区別する
4. The Admin Organization Editor shall `parent_id`に外部キー制約とON DELETE CASCADE制約を設定し、親削除時に子孫ノードも連動削除する
5. The Admin Organization Editor shall 再帰的なクエリまたは階層的なJOINを使用して、全階層データを一度に取得する

### Requirement 14: Server Actionsの実装
**Objective:** As a 開発者, I want Server Actionsでデータ変更操作を実装する, so that セキュアでタイプセーフなCRUD操作を実現できる

#### Acceptance Criteria
1. The Admin Organization Editor shall `"use server"`ディレクティブを使用したServer Actionsで追加・編集・削除操作を実装する
2. The Admin Organization Editor shall Server Actions内でユーザー認証と管理者権限チェックを実行する
3. The Admin Organization Editor shall Server Actionsの戻り値として成功/失敗ステータスとエラーメッセージを含むオブジェクトを返す
4. The Admin Organization Editor shall Server Actions実行後に`revalidatePath('/admin/organizations')`を呼び出し、画面データを更新する
5. The Admin Organization Editor shall Server Actionsでバリデーションエラーが発生した場合、エラー詳細をクライアントに返す

### Requirement 15: パフォーマンスとSEO
**Objective:** As a 開発者, I want 初期表示を高速化し、管理画面として適切なSEO設定をする, so that ユーザー体験を向上させる

#### Acceptance Criteria
1. The Admin Organization Editor shall React Server Componentsを使用してサーバーサイドで組織階層データを取得する
2. The Admin Organization Editor shall 初期HTMLに組織階層データを含めてレンダリングする（SSR）
3. The Admin Organization Editor shall ページメタデータ（`<title>`, `<meta name="robots" content="noindex, nofollow">`）を適切に設定する
4. The Admin Organization Editor shall Next.jsの`metadata` APIを使用してSEOメタデータを定義する
5. The Admin Organization Editor shall 管理画面のため、検索エンジンのインデックスを無効化する（`noindex, nofollow`）
