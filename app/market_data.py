"""Trhové dáta z Binance USDⓈ-M Futures s automatickou zálohou na OKX perpetual swap.

Binance Futures API je z niektorých krajín/cloudov geograficky blokované (HTTP 451 alebo
odpoveď s textom "restricted location"). V režime MARKET_PROVIDER=auto sa pri takejto
chybe prepne na OKX, ktoré ponúka rovnaké perpetual kontrakty (BTC-USDT-SWAP atď.).
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, asdict
from typing import Any

import httpx

from .config import settings

log = logging.getLogger(__name__)


@dataclass
class Candle:
    time: int  # otvorenie sviečky v ms (UTC)
    open: float
    high: float
    low: float
    close: float
    volume: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class ProviderError(RuntimeError):
    """Chyba poskytovateľa dát (sieť, geo-blokácia, neznámy symbol...)."""


class GeoBlocked(ProviderError):
    """Poskytovateľ odmietol požiadavku kvôli geografickej polohe."""


# ---------------------------------------------------------------------------
# Binance USDⓈ-M Futures
# ---------------------------------------------------------------------------
class BinanceFutures:
    name = "binance-futures"
    base = "https://fapi.binance.com"

    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def _get(self, path: str, **params: Any) -> Any:
        try:
            r = await self.client.get(self.base + path, params=params)
        except httpx.HTTPError as e:  # sieť
            raise ProviderError(f"Binance: {e}") from e
        if r.status_code == 451:
            raise GeoBlocked("Binance Futures: HTTP 451 (restricted location)")
        try:
            data = r.json()
        except ValueError as e:
            raise ProviderError(f"Binance: neplatná odpoveď ({r.status_code})") from e
        if isinstance(data, dict) and "msg" in data and "restricted location" in str(data.get("msg", "")):
            raise GeoBlocked(f"Binance Futures: {data['msg']}")
        if r.status_code >= 400:
            raise ProviderError(f"Binance {r.status_code}: {data}")
        return data

    async def klines(self, symbol: str, interval: str, limit: int = 500) -> list[Candle]:
        raw = await self._get("/fapi/v1/klines", symbol=symbol, interval=interval, limit=min(limit, 1500))
        return [Candle(int(k[0]), float(k[1]), float(k[2]), float(k[3]), float(k[4]), float(k[5])) for k in raw]

    async def ticker(self, symbol: str) -> dict[str, Any]:
        t = await self._get("/fapi/v1/ticker/24hr", symbol=symbol)
        return {
            "symbol": symbol,
            "last": float(t["lastPrice"]),
            "change_pct_24h": float(t["priceChangePercent"]),
            "high_24h": float(t["highPrice"]),
            "low_24h": float(t["lowPrice"]),
            "volume_24h_base": float(t["volume"]),
            "volume_24h_quote": float(t["quoteVolume"]),
        }

    async def funding(self, symbol: str) -> dict[str, Any]:
        p = await self._get("/fapi/v1/premiumIndex", symbol=symbol)
        return {
            "funding_rate": float(p["lastFundingRate"]),
            "funding_rate_pct": round(float(p["lastFundingRate"]) * 100, 4),
            "next_funding_time": int(p["nextFundingTime"]),
            "mark_price": float(p["markPrice"]),
            "index_price": float(p["indexPrice"]),
        }

    async def open_interest(self, symbol: str) -> dict[str, Any]:
        oi = await self._get("/fapi/v1/openInterest", symbol=symbol)
        return {"open_interest": float(oi["openInterest"]), "time": int(oi["time"])}

    async def long_short_ratio(self, symbol: str) -> dict[str, Any] | None:
        try:
            rows = await self._get(
                "/futures/data/globalLongShortAccountRatio", symbol=symbol, period="1h", limit=1
            )
        except ProviderError:
            return None
        if not rows:
            return None
        r = rows[-1]
        return {
            "long_short_ratio": float(r["longShortRatio"]),
            "long_account_pct": round(float(r["longAccount"]) * 100, 2),
            "short_account_pct": round(float(r["shortAccount"]) * 100, 2),
        }

    async def symbols(self) -> list[str]:
        info = await self._get("/fapi/v1/exchangeInfo")
        return sorted(
            s["symbol"]
            for s in info["symbols"]
            if s.get("contractType") == "PERPETUAL" and s.get("status") == "TRADING" and s["symbol"].endswith("USDT")
        )


# ---------------------------------------------------------------------------
# OKX perpetual swap (záloha)
# ---------------------------------------------------------------------------
_OKX_BAR = {"1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1H", "4h": "4H", "1d": "1D", "1w": "1W"}


def okx_inst_id(symbol: str) -> str:
    """BTCUSDT -> BTC-USDT-SWAP"""
    s = symbol.upper()
    for quote in ("USDT", "USDC", "USD"):
        if s.endswith(quote):
            return f"{s[:-len(quote)]}-{quote}-SWAP"
    return s


class OkxSwap:
    name = "okx-swap"
    base = "https://www.okx.com"

    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def _get(self, path: str, **params: Any) -> Any:
        try:
            r = await self.client.get(self.base + path, params=params)
            data = r.json()
        except (httpx.HTTPError, ValueError) as e:
            raise ProviderError(f"OKX: {e}") from e
        if str(data.get("code")) != "0":
            raise ProviderError(f"OKX {data.get('code')}: {data.get('msg')}")
        return data["data"]

    async def klines(self, symbol: str, interval: str, limit: int = 300) -> list[Candle]:
        raw = await self._get(
            "/api/v5/market/candles", instId=okx_inst_id(symbol), bar=_OKX_BAR[interval], limit=min(limit, 300)
        )
        candles = [Candle(int(k[0]), float(k[1]), float(k[2]), float(k[3]), float(k[4]), float(k[5])) for k in raw]
        candles.sort(key=lambda c: c.time)
        return candles

    async def ticker(self, symbol: str) -> dict[str, Any]:
        t = (await self._get("/api/v5/market/ticker", instId=okx_inst_id(symbol)))[0]
        last, open24 = float(t["last"]), float(t["open24h"])
        return {
            "symbol": symbol,
            "last": last,
            "change_pct_24h": round((last / open24 - 1) * 100, 3) if open24 else 0.0,
            "high_24h": float(t["high24h"]),
            "low_24h": float(t["low24h"]),
            "volume_24h_base": float(t["volCcy24h"]),
            "volume_24h_quote": float(t["volCcy24h"]) * last,
        }

    async def funding(self, symbol: str) -> dict[str, Any]:
        f = (await self._get("/api/v5/public/funding-rate", instId=okx_inst_id(symbol)))[0]
        rate = float(f["fundingRate"])
        return {
            "funding_rate": rate,
            "funding_rate_pct": round(rate * 100, 4),
            "next_funding_time": int(f["fundingTime"]),
            "mark_price": None,
            "index_price": None,
        }

    async def open_interest(self, symbol: str) -> dict[str, Any]:
        oi = (await self._get("/api/v5/public/open-interest", instType="SWAP", instId=okx_inst_id(symbol)))[0]
        return {"open_interest": float(oi["oiCcy"]), "time": int(oi["ts"])}

    async def long_short_ratio(self, symbol: str) -> dict[str, Any] | None:
        ccy = okx_inst_id(symbol).split("-")[0]
        try:
            rows = await self._get("/api/v5/rubik/stat/contracts/long-short-account-ratio", ccy=ccy, period="1H")
        except ProviderError:
            return None
        if not rows:
            return None
        ratio = float(rows[0][1])
        long_pct = ratio / (1 + ratio) * 100
        return {
            "long_short_ratio": ratio,
            "long_account_pct": round(long_pct, 2),
            "short_account_pct": round(100 - long_pct, 2),
        }

    async def symbols(self) -> list[str]:
        rows = await self._get("/api/v5/public/instruments", instType="SWAP")
        out = []
        for r in rows:
            inst = r["instId"]
            if inst.endswith("-USDT-SWAP") and r.get("state") == "live":
                out.append(inst.replace("-USDT-SWAP", "USDT"))
        return sorted(out)


# ---------------------------------------------------------------------------
# Router: vyberie poskytovateľa a pamätá si geo-blokáciu
# ---------------------------------------------------------------------------
class MarketData:
    def __init__(self, provider: str | None = None):
        self.mode = provider or settings.market_provider
        self.client = httpx.AsyncClient(timeout=15.0, headers={"User-Agent": "crypto-channel-agent/1.0"})
        self.binance = BinanceFutures(self.client)
        self.okx = OkxSwap(self.client)
        self._binance_blocked_until = 0.0
        self.last_provider: str = ""

    async def close(self) -> None:
        await self.client.aclose()

    def _providers(self) -> list[BinanceFutures | OkxSwap]:
        if self.mode == "binance":
            return [self.binance]
        if self.mode == "okx":
            return [self.okx]
        if time.time() < self._binance_blocked_until:
            return [self.okx, self.binance]
        return [self.binance, self.okx]

    async def _call(self, method: str, *args: Any, **kwargs: Any) -> Any:
        errors: list[str] = []
        for p in self._providers():
            try:
                result = await getattr(p, method)(*args, **kwargs)
                self.last_provider = p.name
                return result
            except GeoBlocked as e:
                log.warning("%s – prepínam na záložného poskytovateľa", e)
                self._binance_blocked_until = time.time() + 3600
                errors.append(str(e))
            except ProviderError as e:
                errors.append(str(e))
        raise ProviderError("; ".join(errors) or "žiadny poskytovateľ dát")

    async def klines(self, symbol: str, interval: str, limit: int = 500) -> list[Candle]:
        return await self._call("klines", symbol, interval, limit)

    async def ticker(self, symbol: str) -> dict[str, Any]:
        return await self._call("ticker", symbol)

    async def funding(self, symbol: str) -> dict[str, Any]:
        return await self._call("funding", symbol)

    async def open_interest(self, symbol: str) -> dict[str, Any]:
        return await self._call("open_interest", symbol)

    async def long_short_ratio(self, symbol: str) -> dict[str, Any] | None:
        return await self._call("long_short_ratio", symbol)

    async def symbols(self) -> list[str]:
        return await self._call("symbols")

    async def market_overview(self, symbol: str) -> dict[str, Any]:
        """Ticker + funding + OI + long/short pomer v jednom slovníku (chýbajúce časti sú None)."""
        out: dict[str, Any] = {"symbol": symbol}
        for key, method in (("ticker", "ticker"), ("funding", "funding"), ("open_interest", "open_interest"),
                            ("long_short", "long_short_ratio")):
            try:
                out[key] = await getattr(self, method)(symbol)
            except ProviderError as e:
                log.info("%s %s: %s", symbol, key, e)
                out[key] = None
        out["provider"] = self.last_provider
        return out
