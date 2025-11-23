import { getProfileByUserId } from "@/lib/profiles/service";
import { getUser } from "@/lib/supabase-auth/auth";
import { PageHeader } from "./page-header";

export async function PageHeaderWrapper() {
  const user = await getUser();

  if (!user) {
    return null;
  }

  // Get user profile to check admin status
  const profile = await getProfileByUserId(user.id);
  const isAdmin = profile?.role === "admin";

  return <PageHeader user={user} isAdmin={isAdmin} />;
}
