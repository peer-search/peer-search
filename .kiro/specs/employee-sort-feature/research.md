# Research & Design Decisions

---
**Feature**: `employee-sort-feature`
**Discovery Scope**: Extension（既存ソート機能の UI 改善）
**Key Findings**:
- shadcn/ui Select コンポーネント（`@radix-ui/react-select v2.2.6`）が既存プロジェクトに導入済み
- `searchEmployees` サービス関数は既に `sort` および `order` パラメータをサポート
- 既存の `SortControls` コンポーネント（ボタン形式）と並行運用する段階的移行アプローチを採用
---

## Summary
本機能は、既存の社員一覧画面のソート機能に対して、ボタン形式から ドロップダウンリスト形式への UI 改善を行う**拡張機能**です。バックエンドの `searchEmployees` 関数は既にソートロジックを実装しているため、フロントエンドコンポーネントの追加のみで完結します。

## Research Log

### shadcn/ui Select コンポーネントの利用可能性
- **Context**: ドロップダウンリスト UI の実装に shadcn/ui Select コンポーネントが利用可能か確認
- **Sources Consulted**:
  - `components/ui/select.tsx` - プロジェクト内の既存 Select コンポーネント
  - `package.json` - `@radix-ui/react-select` のバージョン確認（v2.2.6）
- **Findings**:
  - Select コンポーネントは既にプロジェクトに導入済み
  - Radix UI Primitives v2.2.6 を使用（React 19 対応）
  - アクセシビリティ機能内蔵（キーボード操作、ARIA 属性、スクリーンリーダー対応）
  - Tailwind CSS 4 と統合済み
- **Implications**: 新規依存関係の追加不要。既存コンポーネントをそのまま使用可能。

### 既存ソート実装の分析
- **Context**: `searchEmployees` サービス関数の現在のソート実装を確認
- **Sources Consulted**:
  - `lib/employees/service.ts:166-173` - `SearchEmployeesParams` 型定義
  - `lib/employees/service.ts:206-290` - `searchEmployees` 関数実装
  - `app/employees/page.tsx:67-73` - URL パラメータからのソート条件取得
- **Findings**:
  - `SearchEmployeesParams` は既に `sort` および `order` プロパティを持つ
  - `sort` は `"name_kana" | "employee_number" | "hire_date"` のユニオン型
  - `order` は `"asc" | "desc"` のユニオン型
  - Drizzle ORM の `asc()` / `desc()` 関数でソート処理を実装済み
  - URL クエリパラメータ経由でソート条件を受け取る仕組みが既に存在
- **Implications**: バックエンドロジックの変更不要。フロントエンドコンポーネントから既存 API を呼び出すのみ。

### 既存 SortControls コンポーネントとの共存戦略
- **Context**: ボタン形式の `SortControls` コンポーネントとドロップダウン形式の共存方法を検討
- **Sources Consulted**:
  - `components/employee/sort-controls.tsx` - 既存ボタン形式ソートコンポーネント
- **Findings**:
  - `SortControls` は既に `currentSort` および `currentOrder` props を受け取る
  - `useRouter` と `useSearchParams` でURL遷移を管理
  - 3つのボタンで各ソートフィールドを切り替え、同じボタンのクリックで昇順→降順→ソート解除の順に切り替わる
- **Implications**:
  - 新コンポーネント `SortDropdown` も同じ URL パラメータ（`sort`, `order`）を使用
  - 両コンポーネントは同じ状態を共有し、どちらからの操作も同期される
  - 段階的移行のため、最初は両方を表示し、ユーザーフィードバック後にどちらかを削除

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 新規コンポーネント追加 | `SortDropdown` を独立したクライアントコンポーネントとして追加し、既存 `SortControls` と並行運用 | 段階的移行が可能、リスク最小化、A/B テスト可能 | 一時的に2つのUIが共存するため画面が混雑する可能性 | **採用**。要件 8（段階的移行）に準拠。 |
| SortControls の完全置き換え | 既存コンポーネントを削除して新しいドロップダウンに置き換え | UI がシンプル、コードが1つに統一 | ロールバックが困難、ユーザー混乱のリスク | 却下。段階的移行の方が安全。 |
| 条件分岐による切り替え | フィーチャーフラグで UI を切り替え | 柔軟なロールアウト、段階的展開 | 複雑性増加、条件分岐のメンテナンスコスト | 過剰設計。シンプルな並行運用で十分。 |

## Design Decisions

### Decision: shadcn/ui Select コンポーネントの採用
- **Context**: ドロップダウンリスト UI の実装に使用する UI ライブラリの選定
- **Alternatives Considered**:
  1. shadcn/ui Select - プロジェクト標準の UI ライブラリ
  2. HTML `<select>` 要素 - ブラウザネイティブ実装
  3. カスタム実装 - 独自ドロップダウンコンポーネント
- **Selected Approach**: shadcn/ui Select コンポーネント（`@radix-ui/react-select`）
- **Rationale**:
  - プロジェクト steering（structure.md）で shadcn/ui が標準 UI コンポーネントライブラリとして定義されている
  - Radix UI Primitives はアクセシビリティ（WCAG 2.1 Level AA）を標準でサポート
  - 既に `components/ui/select.tsx` として導入済みで追加依存関係不要
  - Tailwind CSS 4 との統合が完了しており、スタイリングの一貫性を維持
- **Trade-offs**:
  - **Benefits**: アクセシビリティ、保守性、一貫性、既存資産の活用
  - **Compromises**: カスタマイズ性は劣るが、要件を満たすには十分
- **Follow-up**: コンポーネントテストでキーボード操作とスクリーンリーダー対応を検証

### Decision: URL 状態管理による UI 同期
- **Context**: 既存 `SortControls` と新 `SortDropdown` の状態同期方法
- **Alternatives Considered**:
  1. URL クエリパラメータ - ブラウザ履歴とブックマークに対応
  2. React Context API - クライアント側のみで状態管理
  3. グローバル状態管理ライブラリ（Zustand, Jotai） - 中央集権的状態管理
- **Selected Approach**: URL クエリパラメータ（`sort`, `order`）
- **Rationale**:
  - Next.js App Router のサーバーコンポーネントパターンに適合
  - ブラウザの戻る/進むボタンで状態が復元される（要件 3）
  - URL 共有・ブックマークによるソート状態の保存（要件 3）
  - 既存実装との一貫性（`SortControls` も同じ方式を使用）
- **Trade-offs**:
  - **Benefits**: SEO 対応、状態の永続化、シンプルな実装
  - **Compromises**: URL 長が若干増加するが、許容範囲
- **Follow-up**: URL パラメータのバリデーションをサーバーサイドで実装（要件 10）

### Decision: 段階的移行アプローチ（両 UI 並行運用）
- **Context**: ボタン形式からドロップダウン形式への移行戦略
- **Alternatives Considered**:
  1. 段階的移行（両UIを一時的に並行運用） - 要件 8 で指定
  2. 即時置き換え - 既存UIを削除して新UIに完全移行
  3. フィーチャーフラグ - ユーザーグループごとに異なるUIを表示
- **Selected Approach**: 段階的移行（両UIを一時的に表示）
- **Rationale**:
  - 要件 8 で明示的に指定されている
  - ユーザーフィードバックを収集してから最終決定できる
  - リスクを最小化（既存 UI が残っているため、問題発生時のロールバックが容易）
  - A/B テストによる UX 比較が可能
- **Trade-offs**:
  - **Benefits**: 安全性、柔軟性、ユーザー主導の意思決定
  - **Compromises**: 一時的に画面が混雑する、コードの一時的な複雑化
- **Follow-up**:
  - ユーザーフィードバックメトリクスの収集計画（使用率、クリック率）
  - 最終的にどちらかのUIを削除する際のマイグレーションプラン

## Risks & Mitigations
- **Risk 1: 既存 SortControls との UI 競合** - 両コンポーネントが視覚的に競合し、ユーザーが混乱する可能性
  - **Mitigation**: レイアウトを工夫して明確に区別（例: ドロップダウンを上部、ボタンを下部に配置）。ユーザーテストで検証。

- **Risk 2: URL パラメータの不正な値** - 手動で URL を編集された際に無効な `sort` や `order` 値が渡される
  - **Mitigation**: `searchEmployees` 関数でバリデーションを実装済み。無効な値は無視してデフォルト動作。

- **Risk 3: アクセシビリティの不足** - ドロップダウンがキーボード操作やスクリーンリーダーで適切に動作しない
  - **Mitigation**: Radix UI Select は WAI-ARIA 標準準拠。コンポーネントテストでアクセシビリティを検証（要件 9）。

## References
- [Radix UI Select Documentation](https://www.radix-ui.com/primitives/docs/components/select) - Radix UI Select API リファレンス
- [WAI-ARIA Authoring Practices - Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) - アクセシビリティベストプラクティス
- [Next.js App Router - searchParams](https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional) - URL パラメータ処理
- プロジェクト内部参照:
  - `.kiro/steering/structure.md` - UI コンポーネント配置規約
  - `.kiro/steering/tech.md` - shadcn/ui 採用方針
  - `components/ui/select.tsx` - 既存 Select コンポーネント実装
  - `lib/employees/service.ts` - 既存ソート実装
