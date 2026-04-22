"""File operations confined to the configured workspace directory.

All paths accepted from clients are normalised and validated so that they
cannot escape the workspace via `..` or absolute paths.
"""

from __future__ import annotations

import os
from pathlib import Path

from .config import settings
from .models import FileNode


class PathOutsideWorkspaceError(ValueError):
    """Raised when a requested path resolves outside the workspace root."""


def _workspace_root() -> Path:
    root = settings.workspace_dir.resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def resolve_workspace_path(relative: str) -> Path:
    """Resolve *relative* against the workspace root, enforcing containment."""
    root = _workspace_root()
    # Treat leading slashes as workspace-relative, not filesystem-absolute.
    cleaned = relative.lstrip("/\\") if relative else ""
    candidate = (root / cleaned).resolve()
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise PathOutsideWorkspaceError(
            f"Path {relative!r} escapes the workspace root"
        ) from exc
    return candidate


def _to_rel(path: Path) -> str:
    return str(path.relative_to(_workspace_root())).replace(os.sep, "/")


def list_tree(sub_path: str = "") -> FileNode:
    base = resolve_workspace_path(sub_path)
    if not base.exists():
        base.mkdir(parents=True, exist_ok=True)

    def build(node_path: Path) -> FileNode:
        if node_path.is_dir():
            children = []
            for child in sorted(node_path.iterdir(), key=lambda p: (p.is_file(), p.name)):
                if child.name.startswith("."):
                    continue
                children.append(build(child))
            rel = _to_rel(node_path) if node_path != _workspace_root() else ""
            return FileNode(
                name=node_path.name or "workspace",
                path=rel,
                type="directory",
                children=children,
            )
        return FileNode(
            name=node_path.name,
            path=_to_rel(node_path),
            type="file",
        )

    return build(base)


def read_file(path: str) -> str:
    target = resolve_workspace_path(path)
    if not target.is_file():
        raise FileNotFoundError(f"No such file: {path}")
    return target.read_text(encoding="utf-8")


def write_file(path: str, content: str) -> int:
    target = resolve_workspace_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    data = content.encode("utf-8")
    target.write_bytes(data)
    return len(data)


def delete_path(path: str) -> bool:
    target = resolve_workspace_path(path)
    if not target.exists():
        return False
    if target == _workspace_root():
        raise ValueError("Refusing to delete the workspace root")
    if target.is_dir():
        import shutil

        shutil.rmtree(target)
    else:
        target.unlink()
    return True
