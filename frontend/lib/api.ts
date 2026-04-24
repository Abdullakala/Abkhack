export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
  timed_out: boolean;
}

const API_BASE = "/api";

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${res.statusText}: ${detail}`);
  }
  return (await res.json()) as T;
}

export const api = {
  listFiles: (path = "") =>
    jsonFetch<FileNode>(`${API_BASE}/files?path=${encodeURIComponent(path)}`),

  readFile: (path: string) =>
    jsonFetch<{ path: string; content: string }>(
      `${API_BASE}/files/read?path=${encodeURIComponent(path)}`,
    ),

  writeFile: (path: string, content: string) =>
    jsonFetch<{ path: string; bytes_written: number }>(`${API_BASE}/files/write`, {
      method: "PUT",
      body: JSON.stringify({ path, content }),
    }),

  deleteFile: (path: string) =>
    jsonFetch<{ path: string; deleted: boolean }>(
      `${API_BASE}/files?path=${encodeURIComponent(path)}`,
      { method: "DELETE" },
    ),

  runCode: (payload: {
    language: "python" | "node";
    code?: string;
    path?: string;
    stdin?: string;
  }) =>
    jsonFetch<RunResult>(`${API_BASE}/run`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  chatStream: (messages: { role: "user" | "assistant"; content: string }[]) =>
    fetch(`${API_BASE}/agent/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    }),
};
