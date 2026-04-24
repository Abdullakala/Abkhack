"use client";

import MonacoEditor from "@monaco-editor/react";
import { useEffect, useState } from "react";

interface Props {
  path: string | null;
  value: string;
  onChange: (next: string) => void;
}

const EXT_TO_LANG: Record<string, string> = {
  py: "python",
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  md: "markdown",
  html: "html",
  css: "css",
  sh: "shell",
};

function languageFor(path: string | null): string {
  if (!path) return "plaintext";
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANG[ext] ?? "plaintext";
}

export function Editor({ path, value, onChange }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="monaco-host h-full w-full">
      <MonacoEditor
        height="100%"
        theme="vs-dark"
        path={path ?? "untitled"}
        language={languageFor(path)}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          tabSize: 2,
          automaticLayout: true,
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}
