"""Jednoduché JSON úložisko signálov (data/signals/<id>.json)."""
from __future__ import annotations

import json
from pathlib import Path

from .models import Signal


class SignalStore:
    def __init__(self, data_dir: Path) -> None:
        self.dir = Path(data_dir) / "signals"
        self.dir.mkdir(parents=True, exist_ok=True)

    def _path(self, signal_id: str) -> Path:
        return self.dir / f"{signal_id}.json"

    def save(self, signal: Signal) -> None:
        self._path(signal.id).write_text(
            json.dumps(signal.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8"
        )

    def load(self, signal_id: str) -> Signal | None:
        path = self._path(signal_id)
        if not path.exists():
            # povoľ aj skrátené ID (prefix)
            matches = sorted(self.dir.glob(f"{signal_id}*.json"))
            if len(matches) != 1:
                return None
            path = matches[0]
        return Signal.from_dict(json.loads(path.read_text(encoding="utf-8")))

    def list(self, status: str | None = None, limit: int = 20) -> list[Signal]:
        signals = []
        for path in sorted(self.dir.glob("*.json"), reverse=True):
            signal = Signal.from_dict(json.loads(path.read_text(encoding="utf-8")))
            if status is None or signal.status == status:
                signals.append(signal)
            if len(signals) >= limit:
                break
        return signals
