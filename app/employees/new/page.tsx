import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmployeeForm } from "@/components/employee/employee-form";
import { getProfileByUserId } from "@/lib/profiles/service";
import { getUser } from "@/lib/supabase-auth/auth";

export const metadata: Metadata = {
  title: "新規社員追加 - peer-search",
};

export default async function NewEmployeePage() {
  // 認証チェック
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  // 権限チェック
  const profile = await getProfileByUserId(user.id);
  if (profile?.role !== "admin") {
    throw new Error("Forbidden"); // 403エラーページへ
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">新規社員追加</h1>
      <EmployeeForm mode="create" />
    </div>
  );
}
