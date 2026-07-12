import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signout } from "../login/actions";

export const metadata = { title: "Dashboard · Runway" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt-and-suspenders: middleware already guards this route.
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <form action={signout}>
          <button className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900">
            Sign out
          </button>
        </form>
      </header>

      <p className="text-zinc-600 dark:text-zinc-400">
        Signed in as <span className="font-medium text-zinc-900 dark:text-zinc-100">{user.email}</span>.
      </p>

      <Link
        href="/import"
        className="inline-flex h-11 w-fit items-center rounded-full bg-emerald-600 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
      >
        Import transactions →
      </Link>
    </main>
  );
}
