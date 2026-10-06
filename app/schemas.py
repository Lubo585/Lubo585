"""Pydantic modely pre API a pre štruktúrovaný výstup AI agenta."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


# ---- Vstupy API ----
class ChannelIn(BaseModel):
    symbol: str
    timeframe: str = "4h"
    name: str = "Môj kanál"
    upper_t1: int = Field(description="čas 1. bodu hornej čiary (ms UTC)")
    upper_p1: float
    upper_t2: int
    upper_p2: float
    lower_t1: int = Field(description="čas bodu spodnej čiary (ms UTC)")
    lower_p1: float
    lower_t2: Optional[int] = None
    lower_p2: Optional[float] = None
    notes: str = ""
    source: str = "manual"
    active: bool = True


class AnalyzeRequest(BaseModel):
    symbol: str
    timeframes: list[str] = ["1d", "4h", "1h"]
    notes: str = ""
    images: list[str] = Field(default_factory=list, description="data:image/png;base64,... screenshoty z TradingView")
    include_alerts: bool = True
    include_detected: bool = True


class WatchlistIn(BaseModel):
    symbol: str


# ---- Štruktúrovaný výstup AI ----
class ChannelAssessment(BaseModel):
    channel: str = Field(description="názov kanála")
    timeframe: str
    verdict: Literal["platný", "oslabený", "prerazený", "nejednoznačný"]
    comment: str


class KeyLevel(BaseModel):
    price: float
    type: Literal["podpora", "rezistencia", "horný okraj kanála", "spodný okraj kanála", "stred kanála", "iné"]
    timeframe: str
    why: str


class Scenario(BaseModel):
    name: str
    direction: Literal["long", "short", "neutral"]
    trigger: str = Field(description="čo musí nastať, aby bol scenár aktívny")
    entry_zone: str
    invalidation: str = Field(description="kde je scenár neplatný / stop")
    targets: list[str]
    probability_pct: int = Field(ge=0, le=100)
    risk_reward: str


class WatchTip(BaseModel):
    tip: str
    priority: Literal["vysoká", "stredná", "nízka"]
    category: Literal["kanál", "úroveň", "objem/OI/funding", "momentum", "riziko", "časovanie", "iné"]


class AnalysisReport(BaseModel):
    symbol: str
    bias: Literal["long", "short", "neutral"]
    bias_confidence_pct: int = Field(ge=0, le=100)
    summary: str = Field(description="3–6 viet, situácia naprieč časovými rámcami")
    channel_assessments: list[ChannelAssessment]
    key_levels: list[KeyLevel]
    scenarios: list[Scenario]
    watch_tips: list[WatchTip] = Field(description="vlastné tipy agenta, čo sledovať")
    risk_notes: list[str]
    data_gaps: list[str] = Field(description="čo v podkladoch chýbalo alebo bolo nejasné")
    disclaimer: str
