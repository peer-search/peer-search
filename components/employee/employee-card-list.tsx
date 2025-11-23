import type { Employee } from "@/lib/employees/service";
import { EmployeeCard } from "./employee-card";

export interface EmployeeCardListProps {
  employees: Employee[];
}

export function EmployeeCardList({ employees }: EmployeeCardListProps) {
  if (employees.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">社員が見つかりませんでした</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {employees.map((employee) => (
        <EmployeeCard key={employee.id} employee={employee} />
      ))}
    </div>
  );
}
