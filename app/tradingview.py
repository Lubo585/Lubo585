"""Spracovanie podkladov z TradingView: webhook alerty a normalizácia symbolov/intervalov."""
from __future__ import annotations

import json
import re
from typing import Any

_TV_INTERVALS = {
    "1": "1m", "3": "3m", "5": "5m", "15": "15m", "30": "30m", "45": "45m",
    "60": "1h", "120": "2h", "180": "3h", "240": "4h", "360": "6h", "480": "8h", "720": "12h",
    "D": "1d", "1D": "1d", "W": "1w", "1W": "1w", "M": "1M", "1M": "1M",
}


def normalize_symbol(symbol: str | None) -> str | None:
    """'BINANCE:BTCUSDT.P' -> 'BTCUSDT', 'BTCUSDTPERP' -> 'BTCUSDT'."""
    if not symbol:
        return None
    s = symbol.strip().upper()
    if ":" in s:
        s = s.split(":", 1)[1]
    s = re.sub(r"\.P$", "", s)
    s = re.sub(r"PERP$", "", s)
    s = s.replace("-", "").replace("/", "")
    return s or None


def normalize_timeframe(tf: str | None) -> str | None:
    if not tf:
        return None
    t = str(tf).strip()
    if t in _TV_INTERVALS:
        return _TV_INTERVALS[t]
    tl = t.lower()
    if re.fullmatch(r"\d+(m|h|d|w)", tl):
        return tl
    return t


def parse_webhook(body: bytes, content_type: str | None) -> dict[str, Any]:
    """TradingView posiela buď JSON (ak je správa alertu JSON), alebo čistý text.

    Vracia normalizovaný slovník: symbol, timeframe, event, price, message, raw, secret.
    """
    text = body.decode("utf-8", errors="replace").strip()
    data: dict[str, Any]
    try:
        parsed = json.loads(text)
        data = parsed if isinstance(parsed, dict) else {"message": text}
    except ValueError:
        data = {"message": text}
        # jednoduchý "key=value" formát v texte, napr. "symbol=BTCUSDT.P tf=240 event=upper_touch price=65000"
        for m in re.finditer(r"(\w+)=([^\s,;]+)", text):
            data.setdefault(m.group(1).lower(), m.group(2))

    price = data.get("price") or data.get("close")
    try:
        price_f = float(price) if price not in (None, "") else None
    except (TypeError, ValueError):
        price_f = None

    return {
        "secret": str(data.get("secret") or data.get("passphrase") or ""),
        "symbol": normalize_symbol(data.get("symbol") or data.get("ticker")),
        "exchange": data.get("exchange"),
        "timeframe": normalize_timeframe(data.get("timeframe") or data.get("interval") or data.get("tf")),
        "event": str(data.get("event") or data.get("alert") or data.get("name") or "alert"),
        "price": price_f,
        "message": str(data.get("message") or data.get("msg") or data.get("comment") or text)[:2000],
        "raw": data,
    }


# Šablóna správy alertu pre TradingView (zobrazí sa aj v UI)
ALERT_MESSAGE_TEMPLATE = (
    '{"secret":"<TV_WEBHOOK_SECRET>","symbol":"{{ticker}}","exchange":"{{exchange}}",'
    '"timeframe":"{{interval}}","price":{{close}},"time":"{{timenow}}",'
    '"event":"NAZOV_UDALOSTI","message":"Cena sa dotkla horného okraja kanála"}'
)
