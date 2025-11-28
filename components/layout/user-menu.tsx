"use client";

import type { User } from "@supabase/supabase-js";
import { Building2, LogOut, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/supabase-auth/authGoogle";

interface UserMenuProps {
  user: User;
  isAdmin: boolean;
}

export function UserMenu({ user, isAdmin }: UserMenuProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error("ログアウトエラー:", error);
      setIsLoading(false);
    }
  };

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full"
          aria-label="ユーザーメニューを開く"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={user.user_metadata?.avatar_url}
              alt={user.email || "User avatar"}
            />
            <AvatarFallback>{getInitials(user.email || "U")}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {isAdmin && (
          <>
            <DropdownMenuItem
              onClick={() => handleNavigation("/employees/new")}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              <span>社員追加</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleNavigation("/admin/organizations")}
            >
              <Building2 className="mr-2 h-4 w-4" />
              <span>部署編集</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleLogout} disabled={isLoading}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>ログアウト</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
