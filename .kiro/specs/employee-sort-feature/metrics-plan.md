# ユーザーフィードバック収集のためのメトリクス計画

## 概要

本ドキュメントは、Task 5.2（ユーザーフィードバック収集のためのメトリクス計画を策定する）の実装計画です。

社員一覧画面に実装された2つのソートUI（ドロップダウン形式と既存のボタン形式）のうち、どちらを最終的に採用するかを決定するためのデータ収集・分析計画を策定します。

## 目的

- **ユーザビリティ評価**: どちらのUIがユーザーにとって使いやすいかを定量的・定性的に評価
- **使用率の把握**: 実際にどちらのUIが多く使用されているかを測定
- **意思決定の根拠**: データに基づいてUIを選定し、段階的移行を完了

## メトリクス収集の3つのアプローチ

### アプローチ1: アナリティクストラッキング（推奨）

#### 実装方法

Google Analytics 4、Mixpanel、Amplitudeなどのアナリティクスツールを使用してユーザー行動を追跡します。

##### 1.1 イベントトラッキングの設計

以下のイベントを追跡します：

```typescript
// イベント定義
type SortEvent = {
  event_name: 'sort_ui_interaction';
  ui_type: 'dropdown' | 'legacy_buttons';
  action: 'field_select' | 'order_toggle';
  sort_field: 'name_kana' | 'employee_number' | 'hire_date' | null;
  sort_order: 'asc' | 'desc';
  has_search_conditions: boolean;
  user_id: string;
  session_id: string;
  timestamp: string;
};
```

##### 1.2 実装例（Google Analytics 4）

`components/employee/sort-dropdown.tsx` への追加:

```typescript
import { useEffect } from 'react';

// Google Analytics 4のイベント送信
const trackSortEvent = (
  uiType: 'dropdown' | 'legacy_buttons',
  action: 'field_select' | 'order_toggle',
  sortField: string | undefined,
  sortOrder: string,
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'sort_ui_interaction', {
      ui_type: uiType,
      action: action,
      sort_field: sortField || 'none',
      sort_order: sortOrder,
      has_search_conditions: new URLSearchParams(window.location.search).has('q'),
    });
  }
};

export function SortDropdown({ currentSort, currentOrder }: SortDropdownProps) {
  // ... 既存のコード ...

  const handleSortFieldChange = (value: "name_kana" | "employee_number" | "hire_date") => {
    // アナリティクス送信
    trackSortEvent('dropdown', 'field_select', value, currentOrder);

    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    if (!params.has("order")) {
      params.set("order", currentOrder);
    }
    router.push(`/employees?${params.toString()}`);
  };

  const handleSortOrderToggle = () => {
    if (!currentSort) return;
    const newOrder = currentOrder === "asc" ? "desc" : "asc";

    // アナリティクス送信
    trackSortEvent('dropdown', 'order_toggle', currentSort, newOrder);

    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", currentSort);
    params.set("order", newOrder);
    router.push(`/employees?${params.toString()}`);
  };

  // ... 残りのコード ...
}
```

同様の実装を `components/employee/sort-controls.tsx` にも追加します。

##### 1.3 収集するメトリクス

| メトリクス名 | 説明 | 計算方法 |
|------------|------|---------|
| **UI使用率** | どちらのUIがより多く使用されているか | `(dropdown使用回数 / 総使用回数) × 100%` |
| **アクション別使用率** | フィールド選択 vs 順序切り替え | `(各アクション / 総アクション) × 100%` |
| **ユニークユーザー数** | どちらのUIを使ったユーザー数 | 各UI typeのユニークuser_id数 |
| **セッションあたり使用回数** | 1セッション内でのソート操作回数 | `総イベント数 / ユニークセッション数` |
| **検索との組み合わせ率** | 検索条件と併用した割合 | `(has_search_conditions=true / 総イベント) × 100%` |

##### 1.4 データ分析期間

- **推奨期間**: 最低2週間〜4週間
- **理由**: 週次の利用パターンを把握し、統計的に有意なサンプルサイズを確保

#### 実装コスト

- **開発工数**: 1〜2日（GA4タグ設定 + イベント実装 + ダッシュボード作成）
- **必要なツール**: Google Analytics 4（無料）またはMixpanel/Amplitude（有料）
- **メンテナンス**: 低（イベント定義が安定すれば最小限）

---

### アプローチ2: ユーザーアンケート

#### 実装方法

実際のユーザーに対してアンケートを実施し、主観的な使いやすさを評価します。

##### 2.1 アンケート設計

**配布タイミング**: ソート機能を使用した後にポップアップまたはメールで配布

**質問項目**（5段階評価 + 自由記述）：

1. **使いやすさ**
   - Q1: 新しいドロップダウン形式のソートUIは使いやすいですか？（1: 非常に使いにくい 〜 5: 非常に使いやすい）
   - Q2: 既存のボタン形式のソートUIは使いやすいですか？（同上）

2. **効率性**
   - Q3: どちらのUIがより素早くソート操作を完了できますか？
     - [ ] ドロップダウン形式
     - [ ] ボタン形式
     - [ ] どちらも同じ
     - [ ] わからない

3. **視認性**
   - Q4: どちらのUIがソート状態（現在のソート項目・順序）を理解しやすいですか？
     - [ ] ドロップダウン形式
     - [ ] ボタン形式
     - [ ] どちらも同じ
     - [ ] わからない

4. **総合評価**
   - Q5: 最終的にどちらのUIを残すべきだと思いますか？
     - [ ] ドロップダウン形式のみ
     - [ ] ボタン形式のみ
     - [ ] 両方残す
     - [ ] どちらでもよい

5. **自由記述**
   - Q6: ソートUIについて、改善してほしい点や気になる点があれば教えてください。

##### 2.2 配布方法

**オプション1: ページ内バナー**
```tsx
// components/employee/feedback-banner.tsx
export function FeedbackBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <p className="text-sm text-gray-700">
        新しいソートUIについてのアンケートにご協力ください（所要時間: 1分）
      </p>
      <div className="mt-2 flex gap-2">
        <a href="/survey/sort-ui" className="text-sm text-blue-600 underline">
          アンケートに回答する
        </a>
        <button onClick={() => setDismissed(true)} className="text-sm text-gray-500">
          後で回答する
        </button>
      </div>
    </div>
  );
}
```

**オプション2: メール配布**
- 社内メーリングリストで配布
- Google Forms / Microsoft Formsを使用

##### 2.3 目標サンプルサイズ

- **最小回答数**: 30名（統計的に有意な分析が可能）
- **推奨回答数**: 50〜100名（より信頼性の高い結果）

#### 実装コスト

- **開発工数**: 0.5〜1日（バナー実装 + アンケートフォーム作成）
- **必要なツール**: Google Forms（無料）またはTypeform（有料）
- **メンテナンス**: 低（アンケート期間中のみ）

---

### アプローチ3: A/Bテスト

#### 実装方法

ユーザーをランダムに2グループに分け、一方にはドロップダウンのみ、もう一方にはボタン形式のみを表示し、パフォーマンスを比較します。

##### 3.1 実装例

```typescript
// lib/ab-test/sort-ui-variant.ts
export type SortUIVariant = 'dropdown_only' | 'buttons_only';

export function getSortUIVariant(userId: string): SortUIVariant {
  // ユーザーIDのハッシュ値で決定論的にグループ分け
  const hash = hashString(userId);
  return hash % 2 === 0 ? 'dropdown_only' : 'buttons_only';
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
```

```tsx
// app/employees/page.tsx
export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const user = await getUser();
  const variant = getSortUIVariant(user.id);

  return (
    <div>
      {variant === 'dropdown_only' ? (
        <SortDropdown currentSort={params.sort} currentOrder={params.order} />
      ) : (
        <SortControls currentSort={params.sort} currentOrder={params.order} />
      )}
    </div>
  );
}
```

##### 3.2 収集するメトリクス

| メトリクス | Variant A (Dropdown) | Variant B (Buttons) | 比較 |
|----------|----------------------|---------------------|------|
| **ソート操作回数/ユーザー** | 平均X回 | 平均Y回 | t検定 |
| **ソート機能利用率** | Z% | W% | カイ二乗検定 |
| **エンゲージメント** | 平均セッション時間 | 平均セッション時間 | t検定 |

##### 3.3 統計的有意性の判定

- **有意水準**: α = 0.05（5%）
- **検出力**: 1 - β = 0.8（80%）
- **必要なサンプルサイズ**: 各グループ最低50名

#### 実装コスト

- **開発工数**: 2〜3日（A/Bテストロジック + イベント収集 + 統計分析）
- **必要なツール**: カスタム実装またはOptimizely/LaunchDarkly（有料）
- **メンテナンス**: 中（A/Bテスト期間中の監視が必要）

---

## 判断基準の定義

### 定量的基準

| 基準 | ドロップダウン形式を採用 | ボタン形式を採用 | 両方残す |
|------|----------------------|----------------|---------|
| **UI使用率** | > 70% | < 30% | 40% 〜 60% |
| **ユーザー満足度** | 平均4.0以上 | 平均4.0以上 | 両方3.5以上 |
| **総合評価（Q5）** | > 60%が選択 | > 60%が選択 | 意見が分散 |

### 定性的基準

- **自由記述の分析**: ポジティブ/ネガティブなフィードバックの比率
- **アクセシビリティ**: スクリーンリーダーやキーボード操作での評価
- **モバイル vs デスクトップ**: デバイス別の使いやすさ

### 最終判断フロー

```
1. データ収集完了（2〜4週間）
   ↓
2. 定量的分析
   - 使用率・満足度・統計検定の結果を確認
   ↓
3. 定性的分析
   - 自由記述・ユーザーインタビューの内容を分析
   ↓
4. 意思決定会議
   - プロダクトマネージャー、デザイナー、エンジニアで協議
   ↓
5. 決定事項の文書化
   - 採用するUIとその理由を記録
   ↓
6. 段階的移行
   - 選択されなかったUIを段階的に削除
   - 既存ユーザーへの周知
```

---

## 実装の優先順位

### 推奨アプローチ（コストと効果のバランス）

**Phase 1: アナリティクストラッキング（必須）**
- 開発工数: 1〜2日
- 定量的なデータを自動収集
- ユーザーへの負担なし

**Phase 2: ユーザーアンケート（推奨）**
- 開発工数: 0.5〜1日
- 定性的なフィードバックを収集
- 小規模な実装で実施可能

**Phase 3: A/Bテスト（オプション）**
- 開発工数: 2〜3日
- より厳密な因果関係の評価
- Phase 1/2の結果が不明確な場合のみ実施

---

## タイムライン

| Week | アクティビティ |
|------|--------------|
| Week 1 | アナリティクス実装 + デプロイ |
| Week 2-5 | データ収集期間（最低2週間） |
| Week 3 | ユーザーアンケート配布・回収 |
| Week 6 | データ分析 + レポート作成 |
| Week 7 | 意思決定会議 + 最終UI決定 |
| Week 8 | 段階的移行計画の策定 |
| Week 9以降 | 選択されなかったUIの削除 |

---

## リスクと対策

### リスク1: サンプルサイズ不足

**対策**:
- アナリティクスは自動収集のため問題なし
- アンケートは社内メールで積極的に呼びかけ
- 必要に応じてインセンティブ（抽選でギフトカードなど）を検討

### リスク2: 両UIの使用率が拮抗

**対策**:
- 定性的フィードバックを重視
- 特定のユースケース（モバイル/デスクトップ、初心者/上級者）で使い分け
- 両方残すことも選択肢として検討

### リスク3: データ収集中にバグ発見

**対策**:
- 既存のユニットテスト・統合テストで品質を担保
- 重大なバグの場合は一時的にデータ収集を停止し、修正後に再開

---

## 参考資料

- [Google Analytics 4 イベントトラッキングガイド](https://developers.google.com/analytics/devguides/collection/ga4/events)
- [A/Bテスト統計的有意性計算機](https://www.optimizely.com/sample-size-calculator/)
- [WCAG 2.1アクセシビリティガイドライン](https://www.w3.org/WAI/WCAG21/quickref/)

---

## まとめ

本メトリクス計画により、データに基づいた客観的な意思決定が可能になります。推奨アプローチ（Phase 1 + Phase 2）を実施することで、**約2週間で十分なデータを収集し、最適なUIを選定**できます。

最終的な決定は、定量的データ（使用率・満足度）と定性的フィードバック（自由記述・ユーザーの声）の両方を総合的に評価して行います。
