"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Employee } from "@/lib/employees/service";

type Props = {
  employee: Employee;
};

export function EmployeeDetailCard({ employee }: Props) {
  const hireYear = employee.hireDate.getFullYear();

  return (
    <Card>
      <CardHeader>
        <h1 className="text-2xl font-bold">{employee.nameKanji}</h1>
        <p className="text-sm text-gray-600">{employee.nameKana}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 社員番号 */}
        <div>
          <span className="text-sm font-semibold text-gray-700">社員番号:</span>
          <span className="ml-2">{employee.employeeNumber}</span>
        </div>

        {/* 入社年 */}
        <div>
          <span className="text-sm font-semibold text-gray-700">入社年:</span>
          <span className="ml-2">{hireYear}年</span>
        </div>

        {/* 携帯 */}
        <div>
          <span className="text-sm font-semibold text-gray-700">携帯:</span>
          <span className="ml-2">{employee.mobilePhone || "未登録"}</span>
        </div>

        {/* メール */}
        <div>
          <span className="text-sm font-semibold text-gray-700">メール:</span>
          <a
            href={`mailto:${employee.email}`}
            className="ml-2 text-blue-600 hover:underline"
          >
            {employee.email}
          </a>
        </div>

        {/* 所属一覧 */}
        <div>
          <span className="text-sm font-semibold text-gray-700 block mb-2">
            所属:
          </span>
          {employee.organizations.length > 0 ? (
            <ul className="space-y-1">
              {employee.organizations.map((org) => (
                <li key={org.organizationId} className="text-sm">
                  {org.organizationPath}
                  {org.position && ` (${org.position})`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">所属情報なし</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
