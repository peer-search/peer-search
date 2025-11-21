# テストガイド

このプロジェクトは **Vitest** と **React Testing Library** を使用した自動テストを実装しています。

## テストの実行

### 基本コマンド

```bash
# Watch mode（開発中）
pnpm test

# 一度だけ実行（CI環境）
pnpm test:run

# UIモード（ビジュアルテストランナー）
pnpm test:ui

# カバレッジレポート生成
pnpm test:coverage
```

## テストの種類

### ユニットテスト

ビジネスロジックやユーティリティ関数のテスト。

**例**: [lib/organizations/tree.test.ts](../lib/organizations/tree.test.ts)
- `buildTree()` - フラット配列からツリー構造への変換ロジック

### コンポーネントテスト

React Componentsの描画とインタラクションのテスト。

**例**:
- [components/organization/organization-card.test.tsx](../components/organization/organization-card.test.tsx)
- [components/organization/organization-card-list.test.tsx](../components/organization/organization-card-list.test.tsx)

## テストの書き方

### 基本構造

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

describe("MyComponent", () => {
  it("コンポーネントが正しく表示される", () => {
    render(<MyComponent />);
    expect(screen.getByText("期待する文字列")).toBeInTheDocument();
  });
});
```

### マッチャー

- `toBeInTheDocument()` - 要素がDOM内に存在するか
- `toHaveAttribute(attr, value)` - 属性が正しい値を持つか
- `toHaveClass(className)` - CSSクラスが適用されているか

詳細は [@testing-library/jest-dom](https://github.com/testing-library/jest-dom) を参照。

## テスト戦略

### カバレッジ目標

- **ユニットテスト**: ビジネスロジック 80%以上
- **コンポーネントテスト**: UIコンポーネント 70%以上
- **統合テスト**: 将来的にE2Eフレームワーク（Playwright等）で実装予定

### テストすべきもの

✅ ビジネスロジック（データ変換、計算処理）
✅ ユーザーインタラクション（クリック、入力）
✅ 条件分岐（エラー状態、空状態）
✅ アクセシビリティ（ARIA属性、キーボード操作）

❌ 実装の詳細（内部状態、プライベートメソッド）
❌ サードパーティライブラリ（shadcn/ui等）
❌ スタイルの細かいピクセル値

## トラブルシューティング

### テストが失敗する場合

1. **モックが必要か確認**: Next.jsの `useRouter` や `Image` などはモックが必要
2. **非同期処理の待機**: `await waitFor()` や `findBy*` を使用
3. **DOM環境の確認**: happy-domで動作しない場合は設定を見直す

### パフォーマンス

- テストが遅い場合は `test.concurrent()` で並列実行を検討
- 重いセットアップは `beforeAll()` でまとめる

## 参考資料

- [Vitest公式ドキュメント](https://vitest.dev/)
- [React Testing Library公式ドキュメント](https://testing-library.com/react)
- [Testing Library ベストプラクティス](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
