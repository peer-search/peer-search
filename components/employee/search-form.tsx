"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface SearchFormProps {
  defaultValues?: {
    name?: string;
    employeeNumber?: string;
    hireYear?: string;
  };
}

export function SearchForm({ defaultValues }: SearchFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState(defaultValues?.name || "");
  const [employeeNumber, setEmployeeNumber] = useState(
    defaultValues?.employeeNumber || "",
  );
  const [hireYear, setHireYear] = useState(defaultValues?.hireYear || "");
  const [isOpen, setIsOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams(searchParams);

    // 検索条件をパラメータに設定
    if (name.trim()) {
      params.set("name", name.trim());
    } else {
      params.delete("name");
    }

    if (employeeNumber.trim()) {
      params.set("employee_number", employeeNumber.trim());
    } else {
      params.delete("employee_number");
    }

    if (hireYear.trim()) {
      params.set("hire_year", hireYear.trim());
    } else {
      params.delete("hire_year");
    }

    // ページ遷移
    router.push(`/employees?${params.toString()}`);

    // モバイルの場合はSheetを閉じる
    setIsOpen(false);
  };

  const handleClear = () => {
    setName("");
    setEmployeeNumber("");
    setHireYear("");

    // すべてのパラメータをクリア
    router.push("/employees");

    // モバイルの場合はSheetを閉じる
    setIsOpen(false);
  };

  const FormContent = () => (
    <form onSubmit={handleSearch} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">氏名</Label>
        <Input
          id="name"
          type="text"
          placeholder="氏名で検索"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="employeeNumber">社員番号</Label>
        <Input
          id="employeeNumber"
          type="text"
          placeholder="社員番号で検索"
          value={employeeNumber}
          onChange={(e) => setEmployeeNumber(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hireYear">入社年</Label>
        <Input
          id="hireYear"
          type="number"
          placeholder="入社年で検索（例: 2020）"
          value={hireYear}
          onChange={(e) => setHireYear(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          <Search className="mr-2 h-4 w-4" />
          検索
        </Button>
        <Button type="button" variant="outline" onClick={handleClear}>
          クリア
        </Button>
      </div>
    </form>
  );

  return (
    <>
      {/* デスクトップ表示 */}
      <div className="hidden md:block">
        <FormContent />
      </div>

      {/* モバイル表示（Sheet/ドロワー） */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <Search className="mr-2 h-4 w-4" />
              検索条件を設定
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>社員検索</SheetTitle>
              <SheetDescription>
                氏名、社員番号、入社年で社員を検索できます
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <FormContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
