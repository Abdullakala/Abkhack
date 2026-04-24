"use client";

import { ChevronDown, ChevronRight, File as FileIcon, Folder } from "lucide-react";
import { useState } from "react";

import type { FileNode } from "@/lib/api";

interface Props {
  root: FileNode | null;
  activePath: string | null;
  onSelect: (path: string) => void;
}

export function FileTree({ root, activePath, onSelect }: Props) {
  if (!root) {
    return <div className="p-3 text-xs text-gray-500">جار التحميل…</div>;
  }
  return (
    <ul className="text-sm">
      {(root.children ?? []).map((child) => (
        <FileTreeNode
          key={child.path}
          node={child}
          depth={0}
          activePath={activePath}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

function FileTreeNode({
  node,
  depth,
  activePath,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  activePath: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 1);
  const isActive = activePath === node.path;
  const padding = { paddingInlineStart: `${depth * 12 + 8}px` };

  if (node.type === "directory") {
    return (
      <li>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-1 py-1 text-start hover:bg-white/5"
          style={padding}
        >
          {open ? (
            <ChevronDown size={14} className="opacity-70" />
          ) : (
            <ChevronRight size={14} className="opacity-70" />
          )}
          <Folder size={14} className="text-yellow-400/80" />
          <span className="truncate">{node.name}</span>
        </button>
        {open && (
          <ul>
            {(node.children ?? []).map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activePath={activePath}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        className={`flex w-full items-center gap-1 py-1 text-start hover:bg-white/5 ${
          isActive ? "bg-white/10" : ""
        }`}
        style={padding}
      >
        <span className="w-[14px]" />
        <FileIcon size={14} className="text-gray-400" />
        <span className="truncate">{node.name}</span>
      </button>
    </li>
  );
}
