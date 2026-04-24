"use client";

import type { RunResult } from "@/lib/api";

interface Props {
  busy: boolean;
  result: RunResult | null;
  error: string | null;
}

export function OutputPanel({ busy, result, error }: Props) {
  return (
    <div className="h-full overflow-auto border-t border-border bg-black/70 p-3 font-mono text-xs text-gray-200 monaco-host">
      {busy && <div className="text-gray-400">يُشغَّل…</div>}
      {error && <pre className="whitespace-pre-wrap text-red-400">{error}</pre>}
      {result && (
        <>
          <div className="mb-2 text-gray-400">
            exit={result.exit_code} · {result.duration_ms}ms
            {result.timed_out ? " · timed out" : ""}
          </div>
          {result.stdout && (
            <pre className="whitespace-pre-wrap text-gray-100">{result.stdout}</pre>
          )}
          {result.stderr && (
            <pre className="whitespace-pre-wrap text-red-300">{result.stderr}</pre>
          )}
        </>
      )}
      {!busy && !result && !error && (
        <div className="text-gray-500">الخرج يظهر هنا بعد تشغيل الكود.</div>
      )}
    </div>
  );
}
