"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SearchType = "name" | "employeeNumber";

const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
  name: "氏名",
  employeeNumber: "社員番号",
};

const SEARCH_PLACEHOLDERS: Record<SearchType, string> = {
  name: "氏名で検索（例: 山田太郎）",
  employeeNumber: "社員番号で検索（例: EMP001）",
};

// 現在の年から1983年までの年のリストを生成
function generateYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear; year >= 1983; year--) {
    years.push(year);
  }
  return years;
}

export function SearchBar() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const [searchType, setSearchType] = useState<SearchType>("name");
  const [query, setQuery] = useState("");
  const [hireYearEnabled, setHireYearEnabled] = useState(false);
  const [hireYear, setHireYear] = useState<string>(currentYear.toString());

  const yearOptions = generateYearOptions();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();

    // 検索種別とクエリを追加
    if (query.trim() !== "") {
      params.set("type", searchType);
      params.set("q", query.trim());
    }

    // 入社年フィルタを追加
    if (hireYearEnabled) {
      params.set("hire_year", hireYear);
    }

    // パラメータがある場合はクエリ付きで遷移、なければベースURLへ
    const queryString = params.toString();
    router.push(queryString ? `/employees?${queryString}` : "/employees");
  };

  return (
    <search className="contents">
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 w-full max-w-2xl"
      >
        {/* 検索種別 */}
        <Select
          value={searchType}
          onValueChange={(value) => setSearchType(value as SearchType)}
        >
          <SelectTrigger
            className="w-[100px] sm:w-[140px]"
            aria-label="検索種別"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">{SEARCH_TYPE_LABELS.name}</SelectItem>
            <SelectItem value="employeeNumber">
              {SEARCH_TYPE_LABELS.employeeNumber}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* 検索入力 */}
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={SEARCH_PLACEHOLDERS[searchType]}
          aria-label="検索キーワード"
          className="flex-1 min-w-0"
        />

        {/* 入社年チェックボックス */}
        <div className="flex items-center gap-1.5">
          <Checkbox
            id="hire-year-filter"
            checked={hireYearEnabled}
            onCheckedChange={(checked) => setHireYearEnabled(checked === true)}
          />
          <Label
            htmlFor="hire-year-filter"
            className="text-sm cursor-pointer whitespace-nowrap"
          >
            入社年
          </Label>
        </div>

        {/* 入社年プルダウン */}
        <Select
          value={hireYear}
          onValueChange={setHireYear}
          disabled={!hireYearEnabled}
        >
          <SelectTrigger className="w-[100px] sm:w-[120px]" aria-label="入社年">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}年
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 検索ボタン */}
        <Button
          type="submit"
          size="icon"
          aria-label="検索"
          className="shrink-0"
        >
          <Search className="h-4 w-4" />
        </Button>
      </form>
    </search>
  );
}
