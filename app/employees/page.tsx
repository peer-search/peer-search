import { EmployeeCardList } from "@/components/employee/employee-card-list";
import { SortControls } from "@/components/employee/sort-controls";
import type { Employee, SearchEmployeesParams } from "@/lib/employees/service";
import { searchEmployees } from "@/lib/employees/service";
import { getUser } from "@/lib/supabase-auth/auth";

interface EmployeesPageSearchParams {
  type?: "name" | "employeeNumber";
  q?: string;
  hire_year?: string;
  name?: string;
  employee_number?: string;
  org_id?: string;
  sort?: "name_kana" | "employee_number" | "hire_date";
  order?: "asc" | "desc";
}

interface EmployeesPageProps {
  searchParams: Promise<EmployeesPageSearchParams>;
}

export default async function EmployeesPage({
  searchParams,
}: EmployeesPageProps) {
  // 認証確認
  const user = await getUser();
  if (!user) {
    // proxy.tsで既にリダイレクトされているはずだが、念のため
    return null;
  }

  // Search Paramsの取得
  const params = await searchParams;

  // 検索条件の構築
  const searchConditions: SearchEmployeesParams = {};

  // SearchBarからの検索パラメータ (type + q) を処理
  if (params.type && params.q) {
    if (params.type === "name") {
      searchConditions.name = params.q;
    } else if (params.type === "employeeNumber") {
      searchConditions.employeeNumber = params.q;
    }
  } else {
    // 従来の個別パラメータをフォールバック
    if (params.name) {
      searchConditions.name = params.name;
    }

    if (params.employee_number) {
      searchConditions.employeeNumber = params.employee_number;
    }
  }

  // 入社年フィルタ（独立して処理）
  if (params.hire_year) {
    const year = Number.parseInt(params.hire_year, 10);
    if (!Number.isNaN(year)) {
      searchConditions.hireYear = year;
    }
  }

  if (params.org_id) {
    searchConditions.orgId = params.org_id;
  }

  if (params.sort) {
    searchConditions.sort = params.sort;
  }

  if (params.order) {
    searchConditions.order = params.order;
  }

  // 社員データの取得
  let employees: Employee[];
  try {
    employees = await searchEmployees(searchConditions);
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    throw error;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">社員一覧</h1>

      {/* 検索条件表示 */}
      {(params.type ||
        params.name ||
        params.employee_number ||
        params.hire_year ||
        params.org_id) && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">検索条件:</span>
            {params.type === "name" && params.q && (
              <span className="ml-2">氏名「{params.q}」</span>
            )}
            {params.type === "employeeNumber" && params.q && (
              <span className="ml-2">社員番号「{params.q}」</span>
            )}
            {!params.type && params.name && (
              <span className="ml-2">氏名「{params.name}」</span>
            )}
            {!params.type && params.employee_number && (
              <span className="ml-2">社員番号「{params.employee_number}」</span>
            )}
            {params.hire_year && (
              <span className="ml-2">入社年「{params.hire_year}年」</span>
            )}
            {params.org_id && <span className="ml-2">組織フィルタ適用中</span>}
          </p>
        </div>
      )}

      {/* 結果数表示 */}
      <div className="mb-4 text-sm text-gray-600">
        {employees.length}件の社員が見つかりました
      </div>

      {/* ソートコントロール */}
      <div className="mb-6">
        <SortControls currentSort={params.sort} currentOrder={params.order} />
      </div>

      {/* 社員カードリスト */}
      <EmployeeCardList employees={employees} />
    </div>
  );
}
