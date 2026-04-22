from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from . import files as files_mod
from . import sandbox
from .agent import stream_chat
from .config import settings
from .models import (
    AgentChatRequest,
    DeleteFileResponse,
    FileNode,
    ReadFileResponse,
    RunCodeRequest,
    RunCodeResponse,
    WriteFileRequest,
    WriteFileResponse,
)

app = FastAPI(
    title="Abkhack Backend",
    version="0.1.0",
    description="FastAPI service powering the Abkhack AI IDE.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/files", response_model=FileNode)
def list_files(path: str = "") -> FileNode:
    try:
        return files_mod.list_tree(path)
    except files_mod.PathOutsideWorkspaceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/files/read", response_model=ReadFileResponse)
def read_file(path: str) -> ReadFileResponse:
    try:
        content = files_mod.read_file(path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except files_mod.PathOutsideWorkspaceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ReadFileResponse(path=path, content=content)


@app.put("/api/files/write", response_model=WriteFileResponse)
def write_file(req: WriteFileRequest) -> WriteFileResponse:
    try:
        written = files_mod.write_file(req.path, req.content)
    except files_mod.PathOutsideWorkspaceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return WriteFileResponse(path=req.path, bytes_written=written)


@app.delete("/api/files", response_model=DeleteFileResponse)
def delete_file(path: str) -> DeleteFileResponse:
    try:
        deleted = files_mod.delete_path(path)
    except files_mod.PathOutsideWorkspaceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return DeleteFileResponse(path=path, deleted=deleted)


@app.post("/api/run", response_model=RunCodeResponse)
async def run_code(req: RunCodeRequest) -> RunCodeResponse:
    if req.code is None and req.path is None:
        raise HTTPException(status_code=400, detail="Provide 'code' or 'path'.")
    try:
        result = await sandbox.run(
            language=req.language,
            code=req.code,
            path=req.path,
            stdin=req.stdin,
        )
    except files_mod.PathOutsideWorkspaceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return RunCodeResponse(
        stdout=result.stdout,
        stderr=result.stderr,
        exit_code=result.exit_code,
        duration_ms=result.duration_ms,
        timed_out=result.timed_out,
    )


@app.post("/api/agent/chat")
async def agent_chat(req: AgentChatRequest) -> StreamingResponse:
    return StreamingResponse(
        stream_chat(req.messages),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
