from __future__ import annotations

import pytest

from app import files
from app.config import settings


@pytest.fixture(autouse=True)
def isolated_workspace(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "workspace_dir", tmp_path)
    yield tmp_path


def test_write_and_read_roundtrip():
    files.write_file("hello.txt", "hi there")
    assert files.read_file("hello.txt") == "hi there"


def test_list_tree_includes_written_file():
    files.write_file("src/main.py", "print(1)\n")
    tree = files.list_tree("")
    names = {child.name for child in (tree.children or [])}
    assert "src" in names


def test_path_traversal_is_rejected():
    with pytest.raises(files.PathOutsideWorkspaceError):
        files.resolve_workspace_path("../etc/passwd")


def test_delete_path_removes_file():
    files.write_file("junk.txt", "x")
    assert files.delete_path("junk.txt") is True
    assert files.delete_path("junk.txt") is False
