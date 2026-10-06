"""SQLite úložisko: watchlist, používateľské kanály, alerty (TradingView + monitor), analýzy."""
from __future__ import annotations

import json
import sqlite3
import time
from pathlib import Path
from typing import Any

from .config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS watchlist (
    symbol TEXT PRIMARY KEY,
    added_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    name TEXT NOT NULL,
    upper_t1 INTEGER NOT NULL, upper_p1 REAL NOT NULL,
    upper_t2 INTEGER NOT NULL, upper_p2 REAL NOT NULL,
    lower_t1 INTEGER NOT NULL, lower_p1 REAL NOT NULL,
    lower_t2 INTEGER, lower_p2 REAL,
    notes TEXT DEFAULT '',
    source TEXT DEFAULT 'manual',
    active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    received_at INTEGER NOT NULL,
    source TEXT NOT NULL,           -- 'tradingview' | 'monitor'
    symbol TEXT,
    timeframe TEXT,
    event TEXT,
    price REAL,
    message TEXT,
    raw TEXT
);
CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    timeframes TEXT NOT NULL,
    model TEXT,
    report TEXT NOT NULL,
    usage TEXT
);
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON alerts(symbol, received_at);
CREATE INDEX IF NOT EXISTS idx_analyses_symbol ON analyses(symbol, created_at);
"""


def now_ms() -> int:
    return int(time.time() * 1000)


class Storage:
    def __init__(self, path: Path | None = None):
        self.path = Path(path or settings.db_path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)
        if not self.list_watchlist():
            for s in settings.default_symbols:
                self.add_watchlist(s)

    # ---- watchlist ----
    def list_watchlist(self) -> list[str]:
        return [r["symbol"] for r in self.conn.execute("SELECT symbol FROM watchlist ORDER BY added_at")]

    def add_watchlist(self, symbol: str) -> None:
        self.conn.execute("INSERT OR IGNORE INTO watchlist(symbol, added_at) VALUES (?, ?)", (symbol.upper(), now_ms()))
        self.conn.commit()

    def remove_watchlist(self, symbol: str) -> None:
        self.conn.execute("DELETE FROM watchlist WHERE symbol = ?", (symbol.upper(),))
        self.conn.commit()

    # ---- kanály ----
    def list_channels(self, symbol: str | None = None, active_only: bool = False) -> list[dict[str, Any]]:
        q, args = "SELECT * FROM channels", []
        conds = []
        if symbol:
            conds.append("symbol = ?")
            args.append(symbol.upper())
        if active_only:
            conds.append("active = 1")
        if conds:
            q += " WHERE " + " AND ".join(conds)
        q += " ORDER BY created_at DESC"
        return [dict(r) for r in self.conn.execute(q, args)]

    def get_channel(self, channel_id: int) -> dict[str, Any] | None:
        r = self.conn.execute("SELECT * FROM channels WHERE id = ?", (channel_id,)).fetchone()
        return dict(r) if r else None

    def add_channel(self, data: dict[str, Any]) -> dict[str, Any]:
        cols = ["symbol", "timeframe", "name", "upper_t1", "upper_p1", "upper_t2", "upper_p2",
                "lower_t1", "lower_p1", "lower_t2", "lower_p2", "notes", "source", "active"]
        values = [data.get(c) for c in cols]
        values[0] = str(values[0]).upper()
        values[-1] = 1 if data.get("active", True) else 0
        cur = self.conn.execute(
            f"INSERT INTO channels({', '.join(cols)}, created_at) VALUES ({', '.join('?' * len(cols))}, ?)",
            values + [now_ms()],
        )
        self.conn.commit()
        return self.get_channel(cur.lastrowid)  # type: ignore[arg-type]

    def update_channel(self, channel_id: int, data: dict[str, Any]) -> dict[str, Any] | None:
        allowed = ["timeframe", "name", "upper_t1", "upper_p1", "upper_t2", "upper_p2",
                   "lower_t1", "lower_p1", "lower_t2", "lower_p2", "notes", "source", "active"]
        sets = [f"{k} = ?" for k in allowed if k in data]
        if not sets:
            return self.get_channel(channel_id)
        vals = [int(data[k]) if k == "active" else data[k] for k in allowed if k in data]
        self.conn.execute(f"UPDATE channels SET {', '.join(sets)} WHERE id = ?", vals + [channel_id])
        self.conn.commit()
        return self.get_channel(channel_id)

    def delete_channel(self, channel_id: int) -> None:
        self.conn.execute("DELETE FROM channels WHERE id = ?", (channel_id,))
        self.conn.commit()

    # ---- alerty ----
    def add_alert(self, source: str, symbol: str | None, timeframe: str | None, event: str | None,
                  price: float | None, message: str | None, raw: Any = None) -> dict[str, Any]:
        cur = self.conn.execute(
            "INSERT INTO alerts(received_at, source, symbol, timeframe, event, price, message, raw) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (now_ms(), source, (symbol or "").upper() or None, timeframe, event, price, message,
             json.dumps(raw, ensure_ascii=False) if raw is not None else None),
        )
        self.conn.commit()
        return dict(self.conn.execute("SELECT * FROM alerts WHERE id = ?", (cur.lastrowid,)).fetchone())

    def list_alerts(self, symbol: str | None = None, limit: int = 50, since_ms: int | None = None) -> list[dict[str, Any]]:
        q, args = "SELECT * FROM alerts", []
        conds = []
        if symbol:
            conds.append("symbol = ?")
            args.append(symbol.upper())
        if since_ms:
            conds.append("received_at >= ?")
            args.append(since_ms)
        if conds:
            q += " WHERE " + " AND ".join(conds)
        q += " ORDER BY received_at DESC LIMIT ?"
        args.append(limit)
        return [dict(r) for r in self.conn.execute(q, args)]

    def last_alert_time(self, source: str, symbol: str, event: str) -> int | None:
        r = self.conn.execute(
            "SELECT MAX(received_at) AS t FROM alerts WHERE source = ? AND symbol = ? AND event = ?",
            (source, symbol.upper(), event),
        ).fetchone()
        return r["t"] if r and r["t"] else None

    # ---- analýzy ----
    def add_analysis(self, symbol: str, timeframes: list[str], model: str, report: dict[str, Any],
                     usage: dict[str, Any] | None) -> dict[str, Any]:
        cur = self.conn.execute(
            "INSERT INTO analyses(created_at, symbol, timeframes, model, report, usage) VALUES (?, ?, ?, ?, ?, ?)",
            (now_ms(), symbol.upper(), ",".join(timeframes), model, json.dumps(report, ensure_ascii=False),
             json.dumps(usage) if usage else None),
        )
        self.conn.commit()
        return self.get_analysis(cur.lastrowid)  # type: ignore[arg-type]

    def get_analysis(self, analysis_id: int) -> dict[str, Any] | None:
        r = self.conn.execute("SELECT * FROM analyses WHERE id = ?", (analysis_id,)).fetchone()
        return self._analysis_row(r) if r else None

    def list_analyses(self, symbol: str | None = None, limit: int = 20) -> list[dict[str, Any]]:
        q, args = "SELECT * FROM analyses", []
        if symbol:
            q += " WHERE symbol = ?"
            args.append(symbol.upper())
        q += " ORDER BY created_at DESC LIMIT ?"
        args.append(limit)
        return [self._analysis_row(r) for r in self.conn.execute(q, args)]

    @staticmethod
    def _analysis_row(r: sqlite3.Row) -> dict[str, Any]:
        d = dict(r)
        d["report"] = json.loads(d["report"])
        d["usage"] = json.loads(d["usage"]) if d.get("usage") else None
        d["timeframes"] = d["timeframes"].split(",")
        return d
