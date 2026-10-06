from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any


def _slug(pair: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", pair.upper())


@dataclass
class Signal:
    pair: str                      # "BTC/USDT"
    direction: str                 # "LONG" | "SHORT"
    entries: list[float] = field(default_factory=list)
    targets: list[float] = field(default_factory=list)
    stop_loss: float | None = None
    leverage: int | None = None    # 10 -> "10x"
    timeframe: str | None = None
    note: str | None = None
    raw_text: str = ""
    source: str = "manual"
    id: str = ""
    created_at: str = ""
    status: str = "pending"        # pending | published | rejected
    published_to: list[str] = field(default_factory=list)
    results: list[dict[str, Any]] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.pair = self.pair.upper()
        self.direction = self.direction.upper()
        if not self.created_at:
            self.created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        if not self.id:
            stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
            self.id = f"{stamp}-{_slug(self.pair)}"

    # --- odvodené hodnoty -------------------------------------------------
    @property
    def base(self) -> str:
        return self.pair.split("/")[0]

    @property
    def quote(self) -> str:
        return self.pair.split("/")[1] if "/" in self.pair else ""

    @property
    def is_long(self) -> bool:
        return self.direction == "LONG"

    @property
    def entry_avg(self) -> float | None:
        return sum(self.entries) / len(self.entries) if self.entries else None

    def pnl_pct(self, price: float, with_leverage: bool = True) -> float | None:
        """Percentuálny výsledok pri uzavretí na danej cene."""
        entry = self.entry_avg
        if not entry:
            return None
        move = (price - entry) / entry * 100
        if not self.is_long:
            move = -move
        if with_leverage and self.leverage:
            move *= self.leverage
        return round(move, 2)

    def risk_reward(self) -> float | None:
        entry = self.entry_avg
        if not entry or self.stop_loss is None or not self.targets:
            return None
        risk = abs(entry - self.stop_loss)
        if risk == 0:
            return None
        reward = abs(self.targets[-1] - entry)
        return round(reward / risk, 1)

    # --- serializácia -----------------------------------------------------
    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Signal":
        known = {f for f in cls.__dataclass_fields__}
        return cls(**{k: v for k, v in data.items() if k in known})


def fmt_price(value: float | None) -> str:
    """Pekné formátovanie ceny: 62000 -> '62 000', 0.000123 -> '0.000123'."""
    if value is None:
        return "—"
    if value >= 1000:
        return f"{value:,.0f}".replace(",", " ") if value == int(value) else f"{value:,.2f}".replace(",", " ")
    if value >= 1:
        text = f"{value:.4f}".rstrip("0").rstrip(".")
        return text
    return f"{value:.8f}".rstrip("0").rstrip(".")
