# Nasadenie firemnej aplikácie na internet

## 1. Server
Stačí malý VPS (napr. 2 vCPU, 2 GB RAM, 40 GB disk; Hetzner, Websupport, DigitalOcean…) s Ubuntu 22.04+ a nainštalovaným Dockerom:
```bash
curl -fsSL https://get.docker.com | sh
```

## 2. Doména
V DNS vytvorte A záznam, napr. `app.vasafirma.sk` → IP servera. Caddy si certifikát HTTPS vybaví sám (Let's Encrypt).

## 3. Inštalácia
```bash
git clone <adresa-repozitára> /opt/agentura && cd /opt/agentura
cp .env.example .env
nano .env        # DOMAIN=app.vasafirma.sk, SESSION_SECRET=$(openssl rand -hex 32), ADMIN_PASSWORD=silné-heslo
docker compose up -d
```
Aplikácia beží na `https://app.vasafirma.sk`. Prihláste sa ako `admin` s heslom z `.env`, v Nastavenia → Používatelia pozvite kolegov (každý dostane odkaz, nastaví si vlastné heslo) a v Nastavenia → Firma vyplňte verejnú adresu aplikácie (pre odkazy v e-mailoch).

## 4. Aktualizácia na novú verziu
```bash
cd /opt/agentura && git pull && docker compose up -d --build
```
Pri štarte novej verzie sa **automaticky vytvorí záloha databázy** (`data/backups/app-before-vX-…db`) a aplikujú sa migrácie, ktoré iba pridávajú tabuľky a stĺpce. Existujúce dáta sa nikdy nemažú. Ak by bolo treba vrátiť sa späť: zastavte aplikáciu, skopírujte zálohu na `data/app.db` a spustite predchádzajúcu verziu.

## 5. Zálohy
- Nočná záloha databázy o 2:30 do `data/backups` (posledných 30), ručne v Nastavenia → Zálohy.
- Odporúčame zálohovať aj mimo servera: `scripts-backup.sh /cesta/k/ulozisku` z cronu, alebo synchronizovať priečinok `data/` (databáza, zálohy, prílohy) na cloudové úložisko.

## 6. Beh bez Dockeru (alternatíva)
```bash
npm ci --omit=dev
NODE_ENV=production COOKIE_SECURE=1 SESSION_SECRET=... PORT=3000 node --no-warnings=ExperimentalWarning server.js
```
Pred aplikáciu dajte nginx alebo Caddy s HTTPS. Pre automatický štart použite systemd:
```
[Unit]
Description=Agentura app
After=network.target
[Service]
WorkingDirectory=/opt/agentura
EnvironmentFile=/opt/agentura/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node --no-warnings=ExperimentalWarning server.js
Restart=always
User=www-data
[Install]
WantedBy=multi-user.target
```

## 7. Bezpečnosť
- Prihlásenie je uložené v databáze (prežije reštart), cookies sú HttpOnly, SameSite a pri HTTPS Secure.
- Zmeny (POST) sú prijímané iba z vlastnej stránky (ochrana proti CSRF).
- Roly: Administrátor, Kancelária, Dispečer, Účtovníctvo, Pracovník (iba vlastný portál).
- Heslá sú hashované (scrypt). Heslá k SMTP, IMAP a AI kľúč sú v databáze: chráňte prístup k serveru a zálohám.
- Odporúčame firewall (povoliť iba 22, 80, 443) a automatické bezpečnostné aktualizácie OS.

## 8. Kontrola
`https://app.vasafirma.sk/health` vracia verziu aplikácie a schémy databázy.
