"""Textové šablóny pre jednotlivé kanály (vyplnené z config.yaml)."""
from __future__ import annotations

from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from .config import Settings
from .models import Signal, fmt_price


class _SafeDict(dict):
    def __missing__(self, key: str) -> str:
        return "{" + key + "}"


def signal_fields(signal: Signal, settings: Settings) -> dict[str, Any]:
    tz = ZoneInfo(settings.cfg.get("timezone", "UTC"))
    now = datetime.now(tz)
    targets_block = "\n".join(
        f"✅ TP{i}: {fmt_price(t)}" for i, t in enumerate(signal.targets, start=1)
    )
    rr = signal.risk_reward()
    return {
        "id": signal.id,
        "pair": signal.pair,
        "base": signal.base,
        "quote": signal.quote,
        "direction": signal.direction,
        "direction_emoji": "🟢" if signal.is_long else "🔴",
        "entries": " – ".join(fmt_price(e) for e in signal.entries) or "—",
        "targets_inline": " / ".join(fmt_price(t) for t in signal.targets) or "—",
        "targets_block": targets_block or "✅ TP: —",
        "stop_loss": fmt_price(signal.stop_loss),
        "leverage": f"{signal.leverage}x" if signal.leverage else "—",
        "leverage_tag": f"({signal.leverage}x)" if signal.leverage else "",
        "timeframe": signal.timeframe or "",
        "timeframe_line": f"⏱ Timeframe: {signal.timeframe}\n" if signal.timeframe else "",
        "note": signal.note or "",
        "note_line": f"📝 {signal.note}\n" if signal.note else "",
        "rr": f"1:{rr}" if rr else "—",
        "brand": settings.brand,
        "vip_link": settings.cfg.get("vip_link", ""),
        "hashtags": settings.cfg.get("hashtags", ""),
        "date": now.strftime("%d.%m.%Y"),
        "time": now.strftime("%H:%M"),
    }


def result_fields(signal: Signal, settings: Settings, kind: str, index: int | None,
                  price: float | None) -> dict[str, Any]:
    fields = signal_fields(signal, settings)
    if kind == "tp":
        idx = index or 1
        price = price if price is not None else (
            signal.targets[idx - 1] if len(signal.targets) >= idx else None
        )
        label = f"TP{idx} HIT ✅"
        emoji = "✅"
    else:
        price = price if price is not None else signal.stop_loss
        label = "STOP LOSS ❌"
        emoji = "❌"
    pnl = signal.pnl_pct(price) if price is not None else None
    fields.update(
        result_label=label,
        result_emoji=emoji,
        tp_index=index or "",
        pnl_pct=(f"{pnl:+.2f} %" if pnl is not None else "—"),
        pnl_value=pnl,
        close_price=fmt_price(price),
    )
    return fields


def render(template_name: str, fields: dict[str, Any], settings: Settings) -> str:
    template = settings.templates.get(template_name, "")
    text = template.format_map(_SafeDict(fields))
    # odstráň prázdne riadky, ktoré ostali po nevyplnených voliteľných poliach
    lines = text.splitlines()
    cleaned: list[str] = []
    for line in lines:
        if line.strip() == "" and cleaned and cleaned[-1].strip() == "":
            continue
        cleaned.append(line.rstrip())
    return "\n".join(cleaned).strip()


def public_variant(name: str, settings: Settings) -> str:
    """'x' -> 'x_teaser' alebo 'x_full' podľa public_mode."""
    suffix = "full" if settings.public_mode == "full" else "teaser"
    return f"{name}_{suffix}"


def build_texts(signal: Signal, settings: Settings) -> dict[str, str]:
    f = signal_fields(signal, settings)
    texts = {
        "telegram_vip": render("telegram_vip", f, settings),
        "discord_title": render("discord_title", f, settings),
        "discord_description": render("discord_description", f, settings),
        "x": render(public_variant("x", settings), f, settings),
        "facebook": render(public_variant("facebook", settings), f, settings),
        "instagram": render(public_variant("instagram", settings), f, settings),
    }
    if len(texts["x"]) > 280:
        texts["x"] = texts["x"][:277].rstrip() + "..."
    return texts


def build_result_texts(signal: Signal, settings: Settings, kind: str,
                       index: int | None = None, price: float | None = None) -> dict[str, str]:
    f = result_fields(signal, settings, kind, index, price)
    vip = render("result_vip", f, settings)
    public = render("result_public", f, settings)
    return {
        "telegram_vip": vip,
        "discord_title": f"{f['result_emoji']} {signal.pair} {signal.direction} – {f['result_label']}",
        "discord_description": vip.replace("<b>", "**").replace("</b>", "**"),
        "x": public[:280],
        "facebook": public,
        "instagram": public,
        "_pnl_pct": f["pnl_pct"],
        "_result_label": f["result_label"],
    }
