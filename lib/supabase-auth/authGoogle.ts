"use server";

import { createClient } from "@/lib/supabase-auth/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

// 現在のオリジンを取得する関数
async function getOrigin() {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  // localhostの場合はhttp、それ以外はhttps
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/api/auth/callback`,
    },
  });

  if (error) {
    console.error(error);
    return;
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
