"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type State =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; embeddedMerchants: number; categorizedTransactions: number }
  | { status: "error"; message: string };

/**
 * supabase-js's FunctionsHttpError only exposes a generic "non-2xx status
 * code" message by default — the actual { error: "..." } body our function
 * returned lives in error.context (the raw Response). Without unwrapping it,
 * every failure looks identical and undiagnosable from the UI.
 */
async function describeFunctionError(error: unknown): Promise<string> {
  const context = (error as { context?: unknown }).context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (typeof body?.error === "string") return body.error;
    } catch {
      try {
        const text = await context.clone().text();
        if (text) return text;
      } catch {
        // fall through to the generic message below
      }
    }
  }
  return error instanceof Error ? error.message : "Unknown error calling the Edge Function";
}

export function CategorizeButton() {
  const { t } = useLanguage();
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "idle" });

  const run = async () => {
    setState({ status: "running" });
    const supabase = createClient();
    // functions.invoke() automatically attaches the current session's
    // access token as the Authorization header — the Edge Function runs
    // scoped to this user, same as every other client call in this app.
    const { data, error } = await supabase.functions.invoke("categorize");
    if (error) {
      setState({ status: "error", message: await describeFunctionError(error) });
      return;
    }
    setState({
      status: "done",
      embeddedMerchants: data.embeddedMerchants,
      categorizedTransactions: data.categorizedTransactions,
    });
    // The spend-by-category chart is fetched server-side; refresh so newly
    // categorized transactions show up without a manual page reload.
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <button
        onClick={run}
        disabled={state.status === "running"}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        {state.status === "running" ? t("dashboard.categorizing") : t("dashboard.categorizeButton")}
      </button>

      {state.status === "done" && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          {t("dashboard.categorizeSuccess", {
            merchants: state.embeddedMerchants,
            transactions: state.categorizedTransactions,
          })}
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
