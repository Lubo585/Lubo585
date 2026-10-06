"""Publikovanie do Discordu cez webhook (embed + obrázok)."""
from __future__ import annotations

import json

import httpx

from ..models import Signal
from .base import Content, Publisher, PublishResult


class DiscordPublisher(Publisher):
    name = "discord"
    scope = "vip"

    def __init__(self, webhook_url: str, username: str = "Signals") -> None:
        self.url = webhook_url
        self.username = username

    def is_configured(self) -> bool:
        return bool(self.url)

    def publish(self, signal: Signal, content: Content) -> PublishResult:
        title = content.texts.get("discord_title", signal.pair)
        description = content.texts.get("discord_description", "")
        color = 0x16C784 if signal.is_long else 0xEA3943
        if content.is_result:
            won = "✅" in title
            color = 0x16C784 if won else 0xEA3943
        embed = {
            "title": title,
            "description": description[:4000],
            "color": color,
            "footer": {"text": f"{self.username} · {signal.id}"},
        }
        image = content.vip_image
        payload = {"username": self.username, "embeds": [embed]}
        try:
            if image and image.exists():
                embed["image"] = {"url": f"attachment://{image.name}"}
                with image.open("rb") as fh:
                    resp = httpx.post(
                        self.url, timeout=30,
                        data={"payload_json": json.dumps(payload)},
                        files={"files[0]": (image.name, fh, "image/png")},
                    )
            else:
                resp = httpx.post(self.url, timeout=30, json=payload)
            if resp.status_code >= 300:
                return PublishResult(self.name, False, f"HTTP {resp.status_code}: {resp.text[:200]}")
            return PublishResult(self.name, True, f"HTTP {resp.status_code}")
        except Exception as exc:  # noqa: BLE001
            return PublishResult(self.name, False, str(exc))
