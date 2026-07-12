import Link from "next/link";
import { ImportClient } from "./ImportClient";

export const metadata = {
  title: "Import transactions · Runway",
};

export default function ImportPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="space-y-2">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Runway
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Import transactions
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Upload a CSV export from your bank or card. We detect the columns, normalize each
          merchant, and get it ready for categorization.
        </p>
      </header>
      <ImportClient />
    </main>
  );
}
