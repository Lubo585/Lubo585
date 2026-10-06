"""Generovanie obrázkov (IG post 1080x1080, IG story 1080x1920, výsledok)."""
from __future__ import annotations

import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .config import Settings
from .models import Signal, fmt_price
from .templates import signal_fields


class Fonts:
    def __init__(self, bold_path: str | None, regular_path: str | None) -> None:
        self.bold_path = bold_path if bold_path and Path(bold_path).exists() else None
        self.regular_path = regular_path if regular_path and Path(regular_path).exists() else None

    def bold(self, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
        return self._load(self.bold_path, size)

    def regular(self, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
        return self._load(self.regular_path, size)

    @staticmethod
    def _load(path: str | None, size: int):
        if path:
            return ImageFont.truetype(path, size)
        try:
            return ImageFont.load_default(size=size)
        except TypeError:  # staršie Pillow
            return ImageFont.load_default()


def _hex(color: str) -> tuple[int, int, int]:
    color = color.lstrip("#")
    return tuple(int(color[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def _scale(size: tuple[int, int]) -> float:
    """Mierka prvkov: 1.0 pre 1080x1080, väčšia pre vysoké (story) formáty."""
    width, height = size
    base = width / 1080
    return base * 1.3 if height > width * 1.3 else base


def _gradient(size: tuple[int, int], top: str, bottom: str) -> Image.Image:
    w, h = size
    base = Image.new("RGB", size, _hex(top))
    t, b = _hex(top), _hex(bottom)
    px = base.load()
    for y in range(h):
        k = y / max(h - 1, 1)
        row = tuple(int(t[i] + (b[i] - t[i]) * k) for i in range(3))
        for x in range(w):
            px[x, y] = row
    return base


class Renderer:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        img = settings.image
        self.fonts = Fonts(img.get("font_bold"), img.get("font_regular"))
        self.c_bg = img.get("background", "#0B0F19")
        self.c_card = img.get("card", "#131A2B")
        self.c_text = img.get("text", "#FFFFFF")
        self.c_muted = img.get("muted", "#8A94A6")
        self.c_long = img.get("long", "#16C784")
        self.c_short = img.get("short", "#EA3943")
        self.disclaimer = img.get("disclaimer", "Not financial advice.")

    # ------------------------------------------------------------------ utils
    def _accent(self, signal: Signal) -> str:
        return self.c_long if signal.is_long else self.c_short

    def _header(self, draw: ImageDraw.ImageDraw, width: int, fields: dict, y: int, scale: float) -> None:
        f_small = self.fonts.regular(int(30 * scale))
        draw.text((60, y), fields["brand"].upper(), font=f_small, fill=self.c_muted)
        date = fields["date"]
        tw = draw.textlength(date, font=f_small)
        draw.text((width - 60 - tw, y), date, font=f_small, fill=self.c_muted)

    def _footer(self, draw: ImageDraw.ImageDraw, width: int, height: int, scale: float) -> None:
        f_small = self.fonts.regular(int(22 * scale))
        tw = draw.textlength(self.disclaimer, font=f_small)
        draw.text(((width - tw) / 2, height - 60 - int(22 * scale)), self.disclaimer,
                  font=f_small, fill=self.c_muted)

    def _badge(self, draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str,
               color: str, size: int) -> int:
        text = re.sub(r"[^\w\s/:+.%-]", "", text).strip()  # DejaVu nemá emoji
        font = self.fonts.bold(size)
        pad_x, pad_y = int(size * 0.7), int(size * 0.35)
        tw = draw.textlength(text, font=font)
        x, y = xy
        draw.rounded_rectangle((x, y, x + tw + 2 * pad_x, y + size + 2 * pad_y),
                               radius=int(size * 0.5), fill=color)
        draw.text((x + pad_x, y + pad_y - size * 0.1), text, font=font, fill="#FFFFFF")
        return int(tw + 2 * pad_x)

    def _row(self, draw: ImageDraw.ImageDraw, x: int, y: int, width: int, label: str,
             value: str, scale: float, value_color: str | None = None) -> int:
        f_label = self.fonts.regular(int(30 * scale))
        f_value = self.fonts.bold(int(40 * scale))
        h = int(110 * scale)
        draw.rounded_rectangle((x, y, x + width, y + h), radius=int(18 * scale), fill=self.c_card)
        draw.text((x + 30, y + int(14 * scale)), label.upper(), font=f_label, fill=self.c_muted)
        draw.text((x + 30, y + int(50 * scale)), value, font=f_value,
                  fill=value_color or self.c_text)
        return y + h + int(18 * scale)

    # --------------------------------------------------------------- signál
    def render_signal(self, signal: Signal, size: tuple[int, int] = (1080, 1080),
                      teaser: bool = False, out: Path | None = None) -> Image.Image:
        width, height = size
        scale = _scale(size)
        img = _gradient(size, self.c_bg, "#0F1526")
        draw = ImageDraw.Draw(img)
        fields = signal_fields(signal, self.settings)
        accent = self._accent(signal)

        # ľavý farebný pásik
        draw.rectangle((0, 0, int(14 * scale), height), fill=accent)

        top = int(70 * scale) if height <= width else int(height * 0.2)
        self._header(draw, width, fields, top, scale)

        y = top + int(90 * scale)
        f_pair = self.fonts.bold(int(96 * scale))
        draw.text((60, y), signal.pair, font=f_pair, fill=self.c_text)
        y += int(120 * scale)
        bw = self._badge(draw, (60, y), signal.direction, accent, int(40 * scale))
        if signal.leverage:
            self._badge(draw, (60 + bw + 20, y), f"{signal.leverage}x", self.c_card, int(40 * scale))
        y += int(110 * scale)

        lock = "VIP ONLY"
        x, w = 60, width - 120
        y = self._row(draw, x, y, w, "Vstup", lock if teaser else fields["entries"], scale)
        if signal.targets:
            tp_text = lock if teaser else "  ·  ".join(
                f"TP{i} {fmt_price(t)}" for i, t in enumerate(signal.targets, 1)
            )
            f_check = self.fonts.bold(int(40 * scale))
            if not teaser and draw.textlength(tp_text, font=f_check) > w - 60:
                tp_text = "  ·  ".join(fmt_price(t) for t in signal.targets)
            y = self._row(draw, x, y, w, "Ciele", tp_text, scale, value_color=self.c_long)
        y = self._row(draw, x, y, w, "Stop loss", lock if teaser else fields["stop_loss"], scale,
                      value_color=self.c_short)
        if not teaser and (signal.timeframe or fields["rr"] != "—"):
            half = (w - 18) // 2
            y2 = y
            if signal.timeframe:
                self._row(draw, x, y, half, "Timeframe", signal.timeframe, scale)
            if fields["rr"] != "—":
                self._row(draw, x + half + 18, y2, half, "Risk / Reward", fields["rr"], scale)
            y = y2 + int(128 * scale)

        if teaser:
            f_cta = self.fonts.bold(int(34 * scale))
            cta = "Celý signál vo VIP skupine"
            draw.text((60, y + int(10 * scale)), cta, font=f_cta, fill=accent)

        self._footer(draw, width, height, scale)
        if out:
            out.parent.mkdir(parents=True, exist_ok=True)
            img.save(out, "PNG")
        return img

    # ------------------------------------------------------------- výsledok
    def render_result(self, signal: Signal, label: str, pnl_text: str, won: bool,
                      size: tuple[int, int] = (1080, 1080), out: Path | None = None) -> Image.Image:
        width, height = size
        scale = _scale(size)
        img = _gradient(size, self.c_bg, "#0F1526")
        draw = ImageDraw.Draw(img)
        fields = signal_fields(signal, self.settings)
        color = self.c_long if won else self.c_short
        draw.rectangle((0, 0, int(14 * scale), height), fill=color)

        top = int(70 * scale) if height <= width else int(height * 0.24)
        self._header(draw, width, fields, top, scale)

        y = top + int(120 * scale)
        f_pair = self.fonts.bold(int(72 * scale))
        draw.text((60, y), f"{signal.pair}  {signal.direction}", font=f_pair, fill=self.c_text)
        y += int(110 * scale)
        self._badge(draw, (60, y), label, color, int(40 * scale))
        y += int(170 * scale)

        big = int(170 * scale)
        f_big = self.fonts.bold(big)
        while draw.textlength(pnl_text, font=f_big) > width - 120 and big > 60:
            big -= 10
            f_big = self.fonts.bold(big)
        draw.text((60, y), pnl_text, font=f_big, fill=color)
        y += int(big * 1.3)
        f_sub = self.fonts.regular(int(34 * scale))
        sub = f"Vstup {fields['entries']}" + (f"  ·  Páka {fields['leverage']}" if signal.leverage else "")
        draw.text((60, y), sub, font=f_sub, fill=self.c_muted)

        self._footer(draw, width, height, scale)
        if out:
            out.parent.mkdir(parents=True, exist_ok=True)
            img.save(out, "PNG")
        return img

    # ------------------------------------------------------------- balíček
    def render_all(self, signal: Signal, out_dir: Path) -> dict[str, Path]:
        teaser = self.settings.public_mode != "full"
        paths = {
            "vip_square": out_dir / "signal_vip.png",
            "public_square": out_dir / "signal_public.png",
            "public_story": out_dir / "signal_story.png",
        }
        self.render_signal(signal, (1080, 1080), teaser=False, out=paths["vip_square"])
        self.render_signal(signal, (1080, 1080), teaser=teaser, out=paths["public_square"])
        self.render_signal(signal, (1080, 1920), teaser=teaser, out=paths["public_story"])
        return paths
