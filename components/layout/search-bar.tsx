"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SearchType = "name" | "employeeNumber" | "hireYear";

const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
  name: "氏名",
  employeeNumber: "社員番号",
  hireYear: "入社年",
};

const SEARCH_PLACEHOLDERS: Record<SearchType, string> = {
  name: "氏名で検索（例: 山田太郎）",
  employeeNumber: "社員番号で検索（例: EMP001）",
  hireYear: "入社年で検索（例: 2020）",
};

export function SearchBar() {
  const router = useRouter();
  const [searchType, setSearchType] = useState<SearchType>("name");
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (query.trim() === "") {
      router.push("/employees");
    } else {
      router.push(
        `/employees?type=${searchType}&q=${encodeURIComponent(query)}`,
      );
    }
  };

  return (
    <search className="contents">
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 w-full max-w-2xl"
      >
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
            <SelectItem value="hireYear">
              {SEARCH_TYPE_LABELS.hireYear}
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
      </form>
    </search>
  );
}
