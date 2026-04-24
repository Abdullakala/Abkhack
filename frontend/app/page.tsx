"use client";

import { Play, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ChatPanel } from "@/components/ChatPanel";
import { Editor } from "@/components/Editor";
import { FileTree } from "@/components/FileTree";
import { OutputPanel } from "@/components/OutputPanel";
import { api, type FileNode, type RunResult } from "@/lib/api";

function inferLanguage(path: string | null): "python" | "node" | null {
  if (!path) return null;
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "py") return "python";
  if (ext === "js" || ext === "mjs" || ext === "cjs") return "node";
  return null;
}

export default function IdePage() {
  const [tree, setTree] = useState<FileNode | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [buffer, setBuffer] = useState<string>("");
  const [dirty, setDirty] = useState(false);

  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const refreshTree = useCallback(async () => {
    try {
      const next = await api.listFiles("");
      setTree(next);
    } catch (err) {
      setRunError(String(err));
    }
  }, []);

  useEffect(() => {
    void refreshTree();
  }, [refreshTree]);

  const openFile = useCallback(async (path: string) => {
    setActivePath(path);
    setDirty(false);
    try {
      const res = await api.readFile(path);
      setBuffer(res.content);
    } catch (err) {
      setRunError(String(err));
    }
  }, []);

  const saveFile = useCallback(async () => {
    if (!activePath) return;
    await api.writeFile(activePath, buffer);
    setDirty(false);
    await refreshTree();
  }, [activePath, buffer, refreshTree]);

  const runActive = useCallback(async () => {
    if (!activePath) return;
    const lang = inferLanguage(activePath);
    if (!lang) {
      setRunError("الامتداد غير مدعوم حالياً. جرِّب ‎.py‎ أو ‎.js‎.");
      setRunResult(null);
      return;
    }
    if (dirty) await saveFile();
    setRunError(null);
    setRunResult(null);
    setRunning(true);
    try {
      const res = await api.runCode({ language: lang, path: activePath });
      setRunResult(res);
    } catch (err) {
      setRunError(String(err));
    } finally {
      setRunning(false);
    }
  }, [activePath, dirty, saveFile]);

  return (
    <main className="grid h-screen w-screen grid-cols-[220px_minmax(0,1fr)_360px] grid-rows-[40px_minmax(0,1fr)_200px]">
      <header className="col-span-3 flex items-center justify-between border-b border-border bg-sidebar px-3 text-sm">
        <div className="font-semibold">Abkhack IDE</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={saveFile}
            disabled={!activePath || !dirty}
            className="flex items-center gap-1 rounded bg-white/5 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-40"
          >
            <Save size={12} /> حفظ
          </button>
          <button
            type="button"
            onClick={runActive}
            disabled={!activePath || running}
            className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-50"
          >
            <Play size={12} /> تشغيل
          </button>
        </div>
      </header>

      <aside className="row-span-2 overflow-auto border-e border-border bg-sidebar">
        <div className="px-3 pt-2 text-[10px] uppercase tracking-wide text-gray-400">
          المستكشف
        </div>
        <FileTree root={tree} activePath={activePath} onSelect={openFile} />
      </aside>

      <section className="flex flex-col bg-panel">
        <div className="flex items-center gap-2 border-b border-border bg-sidebar px-3 py-1 text-xs">
          <span className="text-gray-300">{activePath ?? "لم يُفتح ملف"}</span>
          {dirty && <span className="text-amber-400">●</span>}
        </div>
        <div className="min-h-0 flex-1">
          <Editor
            path={activePath}
            value={buffer}
            onChange={(v) => {
              setBuffer(v);
              setDirty(true);
            }}
          />
        </div>
      </section>

      <aside className="row-span-2 border-s border-border bg-sidebar">
        <ChatPanel onWorkspaceChanged={refreshTree} />
      </aside>

      <section className="col-start-2 row-start-3 flex min-h-0 flex-col">
        <OutputPanel busy={running} result={runResult} error={runError} />
      </section>
    </main>
  );
}
