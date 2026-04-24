"use client";

import { Send } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { api } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ToolEvent {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
}

interface Props {
  onWorkspaceChanged?: () => void;
}

export function ChatPanel({ onWorkspaceChanged }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const assistantDraftRef = useRef<string>("");

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setToolEvents([]);
    setStreaming(true);
    assistantDraftRef.current = "";
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    let res: Response;
    try {
      res = await api.chatStream(next);
    } catch (err) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: `تعذَّر الاتصال بالخادم: ${String(err)}`,
        };
        return copy;
      });
      setStreaming(false);
      return;
    }

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => res.statusText);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: `⚠️ خطأ من الخادم: ${res.status} ${detail}`,
        };
        return copy;
      });
      setStreaming(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep = buffer.indexOf("\n\n");
      while (sep !== -1) {
        const chunk = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        sep = buffer.indexOf("\n\n");
        handleChunk(chunk);
      }
    }

    function handleChunk(raw: string) {
      let event = "message";
      let data = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) return;
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(data);
      } catch {
        return;
      }

      if (event === "delta" && typeof parsed.text === "string") {
        assistantDraftRef.current += parsed.text;
        const draft = assistantDraftRef.current;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: draft };
          return copy;
        });
      } else if (event === "tool_use") {
        setToolEvents((prev) => [
          ...prev,
          {
            id: String(parsed.id),
            name: String(parsed.name),
            input: (parsed.input as Record<string, unknown>) ?? {},
          },
        ]);
      } else if (event === "tool_result") {
        setToolEvents((prev) =>
          prev.map((ev) =>
            ev.id === parsed.id
              ? { ...ev, result: (parsed.result as Record<string, unknown>) ?? {} }
              : ev,
          ),
        );
        // Files may have changed - let the parent refresh the tree.
        onWorkspaceChanged?.();
      } else if (event === "error") {
        const message = String((parsed as { message?: string }).message ?? "خطأ غير معروف");
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${message}` }]);
      }
    }

    setStreaming(false);
  }, [input, messages, streaming, onWorkspaceChanged]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-auto p-3 text-sm">
        {messages.length === 0 && (
          <div className="rounded border border-border/60 bg-sidebar p-3 text-gray-400">
            ابدأ بمحادثة الوكيل. يمكنه قراءة وتعديل ملفاتك وتشغيل الكود نيابة عنك.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded border p-2 ${
              m.role === "user"
                ? "border-blue-500/40 bg-blue-500/10"
                : "border-border/60 bg-sidebar"
            }`}
          >
            <div className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">
              {m.role === "user" ? "أنت" : "الوكيل"}
            </div>
            <pre className="whitespace-pre-wrap text-gray-100">{m.content}</pre>
          </div>
        ))}
        {toolEvents.length > 0 && (
          <details className="rounded border border-border/60 bg-sidebar p-2 text-xs">
            <summary className="cursor-pointer text-gray-400">
              أدوات الوكيل ({toolEvents.length})
            </summary>
            <ul className="mt-2 space-y-2">
              {toolEvents.map((ev) => (
                <li key={ev.id} className="font-mono">
                  <div className="text-blue-300">{ev.name}({JSON.stringify(ev.input)})</div>
                  {ev.result && (
                    <pre className="mt-1 whitespace-pre-wrap text-gray-400">
                      {JSON.stringify(ev.result, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
      <form
        className="flex gap-2 border-t border-border bg-sidebar p-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          className="flex-1 resize-none rounded border border-border bg-panel p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={2}
          value={input}
          placeholder="اسأل الوكيل…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          disabled={streaming}
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="flex items-center gap-1 rounded bg-blue-600 px-3 text-sm text-white disabled:opacity-50"
        >
          <Send size={14} /> إرسال
        </button>
      </form>
    </div>
  );
}
