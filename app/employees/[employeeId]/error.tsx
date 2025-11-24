"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
          <p className="mb-4">社員情報の読み込み中にエラーが発生しました。</p>
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
