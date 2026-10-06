from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from ..models import Signal


@dataclass
class Content:
    """Všetko, čo sa k jednému signálu (alebo výsledku) publikuje."""
    texts: dict[str, str]
    images: dict[str, Path] = field(default_factory=dict)
    is_result: bool = False
    meta: dict[str, str] = field(default_factory=dict)

    @property
    def vip_image(self) -> Path | None:
        return self.images.get("vip_square") or self.images.get("result_square")

    @property
    def public_image(self) -> Path | None:
        return self.images.get("public_square") or self.images.get("result_square")

    @property
    def story_image(self) -> Path | None:
        return self.images.get("public_story") or self.images.get("result_story")


@dataclass
class PublishResult:
    channel: str
    ok: bool
    detail: str = ""


class Publisher:
    name = "base"
    scope = "vip"  # "vip" (plný signál) alebo "public" (IG/X/FB)

    def is_configured(self) -> bool:
        return True

    def publish(self, signal: Signal, content: Content) -> PublishResult:
        raise NotImplementedError
