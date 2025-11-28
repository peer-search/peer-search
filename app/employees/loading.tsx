import { Card, CardContent, CardHeader } from "@/components/ui/card";

const SKELETON_CARDS = [1, 2, 3, 4, 5, 6];

export default function EmployeesLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">社員一覧</h1>

      {/* スケルトンカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SKELETON_CARDS.map((id) => (
          <Card key={`skeleton-${id}`} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
              <div className="h-4 bg-gray-200 rounded w-4/6" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
