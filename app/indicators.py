"""Technické indikátory nad poľami numpy (bez externých TA knižníc)."""
from __future__ import annotations

import numpy as np


def ema(values: np.ndarray, period: int) -> np.ndarray:
    out = np.full(len(values), np.nan)
    if len(values) < period:
        return out
    alpha = 2.0 / (period + 1)
    out[period - 1] = values[:period].mean()
    for i in range(period, len(values)):
        out[i] = alpha * values[i] + (1 - alpha) * out[i - 1]
    return out


def rsi(closes: np.ndarray, period: int = 14) -> np.ndarray:
    out = np.full(len(closes), np.nan)
    if len(closes) <= period:
        return out
    delta = np.diff(closes)
    gain = np.where(delta > 0, delta, 0.0)
    loss = np.where(delta < 0, -delta, 0.0)
    avg_gain = gain[:period].mean()
    avg_loss = loss[:period].mean()
    for i in range(period, len(delta)):
        avg_gain = (avg_gain * (period - 1) + gain[i]) / period
        avg_loss = (avg_loss * (period - 1) + loss[i]) / period
        rs = avg_gain / avg_loss if avg_loss > 0 else np.inf
        out[i + 1] = 100 - 100 / (1 + rs)
    return out


def atr(highs: np.ndarray, lows: np.ndarray, closes: np.ndarray, period: int = 14) -> np.ndarray:
    n = len(closes)
    out = np.full(n, np.nan)
    if n < 2:
        return out
    prev_close = np.concatenate([[closes[0]], closes[:-1]])
    tr = np.maximum(highs - lows, np.maximum(np.abs(highs - prev_close), np.abs(lows - prev_close)))
    if n < period:
        return out
    out[period - 1] = tr[:period].mean()
    for i in range(period, n):
        out[i] = (out[i - 1] * (period - 1) + tr[i]) / period
    return out


def _last(arr: np.ndarray) -> float | None:
    v = arr[-1] if len(arr) else np.nan
    return None if np.isnan(v) else round(float(v), 6)


def summarize(opens, highs, lows, closes, volumes) -> dict:
    """Vráti posledné hodnoty bežných indikátorov + kontext (trend EMA, objem voči priemeru)."""
    closes = np.asarray(closes, dtype=float)
    highs = np.asarray(highs, dtype=float)
    lows = np.asarray(lows, dtype=float)
    volumes = np.asarray(volumes, dtype=float)
    e20, e50, e200 = ema(closes, 20), ema(closes, 50), ema(closes, 200)
    r = rsi(closes)
    a = atr(highs, lows, closes)
    last = float(closes[-1])
    vol_avg20 = float(volumes[-20:].mean()) if len(volumes) >= 20 else None

    def rel(v):
        return None if v is None else round((last / v - 1) * 100, 3)

    ema_stack = None
    if _last(e20) and _last(e50) and _last(e200):
        if _last(e20) > _last(e50) > _last(e200):
            ema_stack = "bullish (EMA20 > EMA50 > EMA200)"
        elif _last(e20) < _last(e50) < _last(e200):
            ema_stack = "bearish (EMA20 < EMA50 < EMA200)"
        else:
            ema_stack = "zmiešané"
    return {
        "close": last,
        "ema20": _last(e20),
        "ema50": _last(e50),
        "ema200": _last(e200),
        "price_vs_ema20_pct": rel(_last(e20)),
        "price_vs_ema50_pct": rel(_last(e50)),
        "price_vs_ema200_pct": rel(_last(e200)),
        "ema_stack": ema_stack,
        "rsi14": _last(r),
        "atr14": _last(a),
        "atr14_pct": round(_last(a) / last * 100, 3) if _last(a) else None,
        "volume_last": float(volumes[-1]),
        "volume_avg20": vol_avg20,
        "volume_vs_avg20": round(float(volumes[-1]) / vol_avg20, 2) if vol_avg20 else None,
        "change_pct_last_bar": round((last / float(closes[-2]) - 1) * 100, 3) if len(closes) > 1 else None,
        "change_pct_10_bars": round((last / float(closes[-11]) - 1) * 100, 3) if len(closes) > 10 else None,
    }


def ema_series(closes, period: int) -> list[float | None]:
    arr = ema(np.asarray(closes, dtype=float), period)
    return [None if np.isnan(v) else round(float(v), 6) for v in arr]
