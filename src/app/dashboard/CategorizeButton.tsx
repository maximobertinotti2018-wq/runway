"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type State =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; embeddedMerchants: number; categorizedTransactions: number }
  | { status: "error"; message: string };

export function CategorizeButton() {
  const [state, setState] = useState<State>({ status: "idle" });

  const run = async () => {
    setState({ status: "running" });
    const supabase = createClient();
    // functions.invoke() automatically attaches the current session's
    // access token as the Authorization header — the Edge Function runs
    // scoped to this user, same as every other client call in this app.
    const { data, error } = await supabase.functions.invoke("categorize");
    if (error) {
      setState({ status: "error", message: error.message });
      return;
    }
    setState({
      status: "done",
      embeddedMerchants: data.embeddedMerchants,
      categorizedTransactions: data.categorizedTransactions,
    });
  };

  return (
    <div className="space-y-3">
      <button
        onClick={run}
        disabled={state.status === "running"}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        {state.status === "running" ? "Categorizing…" : "Categorize transactions"}
      </button>

      {state.status === "done" && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Embedded {state.embeddedMerchants} new merchants, categorized{" "}
          {state.categorizedTransactions} transactions.
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {state.message}
        </p>
      )}
    </div>
  );
}
