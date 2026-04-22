from typing import Literal

from pydantic import BaseModel, Field


class FileNode(BaseModel):
    name: str
    path: str
    type: Literal["file", "directory"]
    children: list["FileNode"] | None = None


class ReadFileResponse(BaseModel):
    path: str
    content: str


class WriteFileRequest(BaseModel):
    path: str
    content: str


class WriteFileResponse(BaseModel):
    path: str
    bytes_written: int


class DeleteFileResponse(BaseModel):
    path: str
    deleted: bool


class RunCodeRequest(BaseModel):
    language: Literal["python", "node"]
    code: str | None = None
    path: str | None = None
    stdin: str | None = None


class RunCodeResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    duration_ms: int
    timed_out: bool = False


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AgentChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: str | None = None
    max_tokens: int = Field(default=4096, ge=1, le=8192)


FileNode.model_rebuild()
