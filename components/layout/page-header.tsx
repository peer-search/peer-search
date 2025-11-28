import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { SearchBar } from "./search-bar";
import { UserMenu } from "./user-menu";

interface PageHeaderProps {
  user: User;
  isAdmin: boolean;
}

export function PageHeader({ user, isAdmin }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-4 px-4 md:gap-6 md:px-8">
        {/* Logo / System Name */}
        <Link
          href="/"
          className="flex items-center space-x-2 text-lg font-bold hover:opacity-80 transition-opacity"
        >
          <span>peer-search</span>
        </Link>

        {/* Search Bar - hidden on mobile, shown on tablet+ */}
        <div className="hidden md:flex flex-1 justify-center">
          <SearchBar />
        </div>

        {/* User Menu */}
        <div className="ml-auto flex items-center">
          <UserMenu user={user} isAdmin={isAdmin} />
        </div>
      </div>

      {/* Search Bar - shown on mobile only */}
      <div className="flex md:hidden border-t px-4 py-3">
        <SearchBar />
      </div>
    </header>
  );
}
