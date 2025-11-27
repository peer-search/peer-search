import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { DeleteEmployeeDialog } from "@/components/employee/delete-employee-dialog";
import { EmployeeDetailCard } from "@/components/employee/employee-detail-card";
import { EmployeeDetailPhoto } from "@/components/employee/employee-detail-photo";
import { EmployeeForm } from "@/components/employee/employee-form";
import { Button } from "@/components/ui/button";
import { getEmployeeById } from "@/lib/employees/service";
import { getProfileByUserId } from "@/lib/profiles/service";
import { getUser } from "@/lib/supabase-auth/auth";

// Cache getEmployeeById to prevent duplicate calls within the same request
const cachedGetEmployeeById = cache(getEmployeeById);

type Props = {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ mode?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { employeeId } = await params;
  const employee = await cachedGetEmployeeById(employeeId);

  return {
    title: employee
      ? `${employee.nameKanji} - 社員詳細 - peer-search`
      : "社員詳細 - peer-search",
  };
}

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: Props) {
  // 認証チェック
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // 権限チェック
  const profile = await getProfileByUserId(user.id);
  const isAdmin = profile?.role === "admin";

  // 社員データ取得
  const { employeeId } = await params;
  const employee = await cachedGetEmployeeById(employeeId);
  if (!employee) {
    notFound();
  }

  // 編集モードの判定
  const { mode } = await searchParams;
  const isEditMode = mode === "edit";

  // 編集モードは管理者のみ
  if (isEditMode && !isAdmin) {
    throw new Error("Forbidden");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {isEditMode ? (
        // 編集モード
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">社員情報編集</h1>
          <EmployeeForm
            mode="edit"
            initialData={employee}
            employeeId={employeeId}
          />
        </div>
      ) : (
        // 表示モード
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <EmployeeDetailPhoto s3Key={employee.photoS3Key} />
          </div>
          <div className="space-y-4">
            <EmployeeDetailCard employee={employee} />
            {isAdmin && (
              <div className="flex gap-3">
                <Link href={`/employees/${employeeId}?mode=edit`}>
                  <Button>編集</Button>
                </Link>
                <DeleteEmployeeDialog
                  employeeId={employee.id}
                  employeeName={employee.nameKanji}
                  employeeNumber={employee.employeeNumber}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
