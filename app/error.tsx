"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * エラー状態UIのProps
 */
interface ErrorProps {
  /** エラーオブジェクト */
  error: Error & { digest?: string };
  /** エラーリセット関数（再試行） */
  reset: () => void;
}

/**
 * エラー状態UI
 *
 * データ取得エラー時に表示されるエラーメッセージと再読み込みボタン。
 * Next.js App Routerのerror.tsxパターンを使用。
 *
 * Requirements:
 * - 7.2: データ取得失敗時にエラーメッセージを表示
 * - 7.3: Next.jsのerror.tsxを使用してエラー状態を管理
 *
 * Note: error.tsxはClient Componentである必要があるため"use client"を使用
 */
export default function ErrorPage({ error, reset }: ErrorProps) {
  return (
    <main className="container mx-auto py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">組織階層</h1>
        <p className="text-muted-foreground">
          会社・本部・部署・課／チームの組織階層を表示します
        </p>
      </div>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">
            エラーが発生しました
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            データの取得に失敗しました。再読み込みしてください。
          </p>

          {/* 開発環境ではエラーメッセージを表示 */}
          {process.env.NODE_ENV === "development" && (
            <details className="rounded-md bg-muted p-4 text-sm">
              <summary className="cursor-pointer font-semibold">
                エラー詳細（開発環境のみ）
              </summary>
              <pre className="mt-2 overflow-auto text-xs">{error.message}</pre>
            </details>
          )}

          {/* 再読み込みボタン */}
          <Button onClick={() => reset()} variant="default">
            再読み込み
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
