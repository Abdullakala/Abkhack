"""Anthropic Claude agent with tool-use for the Abkhack IDE.

The agent is given a small set of tools that operate on the user's workspace
and can trigger sandboxed code execution. Responses are yielded as Server-Sent
Events so the frontend can render text as it streams.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

from anthropic import AsyncAnthropic

from . import files, sandbox
from .config import settings
from .models import ChatMessage

SYSTEM_PROMPT = """You are Abkhack, an AI coding assistant embedded in a web IDE.
You help the user build, test, and run applications entirely inside their workspace.

Guidelines:
- Prefer making minimal, focused edits.
- Before writing to a file, read it first when it already exists.
- Use the `run_code` tool to verify changes; always report the observed output.
- Only operate on paths inside the user's workspace (relative paths only).
- If the user asks for something ambiguous, ask a short clarifying question.
- Never attempt to break out of the sandbox or perform network-facing actions.
""".strip()


TOOLS: list[dict[str, Any]] = [
    {
        "name": "list_files",
        "description": "List the files and directories in the workspace (recursively).",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Optional subdirectory inside the workspace.",
                    "default": "",
                }
            },
        },
    },
    {
        "name": "read_file",
        "description": "Read a UTF-8 text file from the workspace.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Workspace-relative path."}
            },
            "required": ["path"],
        },
    },
    {
        "name": "write_file",
        "description": "Create or overwrite a UTF-8 text file in the workspace.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "content": {"type": "string"},
            },
            "required": ["path", "content"],
        },
    },
    {
        "name": "run_code",
        "description": (
            "Execute Python or Node.js code in an isolated sandbox. "
            "Either provide 'code' inline, or 'path' to a file in the workspace."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "language": {"type": "string", "enum": ["python", "node"]},
                "code": {"type": "string"},
                "path": {"type": "string"},
                "stdin": {"type": "string"},
            },
            "required": ["language"],
        },
    },
]


async def _dispatch_tool(name: str, args: dict[str, Any]) -> dict[str, Any]:
    try:
        if name == "list_files":
            tree = files.list_tree(args.get("path", ""))
            return {"ok": True, "tree": tree.model_dump()}
        if name == "read_file":
            return {"ok": True, "content": files.read_file(args["path"])}
        if name == "write_file":
            written = files.write_file(args["path"], args["content"])
            return {"ok": True, "bytes_written": written}
        if name == "run_code":
            result = await sandbox.run(
                language=args["language"],
                code=args.get("code"),
                path=args.get("path"),
                stdin=args.get("stdin"),
            )
            return {
                "ok": True,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.exit_code,
                "duration_ms": result.duration_ms,
                "timed_out": result.timed_out,
            }
    except Exception as exc:  # noqa: BLE001 - surfaced to the model
        return {"ok": False, "error": f"{type(exc).__name__}: {exc}"}
    return {"ok": False, "error": f"Unknown tool: {name}"}


def _sse(event: str, data: Any) -> bytes:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n".encode()


async def stream_chat(messages: list[ChatMessage]) -> AsyncIterator[bytes]:
    """Run the agent loop, yielding SSE events for the frontend."""
    if not settings.anthropic_api_key:
        yield _sse(
            "error",
            {"message": "ANTHROPIC_API_KEY is not configured on the backend."},
        )
        return

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    convo: list[dict[str, Any]] = [
        {"role": m.role, "content": m.content} for m in messages
    ]

    # Cap the number of tool-use rounds to avoid runaway loops.
    for _ in range(8):
        async with client.messages.stream(
            model=settings.anthropic_model,
            max_tokens=settings.anthropic_max_tokens,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=convo,
        ) as stream:
            async for text in stream.text_stream:
                if text:
                    yield _sse("delta", {"text": text})
            final = await stream.get_final_message()

        tool_uses = [b for b in final.content if b.type == "tool_use"]
        assistant_blocks = [b.model_dump() for b in final.content]
        convo.append({"role": "assistant", "content": assistant_blocks})

        if not tool_uses:
            yield _sse("done", {"stop_reason": final.stop_reason})
            return

        tool_results: list[dict[str, Any]] = []
        for tu in tool_uses:
            yield _sse(
                "tool_use",
                {"id": tu.id, "name": tu.name, "input": tu.input},
            )
            result = await _dispatch_tool(tu.name, tu.input or {})
            yield _sse("tool_result", {"id": tu.id, "result": result})
            tool_results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": tu.id,
                    "content": json.dumps(result, ensure_ascii=False),
                    "is_error": not result.get("ok", False),
                }
            )

        convo.append({"role": "user", "content": tool_results})

    yield _sse("error", {"message": "Reached maximum number of tool-use rounds."})
