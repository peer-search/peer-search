"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

// 現在の年から100年前までの年のリストを生成
function generateYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = 0; i < 100; i++) {
    years.push(currentYear - i);
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
        className="flex flex-col gap-3 w-full max-w-2xl"
      >
        {/* メイン検索行: 検索種別 + 入力 + ボタン */}
        <div className="flex items-center gap-2">
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

          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={SEARCH_PLACEHOLDERS[searchType]}
            aria-label="検索キーワード"
            className="flex-1 min-w-0"
          />

          <Button
            type="submit"
            size="icon"
            aria-label="検索"
            className="shrink-0"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* 入社年フィルタ行 */}
        <div className="flex items-center gap-3 text-sm">
          <RadioGroup
            value={hireYearEnabled ? "enabled" : "disabled"}
            onValueChange={(value) => setHireYearEnabled(value === "enabled")}
            className="flex items-center gap-3"
          >
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="disabled" id="hire-year-off" />
              <Label htmlFor="hire-year-off" className="cursor-pointer">
                入社年指定なし
              </Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="enabled" id="hire-year-on" />
              <Label htmlFor="hire-year-on" className="cursor-pointer">
                入社年で絞り込み
              </Label>
            </div>
          </RadioGroup>

          <Select
            value={hireYear}
            onValueChange={setHireYear}
            disabled={!hireYearEnabled}
          >
            <SelectTrigger className="w-[120px]" aria-label="入社年">
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
        </div>
      </form>
    </search>
  );
}
