import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmployeeDetailCard } from "@/components/employee/employee-detail-card";
import { EmployeeDetailPhoto } from "@/components/employee/employee-detail-photo";
import { getEmployeeById } from "@/lib/employees/service";
import { getUser } from "@/lib/supabase-auth/auth";

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
