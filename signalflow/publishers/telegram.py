"""Publikovanie do platenej Telegram skupiny cez Bot API (bot musí byť admin)."""
from __future__ import annotations

import httpx

from ..models import Signal
from .base import Content, Publisher, PublishResult

CAPTION_LIMIT = 1024


class TelegramPublisher(Publisher):
    name = "telegram_vip"
    scope = "vip"

    def __init__(self, bot_token: str, chat_id: str) -> None:
        self.token = bot_token
        self.chat_id = chat_id
        self.api = f"https://api.telegram.org/bot{bot_token}"

    def is_configured(self) -> bool:
        return bool(self.token and self.chat_id)

    def _post(self, method: str, **kwargs) -> dict:
        resp = httpx.post(f"{self.api}/{method}", timeout=30, **kwargs)
        data = resp.json()
        if not data.get("ok"):
            raise RuntimeError(f"Telegram {method}: {data.get('description', resp.text)}")
        return data["result"]

    def publish(self, signal: Signal, content: Content) -> PublishResult:
        text = content.texts.get("telegram_vip", "")
        image = content.vip_image
        try:
            if image and image.exists():
                caption = text if len(text) <= CAPTION_LIMIT else ""
                with image.open("rb") as fh:
                    msg = self._post(
                        "sendPhoto",
                        data={"chat_id": self.chat_id, "caption": caption, "parse_mode": "HTML"},
                        files={"photo": (image.name, fh, "image/png")},
                    )
                if not caption:
                    msg = self._post("sendMessage", json={
                        "chat_id": self.chat_id, "text": text, "parse_mode": "HTML",
                    })
            else:
                msg = self._post("sendMessage", json={
                    "chat_id": self.chat_id, "text": text, "parse_mode": "HTML",
                })
            return PublishResult(self.name, True, f"message_id={msg.get('message_id')}")
        except Exception as exc:  # noqa: BLE001
            return PublishResult(self.name, False, str(exc))
