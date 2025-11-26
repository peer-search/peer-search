# Design Discovery Research

## 既存システム調査結果

### データベース制約
- ✅ **ON DELETE CASCADE制約**: 既に設定済み（`drizzle/0000_charming_brood.sql:9`）
- ❌ **updated_atカラム**: 未定義、マイグレーション必要

### 既存パターンの再利用可能性
- ✅ **権限チェック**: `lib/employees/actions.ts`の`checkAdminPermission()`を再利用可能
- ✅ **Server Actionsパターン**: 既存の社員管理機能で確立されたパターンを適用可能
- ✅ **ツリー構造変換**: `lib/organizations/tree.ts`の`buildTree()`を活用可能
- ✅ **RPC関数**: `get_org_hierarchy()`が読み取り専用で既存

### 新規実装が必要な要素
1. **Server Actions**:
   - `createOrganizationAction()`
   - `updateOrganizationAction()`
   - `deleteOrganizationAction()`
2. **バリデーションロジック**:
   - 循環参照チェック
   - 階層レベル制約チェック
3. **UIコンポーネント**:
   - ツリービューコンポーネント（展開/折りたたみ、選択状態管理）
   - 編集フォーム（名称・親組織選択）
   - 削除確認ダイアログ

## アーキテクチャ決定

### ハイブリッドアプローチの採用
**Phase 1（MVP）**:
- シンプルなリスト表示 + 編集フォーム
- Server ActionsとCRUD操作の実装
- Effort: M（3-7日）、Risk: Low

**Phase 2（エンハンスメント）**:
- ファイルエクスプローラー風ツリービュー実装
- キーボードナビゲーション、ARIA属性追加
- Effort: M（3-7日）、Risk: Medium

**理由**:
- 早期価値提供（Phase 1で基本CRUD機能を即座に利用可能）
- リスク分散（ツリービューの複雑性を後回し）
- ユーザーフィードバック収集（Phase 1のシンプルUIで使用感を検証）

### コンポーネント責任分離
- **読み取り専用UI**: `components/organization/organization-card.tsx`（変更なし）
- **編集UI**: 新規コンポーネント群（`organization-tree-view.tsx`、`organization-edit-form.tsx`等）
- **理由**: 単一責任原則の維持、既存コンポーネントの複雑化を回避

## 技術スタック評価

### ツリービューライブラリ（Phase 2で評価）
候補:
1. **react-arborist** - 高機能、アクセシビリティ対応、仮想スクロールサポート
2. **rc-tree** - シンプル、カスタマイズ可能、軽量
3. **自作** - 完全なコントロール、ただし工数増加

**Phase 1では不要**: 階層インデント表示の簡易リストで対応

### 状態管理戦略
- **展開状態・選択ノード**: React State（コンポーネント内部管理）
- **理由**: URL Stateは不要（ブックマーク・共有の必要性なし）

## リスク軽減策

### Phase 1の技術的リスク
- **低リスク**: 既存のServer Actionsパターンを踏襲
- **早期検証**: シンプルなUIで基本機能をテスト
- **ロールバック容易**: 最小限の変更範囲

### Phase 2の技術的リスク
- **中リスク**: ツリービューライブラリの選定・統合
- **軽減策**: Phase 1で得たフィードバックを設計に反映
- **段階的導入**: Feature Flagで有効/無効を切り替え可能に

## 次のステップ
1. Phase 1の詳細設計（Server Actions、UIコンポーネント）
2. マイグレーション計画（`updated_at`カラム追加）
3. バリデーションロジックの設計
4. テスト戦略の策定
