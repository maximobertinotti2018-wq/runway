export default function ImportLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl animate-pulse flex-col gap-8 px-6 py-16">
      <div className="space-y-2">
        <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-8 w-56 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-full max-w-md rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="h-48 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800" />
    </main>
  );
}
