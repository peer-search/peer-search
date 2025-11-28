# Requirements Document

## Project Description (Input)
ソート機能を追加したい。ドロップダウンリストのUIで氏名かな、社員番号、入社年を指定する

## Introduction
本仕様書では、社員一覧画面（`/employees`）にドロップダウンリスト形式のソート機能を追加する要件を定義します。現在の社員一覧画面には、ボタン形式のソートコントロール（`SortControls`コンポーネント）が存在していますが、ユーザーからのフィードバックに基づき、より直感的で省スペースなドロップダウンリスト形式のUIに改善します。

ソート対象フィールドは以下の3つです：
- **氏名（かな）**: `name_kana`フィールドによる五十音順ソート
- **社員番号**: `employee_number`フィールドによる数値順ソート
- **入社年**: `hire_date`フィールドによる日付順ソート

## Requirements

### Requirement 1: ドロップダウンリストによるソートフィールド選択
**Objective:** ユーザーとして、社員一覧をドロップダウンリストから選択したフィールドでソートしたい。省スペースで直感的なUIを提供するため。

#### Acceptance Criteria
1. The 社員一覧画面 shall 社員検索フォームの下部にソートフィールド選択用のドロップダウンリストを表示する
2. The ドロップダウンリスト shall 以下の選択肢を表示する：
   - "氏名（かな）"（`name_kana`）
   - "社員番号"（`employee_number`）
   - "入社年"（`hire_date`）
3. The ドロップダウンリスト shall 現在適用中のソートフィールドを選択状態として表示する
4. When ユーザーがドロップダウンリストからソートフィールドを選択する, the 社員一覧画面 shall 選択されたフィールドで社員リストをソートして表示する
5. When ソートフィールドが指定されていない, the ドロップダウンリスト shall デフォルト選択肢（"並び順を選択"または"氏名（かな）"）を表示する
6. The ドロップダウンリスト shall アクセシビリティのため適切なaria-label属性を持つ（例: "ソート項目を選択"）

### Requirement 2: ソート順序（昇順・降順）の切り替え
**Objective:** ユーザーとして、選択したソートフィールドの昇順・降順を切り替えたい。データの並び順を柔軟にコントロールするため。

#### Acceptance Criteria
1. The 社員一覧画面 shall ソートフィールドドロップダウンの隣に昇順・降順切り替えボタンを表示する
2. The 昇順・降順ボタン shall 現在の並び順を示すアイコンを表示する（↑: 昇順、↓: 降順）
3. When ユーザーが昇順・降順ボタンをクリックする, the 社員一覧画面 shall ソート順序を反転させて社員リストを再表示する
4. When ソートフィールドが選択されていない, the 昇順・降順ボタン shall 無効化状態（disabled）で表示する
5. The 昇順・降順ボタン shall 現在の状態を示すaria-sort属性を持つ（"ascending" または "descending"）
6. The 昇順・降順ボタン shall 明確なラベルを持つ（例: "昇順", "降順"）

### Requirement 3: URL同期とブラウザ履歴対応
**Objective:** ユーザーとして、ソート条件をURL経由で共有・ブックマークしたい。また、ブラウザの戻る/進むボタンでソート状態を復元したい。

#### Acceptance Criteria
1. When ユーザーがソートフィールドを選択する, the 社員一覧画面 shall URLクエリパラメータ`sort`に選択されたフィールド名を設定する
2. When ユーザーがソート順序を変更する, the 社員一覧画面 shall URLクエリパラメータ`order`に`asc`（昇順）または`desc`（降順）を設定する
3. When ページが`sort`および`order`クエリパラメータ付きでロードされる, the 社員一覧画面 shall パラメータに従ってソートされた社員リストを表示する
4. When ユーザーがブラウザの戻るボタンをクリックする, the 社員一覧画面 shall 以前のソート状態を復元する
5. The URLクエリパラメータ shall 以下の形式に従う：
   - `sort=name_kana` | `sort=employee_number` | `sort=hire_date`
   - `order=asc` | `order=desc`

### Requirement 4: 既存検索条件との統合
**Objective:** ユーザーとして、氏名・社員番号・入社年・組織フィルタなどの検索条件とソート機能を組み合わせて使用したい。複合的な検索とソートを実現するため。

#### Acceptance Criteria
1. When ユーザーが検索条件（氏名、社員番号、入社年、組織ID）とソート条件を同時に指定する, the 社員一覧画面 shall 検索条件にマッチする社員リストを指定されたソート順で表示する
2. When ユーザーが検索フォームから新しい検索を実行する, the 社員一覧画面 shall 現在のソート設定を維持したまま検索結果を表示する
3. The 社員一覧画面 shall URLクエリパラメータに検索条件とソート条件を両方含める（例: `/employees?name=田中&sort=hire_date&order=desc`）
4. When 検索結果が0件の場合, the ソートコントロール shall 表示され続ける（ソート設定を変更できる状態を維持）

### Requirement 5: サーバーサイドソート処理
**Objective:** システムとして、大量の社員データを効率的にソート処理したい。パフォーマンスとスケーラビリティを確保するため。

#### Acceptance Criteria
1. The `searchEmployees`サービス関数 shall `sort`および`order`パラメータを受け取り、データベースクエリに反映する
2. When `sort=name_kana`が指定される, the データベースクエリ shall `ORDER BY name_kana ASC/DESC`を使用する
3. When `sort=employee_number`が指定される, the データベースクエリ shall `ORDER BY employee_number ASC/DESC`を使用する
4. When `sort=hire_date`が指定される, the データベースクエリ shall `ORDER BY hire_date ASC/DESC`を使用する
5. When `sort`パラメータが指定されていない, the データベースクエリ shall デフォルトソート順序（`id ASC`またはソート指定なし）を使用する
6. The データベースクエリ shall 既存のインデックス（`idx_employees_name_kana`, `idx_employees_employee_number`, `idx_employees_hire_date`）を活用して高速なソートを実現する

### Requirement 6: UIコンポーネント設計とアクセシビリティ
**Objective:** システムとして、shadcn/uiの`Select`コンポーネントを使用した再利用可能で保守性の高いソートUIを提供したい。また、キーボード操作やスクリーンリーダーに対応したアクセシブルなUIを実現したい。

#### Acceptance Criteria
1. The ソートコントロール shall shadcn/uiの`Select`コンポーネント（`@/components/ui/select`）を使用して実装される
2. The ソートコントロール shall `/components/employee/`ディレクトリ配下に独立したコンポーネントとして実装される（例: `sort-dropdown.tsx`）
3. The ソートコントロール shall クライアントコンポーネント（`"use client"`ディレクティブ）として実装される
4. The ソートコントロール shall `useRouter`および`useSearchParams`フックを使用してURL遷移を処理する
5. When ユーザーがキーボードで操作する, the ソートコントロール shall 以下のキーボードショートカットをサポートする：
   - Enter/Space: ドロップダウンを開く
   - ↑/↓: 選択肢を移動
   - Enter: 選択を確定
   - Esc: ドロップダウンを閉じる
6. The ソートコントロール shall WAI-ARIA標準に準拠したマークアップを持つ（role, aria-labelなど）
7. The ソートコントロール shall 既存の`SortControls`コンポーネント（ボタン形式）と共存可能な設計とする（段階的移行のため）

### Requirement 7: レスポンシブデザイン対応
**Objective:** ユーザーとして、モバイル・タブレット・デスクトップ環境で適切に表示されるソートUIを使用したい。デバイスに依存しない快適な操作を実現するため。

#### Acceptance Criteria
1. The ソートコントロール shall スマートフォン画面幅（320px以上）で表示可能なレイアウトを持つ
2. When モバイル環境で表示される, the ソートドロップダウン shall タップしやすい最小タップ領域（44x44px以上）を確保する
3. When タブレット環境で表示される, the ソートコントロール shall 検索フォームと同じ行に配置され、適切な間隔を保つ
4. When デスクトップ環境で表示される, the ソートコントロール shall 検索フォームの右側に配置され、視覚的なバランスを保つ
5. The ソートコントロール shall Tailwind CSSのレスポンシブユーティリティ（`sm:`, `md:`, `lg:`）を使用してスタイリングされる

### Requirement 8: 既存UIとの共存と段階的移行
**Objective:** システムとして、既存のボタン形式ソートコントロールと新しいドロップダウン形式を段階的に移行したい。リスクを最小化し、ユーザーフィードバックを収集するため。

#### Acceptance Criteria
1. The 社員一覧画面 shall 最初の段階で既存の`SortControls`コンポーネント（ボタン形式）と新しいドロップダウン形式を両方表示する
2. The 既存ボタン形式と新ドロップダウン形式 shall 同じURL状態（`sort`, `order`パラメータ）を共有し、どちらを操作しても同期される
3. When ユーザーがどちらかのUIでソートを変更する, the もう一方のUI shall 変更を反映した表示に更新される
4. The プロジェクトチーム shall ユーザーフィードバックを収集した後、最終的にどちらかのUIを削除する権限を持つ
5. The コンポーネント設計 shall 将来的にどちらかのUIを削除する際、最小限のコード変更で対応可能な構造とする

### Requirement 9: テストカバレッジとバリデーション
**Objective:** 開発者として、ソート機能の品質を保証するための自動テストを実装したい。リグレッションを防止し、仕様通りの動作を検証するため。

#### Acceptance Criteria
1. The ソートコントロールコンポーネント shall Vitest + React Testing Libraryによるコンポーネントテストを持つ（`sort-dropdown.test.tsx`）
2. The テストスイート shall ユーザーインタラクションをシミュレートし、以下をテストする：
   - ドロップダウンからソートフィールドを選択
   - 昇順・降順ボタンのクリック
   - URL遷移の検証
3. The `searchEmployees`関数 shall ソートパラメータに関する統合テストを持つ（`service.test.ts`）
4. The テストスイート shall 以下のエッジケースをカバーする：
   - ソートフィールドが指定されていない場合
   - 無効なソートフィールド名が渡された場合
   - 検索結果が0件の場合のソート動作
5. The テストスイート shall アクセシビリティ検証を含む（aria属性、キーボード操作）

### Requirement 10: エラーハンドリングと入力バリデーション
**Objective:** システムとして、無効なソートパラメータに対して適切に対処したい。予期しないエラーやセキュリティリスクを防止するため。

#### Acceptance Criteria
1. When 無効な`sort`パラメータ（例: `sort=invalid_field`）がURLに含まれる, the `searchEmployees`関数 shall 無効なパラメータを無視し、デフォルトソート順序で検索を実行する
2. When 無効な`order`パラメータ（例: `order=invalid`）がURLに含まれる, the `searchEmployees`関数 shall `asc`をデフォルトとして使用する
3. If SQLインジェクション攻撃を試みるパラメータが渡される, then the Drizzle ORMのパラメータ化クエリ shall 攻撃を無効化する
4. The `searchEmployees`関数 shall TypeScriptの型システムによりソートフィールドを制限する（`"name_kana" | "employee_number" | "hire_date"`のユニオン型）
5. When データベースエラーが発生する, the 社員一覧画面 shall エラーメッセージを表示し、ユーザーに適切なフィードバックを提供する

## Non-Functional Requirements

### Performance
- ソート操作は500ms以内にレスポンスを返す（データベースクエリ実行時間を含む）
- ドロップダウンリストの開閉アニメーションは100ms以内で完了する
- 既存のデータベースインデックス（`idx_employees_name_kana`, `idx_employees_employee_number`, `idx_employees_hire_date`）を活用し、10,000件以上の社員データでも高速なソートを実現する

### Compatibility
- Next.js 16 App Router、React 19 Server Componentsと完全に互換性を持つ
- 既存の社員検索機能（`SearchEmployeesParams`型）との後方互換性を維持する
- shadcn/ui `Select`コンポーネントの最新バージョンと互換性を持つ

### Accessibility
- WCAG 2.1 Level AA基準に準拠する
- キーボードのみで全ての操作が可能
- スクリーンリーダー（NVDA, JAWS, VoiceOver）で適切に読み上げられる

### Maintainability
- プロジェクトの命名規則に従う（コンポーネント: PascalCase、ファイル: kebab-case）
- プロジェクトのディレクトリ構造に従う（`/components/employee/`, `/lib/employees/`）
- TypeScript strict modeでエラーなくビルドできる
- Biomeによるリンティング・フォーマットに準拠する
