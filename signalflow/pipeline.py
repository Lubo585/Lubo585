"""Orchestrácia: text -> Signal -> obrázky + texty -> publikovanie."""
from __future__ import annotations

import logging
from pathlib import Path

from .config import Settings
from .models import Signal
from .parser import parse_signal
from .publishers import (Content, DiscordPublisher, PostizPublisher, Publisher,
                         PublishResult, TelegramPublisher)
from .renderer import Renderer
from .store import SignalStore
from .templates import build_result_texts, build_texts

log = logging.getLogger("signalflow")


def build_publishers(settings: Settings) -> list[Publisher]:
    pubs: list[Publisher] = []
    if settings.channel_enabled("telegram_vip"):
        pubs.append(TelegramPublisher(settings.get("TELEGRAM_BOT_TOKEN"), settings.get("VIP_TELEGRAM_CHAT_ID")))
    if settings.channel_enabled("discord"):
        pubs.append(DiscordPublisher(settings.get("DISCORD_WEBHOOK_URL"), settings.brand))
    api_key = settings.get("POSTIZ_API_KEY")
    for platform, env_key in (("instagram", "POSTIZ_INSTAGRAM_ID"), ("x", "POSTIZ_X_ID"),
                              ("facebook", "POSTIZ_FACEBOOK_ID")):
        if settings.channel_enabled(platform):
            pubs.append(PostizPublisher(platform, settings.get(env_key), api_key))
    return pubs


class Pipeline:
    def __init__(self, settings: Settings, publishers: list[Publisher] | None = None) -> None:
        self.settings = settings
        self.store = SignalStore(settings.data_dir)
        self.renderer = Renderer(settings)
        self.publishers = publishers if publishers is not None else build_publishers(settings)

    # ------------------------------------------------------------- príjem
    def ingest(self, text: str, source: str = "manual") -> Signal | None:
        signal = parse_signal(text)
        if not signal:
            log.info("Správa nevyzerá ako signál, preskakujem.")
            return None
        signal.source = source
        self.store.save(signal)
        log.info("Nový signál %s: %s %s", signal.id, signal.pair, signal.direction)
        return signal

    # ------------------------------------------------------------- obsah
    def signal_dir(self, signal: Signal) -> Path:
        return self.settings.output_dir / signal.id

    def build_content(self, signal: Signal) -> Content:
        out_dir = self.signal_dir(signal)
        out_dir.mkdir(parents=True, exist_ok=True)
        texts = build_texts(signal, self.settings)
        images = self.renderer.render_all(signal, out_dir)
        self._dump_texts(out_dir, texts, "signal")
        return Content(texts=texts, images=images)

    def build_result_content(self, signal: Signal, kind: str, index: int | None = None,
                             price: float | None = None) -> Content:
        if kind == "tp" and price is None and (index or 1) > len(signal.targets):
            raise ValueError(
                f"Signál {signal.id} má len {len(signal.targets)} cieľ(e); zadaj TP index alebo cenu."
            )
        if kind == "sl" and price is None and signal.stop_loss is None:
            raise ValueError(f"Signál {signal.id} nemá stop loss; zadaj cenu uzavretia.")
        out_dir = self.signal_dir(signal)
        out_dir.mkdir(parents=True, exist_ok=True)
        texts = build_result_texts(signal, self.settings, kind, index, price)
        label = texts.pop("_result_label")
        pnl = texts.pop("_pnl_pct")
        won = kind == "tp"
        suffix = f"{kind}{index or ''}"
        images = {
            "result_square": out_dir / f"result_{suffix}.png",
            "result_story": out_dir / f"result_{suffix}_story.png",
        }
        self.renderer.render_result(signal, label, pnl, won, (1080, 1080), images["result_square"])
        self.renderer.render_result(signal, label, pnl, won, (1080, 1920), images["result_story"])
        self._dump_texts(out_dir, texts, f"result_{suffix}")
        return Content(texts=texts, images=images, is_result=True,
                       meta={"pnl_pct": pnl, "label": label})

    @staticmethod
    def _dump_texts(out_dir: Path, texts: dict[str, str], prefix: str) -> None:
        for name, text in texts.items():
            if name.startswith("_"):
                continue
            (out_dir / f"{prefix}_{name}.txt").write_text(text, encoding="utf-8")

    # ------------------------------------------------------------- publikovanie
    def publish(self, signal: Signal, content: Content, scope: str = "all") -> list[PublishResult]:
        """scope: 'all' | 'vip' (len Telegram + Discord) | 'public' (len IG/X/FB)."""
        results: list[PublishResult] = []
        for pub in self.publishers:
            if scope == "vip" and pub.scope != "vip":
                continue
            if scope == "public" and pub.scope != "public":
                continue
            if not pub.is_configured():
                results.append(PublishResult(pub.name, False, "nie je nakonfigurované (preskočené)"))
                continue
            res = pub.publish(signal, content)
            results.append(res)
            log.info("%s -> %s %s", pub.name, "OK" if res.ok else "CHYBA", res.detail)
            if res.ok and not content.is_result and pub.name not in signal.published_to:
                signal.published_to.append(pub.name)
        if not content.is_result and any(r.ok for r in results):
            signal.status = "published"
        self.store.save(signal)
        return results

    def publish_result(self, signal: Signal, kind: str, index: int | None = None,
                       price: float | None = None, scope: str = "all") -> list[PublishResult]:
        content = self.build_result_content(signal, kind, index, price)
        signal.results.append({"kind": kind, "index": index, "price": price,
                               "pnl": content.meta.get("pnl_pct")})
        return self.publish(signal, content, scope)

    def reject(self, signal: Signal) -> None:
        signal.status = "rejected"
        self.store.save(signal)


def format_results(results: list[PublishResult]) -> str:
    return "\n".join(f"{'✅' if r.ok else '⚠️'} {r.channel}: {r.detail}" for r in results)
