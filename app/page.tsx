import { getUser } from "@/lib/supabase-auth/auth";
import { signOut } from "@/lib/supabase-auth/authGoogle";

export default async function Home() {
  const user = await getUser();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">ホーム</h1>
          <p className="mt-4 text-gray-600">ログイン中: {user?.email}</p>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700"
          >
            ログアウト
          </button>
        </form>
      </div>
    </div>
  );
}
