import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
