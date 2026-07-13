// Shown by Next.js while DashboardPage's server-side queries resolve.
// Mirrors DashboardClient's layout so there's no visible reflow on load.
export default function DashboardLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl animate-pulse flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-9 w-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <div className="h-4 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl border border-zinc-200 dark:border-zinc-800" />
        ))}
      </div>

      <div className="h-16 rounded-lg bg-zinc-200 dark:bg-zinc-800" />

      <div className="space-y-2.5">
        <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-3 w-full rounded-full bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
    </main>
  );
}
