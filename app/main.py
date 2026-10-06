"""FastAPI aplikácia: REST API + webové rozhranie + monitor kanálov."""
from __future__ import annotations

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import ai_agent
from .analysis import build_snapshot, snapshot_for_ai
from .channels import channel_from_user, evaluate_channel, line_points
from .config import TIMEFRAME_MS, TIMEFRAMES, settings
from .indicators import ema_series
from .market_data import MarketData, ProviderError
from .notify import telegram
from .schemas import AnalyzeRequest, ChannelIn, WatchlistIn
from .storage import Storage
from .tradingview import ALERT_MESSAGE_TEMPLATE, parse_webhook

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("app")

STATIC = Path(__file__).resolve().parent.parent / "static"


# ---------------------------------------------------------------------------
# Monitor: sleduje, či sa cena blíži k hraniciam používateľských kanálov
# ---------------------------------------------------------------------------
async def monitor_loop(md: MarketData, storage: Storage) -> None:
    interval = settings.monitor_interval_seconds
    while True:
        try:
            await check_channels_once(md, storage)
        except Exception as e:  # monitor nesmie spadnúť
            log.warning("monitor: %s", e)
        await asyncio.sleep(max(interval, 15))


async def check_channels_once(md: MarketData, storage: Storage) -> list[dict[str, Any]]:
    created: list[dict[str, Any]] = []
    rows = storage.list_channels(active_only=True)
    by_key: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for r in rows:
        by_key.setdefault((r["symbol"], r["timeframe"]), []).append(r)
    cooldown_ms = 6 * 3600 * 1000
    for (symbol, tf), chans in by_key.items():
        try:
            candles = await md.klines(symbol, tf, 120)
        except ProviderError as e:
            log.info("monitor %s %s: %s", symbol, tf, e)
            continue
        if len(candles) < 20:
            continue
        for r in chans:
            ch = channel_from_user(r)
            ev = evaluate_channel(ch, candles)
            last = candles[-1].close
            events: list[tuple[str, str]] = []
            if abs(ev["distance_to_upper_pct"]) <= settings.monitor_proximity_pct:
                events.append(("near_upper", f"cena {last} je blízko horného okraja {ev['upper_now']}"))
            if abs(ev["distance_to_lower_pct"]) <= settings.monitor_proximity_pct:
                events.append(("near_lower", f"cena {last} je blízko spodného okraja {ev['lower_now']}"))
            if ev["status"].startswith("prerazenie"):
                events.append(("breakout", ev["status"] + f" (cena {last})"))
            for event, msg in events:
                key = f"{event}:{r['id']}"
                last_t = storage.last_alert_time("monitor", symbol, key)
                if last_t and time.time() * 1000 - last_t < cooldown_ms:
                    continue
                text = f"[{symbol} {tf}] {ch.name}: {msg}"
                a = storage.add_alert("monitor", symbol, tf, key, last, text, {"channel_id": r["id"], "eval": ev})
                created.append(a)
                await telegram("📐 " + text)
    return created


# ---------------------------------------------------------------------------
# Aplikácia
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.md = MarketData()
    app.state.storage = Storage()
    task = None
    if settings.monitor_interval_seconds > 0:
        task = asyncio.create_task(monitor_loop(app.state.md, app.state.storage))
    log.info("Aplikácia beží na http://%s:%s  (poskytovateľ dát: %s, model: %s)",
             settings.host, settings.port, settings.market_provider, settings.ai_model)
    try:
        yield
    finally:
        if task:
            task.cancel()
        await app.state.md.close()


app = FastAPI(title="Crypto Channel Agent", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.exception_handler(ProviderError)
async def provider_error(_: Request, exc: ProviderError):
    return JSONResponse(status_code=502, content={"detail": f"Trhové dáta: {exc}"})


@app.exception_handler(ai_agent.AIAgentError)
async def ai_error(_: Request, exc: ai_agent.AIAgentError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


def _md(request: Request) -> MarketData:
    return request.app.state.md


def _db(request: Request) -> Storage:
    return request.app.state.storage


def _tf(tf: str) -> str:
    if tf not in TIMEFRAME_MS:
        raise HTTPException(400, f"Nepodporovaný časový rámec: {tf}")
    return tf


@app.get("/")
async def index():
    return FileResponse(STATIC / "index.html")


@app.get("/api/config")
async def get_config(request: Request):
    return {
        "provider_mode": settings.market_provider,
        "provider_last": _md(request).last_provider,
        "ai_model": settings.ai_model,
        "ai_effort": settings.ai_effort,
        "has_api_key": settings.has_api_key,
        "timeframes": TIMEFRAMES,
        "monitor_interval_seconds": settings.monitor_interval_seconds,
        "monitor_proximity_pct": settings.monitor_proximity_pct,
        "telegram": bool(settings.telegram_bot_token and settings.telegram_chat_id),
        "webhook_secret_set": bool(settings.tv_webhook_secret),
        "tv_alert_template": ALERT_MESSAGE_TEMPLATE,
    }


# ---- watchlist ----
@app.get("/api/watchlist")
async def watchlist(request: Request):
    return _db(request).list_watchlist()


@app.post("/api/watchlist")
async def watchlist_add(body: WatchlistIn, request: Request):
    symbol = body.symbol.strip().upper()
    await _md(request).ticker(symbol)  # overí existenciu symbolu
    _db(request).add_watchlist(symbol)
    return _db(request).list_watchlist()


@app.delete("/api/watchlist/{symbol}")
async def watchlist_remove(symbol: str, request: Request):
    _db(request).remove_watchlist(symbol)
    return _db(request).list_watchlist()


@app.get("/api/symbols")
async def symbols(request: Request, q: str = ""):
    all_symbols = await _md(request).symbols()
    q = q.upper()
    return [s for s in all_symbols if q in s][:50]


# ---- trhové dáta a graf ----
@app.get("/api/chart")
async def chart(request: Request, symbol: str, interval: str = "4h", limit: int = 300, detect: bool = True):
    interval = _tf(interval)
    md, db = _md(request), _db(request)
    symbol = symbol.upper()
    candles = await md.klines(symbol, interval, limit)
    if not candles:
        raise ProviderError(f"{symbol}: žiadne sviečky")
    times = [c.time for c in candles]
    closes = [c.close for c in candles]
    bar_ms = TIMEFRAME_MS[interval]
    from .channels import detect_parallel_channel, horizontal_levels, regression_channel

    out_channels = []
    for r in db.list_channels(symbol, active_only=True):
        if r["timeframe"] != interval:
            continue
        ch = channel_from_user(r)
        out_channels.append({
            "id": r["id"], "name": ch.name, "kind": "user",
            "upper": line_points(ch.upper, times, 15, bar_ms), "lower": line_points(ch.lower, times, 15, bar_ms),
            "eval": evaluate_channel(ch, candles),
        })
    if detect and len(candles) >= 30:
        for ch in filter(None, (detect_parallel_channel(candles, timeframe=interval),
                                regression_channel(candles, timeframe=interval))):
            sub_times = [t for t in times if t >= ch.upper.t1]
            out_channels.append({
                "id": None, "name": ch.name, "kind": ch.kind,
                "upper": line_points(ch.upper, sub_times, 15, bar_ms), "lower": line_points(ch.lower, sub_times, 15, bar_ms),
                "eval": evaluate_channel(ch, candles),
            })
    return {
        "symbol": symbol,
        "interval": interval,
        "provider": md.last_provider,
        "candles": [{"time": c.time // 1000, "open": c.open, "high": c.high, "low": c.low, "close": c.close,
                     "volume": c.volume} for c in candles],
        "ema": {p: [{"time": t // 1000, "value": v} for t, v in zip(times, ema_series(closes, p)) if v is not None]
                for p in (20, 50, 200)},
        "channels": out_channels,
        "levels": horizontal_levels(candles) if detect else [],
    }


@app.get("/api/market/{symbol}")
async def market(symbol: str, request: Request):
    return await _md(request).market_overview(symbol.upper())


# ---- kanály ----
@app.get("/api/channels")
async def channels_list(request: Request, symbol: str | None = None):
    return _db(request).list_channels(symbol)


@app.post("/api/channels")
async def channels_add(body: ChannelIn, request: Request):
    _tf(body.timeframe)
    if body.upper_t1 == body.upper_t2:
        raise HTTPException(400, "Body hornej čiary musia mať rôzny čas.")
    return _db(request).add_channel(body.model_dump())


@app.put("/api/channels/{channel_id}")
async def channels_update(channel_id: int, body: dict[str, Any], request: Request):
    if "timeframe" in body:
        _tf(body["timeframe"])
    row = _db(request).update_channel(channel_id, body)
    if not row:
        raise HTTPException(404, "Kanál neexistuje")
    return row


@app.delete("/api/channels/{channel_id}")
async def channels_delete(channel_id: int, request: Request):
    _db(request).delete_channel(channel_id)
    return {"ok": True}


# ---- TradingView webhook + alerty ----
@app.post("/api/tradingview/webhook")
async def tv_webhook(request: Request):
    body = await request.body()
    data = parse_webhook(body, request.headers.get("content-type"))
    if settings.tv_webhook_secret and data["secret"] != settings.tv_webhook_secret:
        raise HTTPException(403, "Nesprávny secret")
    a = _db(request).add_alert("tradingview", data["symbol"], data["timeframe"], data["event"], data["price"],
                               data["message"], data["raw"])
    await telegram(f"📈 TradingView {data['symbol'] or ''} {data['timeframe'] or ''}: {data['event']} – {data['message']}")
    if settings.auto_analyze_on_tv_alert and data["symbol"] and settings.has_api_key:
        notes = f"Práve prišiel alert z TradingView ({data['timeframe'] or '?'}): {data['event']} – {data['message']}"
        asyncio.create_task(auto_analyze(_md(request), _db(request), data["symbol"], notes))
    return {"ok": True, "alert": a}


async def auto_analyze(md: MarketData, storage: Storage, symbol: str, notes: str) -> None:
    """Analýza na pozadí po alerte z TradingView; výsledok sa uloží a zhrnutie pošle na Telegram."""
    try:
        tfs = [tf for tf in settings.auto_analyze_timeframes if tf in TIMEFRAME_MS] or ["4h"]
        snap = await build_snapshot(md, storage, symbol, tfs)
        report, usage = await asyncio.to_thread(ai_agent.analyze, snapshot_for_ai(snap), notes, [])
        saved = storage.add_analysis(symbol, tfs, usage.get("model") or settings.ai_model, report.model_dump(), usage)
        tips = "\n".join(f"• {t.tip}" for t in report.watch_tips[:4])
        await telegram(
            f"🧠 AI analýza {symbol} ({', '.join(tfs)}) #{saved['id']}\n"
            f"Bias: {report.bias.upper()} ({report.bias_confidence_pct} %)\n{report.summary}\n\nČo sledovať:\n{tips}"
        )
    except Exception as e:  # beží na pozadí – len zalogovať
        log.warning("auto-analýza %s zlyhala: %s", symbol, e)


@app.get("/api/alerts")
async def alerts(request: Request, symbol: str | None = None, limit: int = 50):
    return _db(request).list_alerts(symbol, limit)


@app.post("/api/monitor/run")
async def monitor_run(request: Request):
    return await check_channels_once(_md(request), _db(request))


# ---- AI analýza ----
@app.post("/api/snapshot")
async def snapshot(body: AnalyzeRequest, request: Request):
    """Náhľad podkladov, ktoré dostane AI (užitočné aj bez API kľúča)."""
    snap = await build_snapshot(_md(request), _db(request), body.symbol, body.timeframes,
                                body.include_alerts, body.include_detected)
    return snapshot_for_ai(snap)


@app.post("/api/analyze")
async def analyze(body: AnalyzeRequest, request: Request):
    for tf in body.timeframes:
        _tf(tf)
    snap = await build_snapshot(_md(request), _db(request), body.symbol, body.timeframes,
                                body.include_alerts, body.include_detected)
    ai_input = snapshot_for_ai(snap)
    report, usage = await asyncio.to_thread(ai_agent.analyze, ai_input, body.notes, body.images)
    saved = _db(request).add_analysis(body.symbol, body.timeframes, usage.get("model") or settings.ai_model,
                                      report.model_dump(), usage)
    return saved


@app.get("/api/analyses")
async def analyses(request: Request, symbol: str | None = None, limit: int = 20):
    return _db(request).list_analyses(symbol, limit)


@app.get("/api/analyses/{analysis_id}")
async def analysis_get(analysis_id: int, request: Request):
    a = _db(request).get_analysis(analysis_id)
    if not a:
        raise HTTPException(404, "Analýza neexistuje")
    return a
