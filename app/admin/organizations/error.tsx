"use client";

/**
 * 組織管理ページのエラー状態
 */
export default function OrganizationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          エラーが発生しました
        </h2>
        <p className="text-gray-600 mb-6">
          {error.message || "予期しないエラーが発生しました"}
        </p>
        <button
          type="button"
          onClick={reset}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          再試行
        </button>
      </div>
    </div>
  );
}
