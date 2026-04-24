from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration.

    Values are read from environment variables (or a .env file at repo root).
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Workspace root - the folder mounted into the sandbox. All file APIs are
    # constrained to this directory to prevent path traversal outside of it.
    workspace_dir: Path = Path("/workspace")

    # CORS origins allowed to call the API (comma separated)
    cors_origins: str = "http://localhost:3000"

    # Anthropic API configuration
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5-20250929"
    anthropic_max_tokens: int = 4096

    # Sandbox configuration
    sandbox_image: str = "abkhack-sandbox:latest"
    sandbox_timeout_seconds: int = 30
    sandbox_memory_limit: str = "512m"
    sandbox_cpu_limit: float = 1.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
