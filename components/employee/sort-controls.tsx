"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export interface SortControlsProps {
  currentSort?: "name_kana" | "employee_number" | "hire_date";
  currentOrder?: "asc" | "desc";
}

type SortField = "name_kana" | "employee_number" | "hire_date";

const sortLabels: Record<SortField, string> = {
  name_kana: "氏名（かな）",
  employee_number: "社員番号",
  hire_date: "入社年",
};

export function SortControls({ currentSort, currentOrder }: SortControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortClick = (field: SortField) => {
    const params = new URLSearchParams(searchParams);

    // 同じフィールドをクリックした場合は昇順→降順→ソート解除
    if (currentSort === field) {
      if (currentOrder === "asc") {
        params.set("sort", field);
        params.set("order", "desc");
      } else {
        // 降順の場合はソートを解除
        params.delete("sort");
        params.delete("order");
      }
    } else {
      // 新しいフィールドの場合は昇順から開始
      params.set("sort", field);
      params.set("order", "asc");
    }

    router.push(`/employees?${params.toString()}`);
  };

  const getSortIcon = (field: SortField) => {
    if (currentSort !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    if (currentOrder === "asc") {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const getAriaSort = (
    field: SortField,
  ): "ascending" | "descending" | "none" => {
    if (currentSort !== field) return "none";
    return currentOrder === "asc" ? "ascending" : "descending";
  };

  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(sortLabels) as SortField[]).map((field) => (
        <Button
          key={field}
          variant={currentSort === field ? "default" : "outline"}
          size="sm"
          onClick={() => handleSortClick(field)}
          aria-sort={getAriaSort(field)}
          aria-label={`${sortLabels[field]}でソート`}
        >
          {sortLabels[field]}
          {getSortIcon(field)}
        </Button>
      ))}
    </div>
  );
}
