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
