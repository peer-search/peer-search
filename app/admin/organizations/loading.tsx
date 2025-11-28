/**
 * 組織管理ページのローディング状態
 */
export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
        <p className="text-gray-600">読み込み中...</p>
      </div>
    </div>
  );
}
