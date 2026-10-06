"""Voliteľné Telegram notifikácie."""
from __future__ import annotations

import logging

import httpx

from .config import settings

log = logging.getLogger(__name__)


async def telegram(text: str) -> bool:
    if not (settings.telegram_bot_token and settings.telegram_chat_id):
        return False
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(url, json={"chat_id": settings.telegram_chat_id, "text": text[:4000]})
            return r.status_code == 200
    except httpx.HTTPError as e:
        log.warning("Telegram: %s", e)
        return False
