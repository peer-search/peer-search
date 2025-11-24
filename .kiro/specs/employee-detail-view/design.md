# 技術設計書: 社員詳細画面

## 概要

### 設計目標
- **動的ルーティング実装**: Next.js 16 App Router Dynamic Routesを使用した`/employees/[employeeId]`の実装
- **責任分離**: 既存の一覧画面コンポーネントに影響を与えない独立した詳細画面コンポーネント作成
- **パフォーマンス最適化**: RSC（React Server Components）によるサーバーサイドレンダリングと最小クライアントバンドル
- **再利用性**: S3ユーティリティ、認証ロジック、組織階層パス生成の既存実装を最大限活用
- **保守性**: TypeScript strict mode、Drizzle ORMによるタイプセーフなデータ操作

### 非目標
- 社員情報の編集機能（閲覧のみ）
- 写真のアップロード機能
- 印刷機能・共有機能
- 一覧画面コンポーネントの変更（既存機能の保護）

---

## アーキテクチャ

### パターン & 境界マップ

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
├─────────────────────────────────────────────────────────────────┤
│  Next.js App Router Dynamic Route: /employees/[employeeId]      │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Server Components (RSC)                                    │  │
│  │                                                             │  │
│  │  app/employees/[employeeId]/                               │  │
│  │  ├─ page.tsx (Main Page - RSC)                            │  │
│  │  │  - getUser() → 認証確認                                │  │
│  │  │  - getEmployeeById(employeeId) → データ取得            │  │
│  │  │  - generateMetadata() → 動的メタデータ                │  │
│  │  │                                                          │  │
│  │  ├─ loading.tsx (Skeleton - RSC)                          │  │
│  │  ├─ error.tsx (Error Boundary - Client)                   │  │
│  │  └─ not-found.tsx (404 Page - RSC)                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Client Components                                          │  │
│  │                                                             │  │
│  │  components/employee/                                      │  │
│  │  ├─ employee-detail-photo.tsx                             │  │
│  │  │  - usePresignedUrl(s3Key) → Presigned URL取得         │  │
│  │  │  - Next.js Image + object-contain                      │  │
│  │  │                                                          │  │
│  │  └─ employee-detail-card.tsx                              │  │
│  │     - shadcn/ui Card                                       │  │
│  │     - 社員情報表示（氏名、社員番号、入社年など）        │  │
│  └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      Server-Side Logic                           │
│                                                                   │
│  lib/employees/service.ts                                        │
│  └─ getEmployeeById(employeeId: string)                         │
│     - Drizzle ORM: employees LEFT JOIN employee_organizations   │
│     - buildOrganizationPath() → 組織階層パス生成               │
│     - 返却: Employee | null                                      │
│                                                                   │
│  lib/supabase-auth/auth.ts                                       │
│  └─ getUser() → 認証済みユーザー取得                           │
│                                                                   │
│  lib/s3/presigned-url.ts                                         │
│  └─ generatePresignedGetUrl(key, expiresIn) → Presigned URL    │
│                                                                   │
│  app/api/s3/presign/route.ts (API Route)                        │
│  └─ POST /api/s3/presign                                         │
│     - 認証チェック → generatePresignedGetUrl() → URL返却       │
├─────────────────────────────────────────────────────────────────┤
│                      Data Layer                                  │
│                                                                   │
│  PostgreSQL (via Drizzle ORM)                                   │
│  ├─ employees (id, employeeNumber, nameKanji, nameKana, ...)   │
│  ├─ employee_organizations (employeeId, organizationId, ...)   │
│  └─ organizations (id, name, parentId, level, ...)             │
│                                                                   │
│  AWS S3                                                          │
│  └─ Bucket: static-files/photos/{employeeId}.jpg               │
└─────────────────────────────────────────────────────────────────┘
```

### 技術スタック

#### フレームワーク & ランタイム
- **Next.js 16.0.1**: App Router Dynamic Routes、React Server Components
- **React 19.2**: Server Components、Client Components
- **TypeScript 5**: strictモード

#### データベース & ORM
- **PostgreSQL**: Supabase管理データベース
- **Drizzle ORM**: タイプセーフなクエリ、LEFT JOIN、WITH RECURSIVE

#### 認証 & セキュリティ
- **Supabase SSR**: サーバーサイド認証、Cookieベースセッション
- **proxy.ts**: Next.js 16 Proxy Patternによる全ルート認証チェック

#### ストレージ
- **AWS S3**: 社員写真保存
- **AWS SDK v3**: Presigned URL生成（@aws-sdk/s3-request-presigner）

#### UI & スタイリング
- **shadcn/ui**: Card、Button等のUIコンポーネント
- **Tailwind CSS 4**: ユーティリティファーストCSS、レスポンシブブレークポイント
- **Next.js Image**: 画像最適化、遅延ローディング

#### テスト
- **Vitest 4.0.12**: テストランナー
- **React Testing Library 16.3.0**: コンポーネントテスト
- **happy-dom**: DOM環境

---

## システムフロー

### 1. ページアクセスフロー

```
[ユーザー]
  ↓ (1) アクセス: /employees/[employeeId]
[proxy.ts]
  ↓ (2) 認証チェック（未認証なら /login へリダイレクト）
[page.tsx - RSC]
  ↓ (3) getUser() → 認証済みユーザー取得
  ↓ (4) getEmployeeById(employeeId)
  │     ├─ Drizzle ORM: SELECT + LEFT JOIN
  │     ├─ buildOrganizationPath() → 組織階層パス
  │     └─ 返却: Employee | null
  ↓ (5) null の場合 → notFound() → not-found.tsx
  ↓ (6) データ取得成功
  ↓ (7) 2カラムレイアウト構築
  │     ├─ 左: <EmployeeDetailPhoto s3Key={employee.photoS3Key} />
  │     └─ 右: <EmployeeDetailCard employee={employee} />
  ↓ (8) HTML生成 → ブラウザへ送信
[Browser]
  ↓ (9) ハイドレーション、Client Components実行
[EmployeeDetailPhoto - Client]
  ↓ (10) usePresignedUrl(s3Key)
  │     └─ POST /api/s3/presign → Presigned URL取得
  ↓ (11) Next.js Image → 画像表示（object-contain）
[EmployeeDetailCard - Client]
  ↓ (12) 社員情報表示（shadcn/ui Card）
```

### 2. メタデータ生成フロー

```
[Next.js Router]
  ↓ (1) generateMetadata({ params }) 呼び出し
[generateMetadata() - page.tsx]
  ↓ (2) params.employeeId を await
  ↓ (3) getEmployeeById(employeeId)
  ↓ (4) null の場合 → notFound()
  ↓ (5) データ取得成功
  ↓ (6) Metadata オブジェクト生成
  │     title: "${employee.nameKanji} - 社員詳細 - peer-search"
  ↓ (7) 返却 → Next.js が <head> タグ生成
```

### 3. エラーハンドリングフロー

```
[データ取得エラー]
  ↓ (1) getEmployeeById() → throw Error
[error.tsx - Client]
  ↓ (2) Error Boundary キャッチ
  ↓ (3) エラーメッセージ表示 + 再試行ボタン

[404エラー]
  ↓ (1) getEmployeeById() → null 返却
[page.tsx]
  ↓ (2) notFound() 呼び出し
[not-found.tsx - RSC]
  ↓ (3) 404ページ表示 + ホームリンク

[S3画像エラー]
  ↓ (1) generatePresignedGetUrl() → エラー
[EmployeeDetailPhoto]
  ↓ (2) プレースホルダー画像表示（/placeholder-avatar.svg）
  ↓ (3) コンソールエラーログ出力
```

---

## 要件トレーサビリティ

| 要件ID | 要件名 | 実装コンポーネント | 実装詳細 |
|--------|--------|-------------------|----------|
| REQ-1 | 動的ルーティングとデータフェッチ | `app/employees/[employeeId]/page.tsx`, `lib/employees/service.ts` | `getEmployeeById()`でDrizzle ORMクエリ、RSCでサーバーサイドフェッチ |
| REQ-2 | 2カラムレイアウト | `app/employees/[employeeId]/page.tsx` | Tailwind Grid/Flexbox、`md:`ブレークポイント |
| REQ-3 | 社員写真表示機能 | `components/employee/employee-detail-photo.tsx` | `usePresignedUrl`、Next.js Image、`object-contain`、3:4アスペクト比 |
| REQ-4 | 社員情報カード表示機能 | `components/employee/employee-detail-card.tsx` | shadcn/ui Card、氏名・社員番号・入社年・携帯・メール表示 |
| REQ-5 | 所属一覧表示機能 | `components/employee/employee-detail-card.tsx` | `buildOrganizationPath()`で階層パス生成、複数行表示 |
| REQ-6 | ナビゲーション機能 | `app/layout.tsx`（PageHeaderWrapper統合済み） | 既存実装、ブラウザ履歴管理 |
| REQ-7 | 認証とアクセス制御 | `proxy.ts`, `lib/supabase-auth/auth.ts` | `getUser()`、Supabase SSR認証 |
| REQ-8 | パフォーマンスとSEO | `app/employees/[employeeId]/page.tsx` | RSC、`generateMetadata()`、Next.js Image最適化 |
| REQ-9 | エラーハンドリング | `error.tsx`, `loading.tsx`, `not-found.tsx` | Error Boundary、404ページ、ローディングスケルトン |
| REQ-10 | レスポンシブデザイン | 全コンポーネント | Tailwind CSS `md:`、`lg:`ブレークポイント |

---

## コンポーネント & インターフェース

### 1. データレイヤー

#### `lib/employees/service.ts`

**新規関数**: `getEmployeeById()`

```typescript
/**
 * 単一社員の詳細情報を取得（所属組織情報を含む）
 *
 * @param employeeId - 社員UUID
 * @returns 社員情報（所属を含む）または null（存在しない場合）
 * @throws データベース接続エラー
 */
export async function getEmployeeById(
  employeeId: string
): Promise<Employee | null> {
  // 実装詳細:
  // 1. Drizzle ORM: db.select().from(employees)
  // 2. LEFT JOIN employee_organizations, organizations
  // 3. WHERE eq(employees.id, employeeId)
  // 4. 所属情報の集約（Map使用）
  // 5. buildOrganizationPath()で各所属の階層パス生成
  // 6. Employee型オブジェクト返却 or null
}
```

**型定義** (既存型を再利用):

```typescript
export type Employee = {
  id: string;
  employeeNumber: string;
  nameKanji: string;
  nameKana: string;
  photoS3Key: string | null;
  mobilePhone: string | null;
  email: string;
  hireDate: string; // ISO 8601形式
  organizations: EmployeeOrganization[];
};

export type EmployeeOrganization = {
  organizationId: string;
  organizationPath: string; // "会社名 本部名 部署名 課名"
  position: string | null;
  level: number;
};
```

**実装パターン**:
- `searchEmployees()`のJOINロジックを参考に、単一ID検索に最適化
- `WHERE eq(employees.id, employeeId)` で単一レコード取得
- `buildOrganizationPath()`を再利用して組織階層パス生成

**エラーハンドリング**:
- データベース接続エラー → `throw Error`（page.tsxのエラーバウンダリでキャッチ）
- 存在しないemployeeId → `null`返却（呼び出し側で`notFound()`実行）

---

### 2. ページコンポーネント

#### `app/employees/[employeeId]/page.tsx`

**役割**: 動的ルートのメインページ（RSC）

**実装仕様**:

```typescript
import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase-auth/auth";
import { getEmployeeById } from "@/lib/employees/service";
import { EmployeeDetailPhoto } from "@/components/employee/employee-detail-photo";
import { EmployeeDetailCard } from "@/components/employee/employee-detail-card";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ employeeId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { employeeId } = await params;
  const employee = await getEmployeeById(employeeId);

  if (!employee) {
    notFound();
  }

  return {
    title: `${employee.nameKanji} - 社員詳細 - peer-search`,
  };
}

export default async function EmployeeDetailPage({ params }: Props) {
  // 1. 認証確認
  const user = await getUser();
  if (!user) {
    // proxy.tsで既にリダイレクト済みだが、二重チェック
    throw new Error("Unauthorized");
  }

  // 2. データ取得
  const { employeeId } = await params;
  const employee = await getEmployeeById(employeeId);

  if (!employee) {
    notFound();
  }

  // 3. 2カラムレイアウト
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左カラム: 写真 */}
        <div className="flex justify-center">
          <EmployeeDetailPhoto s3Key={employee.photoS3Key} />
        </div>

        {/* 右カラム: 情報カード */}
        <div>
          <EmployeeDetailCard employee={employee} />
        </div>
      </div>
    </div>
  );
}
```

**レスポンシブレイアウト**:
- デスクトップ（`md:`以上）: `grid-cols-2` → 左右2カラム
- モバイル（`md`未満）: `grid-cols-1` → 縦1カラム（写真が上、情報が下）

**依存関係**:
- `getUser()`: 認証確認（lib/supabase-auth/auth.ts）
- `getEmployeeById()`: データ取得（lib/employees/service.ts）
- `notFound()`: 404リダイレクト（next/navigation）
- `EmployeeDetailPhoto`: 写真表示（Client Component）
- `EmployeeDetailCard`: 情報カード（Client Component）

---

#### `app/employees/[employeeId]/loading.tsx`

**役割**: ローディングスケルトン（RSC）

**実装仕様**:

```typescript
import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 写真スケルトン */}
        <div className="flex justify-center">
          <Skeleton className="aspect-[3/4] w-full max-w-md" />
        </div>

        {/* 情報カードスケルトン */}
        <div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  );
}
```

**デザイン**:
- shadcn/ui `Skeleton`コンポーネント使用
- 写真エリア: 3:4アスペクト比
- 情報カードエリア: 固定高さ（h-96）

---

#### `app/employees/[employeeId]/error.tsx`

**役割**: エラーバウンダリ（Client Component）

**実装仕様**:

```typescript
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function EmployeeDetailError({ error, reset }: Props) {
  useEffect(() => {
    console.error("Employee detail page error:", error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-red-600">
            エラーが発生しました
          </h2>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            社員情報の読み込み中にエラーが発生しました。
          </p>
          {process.env.NODE_ENV === "development" && (
            <pre className="bg-gray-100 p-4 rounded mb-4 overflow-auto">
              {error.message}
            </pre>
          )}
          <Button onClick={reset}>再試行</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

**エラーハンドリング**:
- コンソールエラーログ出力（useEffect）
- 開発環境のみエラーメッセージ表示
- `reset()`で再試行ボタン

---

#### `app/employees/[employeeId]/not-found.tsx`

**役割**: 404ページ（RSC）

**実装仕様**:

```typescript
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function EmployeeNotFound() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">社員が見つかりません</h2>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            指定された社員IDに該当する社員情報が見つかりませんでした。
          </p>
          <Button asChild>
            <Link href="/employees">社員一覧に戻る</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

**デザイン**:
- shadcn/ui Card
- 社員一覧へのリンク（`/employees`）

---

### 3. UIコンポーネント

#### `components/employee/employee-detail-photo.tsx`

**役割**: 社員写真表示（Client Component）

**実装仕様**:

```typescript
"use client";

import Image from "next/image";
import { usePresignedUrl } from "@/lib/s3/use-presigned-url";

type Props = {
  s3Key: string | null;
};

export function EmployeeDetailPhoto({ s3Key }: Props) {
  const { url, isLoading } = usePresignedUrl(s3Key);

  return (
    <div className="w-full max-w-md">
      <div className="aspect-[3/4] bg-white flex items-center justify-center overflow-hidden rounded-lg shadow-md">
        {isLoading ? (
          <div className="animate-pulse bg-gray-200 w-full h-full" />
        ) : (
          <Image
            src={url || "/placeholder-avatar.svg"}
            alt="社員写真"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        )}
      </div>
    </div>
  );
}
```

**スタイリング**:
- `aspect-[3/4]`: 3:4アスペクト比固定
- `object-contain`: 画像全体を枠内に表示（余白あり）
- `bg-white`: 余白部分は白色
- `flex items-center justify-center`: 中央配置
- `rounded-lg shadow-md`: 角丸 + 影

**依存関係**:
- `usePresignedUrl`: S3 Presigned URL取得フック（lib/s3/use-presigned-url.ts）
- `Next.js Image`: 画像最適化

**エラーハンドリング**:
- `url`が`null`の場合 → プレースホルダー画像表示（`/placeholder-avatar.svg`）

---

#### `components/employee/employee-detail-card.tsx`

**役割**: 社員情報カード（Client Component）

**実装仕様**:

```typescript
"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import type { Employee } from "@/lib/employees/service";

type Props = {
  employee: Employee;
};

export function EmployeeDetailCard({ employee }: Props) {
  const hireYear = new Date(employee.hireDate).getFullYear();

  return (
    <Card>
      <CardHeader>
        <h1 className="text-2xl font-bold">{employee.nameKanji}</h1>
        <p className="text-sm text-gray-600">{employee.nameKana}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 社員番号 */}
        <div>
          <span className="text-sm font-semibold text-gray-700">
            社員番号:
          </span>
          <span className="ml-2">{employee.employeeNumber}</span>
        </div>

        {/* 入社年 */}
        <div>
          <span className="text-sm font-semibold text-gray-700">入社年:</span>
          <span className="ml-2">{hireYear}年</span>
        </div>

        {/* 携帯 */}
        <div>
          <span className="text-sm font-semibold text-gray-700">携帯:</span>
          <span className="ml-2">
            {employee.mobilePhone || "未登録"}
          </span>
        </div>

        {/* メール */}
        <div>
          <span className="text-sm font-semibold text-gray-700">
            メール:
          </span>
          <a
            href={`mailto:${employee.email}`}
            className="ml-2 text-blue-600 hover:underline"
          >
            {employee.email}
          </a>
        </div>

        {/* 所属一覧 */}
        <div>
          <span className="text-sm font-semibold text-gray-700 block mb-2">
            所属:
          </span>
          {employee.organizations.length > 0 ? (
            <ul className="space-y-1">
              {employee.organizations.map((org) => (
                <li key={org.organizationId} className="text-sm">
                  {org.organizationPath}
                  {org.position && ` (${org.position})`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">所属情報なし</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**データ処理**:
- 入社年抽出: `new Date(employee.hireDate).getFullYear()`
- 所属一覧: `map()`で複数行表示、役職は括弧付き

**スタイリング**:
- shadcn/ui Card（CardHeader、CardContent）
- `space-y-4`: 各項目間の余白
- メール: `text-blue-600 hover:underline` でリンク強調

---

## データモデル

### Employee型（既存型を再利用）

```typescript
export type Employee = {
  id: string;                          // UUID
  employeeNumber: string;              // 例: "12345"
  nameKanji: string;                   // 例: "山田太郎"
  nameKana: string;                    // 例: "やまだたろう"
  photoS3Key: string | null;           // 例: "photos/123.jpg"
  mobilePhone: string | null;          // 例: "090-1234-5678"
  email: string;                       // 例: "yamada@example.com"
  hireDate: string;                    // ISO 8601: "2020-04-01"
  organizations: EmployeeOrganization[]; // 所属一覧
};

export type EmployeeOrganization = {
  organizationId: string;              // UUID
  organizationPath: string;            // 例: "ABC株式会社 技術本部 開発部 第一課"
  position: string | null;             // 例: "課長"、null可能
  level: number;                       // 組織階層レベル（1=会社、2=本部、...）
};
```

### データベーステーブル（既存スキーマ）

**employees**:
- `id` (UUID, PK)
- `employee_number` (VARCHAR)
- `name_kanji` (VARCHAR)
- `name_kana` (VARCHAR)
- `photo_s3_key` (VARCHAR, nullable)
- `mobile_phone` (VARCHAR, nullable)
- `email` (VARCHAR)
- `hire_date` (DATE)

**employee_organizations** (中間テーブル):
- `employee_id` (UUID, FK)
- `organization_id` (UUID, FK)
- `position` (VARCHAR, nullable)

**organizations**:
- `id` (UUID, PK)
- `name` (VARCHAR)
- `parent_id` (UUID, FK, nullable)
- `level` (INT)

---

## エラーハンドリング

### エラー分類とハンドリング戦略

| エラー種別 | 検出場所 | 対応方法 | ユーザーへの表示 |
|-----------|---------|---------|----------------|
| **404エラー（社員不在）** | `page.tsx`: `getEmployeeById() → null` | `notFound()` → `not-found.tsx` | 「社員が見つかりません」+ 一覧へのリンク |
| **認証エラー** | `proxy.ts`: 未認証 | `/login`へリダイレクト | ログイン画面 |
| **データベースエラー** | `getEmployeeById()`: DB接続エラー | `throw Error` → `error.tsx` | 「エラーが発生しました」+ 再試行ボタン |
| **S3画像取得エラー** | `generatePresignedGetUrl()`: S3エラー | プレースホルダー画像表示 + コンソールログ | プレースホルダー画像のみ（エラー非表示） |
| **不正なUUID** | `getEmployeeById()`: UUID検証失敗 | `null`返却 → `notFound()` | 404ページ |

### エラーログ出力

**開発環境**:
- `error.tsx`: エラーメッセージ + スタックトレース表示
- `EmployeeDetailPhoto`: コンソールエラーログ（`console.error("Failed to load image:", error)`）

**本番環境**:
- `error.tsx`: エラーメッセージのみ表示（スタックトレース非表示）
- `EmployeeDetailPhoto`: コンソールエラーログ（本番でもログ出力）

---

## テスト戦略

### テストレベル

#### 1. ユニットテスト

**対象**: `lib/employees/service.ts` - `getEmployeeById()`

**テストケース**:
```typescript
// lib/employees/service.test.ts
describe("getEmployeeById", () => {
  it("存在する社員IDで社員情報を取得できる", async () => {
    const employee = await getEmployeeById("valid-uuid");
    expect(employee).toBeTruthy();
    expect(employee?.nameKanji).toBe("山田太郎");
    expect(employee?.organizations).toHaveLength(2);
  });

  it("存在しない社員IDでnullを返す", async () => {
    const employee = await getEmployeeById("invalid-uuid");
    expect(employee).toBeNull();
  });

  it("所属情報の階層パスが正しく生成される", async () => {
    const employee = await getEmployeeById("valid-uuid");
    expect(employee?.organizations[0].organizationPath).toBe(
      "ABC株式会社 技術本部 開発部 第一課"
    );
  });
});
```

**モック**:
- Drizzle ORMのクエリビルダー
- `buildOrganizationPath()`関数

---

#### 2. コンポーネントテスト

**対象**: `components/employee/employee-detail-photo.tsx`

**テストケース**:
```typescript
// components/employee/employee-detail-photo.test.tsx
import { render, screen } from "@testing-library/react";
import { EmployeeDetailPhoto } from "./employee-detail-photo";

// usePresignedUrlフックをモック
jest.mock("@/lib/s3/use-presigned-url", () => ({
  usePresignedUrl: jest.fn(),
}));

describe("EmployeeDetailPhoto", () => {
  it("ローディング中はスケルトンを表示する", () => {
    usePresignedUrl.mockReturnValue({ url: null, isLoading: true });
    render(<EmployeeDetailPhoto s3Key="photos/123.jpg" />);
    expect(screen.getByRole("img")).toHaveClass("animate-pulse");
  });

  it("写真URLが取得できたら画像を表示する", () => {
    usePresignedUrl.mockReturnValue({
      url: "https://s3.example.com/photo.jpg",
      isLoading: false,
    });
    render(<EmployeeDetailPhoto s3Key="photos/123.jpg" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("photo.jpg"));
    expect(img).toHaveClass("object-contain");
  });

  it("s3Keyがnullの場合プレースホルダーを表示する", () => {
    usePresignedUrl.mockReturnValue({ url: null, isLoading: false });
    render(<EmployeeDetailPhoto s3Key={null} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("placeholder"));
  });
});
```

---

**対象**: `components/employee/employee-detail-card.tsx`

**テストケース**:
```typescript
// components/employee/employee-detail-card.test.tsx
import { render, screen } from "@testing-library/react";
import { EmployeeDetailCard } from "./employee-detail-card";

const mockEmployee = {
  id: "123",
  employeeNumber: "12345",
  nameKanji: "山田太郎",
  nameKana: "やまだたろう",
  photoS3Key: "photos/123.jpg",
  mobilePhone: "090-1234-5678",
  email: "yamada@example.com",
  hireDate: "2020-04-01",
  organizations: [
    {
      organizationId: "org1",
      organizationPath: "ABC株式会社 技術本部 開発部 第一課",
      position: "課長",
      level: 4,
    },
  ],
};

describe("EmployeeDetailCard", () => {
  it("社員情報を正しく表示する", () => {
    render(<EmployeeDetailCard employee={mockEmployee} />);
    expect(screen.getByText("山田太郎")).toBeInTheDocument();
    expect(screen.getByText("やまだたろう")).toBeInTheDocument();
    expect(screen.getByText("12345")).toBeInTheDocument();
    expect(screen.getByText("2020年")).toBeInTheDocument();
  });

  it("メールアドレスがリンクとして表示される", () => {
    render(<EmployeeDetailCard employee={mockEmployee} />);
    const mailLink = screen.getByRole("link", { name: "yamada@example.com" });
    expect(mailLink).toHaveAttribute("href", "mailto:yamada@example.com");
  });

  it("所属情報が複数行で表示される", () => {
    render(<EmployeeDetailCard employee={mockEmployee} />);
    expect(screen.getByText(/ABC株式会社 技術本部 開発部 第一課 \(課長\)/)).toBeInTheDocument();
  });

  it("携帯電話がnullの場合「未登録」を表示する", () => {
    const employeeWithoutPhone = { ...mockEmployee, mobilePhone: null };
    render(<EmployeeDetailCard employee={employeeWithoutPhone} />);
    expect(screen.getByText("未登録")).toBeInTheDocument();
  });
});
```

---

#### 3. 統合テスト（将来的にE2Eフレームワーク導入）

**対象**: `/employees/[employeeId]` エンドツーエンド

**テストシナリオ**:
1. ログイン済みユーザーが社員一覧から詳細画面に遷移
2. 写真とカード情報が正しく表示される
3. 所属情報が複数行で表示される
4. メールリンクをクリックするとメーラーが起動
5. 存在しない社員IDで404ページが表示される
6. ブラウザの戻るボタンで一覧画面に戻る

**推奨フレームワーク**: Playwright（将来導入）

---

## セキュリティ考慮事項

### 認証・認可
- `proxy.ts`で全ルート認証チェック（未認証は`/login`へリダイレクト）
- `getUser()`でサーバーサイド二重確認
- Supabase SSR: Cookieベースセッション管理

### S3 Presigned URL
- 有効期限: デフォルト1時間（`generatePresignedGetUrl()`）
- 署名付きURL: 無制限アクセス防止
- API Route認証: `/api/s3/presign`でユーザー認証確認後にURL生成

### XSS対策
- React 19の自動エスケープ
- `dangerouslySetInnerHTML`未使用
- メールリンク: `mailto:`スキーム（安全）

### SQL Injection対策
- Drizzle ORMのプリペアドステートメント
- パラメータバインディング（`eq(employees.id, employeeId)`）

---

## パフォーマンス最適化

### サーバーサイド最適化
- **RSC（React Server Components）**: ページ全体をサーバーレンダリング
- **単一クエリ**: `getEmployeeById()`でJOINクエリ1回のみ
- **WITH RECURSIVE**: `buildOrganizationPath()`で組織階層を効率的に取得

### クライアントサイド最適化
- **Next.js Image**: 自動画像最適化、WebP変換、遅延ローディング
- **最小バンドル**: Client Componentsは写真とカードのみ（ページロジックは全てRSC）
- **Presigned URLキャッシュ**: `usePresignedUrl`フックで重複リクエスト防止

### ローディング体験
- **Suspense Boundary**: `loading.tsx`でスケルトン表示
- **段階的ハイドレーション**: RSC → Client Component（写真）の順

---

## 今後の拡張性

### 拡張可能ポイント
1. **編集機能**: `EmployeeDetailCard`に編集ボタン追加
2. **履歴表示**: 過去の所属履歴タブ追加
3. **SNS共有**: 共有ボタン（Twitter、Slack等）
4. **印刷対応**: `@media print`スタイル追加
5. **アクセシビリティ**: ARIA属性、キーボードナビゲーション強化

### 技術的拡張
- **ISR（Incremental Static Regeneration）**: 頻繁にアクセスされる社員ページを静的生成
- **Edge Runtime**: Next.js Edge Runtimeで応答速度向上
- **画像CDN**: CloudFront統合でS3画像配信高速化

---

## 設計決定の根拠

### 1. ハイブリッドアプローチの採用
**決定**: 既存コンポーネント拡張（データレイヤー）+ 新規コンポーネント作成（UI）

**根拠**:
- `getEmployeeById()`は`searchEmployees()`から独立 → 検索機能への影響ゼロ
- `EmployeeDetailPhoto`、`EmployeeDetailCard`は新規作成 → 一覧画面への影響ゼロ
- 責任分離明確、既存パターン最大活用

**参考**: `.kiro/specs/employee-detail-view/research.md` - アーキテクチャパターン評価

---

### 2. 写真コンポーネントの分離
**決定**: `EmployeePhoto`を拡張せず、`EmployeeDetailPhoto`を新規作成

**根拠**:
- 一覧画面: `object-cover`（サムネイル用）
- 詳細画面: `object-contain`（全体表示用）
- 責任範囲が異なる → 分離が適切

**参考**: `.kiro/specs/employee-detail-view/research.md` - 写真表示要件の差異

---

### 3. データ取得関数の独立実装
**決定**: `searchEmployees()`を内部呼び出しせず、`getEmployeeById()`を独立実装

**根拠**:
- 単一ID検索に最適化されたシンプルなクエリ
- `searchEmployees()`の集約処理（Map）は複数検索前提で不要
- JOINロジックは再利用、WHERE条件のみ変更

**参考**: `.kiro/specs/employee-detail-view/research.md` - データ取得関数の実装戦略

---

## 参考資料

### 外部ドキュメント
- [Next.js 公式 - Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [Next.js 公式 - Metadata](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Next.js 公式 - not-found.js](https://nextjs.org/docs/app/api-reference/file-conventions/not-found)
- [Drizzle ORM 公式 - Queries](https://orm.drizzle.team/docs/queries)
- [AWS SDK for JavaScript v3 - S3 Presigned URLs](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/modules/_aws_sdk_s3_request_presigner.html)
- [Tailwind CSS 公式 - Aspect Ratio](https://tailwindcss.com/docs/aspect-ratio)
- [shadcn/ui 公式 - Card](https://ui.shadcn.com/docs/components/card)

### 内部ドキュメント
- `.kiro/steering/product.md`: プロダクト機能概要
- `.kiro/steering/tech.md`: 技術スタック詳細
- `.kiro/steering/structure.md`: ディレクトリ構成規約
- `.kiro/specs/employee-detail-view/requirements.md`: 要件定義書
- `.kiro/specs/employee-detail-view/gap-analysis.md`: ギャップ分析
- `.kiro/specs/employee-detail-view/research.md`: 研究 & 設計決定ログ

### 既存コードベース参考
- `app/employees/page.tsx`: RSCパターン、認証パターン
- `lib/employees/service.ts`: Drizzle ORMクエリパターン
- `components/employee/employee-photo.tsx`: 写真表示パターン
- `lib/s3/presigned-url.ts`: S3統合パターン
