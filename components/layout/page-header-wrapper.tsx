import { getProfileByUserId } from "@/lib/profiles/service";
import { getUser } from "@/lib/supabase-auth/auth";
import { PageHeader } from "./page-header";

export async function PageHeaderWrapper() {
  const user = await getUser();

  if (!user) {
    return null;
  }

  // Get user profile to check admin status
  // Handle missing profiles gracefully (profile may not exist yet)
  let profile = null;
  try {
    profile = await getProfileByUserId(user.id);
  } catch (error) {
    console.error("Failed to fetch profile:", error);
  }
  const isAdmin = profile?.role === "admin";

  return <PageHeader user={user} isAdmin={isAdmin} />;
}
