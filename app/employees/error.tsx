"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function EmployeesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラーログ出力
    console.error("Employees page error:", error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          エラーが発生しました
        </h2>
        <p className="text-gray-700 mb-6">
          データの取得に失敗しました。しばらくしてから再度お試しください。
        </p>
        <Button onClick={() => reset()}>再試行</Button>
      </div>
    </div>
  );
}
