# SignalFlow

Automatizácia pre crypto signálovú skupinu:

```
kamarát (Telegram) ──► ty schváliš v bote ──► platená Telegram skupina
                                          ├─► Discord (webhook)
                                          ├─► Instagram – obrázok 1080×1080 + story 1080×1920
                                          ├─► X – status (teaser, max 280 znakov)
                                          └─► Facebook – status + obrázok
```

Každý tip sa rozparsuje na štruktúrovaný signál (pár, smer, vstup, ciele, SL, páka),
z neho sa vygenerujú obrázky a texty pre všetky kanály, a po tvojom kliknutí
v Telegrame sa všetko publikuje. Neskôr jedným príkazom (`/tp <id> 2`) zverejníš
výsledok obchodu s vypočítaným ziskom – najlepší kontent na sociálne siete.

## Čo to vie

- **Príjem tipov** dvoma spôsobmi:
  - `forward` – kamarátovu správu jednoducho prepošleš botovi (žiadne ďalšie nastavovanie),
  - `userbot` – tvoj účet počúva priamo v chate s kamarátom a bot reaguje sám.
- **Parser** zvládne bežné formáty (`BTC/USDT LONG`, `Entry 62000-62500`, `TP1/TP2`, `SL`,
  `10x`, slovenské `vstup/cieľ/páka`, inline `Entry 1 | TP 2 | SL 3`). Ak formát nerozpozná
  a máš nastavený `ANTHROPIC_API_KEY`, použije AI parser.
- **Schvaľovanie** – bot ti pošle náhľad (obrázok + text) s tlačidlami
  *Publikovať všetko / Len VIP / Len sociálne siete / Zamietnuť*.
- **Obrázky** – VIP verzia s číslami, verejná *teaser* verzia (čísla skryté, CTA do VIP),
  story formát, a obrázok výsledku s veľkým `+44.18 %`.
- **Texty** – šablóny pre každý kanál v `config.yaml`, upraviteľné bez zásahu do kódu.
- **Publikovanie** – Telegram Bot API, Discord webhook, Instagram/X/Facebook cez
  [Postiz](https://postiz.com) (rieši OAuth k Meta a X).
- **Výsledky** – `/tp <id> 2` alebo `/sl <id>` zverejní výsledok so ziskom
  (vypočítaný zo vstupu, ceny a páky) do všetkých kanálov.
- Všetko sa ukladá aj lokálne do `out/<id>/` (PNG + TXT), takže obsah vieš použiť aj ručne.

## Inštalácia

```bash
pip install -r requirements.txt
cp .env.example .env        # doplň kľúče (pozri nižšie)
# voliteľné – IG/X/FB:
npm install -g postiz && postiz auth:login && postiz integrations:list
```

### Kľúče v `.env`

| Premenná | Kde ju získaš |
|---|---|
| `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` | https://my.telegram.org → API development tools |
| `TELEGRAM_BOT_TOKEN` | @BotFather → `/newbot`. Bota pridaj ako **admina** do VIP skupiny. |
| `OWNER_CHAT_ID` | tvoje user ID (@userinfobot) – sem chodia náhľady na schválenie |
| `VIP_TELEGRAM_CHAT_ID` | ID platenej skupiny (napr. `-1001234567890`) alebo `@username` kanála |
| `SOURCE_MODE`, `SOURCE_CHAT` | `forward` (default) alebo `userbot` + @username kamaráta |
| `DISCORD_WEBHOOK_URL` | Discord → Server settings → Integrations → Webhooks |
| `POSTIZ_*` | `postiz integrations:list` vypíše ID pripojených účtov IG/X/FB |
| `ANTHROPIC_API_KEY` | voliteľné, AI fallback parsera |

## Použitie

```bash
# vyskúšaj bez publikovania – vygeneruje obrázky a texty do out/<id>/
python -m signalflow preview "BTC/USDT LONG 10x
Entry: 62000-62500
TP1: 63500
TP2: 65000
SL: 60800"

# spusti bota (príjem + schvaľovanie + publikovanie)
python -m signalflow run

# ručné publikovanie uloženého signálu
python -m signalflow list
python -m signalflow publish 20261006-2255 --scope vip      # all | vip | public

# výsledok obchodu (TP2 zasiahnuté / stop loss)
python -m signalflow result 20261006-2255 tp 2
python -m signalflow result 20261006-2255 sl
python -m signalflow result 20261006-2255 tp 1 --price 63800 --dry-run
```

### Príkazy v Telegram bote

| Správa | Čo sa stane |
|---|---|
| preposlaná správa s tipom | vygeneruje náhľad + tlačidlá na schválenie |
| `/tp <id> <n> [cena]` | zverejní „TPn HIT“ so ziskom |
| `/sl <id> [cena]` | zverejní stop loss |
| `/list` | posledné signály a ich stav |

ID stačí zadať ako prefix (napr. `/tp 20261006 2`).

## Konfigurácia (`config.yaml`)

- `brand`, `vip_link`, `hashtags` – vkladajú sa do textov a obrázkov.
- `require_approval: true` – bez tvojho kliknutia sa nič nepublikuje.
- `public_mode: teaser | full` – či IG/X/FB dostanú celý signál alebo len upútavku.
- `channels` – zapni/vypni jednotlivé kanály.
- `templates` – texty pre každý kanál; dostupné polia sú popísané v hlavičke súboru.
- `image` – farby, fonty a disclaimer na obrázkoch.

## Docker (VPS)

```bash
docker compose up -d --build
docker compose logs -f
```

Pri prvom spustení v režime `userbot` si Telethon vypýta telefón a kód –
spusti najprv `docker compose run --rm signalflow python -m signalflow run`
interaktívne, session sa uloží do `data/`.

## Testy

```bash
python -m pytest -q
```

## Štruktúra

```
signalflow/
  parser.py      regex + AI parser správ na Signal
  models.py      Signal dataclass, výpočet PnL a R:R
  templates.py   texty pre kanály zo šablón v config.yaml
  renderer.py    PNG obrázky (Pillow): signál, teaser, story, výsledok
  pipeline.py    ingest -> obsah -> publikovanie, ukladanie stavu
  bot.py         Telegram bot (schvaľovanie, /tp, /sl, userbot režim)
  publishers/    telegram.py, discord.py, postiz.py (IG/X/FB)
  cli.py         python -m signalflow ...
```

> Upozornenie: zdieľanie tradingových signálov za poplatok môže v niektorých
> jurisdikciách podliehať regulácii. Disclaimer na obrázkoch a v textoch si uprav podľa potreby.
