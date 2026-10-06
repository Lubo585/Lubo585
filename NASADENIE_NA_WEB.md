# Nasadenie na web – postup krok za krokom (Render)

Výsledok: aplikácia beží na adrese `https://app.vasafirma.sk`, s HTTPS, zálohami a trvalými dátami; prihlásia sa všetci, komu pošlete pozvánku, z počítača aj z mobilu.

Cena: Render plán Starter približne 7 USD mesačne + disk 2 GB (0,50 USD). Nepotrebujete vlastný server ani technika.

## Krok 1 – Účet na Render (5 min)
1. Otvorte <https://render.com> → **Get Started** → **Sign in with GitHub** (povoľte prístup k repozitáru `Lubo585/Lubo585`).
2. V účte doplňte platobnú kartu (Account → Billing). Bez karty nejde platený plán s diskom.

## Krok 2 – Nasadenie aplikácie (10 min)
1. Otvorte: **<https://render.com/deploy?repo=https://github.com/Lubo585/Lubo585/tree/claude/determined-mccarthy-7jfplr>**
2. Render načíta `render.yaml` (služba `sxworkforce`, plán Starter, disk 2 GB, región Frankfurt).
3. Pri položke **ADMIN_PASSWORD** zadajte silné heslo pre účet `admin` (zapíšte si ho). SESSION_SECRET sa vygeneruje sám.
4. Kliknite **Apply**. Zostavenie trvá 3–5 minút. Keď je stav *Live*, otvorte adresu `https://sxworkforce.onrender.com` (presný tvar vidíte hore v Render) a prihláste sa `admin` + vaše heslo.

## Krok 3 – Vlastná doména (15 min + čakanie na DNS)
1. V Render: služba `sxworkforce` → **Settings → Custom Domains → Add** → `app.vasafirma.sk`.
2. Render ukáže, aký **CNAME** záznam treba vytvoriť (napr. `app` → `sxworkforce.onrender.com`).
3. U správcu domény (Websupport, Wedos, Forpsi…) v DNS pridajte tento CNAME záznam. Prejaví sa do 1 hodiny, Render potom sám vystaví HTTPS certifikát.
4. V aplikácii: Nastavenia → Firma → **Verejná adresa aplikácie** = `https://app.vasafirma.sk` (používa sa v odkazoch v e-mailoch a pozvánkach).

## Krok 4 – Prvé nastavenie (1 hod)
Podľa OSTRA_PREVADZKA.md, body 2–4: firma a IBAN, Nemecko/compliance, pozvánky pre kolegov, import klientov a pracovníkov z CSV, SMTP, bankový e-mail.

## Krok 5 – Zálohy (10 min)
- Aplikácia zálohuje sama každú noc do priečinka `data/backups` na disku Render.
- Raz týždenne si stiahnite zálohu mimo Render: Nastavenia → Zálohy a verzia → **Stiahnuť aktuálnu databázu** (plus prílohy: Render → Shell → `tar czf /tmp/data.tgz data` a stiahnuť, alebo ich nechajte len na disku Render, ktorý má vlastné snapshoty).
- Render disk má denné snímky (Disk → Snapshots), z ktorých sa dá obnoviť.

## Aktualizácia aplikácie
Keď vydám novú verziu (nový commit na GitHube), v Render kliknite **Manual Deploy → Deploy latest commit**. Pred migráciou sa automaticky vytvorí záloha databázy, dáta ostávajú. (`autoDeploy` je vypnutý, aby sa aplikácia neaktualizovala sama bez vášho vedomia; dá sa zapnúť v Settings.)

## Mobil
Na telefóne otvorte `https://app.vasafirma.sk` v Chrome/Safari → menu → **Pridať na plochu**. Aplikácia sa správa ako natívna (ikona, celá obrazovka). App Store / Google Play podľa `mobile/README.md`, ak to budete chcieť neskôr.

## Ak niečo nejde
- Stav *Deploy failed*: otvorte Logs v Render a pošlite mi posledných 30 riadkov.
- Stránka 502 hneď po nasadení: počkajte minútu, služba štartuje.
- Zabudnuté heslo admin: Render → Environment → zmeňte ADMIN_PASSWORD, to však platí len pre prvé spustenie; pri existujúcej databáze použite „Zabudnuté heslo“ (vyžaduje SMTP) alebo mi napíšte.

## Alternatíva: vlastný server
Ak chcete mať dáta na vlastnom serveri v SR/EÚ (VPS za ~5 €/mes.), postup je v DEPLOY.md (Docker + Caddy, tri príkazy). Vyžaduje prácu v termináli cez SSH.
