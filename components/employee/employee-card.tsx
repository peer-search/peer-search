import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Employee } from "@/lib/employees/service";
import { EmployeePhoto } from "./employee-photo";

export interface EmployeeCardProps {
  employee: Employee;
}

export function EmployeeCard({ employee }: EmployeeCardProps) {
  return (
    <Link href={`/employees/${employee.id}`} className="block">
      <Card
        className="transition-all hover:border-gray-400 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500"
        aria-label={`${employee.nameKanji}の社員カード`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <EmployeePhoto
              photoS3Key={employee.photoS3Key}
              nameKanji={employee.nameKanji}
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold truncate">
                {employee.nameKanji}
              </h3>
              <p className="text-sm text-gray-600 truncate">
                {employee.nameKana}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-gray-600">社員番号:</span>{" "}
            <span className="font-medium">{employee.employeeNumber}</span>
          </div>
          {employee.mobilePhone && (
            <div>
              <span className="text-gray-600">携帯電話:</span>{" "}
              <span>{employee.mobilePhone}</span>
            </div>
          )}
          <div>
            <span className="text-gray-600">メール:</span>{" "}
            <span className="break-all">{employee.email}</span>
          </div>
          {employee.organizations.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <span className="text-gray-600 block mb-1">所属:</span>
              <ul className="space-y-1">
                {employee.organizations.map((org) => (
                  <li key={org.organizationId} className="text-sm">
                    {org.organizationPath}
                    {org.position && (
                      <span className="text-gray-600"> ({org.position})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {employee.organizations.length === 0 && (
            <div className="mt-3 pt-3 border-t">
              <span className="text-gray-500">所属なし</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
