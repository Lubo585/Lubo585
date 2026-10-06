"""Zostavenie trhového "snapshotu" symbolu naprieč časovými rámcami – vstup pre AI agenta aj UI."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from .channels import (
    Channel, channel_from_user, detect_parallel_channel, evaluate_channel, horizontal_levels,
    regression_channel,
)
from .config import TIMEFRAME_MS
from .indicators import summarize
from .market_data import Candle, MarketData, ProviderError
from .storage import Storage

LIMITS = {"5m": 300, "15m": 300, "1h": 300, "4h": 300, "1d": 300, "1w": 200}


def _iso(ms: int | None) -> str | None:
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M") if ms else None


def compact_candles(candles: list[Candle], n: int = 40) -> list[list[Any]]:
    """Posledných n sviečok v kompaktnom tvare [čas, O, H, L, C, V] – šetrí tokeny."""
    return [[_iso(c.time), c.open, c.high, c.low, c.close, round(c.volume, 2)] for c in candles[-n:]]


async def timeframe_snapshot(md: MarketData, storage: Storage, symbol: str, tf: str,
                             include_detected: bool = True) -> dict[str, Any]:
    candles = await md.klines(symbol, tf, LIMITS.get(tf, 300))
    if len(candles) < 30:
        raise ProviderError(f"{symbol} {tf}: málo dát ({len(candles)} sviečok)")
    opens = [c.open for c in candles]
    highs = [c.high for c in candles]
    lows = [c.low for c in candles]
    closes = [c.close for c in candles]
    vols = [c.volume for c in candles]

    detected: list[Channel] = []
    if include_detected:
        par = detect_parallel_channel(candles, timeframe=tf)
        if par:
            detected.append(par)
        reg = regression_channel(candles, timeframe=tf)
        if reg:
            detected.append(reg)

    user_rows = [r for r in storage.list_channels(symbol, active_only=True) if r["timeframe"] == tf]
    user_channels = [channel_from_user(r) for r in user_rows]

    def _eval(ch: Channel) -> dict[str, Any]:
        e = evaluate_channel(ch, candles)
        e["last_touch_upper"] = _iso(e["last_touch_upper"])
        e["last_touch_lower"] = _iso(e["last_touch_lower"])
        return e

    return {
        "timeframe": tf,
        "bars": len(candles),
        "last_candle_time": _iso(candles[-1].time),
        "indicators": summarize(opens, highs, lows, closes, vols),
        "user_channels": [_eval(ch) for ch in user_channels],
        "detected_channels": [_eval(ch) for ch in detected],
        "horizontal_levels": [
            {**lv, "last_touch_time": _iso(lv["last_touch_time"])} for lv in horizontal_levels(candles)
        ],
        "recent_candles": compact_candles(candles, 40 if tf in ("1d", "1w") else 30),
        "_candles": candles,            # interné – nejde do AI
        "_channels": user_channels + detected,
    }


async def build_snapshot(md: MarketData, storage: Storage, symbol: str, timeframes: list[str],
                         include_alerts: bool = True, include_detected: bool = True) -> dict[str, Any]:
    symbol = symbol.upper()
    timeframes = [tf for tf in timeframes if tf in TIMEFRAME_MS]
    overview, *tf_results = await asyncio.gather(
        md.market_overview(symbol),
        *[timeframe_snapshot(md, storage, symbol, tf, include_detected) for tf in timeframes],
        return_exceptions=True,
    )
    if isinstance(overview, BaseException):
        overview = {"symbol": symbol, "error": str(overview)}
    tfs: list[dict[str, Any]] = []
    errors: list[str] = []
    for tf, res in zip(timeframes, tf_results):
        if isinstance(res, BaseException):
            errors.append(f"{tf}: {res}")
        else:
            tfs.append(res)
    if not tfs:
        raise ProviderError("Nepodarilo sa načítať dáta: " + "; ".join(errors))

    if overview.get("funding"):
        overview["funding"]["next_funding_time"] = _iso(overview["funding"]["next_funding_time"])

    alerts = []
    if include_alerts:
        since = int(datetime.now(tz=timezone.utc).timestamp() * 1000) - 7 * 86_400_000
        for a in storage.list_alerts(symbol, limit=20, since_ms=since):
            alerts.append({
                "time": _iso(a["received_at"]), "source": a["source"], "timeframe": a["timeframe"],
                "event": a["event"], "price": a["price"], "message": a["message"],
            })

    return {
        "symbol": symbol,
        "generated_at": _iso(int(datetime.now(tz=timezone.utc).timestamp() * 1000)),
        "data_provider": overview.get("provider") or md.last_provider,
        "market": {k: v for k, v in overview.items() if k not in ("symbol", "provider")},
        "timeframes": tfs,
        "tradingview_alerts_last_7d": alerts,
        "errors": errors,
    }


def snapshot_for_ai(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Odstráni interné polia (sviečky, objekty kanálov) pred odoslaním modelu."""
    out = dict(snapshot)
    out["timeframes"] = [{k: v for k, v in tf.items() if not k.startswith("_")} for tf in snapshot["timeframes"]]
    return out
