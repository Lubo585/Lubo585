"""Telegram bot: príjem tipov (preposlanie), schvaľovanie, výsledky.

Spúšťa sa cez `python -m signalflow run`. Používa Telethon, takže ten istý
proces môže voliteľne bežať aj ako "userbot", ktorý počúva priamo v chate
s kamarátom (SOURCE_MODE=userbot).
"""
from __future__ import annotations

import asyncio
import logging

from telethon import Button, TelegramClient, events

from .config import Settings
from .models import Signal
from .pipeline import Pipeline, format_results
from .publishers import Content

log = logging.getLogger("signalflow.bot")

HELP = (
    "<b>SignalFlow bot</b>\n\n"
    "• Prepošli mi správu s tipom – vygenerujem náhľad a spýtam sa, či publikovať.\n"
    "• /tp &lt;id&gt; &lt;n&gt; [cena] – zverejní TPn hit (napr. <code>/tp 2026 1</code>)\n"
    "• /sl &lt;id&gt; [cena] – zverejní stop loss\n"
    "• /list – posledné signály\n"
    "• /help – táto nápoveda\n\n"
    "ID stačí zadať ako začiatok (prefix)."
)


class SignalBot:
    def __init__(self, settings: Settings, pipeline: Pipeline) -> None:
        self.settings = settings
        self.pipeline = pipeline
        self.owner_id = settings.get_int("OWNER_CHAT_ID")
        api_id = settings.get_int("TELEGRAM_API_ID")
        api_hash = settings.get("TELEGRAM_API_HASH")
        self.bot = TelegramClient(str(settings.data_dir / "bot"), api_id, api_hash)
        self.user: TelegramClient | None = None
        if settings.get("SOURCE_MODE", "forward") == "userbot":
            self.user = TelegramClient(str(settings.data_dir / "user"), api_id, api_hash)
        self.pending: dict[str, Content] = {}

    # ------------------------------------------------------------------ run
    async def start(self) -> None:
        await self.bot.start(bot_token=self.settings.get("TELEGRAM_BOT_TOKEN"))
        self._register_bot_handlers()
        log.info("Bot beží. Owner: %s", self.owner_id)

        if self.user:
            await self.user.start()
            source = self.settings.get("SOURCE_CHAT")
            entity = await self.user.get_entity(int(source) if source.lstrip("-").isdigit() else source)
            self.user.add_event_handler(self._on_source_message, events.NewMessage(chats=entity))
            log.info("Userbot počúva v chate: %s", source)
            await asyncio.gather(self.bot.run_until_disconnected(), self.user.run_until_disconnected())
        else:
            await self.bot.run_until_disconnected()

    # ------------------------------------------------------------- príjem
    async def _on_source_message(self, event: events.NewMessage.Event) -> None:
        text = event.raw_text or ""
        if text.strip():
            await self._handle_incoming(text, source="userbot")

    async def _handle_incoming(self, text: str, source: str) -> None:
        signal = await asyncio.to_thread(self.pipeline.ingest, text, source)
        if not signal:
            await self.bot.send_message(self.owner_id, "ℹ️ Správa nevyzerá ako signál, ignorujem.")
            return
        content = await asyncio.to_thread(self.pipeline.build_content, signal)
        self.pending[signal.id] = content
        if self.settings.require_approval:
            await self._send_preview(signal, content)
        else:
            results = await asyncio.to_thread(self.pipeline.publish, signal, content, "all")
            await self.bot.send_message(self.owner_id, f"🚀 Publikované {signal.id}\n{format_results(results)}")

    async def _send_preview(self, signal: Signal, content: Content) -> None:
        buttons = [
            [Button.inline("✅ Publikovať všetko", f"pub:all:{signal.id}".encode())],
            [Button.inline("🔒 Len VIP (TG + Discord)", f"pub:vip:{signal.id}".encode()),
             Button.inline("📣 Len sociálne siete", f"pub:public:{signal.id}".encode())],
            [Button.inline("❌ Zamietnuť", f"rej:{signal.id}".encode())],
        ]
        caption = (f"<b>Náhľad signálu</b> <code>{signal.id}</code>\n\n"
                   + content.texts["telegram_vip"])
        await self.bot.send_file(self.owner_id, str(content.vip_image), caption=caption[:1024],
                                 parse_mode="html", buttons=buttons)
        if content.public_image:
            await self.bot.send_file(
                self.owner_id, str(content.public_image),
                caption="<b>Verejný obrázok (IG/FB/X)</b>\n\n<b>X:</b>\n" + content.texts["x"],
                parse_mode="html",
            )

    # ------------------------------------------------------------- handlers
    def _register_bot_handlers(self) -> None:
        owner = self.owner_id

        @self.bot.on(events.NewMessage(from_users=owner, pattern=r"^/(start|help)"))
        async def _help(event):
            await event.respond(HELP, parse_mode="html")

        @self.bot.on(events.NewMessage(from_users=owner, pattern=r"^/list"))
        async def _list(event):
            signals = self.pipeline.store.list(limit=10)
            if not signals:
                await event.respond("Zatiaľ žiadne signály.")
                return
            lines = [f"<code>{s.id}</code> {s.pair} {s.direction} – {s.status}" for s in signals]
            await event.respond("\n".join(lines), parse_mode="html")

        @self.bot.on(events.NewMessage(from_users=owner, pattern=r"^/(tp|sl)\b"))
        async def _result(event):
            parts = event.raw_text.split()
            kind = parts[0].lstrip("/").lower()
            if len(parts) < 2:
                await event.respond("Použitie: /tp <id> <n> [cena]  alebo  /sl <id> [cena]")
                return
            signal = self.pipeline.store.load(parts[1])
            if not signal:
                await event.respond("Signál s týmto ID som nenašiel. Pozri /list.")
                return
            index = price = None
            rest = parts[2:]
            if kind == "tp":
                index = int(rest[0]) if rest else 1
                rest = rest[1:]
            if rest:
                price = float(rest[0].replace(",", "."))
            try:
                results = await asyncio.to_thread(self.pipeline.publish_result, signal, kind, index, price)
            except ValueError as exc:
                await event.respond(f"⚠️ {exc}")
                return
            await event.respond(f"📢 Výsledok zverejnený\n{format_results(results)}")

        @self.bot.on(events.NewMessage(from_users=owner, incoming=True))
        async def _incoming(event):
            text = event.raw_text or ""
            if text.startswith("/"):
                return
            if not text.strip():
                return
            await self._handle_incoming(text, source="forward" if event.message.fwd_from else "owner")

        @self.bot.on(events.CallbackQuery(func=lambda e: e.sender_id == owner))
        async def _callback(event):
            data = event.data.decode()
            if data.startswith("rej:"):
                signal_id = data[4:]
                signal = self.pipeline.store.load(signal_id)
                if signal:
                    self.pipeline.reject(signal)
                self.pending.pop(signal_id, None)
                await event.edit(buttons=None)
                await event.answer("Zamietnuté")
                await event.respond(f"❌ Signál {signal_id} zamietnutý.")
                return
            if data.startswith("pub:"):
                _, scope, signal_id = data.split(":", 2)
                signal = self.pipeline.store.load(signal_id)
                if not signal:
                    await event.answer("Signál sa nenašiel", alert=True)
                    return
                content = self.pending.get(signal_id)
                if content is None:
                    content = await asyncio.to_thread(self.pipeline.build_content, signal)
                await event.answer("Publikujem…")
                await event.edit(buttons=None)
                results = await asyncio.to_thread(self.pipeline.publish, signal, content, scope)
                self.pending.pop(signal_id, None)
                await event.respond(f"🚀 Publikované ({scope}) {signal_id}\n{format_results(results)}")


def run_bot(settings: Settings) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    missing = [k for k in ("TELEGRAM_API_ID", "TELEGRAM_API_HASH", "TELEGRAM_BOT_TOKEN", "OWNER_CHAT_ID")
               if not settings.get(k)]
    if missing:
        raise SystemExit(f"V .env chýbajú hodnoty: {', '.join(missing)} (pozri .env.example)")
    pipeline = Pipeline(settings)
    bot = SignalBot(settings, pipeline)
    asyncio.run(bot.start())
