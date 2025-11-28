import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * ローディング状態UI
 *
 * 組織階層データを取得中に表示されるローディングインジケーター。
 * スケルトンUIパターンを使用して、コンテンツの構造を示す。
 *
 * Requirements:
 * - 7.1: データ取得中にローディングインジケーターを表示
 * - 7.3: Next.jsのloading.tsxを使用してローディング状態を管理
 */
export default function Loading() {
  return (
    <main className="container mx-auto py-8">
      <div className="mb-8 space-y-2">
        {/* タイトルスケルトン */}
        <div className="h-9 w-48 animate-pulse rounded-md bg-muted" />
        {/* 説明スケルトン */}
        <div className="h-5 w-96 animate-pulse rounded-md bg-muted" />
      </div>

      {/* カードグリッドスケルトン */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 w-32 rounded-md bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-4 w-full rounded-md bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
