# Crypto Channel Agent

Osobný nástroj na obchodovanie kryptomien pomocou **cenových kanálov** na Binance USDⓈ-M Futures.
Aplikácia stiahne trhové dáta, vykreslí tvoje kanály (zadané podľa TradingView) aj automaticky
detegované kanály, sleduje, či sa cena blíži k ich hraniciam, a **AI agent (Claude)** k tomu vypracuje
analýzu s vlastnými tipmi, čo sledovať. Rozhodnutie o obchode ostáva na tebe – aplikácia nič neobchoduje.

> Toto nie je investičné poradenstvo. Výstupy AI sú len druhý názor; vždy si ich over.

## Čo aplikácia robí

| Časť | Popis |
|---|---|
| **Trhové dáta** | Sviečky, 24h ticker, funding rate, open interest, pomer long/short z Binance Futures. Ak je Binance z tvojej siete blokované (HTTP 451), automaticky prepne na OKX perpetual swap (rovnaké kontrakty). |
| **Tvoje kanály** | Kanál zadáš súradnicami bodov tak, ako ich ukazuje TradingView (dvojklik na kresbu → *Súradnice*). Uloží sa, vykreslí sa na grafe a vyhodnotí (pozícia ceny v kanáli, dotyky, prieniky, projekcia). |
| **Auto-detekcia** | Rovnobežný kanál cez pivotové vrcholy/dná, regresný kanál (±2σ), horizontálne zóny podpory/rezistencie, EMA 20/50/200, RSI, ATR, objem. |
| **TradingView webhook** | Alerty z TradingView (dotyk čiary, prieraz…) sa ukladajú, zobrazia v UI, pošlú na Telegram a sú podkladom pre AI. Voliteľne spustia automatickú AI analýzu. |
| **AI agent** | Claude dostane snapshot všetkých dát (viac časových rámcov), tvoje kanály, alerty, poznámky a prípadné screenshoty z TradingView. Vráti štruktúrovaný report: bias, hodnotenie kanálov, kľúčové úrovne, scenáre (spúšťač / vstup / invalidácia / ciele / pravdepodobnosť), **vlastné tipy čo sledovať**, riziká a čo v podkladoch chýbalo. |
| **Monitor** | Na pozadí kontroluje aktívne kanály a upozorní (UI + Telegram), keď sa cena priblíži k okraju alebo kanál prerazí. |
| **História** | Všetky analýzy sa ukladajú v SQLite, dajú sa spätne pozrieť. |

## Inštalácia

Potrebuješ Python 3.11+.

```bash
git clone <tento repozitár>
cd Lubo585
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # a doplň ANTHROPIC_API_KEY (+ voliteľne Telegram)
python run.py
```

Otvor <http://127.0.0.1:8000>.

Kľúč k Claude API získaš na <https://platform.claude.com>. Bez kľúča funguje všetko okrem samotnej AI analýzy
(graf, kanály, monitor, webhook, náhľad podkladov).

## Ako pracovať s aplikáciou

1. **Watchlist** – v hlavičke vyber symbol alebo pridaj nový (napr. `LINKUSDT`).
2. **Kanály** – záložka *Kanály*. V TradingView dvojklikni na svoj kanál → *Súradnice* a opíš:
   - horná čiara: bod 1 a bod 2 (čas + cena),
   - spodná čiara: jeden bod (urobí sa rovnobežka) alebo dva body.

   Časy zadávaj v **UTC** (prepni si graf v TradingView na UTC, alebo prepočítaj). Tlačidlo
   *Z auto-detekcie* predvyplní formulár z kanála, ktorý našla aplikácia – stačí doladiť.
3. **AI analýza** – vyber časové rámce (odporúčané `1d, 4h, 1h`), napíš poznámky (čo vidíš v TradingView,
   o aký obchod uvažuješ), prípadne prilož screenshoty grafu, a klikni *Analyzovať*. *Náhľad podkladov*
   ukáže presne, čo agent dostane.
4. **Alerty** – záložka *Alerty* zobrazuje alerty z TradingView aj z monitora. *Skontrolovať kanály teraz*
   spustí kontrolu ručne.

## Prepojenie s TradingView (webhook)

1. V TradingView vytvor alert (napr. „cena pretne hornú čiaru kanála“).
2. V záložke *Notifications* zapni **Webhook URL**: `https://TVOJA-ADRESA/api/tradingview/webhook`.
3. Do *Message* vlož JSON (secret musí sedieť s `TV_WEBHOOK_SECRET` v `.env`):

```json
{"secret":"zmen-ma","symbol":"{{ticker}}","exchange":"{{exchange}}","timeframe":"{{interval}}","price":{{close}},"time":"{{timenow}}","event":"horny_okraj","message":"Cena sa dotkla horného okraja kanála"}
```

Symboly ako `BTCUSDT.P` alebo `BINANCE:BTCUSDT.P` a intervaly ako `240` / `D` sa prevedú automaticky.
Funguje aj čistý text v tvare `symbol=BTCUSDT.P tf=240 event=dotyk price=65000`.

TradingView posiela webhooky len na verejnú adresu (port 80/443). Ak aplikácia beží doma:

```bash
cloudflared tunnel --url http://localhost:8000     # alebo: ngrok http 8000
```

a do TradingView daj vygenerovanú HTTPS adresu. Alternatívne aplikáciu nasaď na malý VPS.

S `AUTO_ANALYZE_ON_TV_ALERT=true` agent po každom alerte sám urobí analýzu a zhrnutie pošle na Telegram.

## Telegram (voliteľné)

1. Vytvor bota cez `@BotFather`, skopíruj token do `TELEGRAM_BOT_TOKEN`.
2. Napíš botovi správu a zisti `chat_id` (napr. `https://api.telegram.org/bot<TOKEN>/getUpdates`) → `TELEGRAM_CHAT_ID`.

## Konfigurácia (`.env`)

| Premenná | Význam |
|---|---|
| `ANTHROPIC_API_KEY` | kľúč k Claude API |
| `AI_MODEL` | model (predvolene `claude-opus-5-5`) |
| `AI_EFFORT` | hĺbka uvažovania `low`–`max` (predvolene `high`) |
| `MARKET_PROVIDER` | `auto` / `binance` / `okx` |
| `TV_WEBHOOK_SECRET` | tajný reťazec pre webhook |
| `MONITOR_INTERVAL_SECONDS` | interval monitora kanálov, `0` = vypnúť |
| `MONITOR_PROXIMITY_PCT` | ako blízko (v %) k okraju kanála vzniká upozornenie |
| `AUTO_ANALYZE_ON_TV_ALERT` | automatická AI analýza po alerte z TradingView |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | notifikácie |

## API (pre vlastné skripty)

| Metóda a cesta | Popis |
|---|---|
| `GET /api/chart?symbol=BTCUSDT&interval=4h` | sviečky, EMA, kanály (tvoje + auto) s vyhodnotením, úrovne |
| `GET /api/market/{symbol}` | ticker, funding, OI, long/short |
| `GET/POST/PUT/DELETE /api/channels` | správa kanálov |
| `POST /api/tradingview/webhook` | príjem alertov |
| `GET /api/alerts` | zoznam alertov |
| `POST /api/snapshot` | podklady pre AI (bez volania modelu) |
| `POST /api/analyze` | AI analýza (`{"symbol","timeframes","notes","images"}`) |
| `GET /api/analyses` | história analýz |
| `POST /api/monitor/run` | okamžitá kontrola kanálov |

## Štruktúra

```
app/
  main.py         FastAPI, REST API, monitor kanálov, auto-analýza
  market_data.py  Binance Futures + OKX záloha
  channels.py     detekcia a vyhodnotenie kanálov (časovo definované čiary)
  indicators.py   EMA, RSI, ATR, objem
  analysis.py     snapshot symbolu naprieč časovými rámcami
  ai_agent.py     volanie Claude (štruktúrovaný JSON výstup, prompt caching, fallback)
  tradingview.py  parsovanie webhookov, normalizácia symbolov/intervalov
  storage.py      SQLite
  notify.py       Telegram
static/           webové rozhranie (lightweight-charts)
tests/            pytest
```

Testy: `pytest -q`.
