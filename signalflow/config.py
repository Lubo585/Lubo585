from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv


@dataclass
class Settings:
    cfg: dict[str, Any]
    env: dict[str, str] = field(default_factory=dict)
    root: Path = Path(".")

    # --- config.yaml --------------------------------------------------------
    @property
    def brand(self) -> str:
        return self.cfg.get("brand", "Signals")

    @property
    def require_approval(self) -> bool:
        return bool(self.cfg.get("require_approval", True))

    @property
    def public_mode(self) -> str:
        return self.cfg.get("public_mode", "teaser")

    @property
    def output_dir(self) -> Path:
        return self.root / self.cfg.get("output_dir", "out")

    @property
    def data_dir(self) -> Path:
        return self.root / self.cfg.get("data_dir", "data")

    @property
    def templates(self) -> dict[str, str]:
        return self.cfg.get("templates", {})

    @property
    def image(self) -> dict[str, Any]:
        return self.cfg.get("image", {})

    def channel_enabled(self, name: str) -> bool:
        return bool(self.cfg.get("channels", {}).get(name, False))

    # --- .env -----------------------------------------------------------------
    def get(self, key: str, default: str = "") -> str:
        return self.env.get(key) or os.environ.get(key, default)

    def get_int(self, key: str, default: int = 0) -> int:
        try:
            return int(self.get(key) or default)
        except ValueError:
            return default


def load_settings(root: str | Path = ".", config_file: str = "config.yaml") -> Settings:
    root = Path(root)
    load_dotenv(root / ".env")
    path = root / config_file
    cfg: dict[str, Any] = {}
    if path.exists():
        cfg = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return Settings(cfg=cfg, env=dict(os.environ), root=root)
