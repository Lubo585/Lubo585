import math

import numpy as np

from app.channels import (Line, channel_from_user, detect_parallel_channel, evaluate_channel,
                          horizontal_levels, regression_channel)
from app.market_data import Candle


def synthetic_channel(n=200, slope=10.0, width=200.0, start=50_000.0, bar_ms=3_600_000, seed=1):
    """Rastúci kanál: cena osciluje medzi spodnou a hornou čiarou (sínus + šum)."""
    rng = np.random.default_rng(seed)
    candles = []
    for i in range(n):
        lower = start + slope * i
        phase = (math.sin(i / 9.0) + 1) / 2  # 0..1
        close = lower + phase * width + rng.normal(0, 8)
        close = min(max(close, lower), lower + width)
        high = min(close + abs(rng.normal(0, 15)), lower + width)
        low = max(close - abs(rng.normal(0, 15)), lower)
        candles.append(Candle(1_700_000_000_000 + i * bar_ms, close, high, low, close, 100 + rng.random() * 50))
    return candles


def test_line_math():
    ln = Line(0, 100.0, 1000, 200.0)
    assert ln.price_at(500) == 150.0
    assert ln.price_at(2000) == 300.0
    par = ln.parallel_through(0, 50.0)
    assert par.price_at(1000) == 150.0


def test_parallel_channel_detection():
    candles = synthetic_channel()
    ch = detect_parallel_channel(candles, timeframe="1h")
    assert ch is not None, "kanál sa nenašiel"
    assert ch.upper.slope_per_ms() > 0
    ev = evaluate_channel(ch, candles)
    assert ev["direction"] == "rastúci"
    assert ev["touches_upper"] + ev["touches_lower"] >= 4
    assert -15 <= ev["position_pct"] <= 115
    assert ev["upper_now"] > ev["lower_now"]


def test_regression_channel_and_levels():
    candles = synthetic_channel()
    reg = regression_channel(candles, timeframe="1h")
    assert reg is not None and reg.meta["r2"] > 0.8
    ev = evaluate_channel(reg, candles)
    assert ev["width"] > 0
    levels = horizontal_levels(candles)
    assert isinstance(levels, list)


def test_user_channel_parallel():
    candles = synthetic_channel()
    row = {"id": 1, "name": "test", "timeframe": "1h",
           "upper_t1": candles[0].time, "upper_p1": 50_200.0, "upper_t2": candles[100].time, "upper_p2": 51_200.0,
           "lower_t1": candles[0].time, "lower_p1": 50_000.0, "lower_t2": None, "lower_p2": None}
    ch = channel_from_user(row)
    assert abs(ch.lower.price_at(candles[100].time) - 51_000.0) < 1e-6
    ev = evaluate_channel(ch, candles)
    assert ev["status"] == "vnútri kanála"
    assert abs(ev["width"] - 200.0) < 1e-6
