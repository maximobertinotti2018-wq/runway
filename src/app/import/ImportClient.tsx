"use client";

import { useCallback, useMemo, useState } from "react";
import {
  parseCsv,
  detectColumns,
  parseHeaders,
  type ColumnMapping,
  type RawTransaction,
} from "@/lib/csv/parse";
import { normalizeMerchant } from "@/lib/merchants/normalize";

type Stage = "idle" | "mapping" | "preview";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function ImportClient() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [rows, setRows] = useState<RawTransaction[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>("idle");

  const runParse = useCallback((text: string, map: ColumnMapping) => {
    const res = parseCsv(text, map);
    setMapping(map);
    setRows(res.rows);
    setErrors(res.errors);
    setStage("preview");
  }, []);

  const ingest = useCallback(
    (text: string, name: string) => {
      setRawText(text);
      setFileName(name);
      const hs = parseHeaders(text);
      setHeaders(hs);
      const detected = detectColumns(hs);
      if (detected) {
        runParse(text, detected);
      } else {
        setMapping({ date: hs[0] ?? "", description: hs[1] ?? "", amount: hs[2] ?? "" });
        setStage("mapping");
      }
    },
    [runParse],
  );

  const onFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      ingest(text, file.name);
    },
    [ingest],
  );

  const loadSample = useCallback(async () => {
    const res = await fetch("/sample-transactions.csv");
    ingest(await res.text(), "sample-transactions.csv");
  }, [ingest]);

  const reset = () => {
    setStage("idle");
    setFileName(null);
    setRawText("");
    setHeaders([]);
    setMapping(null);
    setRows([]);
    setErrors([]);
  };

  const total = useMemo(() => rows.reduce((s, r) => s + Math.abs(r.amount), 0), [rows]);

  return (
    <div className="w-full max-w-3xl space-y-6">
      {stage === "idle" && <Dropzone onFile={onFile} onSample={loadSample} />}

      {stage === "mapping" && mapping && (
        <ColumnMapper
          headers={headers}
          mapping={mapping}
          onChange={setMapping}
          onConfirm={() => runParse(rawText, mapping)}
          onCancel={reset}
        />
      )}

      {stage === "preview" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{fileName}</p>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {rows.length} transactions · {money.format(total)} total spend
              </p>
            </div>
            <button
              onClick={reset}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Import another file
            </button>
          </div>

          {errors.length > 0 && (
            <div
              role="alert"
              className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200"
            >
              {errors.length} row{errors.length > 1 ? "s" : ""} skipped:
              <ul className="mt-1 list-inside list-disc">
                {errors.slice(0, 5).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Merchant</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map((r, i) => (
                  <tr key={i} className="text-zinc-800 dark:text-zinc-200">
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{r.occurredOn}</td>
                    <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">{r.description}</td>
                    <td className="px-4 py-2.5 font-medium">{normalizeMerchant(r.description)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                      {money.format(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            The <span className="font-medium">Merchant</span> column is the normalized key used
            for embedding-based categorization — the same messy descriptor always collapses to one
            cached merchant.
          </p>
        </section>
      )}
    </div>
  );
}

function Dropzone({
  onFile,
  onSample,
}: {
  onFile: (f: File) => void;
  onSample: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
          dragging
            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
        }`}
      >
        <span className="text-base font-medium text-zinc-800 dark:text-zinc-100">
          Drop a CSV here, or click to browse
        </span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Bank or card export with date, description and amount columns
        </span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </label>
      <div className="text-center">
        <button
          onClick={onSample}
          className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
        >
          or try it with sample data
        </button>
      </div>
    </div>
  );
}

function ColumnMapper({
  headers,
  mapping,
  onChange,
  onConfirm,
  onCancel,
}: {
  headers: string[];
  mapping: ColumnMapping;
  onChange: (m: ColumnMapping) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const fields: { key: keyof ColumnMapping; label: string }[] = [
    { key: "date", label: "Date" },
    { key: "description", label: "Description" },
    { key: "amount", label: "Amount" },
  ];
  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Map your columns
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          We couldn&apos;t detect the columns automatically — pick them below.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {fields.map((f) => (
          <label key={f.key} className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              {f.label}
            </span>
            <select
              value={mapping[f.key]}
              onChange={(e) => onChange({ ...mapping, [f.key]: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          Preview transactions
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
