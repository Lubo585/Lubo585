#!/usr/bin/env python3
"""Generuje podstránky zo spoločnej hlavičky/pätičky index.html. Spustite po úprave hlavičky alebo pätičky."""
import re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
idx = (ROOT / 'index.html').read_text(encoding='utf-8')
head_common = re.search(r'<link rel="manifest".*?<link rel="stylesheet" href="/css/style.css">', idx, re.S).group(0)
age_gate = re.search(r'<!-- Brána 18\+ -->.*?</div>\n</div>\n', idx, re.S).group(0)
header = re.search(r'<!-- Hlavička -->.*?</header>\n', idx, re.S).group(0)
footer = re.search(r'<!-- Pätička -->.*?</nav>\n', idx, re.S).group(0)

def page(path, title, desc, body, canonical=None, extra_head='', robots='index, follow', current=None):
    h = header
    h = h.replace(' aria-current="page"', '')
    if current:
        h = h.replace(f'<a href="{current}">', f'<a href="{current}" aria-current="page">', 1)
    url = 'https://nazovportalu.sk/' + (canonical or path)
    html = f'''<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="{robots}, max-image-preview:large">
<meta name="rating" content="adult">
<meta name="rating" content="RTA-5042-1996-1400-1577-RTA">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="sk" href="{url}">
{head_common}
<meta property="og:type" content="website">
<meta property="og:locale" content="sk_SK">
<meta property="og:site_name" content="NazovPortalu">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="https://nazovportalu.sk/img/og-cover.jpg">
<meta name="twitter:card" content="summary_large_image">
{extra_head}
</head>
<body>
<a class="skip" href="#obsah">Preskočiť na obsah</a>

{age_gate}
{h}
<main id="obsah">
{body}
</main>

{footer}
<script src="/js/app.js" defer></script>
</body>
</html>
'''
    (ROOT / path).write_text(html, encoding='utf-8')
    print('OK', path)

def crumbs(items):
    ld = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": "https://nazovportalu.sk" + u} for i, (n, u) in enumerate(items)]}
    import json
    html = '<nav class="wrap breadcrumbs" aria-label="Navigácia"><ol>' + ''.join(
        f'<li><a href="{u}">{n}</a></li>' if i < len(items) - 1 else f'<li aria-current="page">{n}</li>' for i, (n, u) in enumerate(items)) + '</ol></nav>'
    return html, '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>'

def listing(name, place, price, tags, badges):
    b = ''.join(f'<span class="badge {c}">{t}</span>' for c, t in badges)
    return f'''<a class="listing" href="/inzerat.html" data-city="bratislava" data-cat="spolocnicky" data-tags="{tags}">
  <div class="photo"><div class="blur"></div>♥<div class="badges">{b}</div></div>
  <div class="body"><div class="title"><span>{name}</span><span class="price">{price}</span></div>
  <div class="meta"><span>{place}</span></div></div></a>'''

# ---------------- MESTO (šablóna lokálnej landing page) ----------------
bc, bcld = crumbs([("Domov", "/"), ("Mestá", "/mesto.html"), ("Bratislava", "/bratislava/")])
cards = ''.join([
    listing("Nikol, 26", "Ružinov", "od 80 €", "overene online", [("ok", "✓ Overené"), ("online", "Online")]),
    listing("Viktória, 24", "Petržalka", "od 100 €", "overene video", [("ok", "✓ Overené"), ("", "▶ Video")]),
    listing("Privát Rose", "Staré Mesto", "od 70 €", "overene recenzie", [("ok", "✓ Overené"), ("gold", "TOP")]),
    listing("Alexandra, 33", "Nové Mesto", "od 90 €", "overene", [("ok", "✓ Overené")]),
    listing("Masáže Lotus", "Karlova Ves", "od 50 €", "overene online", [("ok", "✓ Overené"), ("online", "Online")]),
    listing("Ema, 22", "Dúbravka", "od 80 €", "nove", [("", "Nové")]),
    listing("Kristína, 28", "Rača", "od 70 €", "overene recenzie", [("ok", "✓ Overené")]),
    listing("Privát Velvet", "Ružinov", "od 60 €", "overene video", [("ok", "✓ Overené"), ("", "▶ Video")]),
])
page('mesto.html',
     'Spoločníčky a priváty Bratislava – overené inzeráty | NazovPortalu',
     'Overené erotické inzeráty v Bratislave: spoločníčky, priváty a masáže v Ružinove, Petržalke, Starom Meste a ďalších častiach. Reálne fotky, hodnotenia, diskrétny kontakt.',
     f'''{bc}
<section class="hero" style="padding-top:16px">
  <div class="wrap">
    <h1>Spoločníčky a priváty v Bratislave</h1>
    <p class="lead">Overené inzeráty z celej Bratislavy. Filtrujte podľa mestskej časti, služby alebo dostupnosti teraz.</p>
    <div class="chips" aria-label="Mestské časti">
      <a class="chip is-active" href="/bratislava/">Celá Bratislava</a><a class="chip" href="/bratislava/ruzinov/">Ružinov</a><a class="chip" href="/bratislava/petrzalka/">Petržalka</a>
      <a class="chip" href="/bratislava/stare-mesto/">Staré Mesto</a><a class="chip" href="/bratislava/nove-mesto/">Nové Mesto</a><a class="chip" href="/bratislava/dubravka/">Dúbravka</a><a class="chip" href="/bratislava/raca/">Rača</a>
    </div>
    <div class="chips" style="margin-top:10px" aria-label="Rýchle filtre">
      <a class="chip" href="#" data-filter="overene">✓ Len overené</a><a class="chip" href="#" data-filter="online">● Teraz online</a><a class="chip" href="#" data-filter="video">▶ S videom</a><a class="chip" href="#" data-filter="recenzie">★ S recenziami</a>
    </div>
  </div>
</section>
<section class="section"><div class="wrap">
  <div class="section-head"><div><h2>Overené inzeráty – Bratislava</h2><p class="muted" id="result-count">8 inzerátov</p></div></div>
  <div class="grid">{cards}</div>
</div></section>
<section class="section"><div class="wrap seo-text">
  <h2>Erotická inzercia Bratislava – čo nájdete na NazovPortalu</h2>
  <p>Bratislava je najväčší trh erotickej inzercie na Slovensku. Na NazovPortalu nájdete <strong>spoločníčky, priváty, erotické masáže a online služby</strong> vo všetkých mestských častiach, od Starého Mesta a Ružinova po Petržalku a Dúbravku. Každý profil s odznakom Overené prešiel video overením fotiek.</p>
  <h3>Ďalšie mestá v okolí</h3>
  <p><a href="/trnava/">Trnava</a> · <a href="/senec/">Senec</a> · <a href="/pezinok/">Pezinok</a> · <a href="/malacky/">Malacky</a> · <a href="/nitra/">Nitra</a></p>
  <p class="notice">Táto stránka je šablóna lokálnej landing page. Vytvorte ju pre každé mesto a mestskú časť (URL napr. <code>/kosice/</code>, <code>/bratislava/ruzinov/</code>) s vlastným H1, popisom a textom. Lokálne stránky prinášajú najviac organickej návštevnosti.</p>
</div></section>''',
     canonical='bratislava/', extra_head=bcld, current='/mesto.html')

# ---------------- DETAIL INZERÁTU ----------------
bc, bcld = crumbs([("Domov", "/"), ("Bratislava", "/bratislava/"), ("Spoločníčky", "/bratislava/spolocnicky/"), ("Nikol, 26", "/inzerat/nikol-26-bratislava-12345")])
page('inzerat.html',
     'Nikol, 26 – overená spoločníčka Bratislava Ružinov | NazovPortalu',
     'Nikol, 26 rokov, Bratislava Ružinov. Overený profil s videom, 41 hodnotení, priemer 4,9. Diskrétny privát, cena od 80 €. Kontakt po kliknutí.',
     f'''{bc}
<section class="section" style="padding-top:16px"><div class="wrap detail">
  <div>
    <div class="gallery" aria-label="Fotogaléria">
      <div class="photo"></div><div class="photo"></div><div class="photo"></div><div class="photo"></div>
    </div>
    <p class="muted" style="font-size:.85rem;margin-top:8px">Fotky overené videom 28. 9. 2026 · Vodoznak NazovPortalu · Tvár rozmazaná na želanie inzerentky</p>
    <div class="panel" style="margin-top:16px">
      <h2 style="font-size:1.2rem">O mne</h2>
      <p>Som Nikol, príjemná a diskrétna spoločníčka z Ružinova. Ponúkam príjemne strávený čas v čistom a diskrétnom priváte s vlastným parkovaním. Vážim si slušnosť a dochvíľnosť. Volajte, prosím, len v uvedených hodinách.</p>
      <h3>Služby</h3>
      <div class="chips"><span class="chip">Klasika</span><span class="chip">Erotická masáž</span><span class="chip">Spoločníčka na večer</span><span class="chip">Sprcha spolu</span></div>
      <h3 style="margin-top:14px">Cenník</h3>
      <dl class="kv"><dt>30 minút</dt><dd>80 €</dd><dt>60 minút</dt><dd>130 €</dd><dt>2 hodiny</dt><dd>240 €</dd><dt>Celá noc</dt><dd>dohodou</dd></dl>
    </div>
    <div class="panel" style="margin-top:16px" id="hodnotenia">
      <h2 style="font-size:1.2rem">Hodnotenia <span class="stars">★★★★★</span> <span class="muted">4,9 z 41</span></h2>
      <p class="notice">Hodnotiť môžu len používatelia, ktorí inzerentku kontaktovali cez portál. Recenzie moderujeme.</p>
      <div class="review"><strong>Peter K. · overený kontakt · 2. 10. 2026</strong><span class="stars">★★★★★</span><p class="muted">Presne ako na fotkách, čisto, príjemná komunikácia. Odporúčam.</p></div>
      <div class="review"><strong>Martin · overený kontakt · 20. 9. 2026</strong><span class="stars">★★★★☆</span><p class="muted">Veľmi milá, trochu meškala. Inak super.</p></div>
    </div>
  </div>
  <aside>
    <div class="panel">
      <div class="badges" style="position:static;margin-bottom:10px"><span class="badge ok">✓ Overené videom</span><span class="badge online">Teraz online</span><span class="badge gold">TOP</span></div>
      <h1 style="font-size:1.6rem">Nikol, 26</h1>
      <p class="muted">Bratislava – Ružinov · Privát · Slovenka</p>
      <dl class="kv" style="margin:12px 0"><dt>Vek</dt><dd>26</dd><dt>Výška</dt><dd>168 cm</dd><dt>Postava</dt><dd>štíhla</dd><dt>Jazyky</dt><dd>SK, EN</dd><dt>Dostupnosť</dt><dd>Po–So 10:00–22:00</dd><dt>Prijíma</dt><dd>hotovosť, karta</dd></dl>
      <a class="btn btn-primary btn-block" href="#" data-phone="+421 900 000 000">Zobraziť telefónne číslo</a>
      <div style="height:8px"></div>
      <a class="btn btn-ghost btn-block" href="#sprava">Napísať správu (diskrétne)</a>
      <div style="height:8px"></div>
      <a class="btn btn-ghost btn-block btn-sm" href="/bezpecnost.html#nahlasenie">⚑ Nahlásiť inzerát</a>
      <p class="muted" style="font-size:.8rem;margin:12px 0 0">Pri kontakte uveďte, že voláte z NazovPortalu. Nikdy neposielajte platbu vopred.</p>
    </div>
    <div class="panel" style="margin-top:12px">
      <h3>Bezpečnostné tipy</h3>
      <ul class="muted" style="padding-left:1.1em;margin:0;font-size:.9rem"><li>Overený profil = fotky zodpovedajú osobe.</li><li>Neplaťte zálohy cez prevod ani kupóny.</li><li>Podozrenie na nátlak nahláste, riešime do 24 h.</li></ul>
    </div>
  </aside>
</div></section>
<section class="section"><div class="wrap">
  <div class="section-head"><div><h2>Podobné inzeráty v Bratislave</h2></div><a href="/bratislava/">Všetky v Bratislave →</a></div>
  <div class="grid">{''.join([listing("Viktória, 24", "Petržalka", "od 100 €", "", [("ok", "✓ Overené")]), listing("Alexandra, 33", "Nové Mesto", "od 90 €", "", [("ok", "✓ Overené")]), listing("Privát Rose", "Staré Mesto", "od 70 €", "", [("ok", "✓ Overené"), ("gold", "TOP")]), listing("Kristína, 28", "Rača", "od 70 €", "", [("ok", "✓ Overené")])])}</div>
</div></section>''',
     canonical='inzerat/nikol-26-bratislava-12345', extra_head=bcld + '''
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Service","name":"Nikol, 26 – spoločníčka Bratislava","areaServed":{"@type":"City","name":"Bratislava"},"provider":{"@type":"Person","name":"Nikol"},"offers":{"@type":"Offer","priceCurrency":"EUR","price":"80","availability":"https://schema.org/InStock"},"aggregateRating":{"@type":"AggregateRating","ratingValue":"4.9","reviewCount":"41"}}
</script>''')

# ---------------- PRIDAŤ INZERÁT ----------------
bc, bcld = crumbs([("Domov", "/"), ("Pridať inzerát", "/pridat-inzerat.html")])
page('pridat-inzerat.html',
     'Pridať inzerát zdarma – erotická inzercia s overením | NazovPortalu',
     'Pridajte erotický inzerát zdarma za 10 minút. Overenie videom, rozmazanie tváre, skryté číslo, topovanie kartou bez SMS. Len pre osoby 18+.',
     f'''{bc}
<section class="section" style="padding-top:16px"><div class="wrap detail">
  <div>
    <h1>Pridať inzerát zdarma</h1>
    <p class="lead muted">Základný inzerát je bez poplatku. Vyplnenie trvá približne 10 minút, overenie schválime zvyčajne do 2 hodín.</p>
    <form class="panel" action="/api/inzerat" method="post" style="display:grid;gap:14px" novalidate>
      <h2 style="font-size:1.1rem">1. Účet a overenie veku</h2>
      <div class="field"><label for="i-email">E-mail *</label><input id="i-email" name="email" type="email" required autocomplete="email"></div>
      <div class="field"><label for="i-tel">Telefón * <span class="muted">(zobrazí sa až po kliknutí klienta)</span></label><input id="i-tel" name="tel" type="tel" required autocomplete="tel" placeholder="+421"></div>
      <div class="field"><label for="i-dob">Dátum narodenia *</label><input id="i-dob" name="dob" type="date" required></div>
      <h2 style="font-size:1.1rem;margin-top:8px">2. Inzerát</h2>
      <div class="field"><label for="i-title">Nadpis * <span class="muted">(napr. „Nikol, 26 – Ružinov“)</span></label><input id="i-title" name="title" maxlength="60" required></div>
      <div class="field"><label for="i-cat">Kategória *</label><select id="i-cat" name="kategoria" required><option value="">Vyberte…</option><option>Spoločníčky</option><option>Priváty</option><option>Erotické masáže</option><option>Páry</option><option>Muži</option><option>Trans</option><option>Online &amp; videohovory</option></select></div>
      <div class="field"><label for="i-city">Mesto a časť *</label><input id="i-city" name="mesto" placeholder="Bratislava – Ružinov" required></div>
      <div class="field"><label for="i-text">Text inzerátu *</label><textarea id="i-text" name="text" rows="6" required style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--card-2);color:var(--text);font:inherit"></textarea></div>
      <div class="field"><label for="i-price">Cena od (€)</label><input id="i-price" name="cena" type="number" min="0" step="5"></div>
      <div class="field"><label for="i-photos">Fotky (max. 10, JPG/PNG/WebP)</label><input id="i-photos" name="fotky" type="file" accept="image/*" multiple>
        <label style="display:flex;gap:8px;align-items:center;font-size:.9rem"><input type="checkbox" name="blur" style="width:auto;min-height:auto"> Automaticky rozmazať tvár na všetkých fotkách</label></div>
      <h2 style="font-size:1.1rem;margin-top:8px">3. Súhlasy</h2>
      <label style="display:flex;gap:8px;font-size:.9rem"><input type="checkbox" required style="width:auto;min-height:auto;margin-top:4px"> Potvrdzujem, že mám viac ako 18 rokov, inzerát zadávam dobrovoľne a sám/sama za seba.</label>
      <label style="display:flex;gap:8px;font-size:.9rem"><input type="checkbox" required style="width:auto;min-height:auto;margin-top:4px"> Súhlasím s <a href="/podmienky.html">podmienkami používania</a> a beriem na vedomie <a href="/ochrana-sukromia.html">informácie o spracúvaní osobných údajov</a>.</label>
      <label style="display:flex;gap:8px;font-size:.9rem"><input type="checkbox" required style="width:auto;min-height:auto;margin-top:4px"> Som si vedomý/á, že po odoslaní nasleduje video overenie (selfie s kódom), bez ktorého inzerát nezíska odznak Overené.</label>
      <button class="btn btn-primary btn-block" type="submit">Pokračovať na overenie</button>
      <p class="muted" style="font-size:.8rem;margin:0">Ukážkový formulár. Odoslanie vyžaduje backend (napr. Supabase, Laravel, Node).</p>
    </form>
  </div>
  <aside>
    <div class="panel"><h3>Prečo inzerovať u nás</h3>
      <ul class="muted" style="padding-left:1.1em;margin:0"><li>Základný inzerát zdarma, bez skrytých poplatkov</li><li>Odznak Overené zvyšuje počet kontaktov v priemere 3×</li><li>Rozmazanie tváre a skryté číslo</li><li>Topovanie kartou od 5 € / deň, bez SMS</li><li>Štatistiky zobrazení a kontaktov v účte</li></ul></div>
    <div class="panel" style="margin-top:12px"><h3>Cenník topovania</h3>
      <dl class="kv"><dt>Základný inzerát</dt><dd>0 €</dd><dt>TOP na 1 deň</dt><dd>5 €</dd><dt>TOP na 7 dní</dt><dd>25 €</dd><dt>TOP na 30 dní</dt><dd>79 €</dd><dt>Zvýraznenie</dt><dd>+2 € / deň</dd></dl>
      <a class="btn btn-ghost btn-sm" href="/cennik.html" style="margin-top:10px">Celý cenník</a></div>
    <div class="panel notice" style="margin-top:12px">Inzeráty osôb mladších ako 18 rokov, inzeráty zadané pod nátlakom alebo tretími osobami bez súhlasu sú zakázané a oznamujeme ich polícii.</div>
  </aside>
</div></section>''', extra_head=bcld, current='/pridat-inzerat.html')

# ---------------- CENNÍK ----------------
bc, bcld = crumbs([("Domov", "/"), ("Cenník", "/cennik.html")])
page('cennik.html', 'Cenník topovania inzerátov – platba kartou bez SMS | NazovPortalu',
     'Transparentný cenník NazovPortalu: základný inzerát zdarma, TOP od 5 € za deň, zvýraznenie, overenie zdarma. Platba kartou, Apple Pay, Google Pay.',
     f'''{bc}<section class="section" style="padding-top:16px"><div class="wrap prose">
<h1>Cenník</h1><p class="lead muted">Žiadne SMS, žiadne automatické obnovy. Platíte len to, čo si vyberiete.</p>
<div class="features">
  <div class="feature"><h3>Základný inzerát</h3><p style="font-size:2rem;color:var(--text);font-weight:800">0 €</p><p>Neobmedzený čas, 10 fotiek, overenie videom, štatistiky.</p></div>
  <div class="feature"><h3>TOP inzerát</h3><p style="font-size:2rem;color:var(--text);font-weight:800">5 € / deň</p><p>Prvé miesta vo výpise mesta a kategórie. 7 dní 25 €, 30 dní 79 €.</p></div>
  <div class="feature"><h3>Zvýraznenie</h3><p style="font-size:2rem;color:var(--text);font-weight:800">2 € / deň</p><p>Farebný rámik a odznak vo výpise. Kombinovateľné s TOP.</p></div>
</div>
<h2>Spôsoby platby</h2><p>Platobná karta, Apple Pay, Google Pay, bankový prevod. Daňový doklad vystavujeme automaticky do účtu.</p>
<p class="notice">Ceny sú ukážkové. Pre erotickú inzerciu je nutný poskytovateľ platieb pre „high-risk“ segment (napr. CCBill, Segpay, Verotel, Paxum). Bežné brány ako Stripe alebo GoPay tento obsah zväčša odmietajú.</p>
</div></section>''', extra_head=bcld)

# ---------------- BEZPEČNOSŤ ----------------
bc, bcld = crumbs([("Domov", "/"), ("Bezpečnosť", "/bezpecnost.html")])
page('bezpecnost.html', 'Bezpečnosť a pravidlá – overovanie, nahlasovanie, pomoc obetiam | NazovPortalu',
     'Ako NazovPortalu chráni inzerentky aj klientov: video overenie profilov, moderácia, nahlásenie do 24 hodín, nulová tolerancia nátlaku a obchodovania s ľuďmi. Kontakty na pomoc.',
     f'''{bc}<section class="section" style="padding-top:16px"><div class="wrap prose">
<h1>Bezpečnosť a pravidlá portálu</h1>
<p class="lead muted">Bezpečný portál je dobrý portál. Tu je, čo robíme a čo očakávame od používateľov.</p>
<h2 id="overenie">Overovanie profilov</h2>
<p>Každá inzerentka môže získať odznak <strong>Overené</strong> nahratím krátkeho videa alebo selfie s jednorazovým kódom. Porovnáme ho s fotkami v inzeráte. Overenie opakujeme každých 90 dní a pri každej výmene fotiek. Neoverené inzeráty sú označené a radia sa nižšie.</p>
<h2 id="pravidla">Čo je zakázané</h2>
<ul><li>Inzercia osôb mladších ako 18 rokov, v akejkoľvek podobe.</li><li>Inzeráty zadané tretími osobami bez súhlasu inzerovanej osoby, nátlak, kupliarstvo, obchodovanie s ľuďmi.</li><li>Cudzie alebo upravené fotky, falošné recenzie, duplicitné inzeráty.</li><li>Ponuka nechránených praktík, drog a nelegálneho tovaru.</li><li>Zverejňovanie osobných údajov klientov alebo inzerentiek bez súhlasu.</li></ul>
<h2 id="nahlasenie">Nahlásenie inzerátu</h2>
<p>Pri každom inzeráte je tlačidlo <strong>Nahlásiť</strong>. Hlásenie vybavíme do 24 hodín, závažné podozrenia (neplnoletosť, nátlak) okamžite a oznamujeme ich Policajnému zboru SR. Anonymné hlásenia prijímame aj na <a href="mailto:bezpecnost@nazovportalu.sk">bezpecnost@nazovportalu.sk</a>.</p>
<h2 id="pomoc">Pomoc, ak ste v ohrození</h2>
<ul><li><strong>Národná linka pomoci obetiam obchodovania s ľuďmi:</strong> 0800 800 818 (bezplatne, nonstop)</li><li><strong>Polícia:</strong> 158 / 112</li><li><strong>Linka pomoci ženám zažívajúcim násilie:</strong> 0800 212 212</li></ul>
<h2 id="tipy">Tipy pre klientov</h2>
<ul><li>Uprednostňujte overené profily s recenziami.</li><li>Nikdy neposielajte platbu vopred prevodom, kupónom ani kryptomenou.</li><li>Pri kontakte uveďte, že voláte z NazovPortalu.</li><li>Rešpektujte hranice a dohodnuté podmienky.</li></ul>
<h2 id="tipy-inzerentky">Tipy pre inzerentky</h2>
<ul><li>Používajte skryté číslo a kontakt cez formulár.</li><li>Rozmažte tvár, fotky dostanú vodoznak automaticky.</li><li>Informujte blízku osobu o stretnutí a mieste.</li><li>Nahláste klienta, ktorý porušuje pravidlá, zablokujeme ho na celom portáli.</li></ul>
</div></section>''', extra_head=bcld, current='/bezpecnost.html')

# ---------------- PRÁVNE ----------------
legal_note = '<p class="notice">Vzorový text na doplnenie. Pred spustením nechajte skontrolovať advokátom a doplňte identifikačné údaje prevádzkovateľa.</p>'
bc, bcld = crumbs([("Domov", "/"), ("Podmienky používania", "/podmienky.html")])
page('podmienky.html', 'Podmienky používania | NazovPortalu', 'Všeobecné podmienky používania inzertného portálu NazovPortalu: pravidlá inzercie, zodpovednosť, platby, ukončenie účtu.',
     f'''{bc}<section class="section" style="padding-top:16px"><div class="wrap prose">
<h1>Podmienky používania</h1>{legal_note}
<h2>1. Prevádzkovateľ</h2><p>[Obchodné meno], IČO [●], so sídlom [●], zapísaný v [●] (ďalej „prevádzkovateľ“), prevádzkuje inzertný portál NazovPortalu dostupný na nazovportalu.sk (ďalej „portál“).</p>
<h2>2. Povaha služby</h2><p>Portál je výlučne inzertnou platformou. Prevádzkovateľ nie je poskytovateľom, sprostredkovateľom ani organizátorom inzerovaných služieb, nezúčastňuje sa na dohode medzi inzerentom a záujemcom a nemá z nej prospech okrem poplatkov za zverejnenie a zvýraznenie inzerátu.</p>
<h2>3. Podmienky používania</h2><ul><li>Portál môžu používať len osoby staršie ako 18 rokov.</li><li>Inzerent zadáva inzerát výlučne sám za seba, dobrovoľne a zodpovedá za pravdivosť obsahu a za práva k nahratým fotografiám.</li><li>Zakázaný obsah je vymedzený v sekcii <a href="/bezpecnost.html">Bezpečnosť a pravidlá</a>.</li></ul>
<h2>4. Moderácia a odstraňovanie obsahu</h2><p>Prevádzkovateľ je oprávnený inzerát pred zverejnením skontrolovať, odmietnuť alebo kedykoľvek odstrániť, ak porušuje podmienky alebo právne predpisy. Postup nahlasovania a vybavovania oznámení zodpovedá nariadeniu (EÚ) 2022/2065 o digitálnych službách (DSA).</p>
<h2>5. Platené služby</h2><p>Platené služby (topovanie, zvýraznenie) sú spoplatnené podľa <a href="/cennik.html">cenníka</a>. Spotrebiteľ berie na vedomie, že so začatím poskytovania digitálnej služby pred uplynutím lehoty na odstúpenie stráca právo na odstúpenie od zmluvy.</p>
<h2>6. Zodpovednosť</h2><p>Prevádzkovateľ nezodpovedá za obsah inzerátov ani za konanie používateľov. Zodpovednosť za obsah nesie inzerent.</p>
<h2>7. Ukončenie účtu</h2><p>Používateľ môže účet kedykoľvek zrušiť. Prevádzkovateľ môže účet zablokovať pri porušení podmienok.</p>
<h2>8. Záverečné ustanovenia</h2><p>Právne vzťahy sa riadia právom Slovenskej republiky. Platné od [dátum].</p>
</div></section>''', extra_head=bcld)

bc, bcld = crumbs([("Domov", "/"), ("Ochrana súkromia", "/ochrana-sukromia.html")])
page('ochrana-sukromia.html', 'Ochrana osobných údajov (GDPR) | NazovPortalu', 'Informácie o spracúvaní osobných údajov na portáli NazovPortalu podľa GDPR: účely, právny základ, doba uchovávania, práva dotknutých osôb.',
     f'''{bc}<section class="section" style="padding-top:16px"><div class="wrap prose">
<h1>Ochrana osobných údajov</h1>{legal_note}
<h2>Prevádzkovateľ</h2><p>[Obchodné meno], IČO [●], [adresa], e-mail: gdpr@nazovportalu.sk.</p>
<h2>Aké údaje spracúvame a prečo</h2>
<ul><li><strong>Registračné údaje</strong> (e-mail, telefón, dátum narodenia): plnenie zmluvy, overenie veku. Právny základ čl. 6 ods. 1 písm. b) a c) GDPR.</li>
<li><strong>Overovacie video/selfie</strong>: ochrana pred falošnými profilmi a neplnoletými osobami. Oprávnený záujem (čl. 6 ods. 1 písm. f)); uchovávame v šifrovanej podobe najviac 12 mesiacov po ukončení účtu.</li>
<li><strong>Obsah inzerátu a fotografie</strong>: zverejnenie na žiadosť inzerenta (čl. 6 ods. 1 písm. b)). Údaje o sexuálnom živote sú osobitnou kategóriou; spracúvame ich na základe výslovného súhlasu (čl. 9 ods. 2 písm. a)) a zjavného zverejnenia dotknutou osobou (čl. 9 ods. 2 písm. e)).</li>
<li><strong>Platobné údaje</strong>: spracúva platobná brána, my uchovávame len doklad o transakcii (10 rokov podľa zákona o účtovníctve).</li>
<li><strong>Technické logy</strong>: bezpečnosť, 90 dní.</li></ul>
<h2>Príjemcovia</h2><p>Hosting [●], platobná brána [●], e-mailová služba [●]. Údaje neprenášame mimo EÚ/EHP bez primeraných záruk.</p>
<h2>Vaše práva</h2><p>Prístup, oprava, výmaz, obmedzenie, prenosnosť, námietka, odvolanie súhlasu, sťažnosť na Úrad na ochranu osobných údajov SR (dataprotection.gov.sk). Žiadosti: gdpr@nazovportalu.sk.</p>
<h2>Cookies</h2><p>Používame len nevyhnutné cookies (prihlásenie, potvrdenie veku). Analytické cookies len so súhlasom. Podrobnosti v <a href="/cookies.html">zásadách cookies</a>.</p>
</div></section>''', extra_head=bcld)

bc, bcld = crumbs([("Domov", "/"), ("Cookies", "/cookies.html")])
page('cookies.html', 'Zásady používania cookies | NazovPortalu', 'Aké cookies používa NazovPortalu a ako ich spravovať. Len nevyhnutné cookies bez súhlasu, analytické len so súhlasom.',
     f'''{bc}<section class="section" style="padding-top:16px"><div class="wrap prose">
<h1>Zásady cookies</h1>{legal_note}
<h2>Nevyhnutné</h2><p><code>np_age_ok</code> (potvrdenie veku, localStorage), relačné cookie prihlásenia. Bez nich portál nefunguje; nevyžadujú súhlas.</p>
<h2>Analytické (len so súhlasom)</h2><p>Odporúčame self-hosted analytiku bez cookies (napr. Plausible, Matomo bez cookies), ktorá súhlas nevyžaduje a zároveň nezdieľa dáta o návštevníkoch s tretími stranami.</p>
<h2>Marketingové</h2><p>Nepoužívame. Nezdieľame údaje o návšteve s reklamnými sieťami.</p>
</div></section>''', extra_head=bcld, robots='noindex, follow')

bc, bcld = crumbs([("Domov", "/"), ("Kontakt", "/kontakt.html")])
page('kontakt.html', 'Kontakt a podpora | NazovPortalu', 'Kontaktujte podporu NazovPortalu: pomoc s inzerátom, platby, nahlásenie obsahu, GDPR žiadosti, médiá.',
     f'''{bc}<section class="section" style="padding-top:16px"><div class="wrap prose">
<h1>Kontakt</h1>
<div class="features">
  <div class="feature"><h3>Podpora</h3><p><a href="mailto:podpora@nazovportalu.sk">podpora@nazovportalu.sk</a><br>Odpovedáme do 24 hodín, 7 dní v týždni.</p></div>
  <div class="feature"><h3>Bezpečnosť a nahlásenia</h3><p><a href="mailto:bezpecnost@nazovportalu.sk">bezpecnost@nazovportalu.sk</a><br>Prednostné vybavenie, aj anonymne.</p></div>
  <div class="feature"><h3>Ochrana údajov</h3><p><a href="mailto:gdpr@nazovportalu.sk">gdpr@nazovportalu.sk</a><br>Žiadosti podľa GDPR a DSA.</p></div>
</div>
<h2>Prevádzkovateľ</h2><p>[Obchodné meno] · IČO [●] · [adresa] · zodpovedná osoba podľa DSA: [●]</p>
</div></section>''', extra_head=bcld, current='/kontakt.html')

page('404.html', 'Stránka sa nenašla | NazovPortalu', 'Požadovaná stránka neexistuje alebo bol inzerát odstránený.',
     '''<section class="section" style="text-align:center;padding-top:60px"><div class="wrap">
<h1>Inzerát alebo stránka sa nenašla</h1><p class="lead muted">Inzerát mohol byť odstránený alebo adresa obsahuje chybu.</p>
<p><a class="btn btn-primary" href="/">Späť na inzeráty</a> &nbsp; <a class="btn btn-ghost" href="/mesto.html">Prehliadať podľa mesta</a></p>
</div></section>''', robots='noindex, follow')
