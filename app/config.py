"""Nastavenia aplikácie načítané z prostredia / .env súboru."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")


def _csv(value: str) -> list[str]:
    return [v.strip().upper() for v in value.split(",") if v.strip()]


@dataclass
class Settings:
    ai_model: str = os.getenv("AI_MODEL", "claude-opus-5-5")
    ai_effort: str = os.getenv("AI_EFFORT", "high")
    market_provider: str = os.getenv("MARKET_PROVIDER", "auto").lower()
    tv_webhook_secret: str = os.getenv("TV_WEBHOOK_SECRET", "")
    telegram_bot_token: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    telegram_chat_id: str = os.getenv("TELEGRAM_CHAT_ID", "")
    monitor_interval_seconds: int = int(os.getenv("MONITOR_INTERVAL_SECONDS", "60") or 0)
    monitor_proximity_pct: float = float(os.getenv("MONITOR_PROXIMITY_PCT", "0.4") or 0.4)
    db_path: Path = field(default_factory=lambda: ROOT / os.getenv("DB_PATH", "data/agent.db"))
    default_symbols: list[str] = field(
        default_factory=lambda: _csv(os.getenv("DEFAULT_SYMBOLS", "BTCUSDT,ETHUSDT,SOLUSDT"))
    )
    auto_analyze_on_tv_alert: bool = os.getenv("AUTO_ANALYZE_ON_TV_ALERT", "false").lower() in ("1", "true", "yes")
    auto_analyze_timeframes: list[str] = field(
        default_factory=lambda: [t.strip().lower() for t in os.getenv("AUTO_ANALYZE_TIMEFRAMES", "1d,4h,1h").split(",") if t.strip()]
    )
    host: str = os.getenv("HOST", "127.0.0.1")
    port: int = int(os.getenv("PORT", "8000"))

    @property
    def has_api_key(self) -> bool:
        return bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN"))


settings = Settings()

# Časové rámce, ktoré aplikácia podporuje (interné označenie = štýl Binance)
TIMEFRAMES = ["5m", "15m", "1h", "4h", "1d", "1w"]
TIMEFRAME_MS = {
    "1m": 60_000,
    "5m": 300_000,
    "15m": 900_000,
    "30m": 1_800_000,
    "1h": 3_600_000,
    "4h": 14_400_000,
    "1d": 86_400_000,
    "1w": 604_800_000,
}
