"""Parsovanie textovej správy s tradingovým tipom na štruktúrovaný Signal.

Najprv sa skúsi rýchly regexový parser (zvládne bežné formáty signálových
skupín), ak zlyhá a je nastavený ANTHROPIC_API_KEY, použije sa AI parser.
"""
from __future__ import annotations

import os
import re

from .models import Signal

QUOTES = ("USDT", "USDC", "BUSD", "USD", "PERP", "BTC", "ETH", "EUR")

PAIR_RE = re.compile(
    r"(?:^|[\s#$])([A-Z]{2,10})\s*[/\-]?\s*(" + "|".join(QUOTES) + r")\b(?:\.P|PERP)?",
    re.MULTILINE,
)
TICKER_RE = re.compile(r"(?:^|[\s#$])\$?([A-Z]{2,10})\b(?=.*\b(?:long|short|buy|sell)\b)", re.I | re.S)

LONG_WORDS = r"long|buy|nákup|nakup|kúp|kup"
SHORT_WORDS = r"short|sell|predaj"
DIRECTION_RE = re.compile(rf"\b({LONG_WORDS}|{SHORT_WORDS})\b", re.I)

NUM_RE = re.compile(r"\d+(?:[.,]\d+)*")

LABELS = {
    "entry": r"(?:entry\s*(?:zone|price)?|entries|vstup(?:ová zóna)?|buy\s*zone|ep)",
    "target": r"(?:(?:tp|take\s*profit|targets?|cie[ľl])\s*\d{0,2}(?=\s*[:\-=–]|\s+\d)|t\d)",
    "stop": r"(?:sl|stop\s*-?\s*loss|stoploss|stop)",
    "leverage": r"(?:lev(?:erage)?|p[áa]ka|cross|isolated)",
}
LINE_RE = {
    key: re.compile(rf"^\s*(?:[\W_]*\s*)?{pattern}\s*[:\-=–]?\s*(.+)$", re.I | re.MULTILINE)
    for key, pattern in LABELS.items()
}
LEVERAGE_RE = re.compile(r"(?:(\d{1,3})\s*[xX]|[xX]\s*(\d{1,3}))")
TIMEFRAME_RE = re.compile(r"\b(\d{1,3}\s?(?:m|min|h|hod|d|w|D|H|W))\b")


def _to_float(token: str) -> float | None:
    token = token.strip()
    # 62,000 alebo 1,234,567 -> oddeľovač tisícov
    if re.fullmatch(r"\d{1,3}(,\d{3})+(\.\d+)?", token):
        token = token.replace(",", "")
    else:
        token = token.replace(",", ".")
    try:
        return float(token)
    except ValueError:
        return None


def _numbers(chunk: str) -> list[float]:
    out = []
    for tok in NUM_RE.findall(chunk):
        val = _to_float(tok)
        if val is not None:
            out.append(val)
    return out


def _find_pair(text: str) -> str | None:
    match = PAIR_RE.search(text)
    if match:
        return f"{match.group(1)}/{match.group(2)}"
    match = TICKER_RE.search(text)
    if match:
        ticker = match.group(1).upper()
        if ticker not in ("LONG", "SHORT", "BUY", "SELL", "TP", "SL", "ENTRY"):
            return f"{ticker}/USDT"
    return None


def _find_direction(text: str) -> str | None:
    match = DIRECTION_RE.search(text)
    if not match:
        return None
    word = match.group(1).lower()
    return "SHORT" if re.fullmatch(SHORT_WORDS, word) else "LONG"


def _normalize(text: str) -> str:
    """Inline formáty ("Entry 1 | TP 2 | SL 3") rozdelí na riadky."""
    return re.sub(r"\s*[|;•]\s*", "\n", text)


def parse_regex(text: str) -> Signal | None:
    raw = text
    text = _normalize(text)
    pair = _find_pair(text)
    direction = _find_direction(text)
    if not pair or not direction:
        return None

    entries: list[float] = []
    for m in LINE_RE["entry"].finditer(text):
        entries += _numbers(m.group(1))

    targets: list[float] = []
    for m in LINE_RE["target"].finditer(text):
        targets += _numbers(m.group(1))

    stop_loss = None
    m = LINE_RE["stop"].search(text)
    if m:
        nums = _numbers(m.group(1))
        stop_loss = nums[0] if nums else None

    leverage = None
    m = LINE_RE["leverage"].search(text)
    lev_src = m.group(1) if m else text
    lm = LEVERAGE_RE.search(lev_src)
    if lm:
        leverage = int(lm.group(1) or lm.group(2))

    timeframe = None
    tm = TIMEFRAME_RE.search(text)
    if tm:
        timeframe = tm.group(1).replace(" ", "").upper()

    if not entries and not targets:
        return None

    # odstráň duplicity a zachovaj poradie
    targets = list(dict.fromkeys(targets))
    entries = list(dict.fromkeys(entries))

    return Signal(
        pair=pair,
        direction=direction,
        entries=entries,
        targets=targets,
        stop_loss=stop_loss,
        leverage=leverage,
        timeframe=timeframe,
        raw_text=raw.strip(),
    )


def parse_with_claude(text: str, model: str | None = None) -> Signal | None:
    """AI fallback – použije sa, keď regex nerozpozná formát správy."""
    try:
        import anthropic
        from pydantic import BaseModel
    except ImportError:
        return None

    class SignalSchema(BaseModel):
        is_signal: bool
        pair: str | None = None
        direction: str | None = None
        entries: list[float] = []
        targets: list[float] = []
        stop_loss: float | None = None
        leverage: int | None = None
        timeframe: str | None = None
        note: str | None = None

    client = anthropic.Anthropic()
    response = client.messages.parse(
        model=model or os.environ.get("ANTHROPIC_MODEL", "claude-opus-5-5"),
        max_tokens=1024,
        system=(
            "You extract crypto trading signals from chat messages. "
            "Return is_signal=false if the message is not a trade setup. "
            "pair must be formatted like BTC/USDT; direction is LONG or SHORT. "
            "Numbers must be plain floats. Keep note short (max 120 chars) or null."
        ),
        messages=[{"role": "user", "content": text}],
        output_format=SignalSchema,
    )
    if response.stop_reason == "refusal":
        return None
    data = response.parsed_output
    if not data or not data.is_signal or not data.pair or not data.direction:
        return None
    return Signal(
        pair=data.pair,
        direction=data.direction,
        entries=data.entries,
        targets=data.targets,
        stop_loss=data.stop_loss,
        leverage=data.leverage,
        timeframe=data.timeframe,
        note=data.note,
        raw_text=text.strip(),
    )


def parse_signal(text: str, use_ai: bool | None = None) -> Signal | None:
    signal = parse_regex(text)
    if signal:
        return signal
    if use_ai is None:
        use_ai = bool(os.environ.get("ANTHROPIC_API_KEY"))
    if use_ai:
        return parse_with_claude(text)
    return None
