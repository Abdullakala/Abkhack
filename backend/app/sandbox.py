"""Sandboxed code execution via Docker.

A short-lived container is spawned per run with the following isolation
properties:

- **Container root filesystem is read-only** (``--read-only``), so malicious
  code cannot modify the runtime image itself.
- **Network is disabled** (``--network=none``), blocking any outbound
  traffic.
- **CPU, memory and PID limits** are enforced per config.
- **`/tmp` is a small tmpfs** for scratch writes that vanish at exit.
- **The user's workspace is bind-mounted read-write at `/workspace`** so that
  executed code can create and update artifacts (e.g. build outputs, test
  reports). This is an intentional trade-off: we trust that the user's own
  code may modify the user's own workspace. The sandbox's job is to contain
  OS-level escape, not to stop user code from touching user files. Clients
  that need stricter isolation should change the mount to `:ro` below.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass

from .config import settings
from .files import resolve_workspace_path


@dataclass
class RunResult:
    stdout: str
    stderr: str
    exit_code: int
    duration_ms: int
    timed_out: bool = False


LANGUAGE_COMMANDS: dict[str, list[str]] = {
    "python": ["python", "-u"],
    "node": ["node"],
}


def _build_command(language: str, *, code: str | None, path: str | None) -> list[str]:
    if language not in LANGUAGE_COMMANDS:
        raise ValueError(f"Unsupported language: {language}")
    base = LANGUAGE_COMMANDS[language]
    if path is not None:
        # Validate the path is inside the workspace; the sandbox mounts the
        # workspace at /workspace so we can re-use that path directly.
        resolve_workspace_path(path)
        cleaned = path.lstrip("/\\")
        return [*base, f"/workspace/{cleaned}"]
    if code is None:
        raise ValueError("Either 'code' or 'path' must be provided")
    return [*base, "-c", code] if language == "python" else [*base, "-e", code]


async def run(
    *,
    language: str,
    code: str | None = None,
    path: str | None = None,
    stdin: str | None = None,
) -> RunResult:
    """Execute user code inside an isolated Docker container."""
    cmd = _build_command(language, code=code, path=path)

    docker_args = [
        "docker", "run", "--rm", "-i",
        "--network=none",
        f"--memory={settings.sandbox_memory_limit}",
        f"--cpus={settings.sandbox_cpu_limit}",
        "--pids-limit=128",
        "--read-only",
        "--tmpfs", "/tmp:rw,size=64m",
        "-v", f"{settings.workspace_dir}:/workspace:rw",
        "-w", "/workspace",
        settings.sandbox_image,
        *cmd,
    ]

    started = time.monotonic()
    proc = await asyncio.create_subprocess_exec(
        *docker_args,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    timed_out = False
    try:
        stdout_b, stderr_b = await asyncio.wait_for(
            proc.communicate(input=stdin.encode("utf-8") if stdin else None),
            timeout=settings.sandbox_timeout_seconds,
        )
    except TimeoutError:
        timed_out = True
        proc.kill()
        stdout_b, stderr_b = await proc.communicate()

    duration_ms = int((time.monotonic() - started) * 1000)
    return RunResult(
        stdout=stdout_b.decode("utf-8", errors="replace"),
        stderr=stderr_b.decode("utf-8", errors="replace"),
        exit_code=proc.returncode if proc.returncode is not None else -1,
        duration_ms=duration_ms,
        timed_out=timed_out,
    )
