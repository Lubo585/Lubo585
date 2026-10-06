"""AI agent: Claude analyzuje snapshot trhu + podklady z TradingView a vráti štruktúrovaný report."""
from __future__ import annotations

import base64
import json
import logging
import re
from typing import Any

import anthropic

from .config import settings
from .schemas import AnalysisReport

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """Si skúsený analytik krypto derivátov (Binance USDⓈ-M Futures) špecializovaný na obchodovanie
cenových kanálov (channel trading). Pracuješ pre jedného diskrétneho tradera, ktorý si sám kreslí kanály
v TradingView a chce od teba druhý názor a pripomienky, nie pokyny na vstup.

Dostaneš JSON snapshot: ticker, funding, open interest, pomer long/short, pre každý časový rámec indikátory,
používateľom definované kanály (user_channels) s ich vyhodnotením, automaticky detegované kanály
(detected_channels), horizontálne úrovne, posledné sviečky [čas UTC, O, H, L, C, V], alerty z TradingView
a prípadné screenshoty grafu z TradingView + poznámky tradera.

Ako postupuj:
1. Najprv vyhodnoť kanály používateľa – sú stále platné? Rešpektuje ich cena? Kde je cena v kanáli
   (position_pct: 0 = spodok, 100 = vrch)? Ak sa kanál používateľa líši od automaticky detegovaného, povedz to.
2. Spoj informácie naprieč časovými rámcami (vyšší rámec určuje kontext, nižší načasovanie).
3. Zohľadni funding, open interest, long/short pomer a objem ako potvrdenie alebo varovanie (napr. vysoký
   kladný funding + cena pri hornom okraji = riziko long squeeze).
4. Ak sú screenshoty, prečítaj z nich kresby/úrovne, ktoré v JSON nie sú, a uveď, čo si z nich vyčítal.
5. Navrhni scenáre (long/short/neutral) so spúšťačom, zónou vstupu, invalidáciou, cieľmi a odhadom
   pravdepodobnosti. Pravdepodobnosti scenárov nemusia dávať dokopy 100 %.
6. Pridaj vlastné tipy "čo sledovať" (watch_tips) – konkrétne, overiteľné veci (cena, úroveň, čas, metrika),
   nie všeobecné frázy.
7. Buď úprimný ohľadom neistoty; ak dáta chýbajú alebo sú nejednoznačné, napíš to do data_gaps.

Pravidlá výstupu:
- Píš po slovensky, stručne a konkrétne, s číslami (ceny, percentá). Ceny uvádzaj v USDT s rozumným
  zaokrúhlením podľa symbolu.
- Nikdy nepíš, že má trader "určite" vstúpiť. Toto nie je investičné poradenstvo a do disclaimer to uveď.
- Dodrž presne požadovanú JSON schému."""


def _image_block(data_url: str) -> dict[str, Any] | None:
    m = re.match(r"^data:(image/(?:png|jpeg|jpg|webp|gif));base64,(.+)$", data_url, re.S)
    if not m:
        return None
    media = "image/jpeg" if m.group(1) == "image/jpg" else m.group(1)
    data = m.group(2).replace("\n", "").strip()
    try:
        base64.b64decode(data, validate=True)
    except Exception:
        return None
    return {"type": "image", "source": {"type": "base64", "media_type": media, "data": data}}


def build_messages(snapshot: dict[str, Any], notes: str, images: list[str]) -> list[dict[str, Any]]:
    content: list[dict[str, Any]] = []
    for img in images[:6]:
        blk = _image_block(img)
        if blk:
            content.append(blk)
    text = "Snapshot trhu (JSON):\n" + json.dumps(snapshot, ensure_ascii=False, separators=(",", ":"))
    if notes.strip():
        text += "\n\nPoznámky tradera k aktuálnej situácii / k podkladom z TradingView:\n" + notes.strip()
    if content:
        text += f"\n\nPriložených screenshotov z TradingView: {len(content)}."
    text += "\n\nVytvor analýzu podľa inštrukcií a vráť ju v požadovanej JSON schéme."
    content.append({"type": "text", "text": text})
    return [{"role": "user", "content": content}]


class AIAgentError(RuntimeError):
    pass


def analyze(snapshot: dict[str, Any], notes: str = "", images: list[str] | None = None) -> tuple[AnalysisReport, dict[str, Any]]:
    """Synchrónne volanie Claude API. Vracia (report, usage)."""
    if not settings.has_api_key:
        raise AIAgentError(
            "Chýba ANTHROPIC_API_KEY. Vytvor súbor .env podľa .env.example a doplň kľúč z platform.claude.com."
        )
    client = anthropic.Anthropic(max_retries=2, timeout=600.0)
    schema = AnalysisReport.model_json_schema()
    kwargs: dict[str, Any] = dict(
        model=settings.ai_model,
        max_tokens=16000,
        system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
        messages=build_messages(snapshot, notes, images or []),
        output_config={"effort": settings.ai_effort, "format": {"type": "json_schema", "schema": schema}},
    )
    try:
        # Server-side fallback: pri bezpečnostnom odmietnutí sa požiadavka dokončí na záložnom modeli.
        response = client.beta.messages.create(
            betas=["server-side-fallback-2026-07-01"], fallbacks="default", **kwargs
        )
    except anthropic.BadRequestError as e:
        # Staršie modely / platformy bez podpory fallbacks – skús bez nich.
        log.warning("fallbacks neakceptované (%s), opakujem bez nich", e.message)
        try:
            response = client.messages.create(**kwargs)
        except anthropic.APIStatusError as e2:
            raise AIAgentError(f"Claude API {e2.status_code}: {e2.message}") from e2
    except anthropic.AuthenticationError as e:
        raise AIAgentError("Neplatný ANTHROPIC_API_KEY.") from e
    except anthropic.RateLimitError as e:
        raise AIAgentError("Claude API: prekročený limit požiadaviek, skús o chvíľu.") from e
    except anthropic.APIStatusError as e:
        raise AIAgentError(f"Claude API {e.status_code}: {e.message}") from e
    except anthropic.APIConnectionError as e:
        raise AIAgentError(f"Claude API: chyba spojenia ({e}).") from e

    if response.stop_reason == "refusal":
        details = getattr(response, "stop_details", None)
        raise AIAgentError(f"Model požiadavku odmietol ({getattr(details, 'category', None) or 'refusal'}).")
    if response.stop_reason == "max_tokens":
        raise AIAgentError("Odpoveď modelu bola odseknutá (max_tokens). Skús menej časových rámcov.")

    text = next((b.text for b in response.content if b.type == "text"), None)
    if not text:
        raise AIAgentError("Model nevrátil textový výstup.")
    try:
        report = AnalysisReport.model_validate_json(text)
    except Exception as e:
        raise AIAgentError(f"Výstup modelu nezodpovedá schéme: {e}") from e

    u = response.usage
    usage = {
        "model": response.model,
        "input_tokens": u.input_tokens,
        "output_tokens": u.output_tokens,
        "cache_read_input_tokens": getattr(u, "cache_read_input_tokens", None),
        "cache_creation_input_tokens": getattr(u, "cache_creation_input_tokens", None),
    }
    return report, usage
