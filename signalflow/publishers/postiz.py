"""Publikovanie na Instagram / X / Facebook cez Postiz CLI (npm i -g postiz).

Postiz rieši OAuth k Meta a X za nás. Obrázok sa musí najprv nahrať cez
`postiz upload`, až potom sa použije v príspevku.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from ..models import Signal
from .base import Content, Publisher, PublishResult


class PostizPublisher(Publisher):
    scope = "public"

    def __init__(self, platform: str, integration_id: str, api_key: str = "",
                 cli: str = "postiz", delay_minutes: int = 1) -> None:
        self.platform = platform              # instagram | x | facebook
        self.name = platform
        self.integration_id = integration_id
        self.api_key = api_key
        self.cli = cli
        self.delay_minutes = delay_minutes

    def is_configured(self) -> bool:
        return bool(self.integration_id) and shutil.which(self.cli) is not None

    def _run(self, *args: str) -> str:
        env = dict(os.environ)
        if self.api_key:
            env["POSTIZ_API_KEY"] = self.api_key
        proc = subprocess.run([self.cli, *args], capture_output=True, text=True, env=env, timeout=120)
        if proc.returncode != 0:
            raise RuntimeError(proc.stderr.strip() or proc.stdout.strip())
        return proc.stdout

    def _upload(self, path: Path) -> str:
        out = self._run("upload", str(path))
        data = json.loads(out[out.index("{"):])
        return data["path"]

    def publish(self, signal: Signal, content: Content) -> PublishResult:
        text = content.texts.get(self.platform, "")
        image = content.story_image if self.platform == "instagram_story" else content.public_image
        try:
            media = self._upload(image) if image and image.exists() else None
            when = (datetime.now(timezone.utc) + timedelta(minutes=self.delay_minutes)).strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            )
            post = {"content": text}
            if media:
                post["image"] = [media]
            settings: dict = {}
            if self.platform == "instagram":
                settings = {"post_type": "post"}
            elif self.platform == "x":
                settings = {"who_can_reply_post": "everyone"}
            payload = {
                "integrations": [self.integration_id],
                "date": when,
                "posts": [{"provider": self.platform, "post": [post], "settings": settings}],
            }
            with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
                json.dump(payload, fh)
                tmp = fh.name
            try:
                out = self._run("posts:create", "--json", tmp)
            finally:
                os.unlink(tmp)
            return PublishResult(self.name, True, out.strip()[:200])
        except Exception as exc:  # noqa: BLE001
            return PublishResult(self.name, False, str(exc))
