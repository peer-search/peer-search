import { signInWithGoogle } from "@/lib/supabase-auth/authGoogle";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold">ログイン</h2>
          <p className="mt-2 text-gray-600">
            Googleアカウントでログインしてください
          </p>
        </div>

        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Googleでログイン
          </button>
        </form>
      </div>
    </div>
  );
}
