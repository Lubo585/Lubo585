"""Detekcia a vyhodnocovanie cenových kanálov.

Všetky čiary sú definované časovo (t1, p1) -> (t2, p2) v milisekundách UTC, takže sa dajú
kresliť v grafe a extrapolovať do budúcnosti nezávisle od počtu sviečok. Používateľ
si kanál definuje rovnakými bodmi, aké vidí v TradingView (Nastavenia kresby -> Súradnice).
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from itertools import combinations
from typing import Any, Sequence

import numpy as np

from .indicators import atr as atr_fn
from .market_data import Candle


@dataclass
class Line:
    t1: int
    p1: float
    t2: int
    p2: float

    def price_at(self, t: int | float) -> float:
        if self.t2 == self.t1:
            return self.p1
        return self.p1 + (self.p2 - self.p1) * (t - self.t1) / (self.t2 - self.t1)

    def slope_per_ms(self) -> float:
        return 0.0 if self.t2 == self.t1 else (self.p2 - self.p1) / (self.t2 - self.t1)

    def parallel_through(self, t: int, p: float) -> "Line":
        """Rovnobežka prechádzajúca bodom (t, p)."""
        s = self.slope_per_ms()
        return Line(self.t1, p + s * (self.t1 - t), self.t2, p + s * (self.t2 - t))

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Channel:
    name: str
    kind: str  # "parallel" | "regression" | "user"
    upper: Line
    lower: Line
    timeframe: str
    meta: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "kind": self.kind,
            "timeframe": self.timeframe,
            "upper": self.upper.to_dict(),
            "lower": self.lower.to_dict(),
            "meta": self.meta,
        }


# ---------------------------------------------------------------------------
# Pomocné funkcie
# ---------------------------------------------------------------------------
def _arrays(candles: Sequence[Candle]):
    t = np.array([c.time for c in candles], dtype=np.int64)
    o = np.array([c.open for c in candles])
    h = np.array([c.high for c in candles])
    l = np.array([c.low for c in candles])
    c_ = np.array([c.close for c in candles])
    v = np.array([c.volume for c in candles])
    return t, o, h, l, c_, v


def find_pivots(highs: np.ndarray, lows: np.ndarray, left: int = 3, right: int = 3) -> tuple[list[int], list[int]]:
    """Fraktálové pivoty: lokálne maximá/minimá s `left` sviečkami vľavo a `right` vpravo."""
    ph, pl = [], []
    n = len(highs)
    for i in range(left, n - right):
        hw = highs[i - left:i + right + 1]
        lw = lows[i - left:i + right + 1]
        if highs[i] == hw.max() and (hw == highs[i]).sum() == 1:
            ph.append(i)
        if lows[i] == lw.min() and (lw == lows[i]).sum() == 1:
            pl.append(i)
    return ph, pl


def _atr_value(highs, lows, closes) -> float:
    a = atr_fn(highs, lows, closes, 14)
    if np.isnan(a[-1]):
        return float((highs - lows).mean())
    return float(a[-1])


# ---------------------------------------------------------------------------
# Detekcia
# ---------------------------------------------------------------------------
def _touch_clusters(values: np.ndarray, line: np.ndarray, tol: float, gap: int = 3) -> int:
    """Počet samostatných dotykov (skupiny susedných sviečok v tolerancii čiary)."""
    idx = np.where(np.abs(values - line) <= tol)[0]
    if len(idx) == 0:
        return 0
    return 1 + int((np.diff(idx) > gap).sum())


def detect_parallel_channel(candles: Sequence[Candle], lookback: int = 200, tol_atr: float = 0.3,
                            timeframe: str = "") -> Channel | None:
    """Nájde rovnobežný kanál s najväčším počtom dotykov (horná čiara cez pivot highs,
    rovnobežná spodná čiara cez pivot lows). Vracia None, ak sa nenájde dôveryhodný kanál."""
    window = list(candles[-lookback:])
    if len(window) < 30:
        return None
    t, _, h, l, c, _ = _arrays(window)
    n = len(window)
    idx = np.arange(n, dtype=float)
    ph, pl = find_pivots(h, l, 4, 4)
    if len(ph) < 2 or len(pl) < 2:
        return None
    tol = max(tol_atr * _atr_value(h, l, c), 0.025 * float(h.max() - l.min()))
    max_viol = max(2, n // 50)
    ph, pl = ph[-16:], pl[-16:]  # obmedzenie kombinácií
    best: tuple[float, dict[str, Any]] | None = None
    for i, j in combinations(ph, 2):
        if j - i < 5:
            continue
        slope = (h[j] - h[i]) / (j - i)
        c_up = h[i] - slope * i
        line_up = slope * idx + c_up
        viol_up = int((h[i:] > line_up[i:] + tol).sum())
        if viol_up > max_viol:
            continue
        touch_up = _touch_clusters(h[i:], line_up[i:], tol)
        if touch_up < 2:
            continue
        lower_candidates = [l[k] - slope * k for k in pl if k >= i - 10]
        lower_candidates.append(float((l[i:] - slope * idx[i:]).min()))
        for c_lo in lower_candidates:
            if c_lo >= c_up:
                continue
            line_lo = slope * idx + c_lo
            viol_lo = int((l[i:] < line_lo[i:] - tol).sum())
            if viol_lo > max_viol:
                continue
            touch_lo = _touch_clusters(l[i:], line_lo[i:], tol)
            if touch_lo < 2:
                continue
            width = c_up - c_lo
            if width < 3 * tol:
                continue
            score = (touch_up + touch_lo) * 2.0 - (viol_up + viol_lo) * 1.5 + 0.01 * (j - i) + 0.005 * j
            if best is None or score > best[0]:
                best = (score, {
                    "i": i, "slope": slope, "c_up": c_up, "c_lo": c_lo,
                    "touch_up": touch_up, "touch_lo": touch_lo, "viol": viol_up + viol_lo,
                })
    if best is None:
        return None
    b = best[1]
    i0, iN = int(b["i"]), n - 1
    bar_ms = int(np.median(np.diff(t))) if len(t) > 1 else 0
    upper = Line(int(t[i0]), float(b["slope"] * i0 + b["c_up"]), int(t[iN]), float(b["slope"] * iN + b["c_up"]))
    lower = Line(int(t[i0]), float(b["slope"] * i0 + b["c_lo"]), int(t[iN]), float(b["slope"] * iN + b["c_lo"]))
    return Channel(
        name="Auto rovnobežný kanál",
        kind="parallel",
        upper=upper,
        lower=lower,
        timeframe=timeframe,
        meta={
            "touches_upper": b["touch_up"],
            "touches_lower": b["touch_lo"],
            "violations": b["viol"],
            "bars": iN - i0 + 1,
            "bar_ms": bar_ms,
            "score": round(float(best[0]), 2),
        },
    )


def regression_channel(candles: Sequence[Candle], lookback: int = 100, sigma: float = 2.0,
                       timeframe: str = "") -> Channel | None:
    window = list(candles[-lookback:])
    if len(window) < 20:
        return None
    t, _, h, l, c, _ = _arrays(window)
    idx = np.arange(len(window), dtype=float)
    slope, intercept = np.polyfit(idx, c, 1)
    fit = slope * idx + intercept
    resid = c - fit
    sd = float(resid.std()) or 1e-9
    ss_tot = float(((c - c.mean()) ** 2).sum()) or 1e-9
    r2 = 1 - float((resid ** 2).sum()) / ss_tot
    iN = len(window) - 1
    upper = Line(int(t[0]), float(fit[0] + sigma * sd), int(t[iN]), float(fit[iN] + sigma * sd))
    lower = Line(int(t[0]), float(fit[0] - sigma * sd), int(t[iN]), float(fit[iN] - sigma * sd))
    return Channel(
        name=f"Regresný kanál ({lookback} sviečok, ±{sigma}σ)",
        kind="regression",
        upper=upper,
        lower=lower,
        timeframe=timeframe,
        meta={"r2": round(r2, 3), "sigma": sigma, "bars": len(window), "stdev": round(sd, 6)},
    )


def horizontal_levels(candles: Sequence[Candle], lookback: int = 300, max_levels: int = 6) -> list[dict[str, Any]]:
    """Zhlukuje pivot highs/lows do horizontálnych zón podpory/rezistencie."""
    window = list(candles[-lookback:])
    if len(window) < 20:
        return []
    t, _, h, l, c, _ = _arrays(window)
    ph, pl = find_pivots(h, l)
    last = float(c[-1])
    tol = max(0.5 * _atr_value(h, l, c), last * 0.0015)
    points = sorted([(float(h[i]), int(t[i]), "high") for i in ph] + [(float(l[i]), int(t[i]), "low") for i in pl])
    zones: list[list[tuple[float, int, str]]] = []
    for p in points:
        if zones and p[0] - zones[-1][-1][0] <= tol:
            zones[-1].append(p)
        else:
            zones.append([p])
    out = []
    for z in zones:
        if len(z) < 2:
            continue
        price = float(np.mean([p[0] for p in z]))
        out.append({
            "price": round(price, 6),
            "touches": len(z),
            "last_touch_time": max(p[1] for p in z),
            "type": "rezistencia" if price > last else "podpora",
            "distance_pct": round((price / last - 1) * 100, 3),
        })
    out.sort(key=lambda z: (-z["touches"], abs(z["distance_pct"])))
    return out[:max_levels]


# ---------------------------------------------------------------------------
# Vyhodnotenie kanála voči aktuálnym dátam
# ---------------------------------------------------------------------------
def evaluate_channel(ch: Channel, candles: Sequence[Candle], tol_atr: float = 0.3) -> dict[str, Any]:
    t, _, h, l, c, _ = _arrays(candles)
    atr_v = _atr_value(h, l, c)
    tol = tol_atr * atr_v
    now_t = int(t[-1])
    last = float(c[-1])
    up_now, lo_now = ch.upper.price_at(now_t), ch.lower.price_at(now_t)
    width = up_now - lo_now
    pos = (last - lo_now) / width * 100 if width else None
    bar_ms = int(np.median(np.diff(t))) if len(t) > 1 else 0
    slope_per_bar = ch.upper.slope_per_ms() * bar_ms
    slope_pct_per_bar = slope_per_bar / last * 100 if last else 0
    # bočný = za 10 sviečok sa kanál posunie o menej než 5 % svojej šírky
    if width and abs(slope_per_bar) * 10 < 0.05 * width:
        direction = "bočný (range)"
    elif slope_per_bar > 0:
        direction = "rastúci"
    else:
        direction = "klesajúci"

    # dotyky a prieniky v okne od začiatku kanála
    start = max(0, int(np.searchsorted(t, ch.upper.t1)))
    up_line = np.array([ch.upper.price_at(x) for x in t[start:]])
    lo_line = np.array([ch.lower.price_at(x) for x in t[start:]])
    hw, lw, cw, tw = h[start:], l[start:], c[start:], t[start:]
    touch_up_idx = np.where(np.abs(hw - up_line) <= tol)[0]
    touch_lo_idx = np.where(np.abs(lw - lo_line) <= tol)[0]
    touches_up = _touch_clusters(hw, up_line, tol)
    touches_lo = _touch_clusters(lw, lo_line, tol)
    closes_above = np.where(cw > up_line + 0.1 * atr_v)[0]
    closes_below = np.where(cw < lo_line - 0.1 * atr_v)[0]

    status = "vnútri kanála"
    if last > up_now + 0.1 * atr_v:
        status = "prerazenie nahor (close nad horným okrajom)"
    elif last < lo_now - 0.1 * atr_v:
        status = "prerazenie nadol (close pod spodným okrajom)"
    else:
        recent = len(cw) - 1
        if any(recent - i <= 10 for i in closes_above) or any(recent - i <= 10 for i in closes_below):
            status = "návrat do kanála po nedávnom prieniku (možný falošný breakout)"

    def _last_time(idx_arr):
        return int(tw[idx_arr[-1]]) if len(idx_arr) else None

    proj_t = now_t + 5 * bar_ms
    return {
        "name": ch.name,
        "kind": ch.kind,
        "timeframe": ch.timeframe,
        "upper_now": round(up_now, 6),
        "lower_now": round(lo_now, 6),
        "mid_now": round((up_now + lo_now) / 2, 6),
        "width": round(width, 6),
        "width_pct": round(width / last * 100, 3) if last else None,
        "position_pct": round(pos, 1) if pos is not None else None,  # 0 = spodok, 100 = vrch
        "distance_to_upper_pct": round((up_now / last - 1) * 100, 3),
        "distance_to_lower_pct": round((lo_now / last - 1) * 100, 3),
        "direction": direction,
        "slope_pct_per_bar": round(slope_pct_per_bar, 4),
        "touches_upper": touches_up,
        "touches_lower": touches_lo,
        "last_touch_upper": _last_time(touch_up_idx),
        "last_touch_lower": _last_time(touch_lo_idx),
        "closes_above_upper": int(len(closes_above)),
        "closes_below_lower": int(len(closes_below)),
        "status": status,
        "projection_5_bars": {"upper": round(ch.upper.price_at(proj_t), 6), "lower": round(ch.lower.price_at(proj_t), 6)},
        "atr14": round(atr_v, 6),
        "meta": ch.meta,
    }


def channel_from_user(row: dict[str, Any]) -> Channel:
    """Z uloženého (DB) záznamu vytvorí Channel. Ak chýba druhý bod spodnej čiary,
    spodná čiara je rovnobežka s hornou cez jeden bod."""
    upper = Line(int(row["upper_t1"]), float(row["upper_p1"]), int(row["upper_t2"]), float(row["upper_p2"]))
    if row.get("lower_t2") is not None and row.get("lower_p2") is not None:
        lower = Line(int(row["lower_t1"]), float(row["lower_p1"]), int(row["lower_t2"]), float(row["lower_p2"]))
    else:
        lower = upper.parallel_through(int(row["lower_t1"]), float(row["lower_p1"]))
    return Channel(
        name=row.get("name") or "Môj kanál",
        kind="user",
        upper=upper,
        lower=lower,
        timeframe=row.get("timeframe", ""),
        meta={"id": row.get("id"), "notes": row.get("notes"), "source": row.get("source")},
    )


def line_points(line: Line, times: Sequence[int], extend_bars: int = 10, bar_ms: int = 0) -> list[dict[str, float]]:
    """Body čiary pre vykreslenie v grafe (sekundy UTC pre lightweight-charts)."""
    ts = list(times)
    if bar_ms and ts:
        ts += [ts[-1] + bar_ms * k for k in range(1, extend_bars + 1)]
    return [{"time": int(x // 1000), "value": round(line.price_at(x), 6)} for x in ts]
