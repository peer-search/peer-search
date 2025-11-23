import { eq } from "drizzle-orm";
import { db } from "@/db";
import type { Profile } from "@/db/schema";
import { profiles } from "@/db/schema";

/**
 * ユーザーIDからプロフィール情報を取得する
 *
 * @param userId - ユーザーID (UUID)
 * @returns プロフィール情報、存在しない場合はnull
 *
 * @example
 * const profile = await getProfileByUserId('550e8400-e29b-41d4-a716-446655440000');
 * if (profile) {
 *   console.log('Role:', profile.role);
 * } else {
 *   console.log('Profile not found');
 * }
 */
export async function getProfileByUserId(
  userId: string,
): Promise<Profile | null> {
  const result = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId));

  return result.length > 0 ? result[0] : null;
}
