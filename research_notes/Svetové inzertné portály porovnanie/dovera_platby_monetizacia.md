# Cross-cutting best practices of leading C2C classifieds portals: trust & safety, payments/escrow & shipping, monetization (state 2025–2026)

Baseline for comparison: Bazoš.sk / Bazoš.cz. Note that the "no verification" assumption in the brief is outdated: Bazoš now requires SMS device verification AND a bank-account micropayment (0,01 € on bazos.sk, 1 Kč on bazos.cz), both valid 1 year, before any non-browsing action (details in Q1). Bazoš still has no payments/escrow, no shipping integration, no ratings; monetization is only TOP (topování) in all sections plus paid Jobs/Services sections.

Method note: WebSearch budget for the session was exhausted mid-research; several items below are based on direct fetches of official help/terms pages and dated press; some figures come from secondary guides and are flagged as such. Items I could not verify are listed under Gaps. All EUR conversions are approximate (1 EUR ≈ 25 CZK, ≈ 4.3 PLN, ≈ 11.5 NOK, ≈ 11.3 SEK, ≈ 1.08–1.17 USD depending on date).

---

## Q1. Identity verification: who requires what, and what effect did it have?

### Takeaway
The strongest verification tier is the Nordics (bank identity: Blocket = mandatory BankID for everyone since May 2024; FINN = voluntary BankID badge, one account per BankID). Most big Western portals (Leboncoin, Kleinanzeigen, Marktplaats, Vinted, Wallapop, OLX) rely on phone/e-mail plus KYC at the payment layer (ID scans triggered by the PSP once volume thresholds are crossed), not at sign-up. Nobody publishes a clean "verification reduced fraud by X %" number; the best proxies are Swedish police data (ad fraud still +66 % 2020→2023 nationally, with ~half tied to Facebook, the only big unverified platform) and TSB UK data (60 % of purchase-fraud cases originate on Facebook).

### Cited Findings

**Bazoš (baseline, SK/CZ)**
- bazos.sk terms: before any action other than browsing (posting, sending e-mail, revealing phone) the device must be verified by SMS ("nutné zariadenie … overiť pomocou sms"); device verification valid max 1 year; the verified phone must be linked to a bank account via a non-refundable micropayment of 0,01 € ("pomocou mikroplatby 0,01 €", "Overenie účtu je platné 1 rok"); max 50 ads per user; ads free for 2 months; SMS/micropayment data kept 1 year; payments processed by ComGate Payments a.s.; no data transfer outside EEA — [Bazoš.sk Podmienky](https://www.bazos.sk/podmienky.php)
- bazos.cz terms: same scheme with 1 Kč micropayment ("pomocí mikroplatby 1 Kč", non-refundable, valid 1 year), SMS device verification valid max 1 year, max 50 non-TOP ads per user, max 21 TOPs per ad (7 in Služby) — [Bazoš.cz Podmínky](https://www.bazos.cz/podminky.php)
- The bank-account verification was introduced because bazaar sites "se dlouhodobě potýkají s obrovským množstvím podvodníků"; reader comments (earliest 23 Mar 2026) say the process links bank account + phone + e-mail — [aRecenze.cz discussion](https://www.arecenze.cz/diskuze/bazos-zavadi-overeni-bankovnim-uctem-k-odpovedi-na-inzerat-staci-poslat-1-kc-plati-cely-rok/) (page shows title/intro/comments only; no fraud stats)
- Scale: bazos.sk showed "Inzeráty celkom: 1 031 732" and 45 202 new ads in 24 h on the day fetched (Oct 2026) — [bazos.sk](https://www.bazos.sk/)

**Blocket (SE) – mandatory BankID**
- 20 May 2022: Blocket activated voluntary site-wide BankID verification for buyers and sellers (verified icon on profile); BankID was already required for ads in "vissa kategorier"; Blocket said it would evaluate before making it mandatory — [M3.se, 20 May 2022](https://www.m3.se/article/1829197/tryggare-kop-salj-nar-blocket-infor-bank-id.html)
- 30 May 2024: BankID required for all users who post an ad in any category or use Blocket's messaging; SMS verification option removed. Blocket's customer-security chief Jessica Cervin: "BankID kommer försvåra betydligt för de som försöker använda vår plattform". Earlier she had argued a blanket requirement "skulle stänga ute för många" (people without Swedish personnummer, some elderly) — [Vi Bilägare, 30 May 2024](https://www.vibilagare.se/nyheter/blocket-skarper-kraven-bankid-alla-anvandare)
- Blocket said the stepwise tightening had "gett väldigt positiva resultat" (company's own claim, no figures) — [Skaraborgs Nyheter](https://www.skaraborgsnyheter.se/?p=41383)
- Swedish police: reported annonsbedrägerier rose from 16 264 (2020) to 27 046 (2023), +66 %; nearly half of reported ad frauds are linked to Facebook; police call Facebook Marketplace "en mer osäker och öppen plattform" versus Blocket's BankID and demand Meta introduce verification (Lotta Mauritzson, NOA: "Vi vill att de inför verifiering") — [SVT, 3 Oct 2024](https://www.svt.se/nyheter/lokalt/vasterbotten/annonsbedragerierna-okar-polisen-kraver-att-facebook-agerar-osakert)

**FINN.no (NO) – voluntary BankID badge**
- FINN help centre: verifying with BankID gives the profile a visible symbol; such users are "seen as safer to trade with"; verification "can be required" but most do it voluntarily "as a measure against fraud and misuse"; only one account per BankID — [FINN hjelpesenter: Hvorfor verifisere brukeren min?](https://hjelpesenter.finn.no/hc/no/articles/22642799684754-Hvorfor-verifisere-brukeren-min) and [Hvordan blir jeg en verifisert bruker?](https://hjelpesenter.finn.no/hc/no/articles/22650637283858) (direct fetch returned 403; content from search snippets)

**Kleinanzeigen (DE)**
- Kleinanzeigen itself states "anyone can register on the platform" and that it cannot fully stop phishing attempts; countermeasures are in-chat warnings and police coordination (Pierre Du Bois) — [TECHBOOK, 16 Aug 2023](https://www.techbook.de/shop-pay/shops-marktplaetze/kleinanzeigen-betrug-lka)
- Scale: >32 million monthly visitors, >58 million ads on average; scam victims lost on average 763 € in 2025 (figure cited in Adyen/Kleinanzeigen release) — [Adyen press release, 31 Mar 2026](https://www.adyen.com/de_DE/presse-und-medien/kleinanzeigen)

**OLX (PL) – KYC at the PSP layer**
- Since 24 Oct 2022 OLX/PayU offers full identity verification after a seller's first Przesyłka OLX sale; it becomes mandatory when a single item ≥ 3 000 PLN is sold via Przesyłka OLX, when total sales exceed 30 000 PLN, when several accounts' combined volume exceeds 30 000 PLN, or on suspicion of money laundering; sellers upload an ID scan; processing up to 5 business days; payouts are held until verification completes — [Instalki.pl](https://www.instalki.pl/news/internet/sprzedajesz-na-olx-z-przesylka-olx-bedziesz-musial-wyslac-skan-dowodu/)
- PayU also asked sellers for a 1 zł verification transfer — [Tabletowo](https://www.tabletowo.pl/olx-weryfikacja-danych-platnosci-payu)

**Facebook Marketplace (no verification) – fraud statistics**
- TSB (UK bank), release Nov 2025: purchase-fraud cases +11 % YoY Jan–Sep 2025; average loss £452; purchase scams = 63 % of all bank-transfer fraud cases (52 % in 2024); 60 % of TSB purchase-fraud cases originate on Facebook, 12 % Instagram, 11 % WhatsApp; UK Finance: purchase scams 72 % of all fraud cases, £53m lost in H1 2025 — [TSB release](https://www.tsb.co.uk/news-releases/TSB-warns-of-spike-in-purchase-fraud-ahead-of-festive-shopping-season.html) (summary via search; direct fetch 404)
- TSB 2024: Facebook = 67 % of purchase-fraud cases by volume, 59 % by value; TSB 2023: Marketplace = 73 % of purchase-fraud cases; TSB found "over a third" of Marketplace adverts could be scams — [TSB release](https://www.tsb.co.uk/news-releases/urgent-consumer-warning-as-tsb-finds-over-a-third-of-adverts-on-facebook-marketplace-could-be-scams); [FStech](https://fstech.co.uk/fst/Over_Third_Of_Facebook_Marketplace_Ads_Are_Scams_Warns_TSB.php)

**Mercari (JP)**
- Mercari Japan requires identity verification (本人確認) for any shipping method other than メルカリ便 (its anonymous-delivery service), described as an anti-fraud measure — [Mercari JP help, 配送方法早わかり表](https://help.jp.mercari.com/guide/articles/1080/)

**Germany national fraud context**
- BKA Bundeslagebild Cybercrime 2025: ~334 000–335 000 registered cybercrime cases in 2025; ~two-thirds from abroad/unknown; large dark field — [Bundesregierung summary](https://www.bundesregierung.de/breg-de/aktuelles/bundeslagebild-cybercrime-2025-2430048)

**Czechia/Slovakia national fraud context**
- Czech police: cybercrime in 2022 +100 % vs 2021, >18 500 cases (~1/10 of all crime); ČBA: average loss per internet-fraud victim 161 500 CZK; clients lost almost 2 bn CZK (~80 m €) in total; "reverse ad fraud" (fake buyer sends seller a fake gateway link) named as a top current problem — [ČT24, 13 Feb 2023](https://ct24.ceskatelevize.cz/clanek/domaci/pocet-podvodu-na-internetu-stale-roste-jen-loni-lide-prisli-o-vice-nez-dve-miliardy-10402)
- Czech police H1 2025: online-fraud attacks +12 %, attacks on online payment methods −19,2 % — [policie.gov.cz](https://policie.gov.cz/clanek/kradez-hotovosti-z-uctu.aspx) (via search snippet)
- ESET Czech phishing Q1 2025: phishing via SMS/chat apps >25 % of attacks; "selling goods on online marketplaces" ≈ one-fifth of cases; HTML/Phishing.Agent.GFH (fake forms impersonating carriers) 23 % of detections — [Kurzy.cz / ESET, 3 Jun 2025](https://zpravy.kurzy.cz/814189-cesi-se-nejcasteji-potykaji-s-utoky-na-bankovni-identitu-a-falesnymi-kupujicimi-na-bazarech/)

### Comparison table – verification tiers (as of 2025–2026)

| Portal | Sign-up / posting verification | Bank identity | ID document | Where KYC happens | Source |
|---|---|---|---|---|---|
| Bazoš.sk / .cz | SMS device verification (1 yr) + bank micropayment 0,01 € / 1 Kč (1 yr) | Indirect (bank account ownership) | No | Portal | Bazoš terms (above) |
| Blocket | BankID mandatory for posting + messaging (May 2024) | Yes, mandatory | No (BankID is ID-grade) | Portal | Vi Bilägare |
| FINN.no | BankID voluntary badge, 1 account per BankID | Optional | No | Portal | FINN help |
| Kleinanzeigen | E-mail/phone; open registration | No | Only via PSP for payouts | PSP (OPP→Adyen 2026) | TECHBOOK, Adyen |
| Marktplaats | E-mail; payments via OPP | No | Via OPP onboarding | PSP (OPP) | Marktplaats kopersbescherming |
| OLX.pl | Phone/e-mail; ID scan via PayU at ≥3 000 PLN item or >30 000 PLN volume | No | Yes (threshold-based) | PSP (PayU) | Instalki |
| Vinted | E-mail/phone; DAC7 form (TIN etc.) at 30 sales / 2 000 € | No | Via DAC7/PSP | Portal + PSP | Vinted help 1308 |
| Mercari JP | 本人確認 required unless anonymous メルカリ便 used | No | Yes | Portal | Mercari help |
| Facebook Marketplace | Facebook account only | No | No | – | SVT, TSB |

### Inferences
- The two portals with ID-grade verification (Blocket, FINN) sit in markets with ubiquitous bank-eID; CZ/SK now have Bank iD (CZ) and bank-based eID options, so a Tržko "verified with bank identity" badge (voluntary, FINN-style) is feasible, with a Blocket-style mandatory step as a later escalation once coverage is proven.
- Bazoš's micropayment scheme is a cheap proxy for bank identity (it proves control of a bank account, not a name), and it has not stopped scams: the dominant CZ/SK pattern (fake buyer → fake carrier gateway) targets sellers' card data outside the platform, which no sign-up verification prevents. Only in-platform payments plus message-level warnings address it.
- No portal publishes a causal fraud-reduction figure; police data suggest verification shifts fraud to unverified platforms rather than eliminating it (Sweden: fraud keeps growing nationally while concentrating on Facebook).

### Gaps
- No published before/after fraud statistics for Blocket's 2024 mandatory BankID, FINN's badge, or Bazoš's micropayment (companies only claim "positive results").
- DBA (DK) MitID requirement: found only Danish complaints-board cases of DBA sellers phished via fake DAO/MitID pages ([Finansielle Ankenævn case, Feb 2024](https://www.lovguiden.dk/dokument/finansielle-ankenaevn/06-02-2024-indsigelse-mod-haeftelse-for-8-000-kr-ved-mitid-svindel-i-forbindelse-med-dba-salg)); no source on whether DBA requires MitID.
- Tori (FI), Willhaben, Subito, Wallapop, Gumtree, Carousell, Karrot, Xianyu, OfferUp, Craigslist: no reliable source found on sign-up verification rules (search budget exhausted).
- Kleinanzeigen "Online-Ausweis"/eID verification: no source found; it appears not to exist.
- Effect of verification on listing counts: no source found for any portal.

---

## Q2. Reputation systems: what works and what gets gamed

### Takeaway
Transaction-gated ratings are the norm wherever an integrated payment exists (Vinted, Subito, Mercari, OLX); Karrot's "manner temperature" (starts at 36,5 °C, max 99 °C, moves with post-deal peer ratings) is the most distinctive, but Karrot itself replaced it abroad with a 1 000-point "Karrot Score" because foreign users misread the metaphor. Published evidence on gaming is thin; the only documented structural weakness is that temperature rises faster from buying and giveaways than from honest selling.

### Cited Findings
- Karrot (당근): manner temperature starts at 36,5 ° ("human basal body temperature"), max 99 °; it measures trust and conversation quality; no direct perks but higher score signals trust; rises with good post-transaction ratings (friendliness, manners, quick responses, item condition), fast replies, buying rather than selling ("raises it more"), detailed listings, free giveaways (무료나눔, "raise the score faster than cheap listings"); emoticon changes with score; highest-scoring districts Gangnam-gu, Songpa-gu, Bundang — [GQ Korea, 7 Feb 2024](https://www.gqkorea.co.kr/?p=275782)
- Karrot abroad (UK launch 2019): UX research found global users did not understand the temperature (some thought it was weather; a "30-something" reading was read as neighbours not trusting each other); Karrot replaced it with a 1 000-point "Karrot Score" and an "Expert Karroter" designation — [maily.so newsletter, 29 Jul 2024, citing Aug 2022 case study](https://maily.so/redbusbagman/posts/d5ryk711z1w)
- Subito (TuttoSubito): reviews can be left within 14 days after a transaction; professional sellers must grant a 14-day withdrawal right — [Aranzulla guide](https://www.aranzulla.it/come-funziona-tuttosubito-1294131.html)
- FINN: verified-with-BankID symbol on profile acts as a trust badge ("seen as safer to trade with") — [FINN help](https://hjelpesenter.finn.no/hc/no/articles/22642799684754-Hvorfor-verifisere-brukeren-min)
- Kleinanzeigen PRO (from Feb 2026): dealers can display "Verkaufslabels" (voluntary seller guarantee, fast shipping) and, from PRO Power, message users who saved a listing — [iFun.de](https://www.ifun.de/kleinanzeigen-pro-preiserhoehungen-und-spam-erlaubnis-ab-2026-270959/)
- Bazoš: no rating or reputation system in its terms; only phone/bank verification — [Bazoš.sk Podmienky](https://www.bazos.sk/podmienky.php)

### Inferences
- A rating that can only be left after a paid, shipped transaction (Vinted/Subito/Mercari pattern) is the main defence against fake reviews; portals without payments (Bazoš, Craigslist, Facebook) have no reliable rating signal at all.
- Karrot's experience suggests Tržko should use a plain, transparent score or star rating with explicit response-time/verified badges rather than a metaphorical gauge.

### Gaps
- No primary sources found on gaming/abuse of Karrot's temperature, Vinted ratings, or OLX ratings (search budget exhausted before this topic).
- No source found for response-time badges on Leboncoin/Kleinanzeigen/OLX or for Mercari's rating mechanics.

---

## Q3. Escrow / secure payment: product, money-holder, fees, release, disputes

### Takeaway
Every leading European portal has converged on the same design: buyer pays a protection fee of roughly 0,70 € + 5 % (Vinted, Leboncoin, Subito, Marktplaats-style), seller pays nothing, a licensed PSP holds the money (OPP for Marktplaats; Adyen for Leboncoin and, since 2026, Kleinanzeigen; PayU for OLX), release ~48 h–14 days after delivery unless the buyer disputes. The Polish OLX case shows the regulatory risk: UOKiK forced OLX (decision DOZIK-2-2024) to refund service fees and rewrite its "Pakiet ochronny" because exclusions made protection illusory and fees were hidden from price sorting.

### Cited Findings

**Vinted (Buyer Protection)**
- Official price list: buyer protection fee "généralement de 5 % + 0,70 €" of item/lot price; varies with item, order amount, single item vs lot; VAT included, added at checkout; item verification 10 € per item (5 € for electronics), includes shipping to verification centre; boost 3 or 7 days, price shown at payment — [Vinted.fr pricelist](https://www.vinted.fr/pricelist)
- Sellers pay no commission; buyer-pays model since 2016 (secondary) — [Voolist guide](https://www.voolist.com/blog/vinted-fees-2026); release 2 days after buyer confirms or auto after 5 days (secondary, unverified) — [Garnet](https://garnetmarketplace.com/marketplaces/vinted.html)

**Leboncoin (Paiement sécurisé / Transaction sécurisée)**
- Buyer pays ≈ 0,70 € + 5 % of item price for shipped sales; ≈ 0,99 € flat for optional secured hand-delivery; private sellers pay no commission; pro sellers without subscription ("Option Liberté") pay 6–15 % commission by subcategory on secured sales — [Margeo guide, updated 23 Sep 2026](https://margeoapp.com/blog/frais-leboncoin-2026-vendeur-particulier-pro)
- Leboncoin help states payment is secured by Adyen, which holds funds in escrow until the transaction ends (via search snippet of Friptadium guide citing Leboncoin aide) — [Friptadium](https://friptadium.com/blogs/actualites/livraison-leboncoin-modes-tarifs)
- Older grid (2021): 4 % of price, minimum 0,99 € — [Que Choisir forum](https://forum.quechoisir.org/post1045415.html)
- Example dispute: 750 € item lost by Mondial Relay; buyer had paid 38,20 € "Protection Leboncoin"; user eventually got 400 € compensation (forum, unverified) — [Que Choisir forum](https://forum.quechoisir.org/post939531.html)

**Kleinanzeigen (Sicher bezahlen / Direkt kaufen)**
- Official page (2026): payment runs via "unserem Zahlungsdienstleister Adyen"; Adyen holds the buyer's money "bis zu 14 Tage"; released on buyer's receipt confirmation, automatically after 14 days; buyer pays "kleine Gebühr abhängig vom Verkaufspreis" (amount not published); "Für Verkäufer ist dieser Service kostenlos"; protection covers not shipped / significantly different / counterfeit / wrong / incomplete item; seller protection covers chargebacks and unjustified complaints; payment methods: card, Apple Pay, Google Pay, PayPal, bank/instant transfer; shipping labels DHL S–XL and Hermes Päckchen/S/M/L bought in-app — [themen.kleinanzeigen.de/sicher-bezahlen](https://themen.kleinanzeigen.de/sicher-bezahlen/)
- 31 Mar 2026: Kleinanzeigen moved payments to an in-house platform on Adyen (one-click checkout, Adyen Uplift risk engine, better logistics/protection integration); previous provider since the 2020 launch was Dutch OPP — [Adyen press release](https://www.adyen.com/de_DE/presse-und-medien/kleinanzeigen); [Mobiflip](https://www.mobiflip.de/kleinanzeigen-erneuert-sicher-bezahlen-mit-adyen/amp/)
- Fee formula 0,35 € + 4,5 % of agreed price (example 1,25 € on 20 €) reported by basic-tutorials (27 Oct 2022, OPP era) — [basic-tutorials.de](https://basic-tutorials.de/ratgeber/software/sicher-bezahlen-mit-ebay-kleinanzeigen-so-funktionieren-verkaeufer-und-kaeuferschutz/); a 2026 marketing blog repeats 4,5 % + 0,35 € and claims the fee "can be switched to the seller in ad settings" and was raised from 4,2 % to 4,5 % on 15 Feb 2026 — [Marszal Studio blog](https://marszalstudio.pl/de/ebay-kleinanzeigen-2026-gebuehren-betrug-verkaufstipps/) (low-quality source; not confirmed by Kleinanzeigen)
- Verbraucherzentrale app test (written Sep 2024, published 18 Sep 2025) still names OPP as the provider and notes a buyer-protection surcharge plus PSP fee without amounts — [Verbraucherzentrale](https://www.verbraucherzentrale.de/umwelt-haushalt/apptest-kleinanzeigen-kreislaufwirtschaft-mit-hintertuer-99396)

**Marktplaats (Kopersbescherming via Betaalverzoek)**
- Official page: run by Online Payment Platform BV (OPP); buyer pays "een klein percentage van de vraagprijs" (amount not stated); money held in a separate "tussenrekening"; seller paid when buyer confirms, or automatically after 48 hours; buyer must report wrong/damaged item within 48 h of receipt and non-delivery within 14 days of payment; Kopersbescherming applies by default with PostNL, DHL or Brenger shipping; shipping always paid by buyer — [Marktplaats kopersbescherming](http://www.marktplaats.nl/m/kopersbescherming/)
- Predecessor "Gelijk Oversteken" (ended 2022) cost 40 cent + 4,5 %; payout only after PostNL confirmed delivery — [ID.nl, Apr/Nov 2022](https://id.nl/huis-en-entertainment/mobiel/smartphone-en-tablet/marktplaats-stopt-met-gelijk-oversteken-hoe-kun-je-veilig-betalen); secondary Q&A sites cite 0,40 € + 5 % for the current Betaalverzoek — [Webwoordenboek](https://webwoordenboek.nl/kenniscentrum/waarom-1-cent-overmaken-marktplaats) (403 on fetch; unverified)
- OPP cites "nearly a decade of successful collaboration" with Marktplaats (CEO Annemarie Buitelaar); OPP features: escrow hold for buyer protection, hold down payment, instant payouts; onboarding 9 s consumer / 1,2 days business; licence not stated on the page — [OPP](https://onlinepaymentplatform.com/en)

**Wallapop (Wallapop Envíos + Protección Wallapop, ES)**
- Official page: costs of Wallapop Envíos borne by buyer, include shipping + Protección Wallapop; free for seller except home pickup; money protected until buyer receives and confirms — [Wallapop Envíos](https://es.wallapop.com/envios-wallapop) (fetch 403; via search snippet)
- Guide (1 May 2025): Wallapop Protect fee paid by buyer: 1–13 € → 1,69 € flat; 13,01–657 € → 0,69 € + 7,5 %; 657,01–2 500 € → 50 € flat; insured range 1–2 500 €; buyer has 48 h after delivery to review/dispute, then payout to seller ≈ 3 working days; seller pays SEUR home-pickup surcharge 2,25 €; "Method" bulky-item service costs seller 10 % commission — [AndroidGuías](https://androidguias.com/envios-wallapop/) (secondary)
- 2018 Wallapay launch: tiered commission min 0,99 € (<40 €) to max 6,99 € (>500 €) — [Xataka Móvil, 7 Jun 2018](https://www.xatakamovil.com/aplicaciones/adios-al-efectivo-en-wallapop-wallapay-es-su-nueva-plataforma-de-pagos-con-comisiones) (historical)

**Subito (TuttoSubito, IT)**
- Buyer pays "una piccola percentuale del prezzo di vendita"; carriers Poste Italiane, InPost, Bartolini (BRT), UPS; parcel tiers Piccolo ≤2 kg, Medio ≤5 kg, Grande ≤15 kg, Maxi ≤20 kg; payment released if buyer reports no problem within 3 days (10 days for seller-managed shipping); payout to PayPal within 1 business day, bank 3 business days; seller has 6 days to hand parcel to carrier; buyer 7 days to collect from pickup point; cards/Apple Pay/Google Pay accepted — [Aranzulla](https://www.aranzulla.it/come-funziona-tuttosubito-1294131.html)
- Fee 0,70 € + 5 % up to 300 €, 0,70 € + 4,5 % above (third-party, updated 27 Jul 2025) — [Qualcherisposta](https://qualcherisposta.it/cose-tuttosubito) (fetch 403; via snippet)

**OLX.pl (Przesyłka OLX + Płatności OLX, PayU)**
- "Opłata serwisowa" paid by buyer up-front via OLX Payments, capped at 50 zł gross ("nie wyższa niż 50 złotych brutto"), not charged if users agree another delivery/payment — [android.com.pl](https://android.com.pl/news/435501-olx-oplata-serwisowa/); [Instalki](https://www.instalki.pl/news/internet/olx-wprowadza-nowe-prowizje-zaplaca-kupujacy-to-spory-krok-wstecz/)
- UOKiK example (Sep 2022): 39 zł shirt + 3,67 zł service fee (≈ 9,4 %) sorted above a 40 zł fee-free shirt; "Pakiet ochronny" claims had to be filed within 24 h of delivery; UOKiK called protection illusory; potential fine 10 % of turnover; UOKiK had just fined Vinted >5 m zł for similar practices — [Telepolis, 21 Sep 2022](https://www.telepolis.pl/tech/prawo-finanse-statystyki/olx-wprowadza-w-blad-uokik-zarzuty-oplaty-sortowanie-ofert-ochrona-kupujacych)
- UOKiK decision DOZIK-2-2024 (reported 17 Apr 2024): OLX must refund rejected Pakiet-ochronny claims (24 Aug 2021–27 Feb 2024) and service fees complained about (1 Dec 2021–28 Feb 2024); protection scope "will no longer contain exclusions"; valid claims get refund of purchase + service fee + shipping; price sorting must include fees; terms must state items can be bought directly without Przesyłka OLX — [android.com.pl, 17 Apr 2024](https://android.com.pl/tech/717325-prezes-uokik-olx-zwrot-pieniedzy/)
- PayU holds funds in escrow until the parcel is collected / buyer confirms; sellers historically paid within 72 h of confirmation — [Instalki](https://www.instalki.pl/news/internet/sprzedajesz-na-olx-z-przesylka-olx-bedziesz-musial-wyslac-skan-dowodu/)

**willhaben (PayLivery, AT)**
- Free for seller; buyer pays shipping "Minimum 0,99 EUR bzw. 4% vom Artikel-Preises"; Austria-only; contact support if delivery not arrived after >7 days — [Eurosender guide](https://www.eurosender.com/de/verkaufsleitfaden/willhaben) (third-party, undated)

**FINN.no (Fiks ferdig)**
- Listing example: shipping from 39 kr plus 39 kr "Trygg betaling" fee (~3,4 € each); buyer has 24 h to inspect before money goes to seller — [FINN listing](https://www.finn.no/recommerce/forsale/item/384718944) (via snippet; not an official fee table)

**Mercari US**
- From 6 Jan 2025: flat 10 % selling fee on item price + buyer-paid shipping; buyers pay flat 3,6 % Buyer Protection fee on item + shipping; no separate payment-processing fee; ACH payouts free, $2 for rejected deposits — [Value Added Resource, Dec 2024](https://valueaddedresource.net/mercari-backtracks-on-fee-changes)
- 2024 experiment: 0 % seller fee, variable buyer fees at checkout ("10 % plus payment processing" before); 10 % buyer-fee cap through end 2024; listings rose but GMV/buyer results disappointed (CEO memo), ~45 % staff laid off June 2024, CEO resigned — [Value Added Resource, Sep 2024](https://www.valueaddedresource.net/mercari-buyer-fees-10-percent-cap/)
- Pre-Jan-2025 processing fee was 2,9 % + $0,50 per transaction (secondary) — [Underpriced guide](https://www.underpriced.app/blog/mercari-fees-explained-complete-guide-2026)

**OfferUp (US)**
- Shipped sales: 12,9 % service fee or $1,99 minimum, whichever is greater; local cash sales free; buyer pays shipping; payments via Stripe integration — [FourWeekMBA](https://fourweekmba.com/how-does-offerup-make-money/); [Closo](https://closo.co/blogs/platform-specific-guides/selling-on-offerup)

**Regulatory framing (PSD2 / e-money)**
- PSD2 commercial-agent exclusion applies only where the agent acts for payer OR payee, not both; two-sided classifieds platforms holding funds "even briefly" typically need an EMI (EMD2) or payment-institution licence; the standard avoidance route is a licensed PSP that holds funds (platform does not need its own licence); PSD3 is expected to narrow the exemption further — [Clifford Chance briefing](https://www.cliffordchance.com/content/dam/cliffordchance/briefings/2017/11/impact-of-psd2-on-online-marketplaces-operating-in-europe.pdf); [Stripe PSD2 guide](https://stripe.com/sv-fi/guides/how-psd2-impacts-marketplaces-and-platforms); [Stripe PSD3 guide](https://stripe.com/en-cz/guides/what-platforms-and-marketplaces-can-expect-from-psd3)

### Comparison table – secure payment products (2025–2026)

| Portal | Product | Money held by | Buyer fee | Seller fee | Release | Dispute window | Source |
|---|---|---|---|---|---|---|---|
| Vinted | Buyer Protection | Vinted (own payment entity; PSP not confirmed) | ≈ 5 % + 0,70 € | 0 (private) | ~2 days after confirm / auto ~5 days (secondary) | until confirmation | Vinted pricelist |
| Leboncoin | Paiement sécurisé | Adyen escrow | ≈ 5 % + 0,70 € (shipped); 0,99 € hand-delivery | 0 private; 6–15 % pro w/o subscription | after buyer validation | n/a | Margeo, Friptadium |
| Kleinanzeigen | Sicher bezahlen | OPP (2020–2026) → Adyen (2026) | undisclosed; reported 4,5 % + 0,35 € | 0 | on confirm, auto after 14 days | 14 days | Kleinanzeigen page, Adyen PR |
| Marktplaats | Kopersbescherming | OPP (tussenrekening) | "small %" (reported 0,40 € + 5 %) | 0 | on confirm, auto 48 h | 48 h damage; 14 days non-delivery | Marktplaats page |
| Wallapop | Protección Wallapop | not disclosed | 1,69 € (<13 €); 0,69 € + 7,5 %; 50 € (>657 €) | 0 (2,25 € pickup; 10 % Method) | 48 h review + ~3 working days | 48 h | AndroidGuías |
| Subito | TuttoSubito | not disclosed | "small %" (reported 0,70 € + 5 % ≤300 €, 4,5 % above) | 0 | 3 days (10 if own shipping) | 3 days | Aranzulla |
| OLX.pl | Przesyłka OLX / Płatności OLX | PayU escrow | % capped at 50 zł (~11,6 €) | 0 | after buyer confirmation (≤72 h) | 24 h (pre-2024), exclusions removed 2024 | UOKiK coverage |
| willhaben | PayLivery | not disclosed | min 0,99 € or 4 % | 0 | n/a | contact after 7 days | Eurosender |
| FINN | Fiks ferdig / Trygg betaling | not disclosed | 39 kr fee + shipping from 39 kr | n/a | after 24 h inspection | 24 h | FINN listing |
| Mercari US | Buyer Protection | Mercari | 3,6 % | 10 % | after rating/confirm | n/a | VAR |
| OfferUp | Shipping | Stripe | shipping | 12,9 % / min $1,99 | n/a | n/a | FourWeekMBA |
| Bazoš | none | – | – | – | – | – | Bazoš terms |

### Inferences
- The Vinted/Leboncoin/Subito formula (0,70 € + 5 %, buyer pays, seller free) is the de-facto European standard and is the obvious template for Tržko; Wallapop's 7,5 % is the high end, OLX's 50 zł cap the low end for big tickets.
- For Tržko the regulatory shortcut is to use a licensed PSP with marketplace escrow (OPP, Adyen MarketPay, Mangopay, Stripe Connect, or locally Comgate/GoPay/PayU) so Tržko never holds client money; Kleinanzeigen's 2026 move to Adyen shows that even the largest players stay on a licensed PSP rather than obtaining their own EMI licence.
- The OLX/UOKiK precedent (and UOKiK's >5 m zł Vinted fine) means from day one: show the protection fee in sorted prices, make the fee-free direct deal explicit, and avoid exclusion-laden protection terms. Slovak SOI / Czech ČOI would apply the same UCPD logic.

### Gaps
- Vinted's regulated payment entity/PSP (Adyen vs Mangopay) was not confirmed by any source found.
- Official current fee tables for Kleinanzeigen, Marktplaats, Subito, Wallapop and willhaben were not retrievable (pages show "small fee" without numbers); figures above come from dated secondary sources.
- Adoption share of transactions via secure payment: no portal publishes it (Adyen/Kleinanzeigen release explicitly gives no volumes).
- Blocket "Köp nu", Tori, DBA, Gumtree, Carousell Protection, Xianyu (Alipay escrow), Facebook Marketplace checkout fees, Karrot Pay: not researched before search budget ran out.
- OPP's exact licence type (DNB payment institution) not confirmed from its site.

---

## Q4. Shipping integrations: carriers, lockers, prepaid labels, anonymity, who pays

### Takeaway
Integrated shipping is always sold as "buyer pays, seller gets a prepaid label in-app"; locker/PUDO networks dominate (Vinted >500 000 PUDO points in Europe; Packeta Z-BOX ~1 million slots in CZ/SK/HU). In CZ/SK Packeta already runs C2C flows for Vinted (Z-BOX drop-off since 19 May 2025) and Aukro (2025), so a Tržko–Packeta integration has a proven template; Bazoš has no shipping integration.

### Cited Findings
- Packeta × Vinted, 19 May 2025: Vinted sellers in Czechia, Slovakia and Hungary can drop sold items at self-service Z-BOXes 24/7 (previously only retail drop-off points); Z-BOX network capacity up to one million locker slots; Czech capacity doubled in 2024; "millions of second-hand parcels" transported through the cooperation — [Packeta press release](https://blog.packeta.com/packeta-and-vinted-launch-drop-off-via-z-boxes-pressrelease/)
- Zásilkovna about page lists a 2025 launch of Vinted and Aukro parcel drop-offs to Z-BOXes — [Zásilkovna about](https://www.zasilkovna.cz/en/about); Zásilkovna–Vinted cooperation dates back to Feb 2022 — [MediaGuru](https://www.mediaguru.cz/clanky/2022/02/zasilkovna-nove-spolupracuje-s-platformou-vinted/)
- cc.cz reported mix-up problems with Z-BOX parcels sent between individuals on Vinted and Aukro (headline only) — [cc.cz tag page](https://cc.cz/tag/packeta/)
- Vinted 2025: delivery partner network >500 000 pick-up/drop-off points across Europe; Vinted Go (own locker/PUDO network) in 5 markets (BE, FR, NL, PT, ES; ES/PT launched 2025); new sorting centre in France — [FashionUnited, Apr 2026](https://fashionunited.com/news/business/vinted-reaches-1-1-billion-euros-in-revenue-for-2025-accepting-a-strategic-drop-in-profits/2026040971654)
- Leboncoin: shipping from 2,49 € (Mondial Relay or Shop2Shop, up to 500 g, buyer grid Sep 2026); Mondial Relay accepts up to 30 kg; a 0,99 € Mondial Relay promo existed (Dealabs) — [Friptadium](https://friptadium.com/blogs/actualites/livraison-leboncoin-modes-tarifs); [Dealabs](https://www.dealabs.com/bons-plans/livraison-a-099eur-en-point-relais-mondial-relay-sur-leboncoin-3216865)
- Kleinanzeigen: in-app labels for DHL Paket S/M/L/XL and Hermes Päckchen/S/M/L; tracking number sent to buyer automatically; drop-off at DHL/Hermes Paketshop or Packstation — [Kleinanzeigen Sicher bezahlen](https://themen.kleinanzeigen.de/sicher-bezahlen/)
- Marktplaats: Kopersbescherming auto-applies with PostNL, DHL or Brenger (large items); shipping always paid by buyer — [Marktplaats](http://www.marktplaats.nl/m/kopersbescherming/)
- Wallapop (May 2025 tariffs): Correos, SEUR, GLS, Method; 0–2 kg: 3,49 € home / 2,99 € Correos office / 2,39–2,59 € GLS; 2–5 kg: 4,49 / 3,99 / 3,49 €; 5–10 kg: 7,49 / 6,49 / 5,49 €; 10–20 kg: 11,49 / 10,49 / 9,49 €; 20–30 kg: 16,49 / 15,49 / 14,49 €; buyer pays shipping; seller pays 2,25 € SEUR home pickup — [AndroidGuías](https://androidguias.com/envios-wallapop/); Correos manages Wallapop shipments — [Alimarket](https://www.alimarket.es/logistica/noticia_amp/249715/correos-gestionara-los-envios-de-wallapop)
- Subito: Poste Italiane, InPost, BRT, UPS; size tiers ≤2/5/15/20 kg; seller must hand over within 6 days; buyer collects from PUDO within 7 days — [Aranzulla](https://www.aranzulla.it/come-funziona-tuttosubito-1294131.html)
- OLX.pl: Przesyłka OLX launched with Sendit.pl; periodic "Przesyłka OLX za 1 zł" promotions (Aug 2024) — [Telepolis](https://www.telepolis.pl/wiadomosci/olx-wprowadza-bezpieczne-transakcje-i-dostawy-przesylek-razem-z-sendit-pl); [FashionBiznes](https://fashionbiznes.pl/olx-jakie-formy-przesylki-oferuje-kiedy-olx-wysylka-za-1-zl/)
- Mercari Japan: anonymous delivery (匿名配送) available only via メルカリ便 (Yamato らくらくメルカリ便 / Japan Post ゆうゆうメルカリ便); 宅急便コンパクト flat 450 ¥ nationwide + 70 ¥ box; drop-off at Yamato branches, 7-Eleven, FamilyMart, Mercari Store; non-メルカリ便 shipping requires identity verification — [Mercari help 135](https://help.jp.mercari.com/guide/articles/135/); [Mercari help 1080](https://help.jp.mercari.com/guide/articles/1080/)
- FINN: Fiks ferdig shipping from 39 kr (Helthjem/Posten; carrier not confirmed) — [FINN listing](https://www.finn.no/recommerce/forsale/item/384718944)
- Vend (ex-Schibsted) is divesting its Delivery unit (Helthjem; 2024 revenue ~2,1 bn NOK, 3 % EBITDA margin) — [Placera, 18 Dec 2025](https://www.placera.se/analys/analys-blocket-agaren-ger-en-unik-exponering--2025-12-18)
- Blocket/Tori/DBA/willhaben carrier details: willhaben PayLivery is Austria-only — [Eurosender](https://www.eurosender.com/de/verkaufsleitfaden/willhaben)

### Comparison table – shipping integrations

| Portal | Carriers / lockers | Label | Who pays | Typical price | Source |
|---|---|---|---|---|---|
| Vinted | >500 000 PUDO points; Vinted Go lockers (5 markets); Packeta Z-BOX in CZ/SK/HU | prepaid in-app, Z-BOX drop | buyer | n/a (varies) | FashionUnited, Packeta |
| Leboncoin | Mondial Relay, Shop2Shop, Colissimo… | prepaid | buyer | from 2,49 € | Friptadium |
| Kleinanzeigen | DHL S–XL, Hermes; Packstation | prepaid in-app | buyer | n/a | Kleinanzeigen |
| Marktplaats | PostNL, DHL, Brenger | prepaid | buyer | n/a | Marktplaats |
| Wallapop | Correos, SEUR, GLS, Method | prepaid | buyer | 2,39–16,49 € | AndroidGuías |
| Subito | Poste Italiane, InPost, BRT, UPS | prepaid | buyer | n/a | Aranzulla |
| OLX.pl | InPost/Sendit etc. | prepaid | buyer | promos 1 zł | Telepolis |
| Mercari JP | Yamato, Japan Post; convenience stores; anonymous | QR in-app | buyer or seller | 450 ¥ compact | Mercari help |
| Bazoš | none | – | – | – | – |

### Inferences
- A Tržko × Packeta integration (Z-BOX drop-off with QR code, anonymous address, prepaid label bought in the buyer's checkout) can reuse exactly the Vinted/Aukro flows Packeta already operates; Packeta's own press material frames Z-BOX C2C as a growth priority.
- The cc.cz note on mix-ups shows the operational risk of label-less C2C drop-offs; a QR-based flow with immediate app confirmation is the mitigation Vinted uses.

### Gaps
- Packeta's partner API pricing for marketplaces, and whether Sbazar has any Packeta integration: no source found.
- Exact Z-BOX count in SK vs CZ, parcel volumes for Vinted/Aukro flows: not published beyond "millions".
- Carrier fee tables for Kleinanzeigen, Marktplaats, Subito, FINN, Blocket, Tori, DBA, willhaben not retrievable.

---

## Q5. Scam detection: patterns in CZ/SK/PL, message scanning, masked contacts, what portals publish

### Takeaway
The dominant scam against sellers across DE/CZ/SK/PL/DK is identical: a fake "buyer" moves the chat off-platform, sends a link to a fake carrier/"secure payment" page (DPD/Packeta/DAO/"Sicher bezahlen" lookalike) and harvests card + 3-D Secure codes; in SK a June 2025 wave spoofed Bazoš itself by SMS ("urgent verification or ad deleted in 24 h", domain bazos.cfd). Portals respond with in-chat warnings and "stay in the app" messaging; the only published technical measure is Kleinanzeigen's 2026 move to Adyen's ML risk engine (Adyen Uplift) replacing static rules. No portal in scope published link-blocking or message-scanning statistics.

### Cited Findings
- Slovakia, 23 Jun 2025: SMS campaign impersonating Bazoš ("Ak chcete zachovať inzerát aktívny, vykonajte urgentnú verifikáciu kliknutím na nasledujúci odkaz"), link to bazos.cfd; police (Roman Hájek) say the aim is payment data; several reports logged — [Startitup.sk](https://www.startitup.sk/?p=1088183)
- Slovakia, Feb 2023: fake Zásielkovňa/Packeta e-mail ("Naplánujte dodávku") with tracking number leads to foreign-domain page asking card details incl. CVC and a 99 CZK "fee" — [TouchIT.sk](https://touchit.sk/zasielkovana-podvod/480489/)
- Czechia Q1 2025 (ESET): fake buyer sends seller a link to a counterfeit form or payment gateway "often mimicking a known carrier", requesting card/online-banking details including the authorisation SMS code; marketplace-selling cases ≈ one-fifth of phishing; SMS/chat-app phishing >25 % — [Kurzy.cz / ESET](https://zpravy.kurzy.cz/814189-cesi-se-nejcasteji-potykaji-s-utoky-na-bankovni-identitu-a-falesnymi-kupujicimi-na-bazarech/)
- Czech police list Bazoš.cz and Vinted.cz among portals where sellers are targeted by fake buyers — [Policie ČR kyberkriminalita PDF](https://policie.cz/soubor/kyberkriminalita1-pdf.aspx) (via snippet)
- Germany, Aug 2023: LKA Sachsen-Anhalt warned of scammers who ask sellers for e-mail/phone, claim "Sicher bezahlen" needs e-mail confirmation, send a phishing link capturing card data; 23 cases since June 2023, losses "mehrere Tausend Euro"; Kleinanzeigen added explicit warnings in chat and coordinates with police; spokesman Pierre Du Bois: perpetrators mainly operate from Turkey and North Africa; advice: use only in-app payment, share nothing outside the site — [TECHBOOK](https://www.techbook.de/shop-pay/shops-marktplaetze/kleinanzeigen-betrug-lka); [GIGA](https://www.giga.de/news/betrug-bei-kleinanzeigen-nimmt-zu-polizei-warnt-vor-neuer-masche/)
- Kleinanzeigen 2026: Adyen Uplift risk management replaces "static manual rules", with adjustable fraud thresholds and false-positive rates — [Adyen PR](https://www.adyen.com/de_DE/presse-und-medien/kleinanzeigen)
- Denmark: DBA seller phished via lookalike DAO courier page + MitID approval; complaints board held seller liable for 8 000 kr (two members dissented, would cap at 375 kr) — [Finansielle Ankenævn via Lovguiden](https://www.lovguiden.dk/dokument/finansielle-ankenaevn/06-02-2024-indsigelse-mod-haeftelse-for-8-000-kr-ved-mitid-svindel-i-forbindelse-med-dba-salg)
- France: Leboncoin "paiement sécurisé" is itself impersonated in scams — [Fiches-auto](https://www.fiches-auto.fr/articles-auto/arnaques/s-3221-arnaque-au-paiement-securise-leboncoin.php)
- Spain: Wallapop warns that protection does not apply if payment happens outside the app — [Chilat](https://www.chilat.com/blog/1981647012537254458); [Teknofilo](https://www.teknofilo.com/wallapop-alerta-sobre-la-estafa-mas-comun-y-explica-como-evitarla/)
- Mercari JP: identity verification required for non-anonymous shipping "as a measure against fraud" — [Mercari help 1080](https://help.jp.mercari.com/guide/articles/1080/)

### Inferences
- Because the CZ/SK attack vector is "seller's card data via fake carrier page", the single most effective product measure is an in-app payout flow where the seller never enters card data (prepaid label + PSP payout to IBAN), combined with auto-inserted chat warnings whenever a message contains a URL, a phone number, or carrier keywords (Packeta/Zásilkovna/DPD/GLS).
- Bazoš's reliance on visible phone numbers + e-mail replies pushes every transaction off-platform; masked chat (Leboncoin/Kleinanzeigen/Vinted style) removes the attacker's channel and is a prerequisite for scam detection.
- Spoofing of the portal's own "verification" SMS (bazos.cfd) means Tržko should never send payment links by SMS and should state that publicly.

### Gaps
- No portal in scope publishes numbers on blocked links, message scans, AI moderation volumes, or false-positive rates (search budget exhausted before Vinted/Wallapop/Leboncoin safety centres could be fetched).
- Polish UOKiK/CERT Polska or Dutch Fraudehelpdesk scam statistics for OLX/Marktplaats not retrieved.
- Slovak police aggregate statistics on bazaar fraud not found.

---

## Q6. Monetization: promotions, paid categories, pro subscriptions, commissions, revenue mix, ARPU

### Takeaway
Leading portals earn >70 % from listing/publishing fees to professionals and paid verticals (Vend: Mobility 39 %, Real Estate 20 %, Jobs 18 %, Recommerce 13 %), with transaction fees and advertising as the remainder; pure C2C transactional players (Vinted) earn from the buyer-protection fee on GMV (≈10 % take: 1,1 bn € revenue on 10,8 bn € GMV in 2025). Private-user promotions are cheap (Leboncoin boost from 0,99 €; Kleinanzeigen Top from ~3,90 €; OLX Mini/Midi/Maxi 3,96/13,21/38,43 zł on a 499 zł item; Craigslist $5), while cars and real estate are the paid categories (Leboncoin 79,90 € from the 3rd private car ad per year; OLX cars 39,99–333,99 zł per 30 days).

### Cited Findings

**Revenue mix / scale**
- Vend (Schibsted Marketplaces: FINN, Blocket, Tori, DBA, Oikotie): revenue shares Mobility 39 %, Real Estate 20 %, Jobs 18 %, Recommerce 13 %, Other ~10 %; publishing fees >70 % of revenue, transaction fees and advertising the rest; Q1–Q3 2025 revenue 4 807 MNOK (−1,0 %), operating result 993 MNOK (20,7 % margin); rolling EBITDA margins Mobility 54 %, Real Estate 44 %, Jobs 54 %, Recommerce −32 %; group transaction volumes est. −5 % in 2025 while ARPA rose est. 10–15 %; Recommerce growth target >20 % — [Placera, 18 Dec 2025](https://www.placera.se/analys/analys-blocket-agaren-ger-en-unik-exponering--2025-12-18)
- Schibsted FY2024: revenue NOK 8,3 bn (+9 %), EBITDA margin 20 %; Q4 2024 revenue NOK 2 103 m (+12 % cc), Real Estate transactional revenue NOK 35 m "more than double" — [OnlineMarketplaces](https://www.onlinemarketplaces.com/articles/schibsted-q4-2024-12-revenue-increase-as-ceo-halvorsen-hails-transformative-year/)
- Adevinta Q1 2024 (last public quarter): online classifieds €376 m (+15 %), transactional €33 m (+31 %), advertising €70 m (−7 %), total €480 m; FY2023 revenue €1 826 m, EBITDA €651 m; delisted June 2024 — [Adevinta Q1 2024 release](https://adevinta.com/press-releases/adevinta-asa-ade-adevinta-reports-strong-q1-financial-performance-in-soft-macro-environment/); [Adevinta AR 2023](https://live.euronext.com/sites/default/files/company_press_releases/attachments_oslo/2024/04/26/616971_Adevinta%20AR%202023.pdf)
- OLX Group FY2025 (to 31 Mar 2025): revenue US$777 m (+18 %), aEBIT US$270 m (+61 %), margin 35 % (25 % FY24); Motors +24 %, Real Estate +23 %; ~64 m daily active listings, 29 m monthly app users, 9 brands/9 markets; management targets >20 % growth and margins approaching 50 % — [OLX Group, 23 Jun 2025](https://www.olxgroup.com/news/olx-group-reports-strong-fy-2025-results-with-18-revenue-growth-and-61-profit-uplift-year-on-year/); H1 FY25 revenue US$399 m (+20 %), real-estate monthly ARPA +11 % YoY — [OnlineMarketplaces](https://www.onlinemarketplaces.com/articles/prosus-olx-h1-2025-overall-revenues-up-20-as-real-estate-revenues-jump-21-yoy)
- Vinted 2025: GMV €10,8 bn (+47 %), revenue €1,1 bn (+38 %), adj. EBITDA €151 m (−5 %), net profit €62 m (−19 %), FCF €137 m; 2024: revenue €813,4 m (+36 %), net profit €76,7 m, adj. EBITDA €158,9 m — [FashionUnited 2026](https://fashionunited.com/news/business/vinted-reaches-1-1-billion-euros-in-revenue-for-2025-accepting-a-strategic-drop-in-profits/2026040971654); [FashionUnited 2025](https://fashionunited.uk/news/business/vinteds-parent-company-sees-profit-soar-by-330-percent/2025042981341)
- Kleinanzeigen: >32 m monthly visitors, >58 m ads — [Adyen PR](https://www.adyen.com/de_DE/presse-und-medien/kleinanzeigen)

**Promotion / listing prices**
- Leboncoin: boost/remontée from 0,99 €; mise en avant (7–30 days) up to 29,99 €; 50 free listings in common categories (from 27 Apr 2026); vehicles: 2 free ads per person per year, 3rd costs 79,90 € TTC; pro commission 6–15 % without subscription — [Margeo](https://margeoapp.com/blog/frais-leboncoin-2026-vendeur-particulier-pro)
- Leboncoin private cars (Apr 2025): from the 3rd ad in 12 months, insertion 79,90 €, edit 26,90 €; visibility options 11,90–179,90 € by duration — [Journal de l'Automobile, 15 Apr 2025](https://journalauto.com/services/leboncoin-commence-a-facturer-les-particuliers/)
- Kleinanzeigen (claims, 2026 blog): Top/hochschieben from 3,90 € (7 days), highlight from 2,90 € (30 days), gallery image from 5,90 € (30 days), PRO from 19,90 to 159 €/month by industry — [Marszal Studio](https://marszalstudio.pl/de/ebay-kleinanzeigen-2026-gebuehren-betrug-verkaufstipps/) (unverified); Kleinanzeigen PRO price increases for larger packages from Feb 2026, smallest packages (1 or 5 ads) unchanged — [iFun.de](https://www.ifun.de/kleinanzeigen-pro-preiserhoehungen-und-spam-erlaubnis-ab-2026-270959/); ad-free "Kleinanzeigen Pur" 1,99 €/month — [GIGA](https://www.giga.de/tech/kleinanzeigen-pur-kosten-vorteile-und-wie-man-sich-anmeldet--01K8B451MRATNVHF9RBTH32TQ6)
- OLX.pl cars (Jul 2026): Basic package ≤4 999,99 zł car 39,99 zł (≤4 listings/30 days) or 44,99 zł; Ultra >100 000 zł car 298,99–333,99 zł; promotions on a 499 zł item: Mini 3,96 zł (3 days), Midi 13,21 zł (7 days), Maxi 38,43 zł (30 days + homepage 7 days) — [Bezprawnik, 16 Jul 2026](https://bezprawnik.pl/oplaty-za-ogloszenia-samochodow-na-olx/); Otodom: bump 43,99 zł net, 30-day highlight 229,99 zł net — [Otodom cennik](https://www.otodom.pl/pl/cennik/deweloperzy)
- Craigslist: jobs $10–75; apartments (Boston/Chicago/NYC) $5; all for-sale by-dealer $5; cars/trucks by-dealer $5; cars/trucks/RVs/motorcycles by-owner $5; gigs $3–10; services $5; everything else free — [Craigslist posting fees](https://www.craigslist.org/about/help/posting_fees)
- Vinted: boost 3 or 7 days priced dynamically; wardrobe spotlight priced at checkout; item verification 10 €/5 € — [Vinted pricelist](https://www.vinted.fr/pricelist)
- Bazoš: free ads for 2 months, max 50 per user; TOP moves ad 7 days forward (decreasing to 1 day by the 7th TOP, max 21 TOPs, 7 in Services); paid Práce and Služby sections; TOP price not stated in terms (paid via SMS/in-app/voucher per guides) — [Bazoš.cz Podmínky](https://www.bazos.cz/podminky.php); [ZS Sambra guide](https://zssambra.sk/blog/topovat-prispevok-vyznam/)
- Mercari US / OfferUp / Vinted / Leboncoin commissions: see Q3 table.

### Comparison table – monetization levers (private users)

| Portal | Free listing? | Bump/Top | Highlight / gallery | Paid categories | Pro subscription | Transaction fee | Source |
|---|---|---|---|---|---|---|---|
| Bazoš | Yes, 2 months, 50 ads | TOP (SMS), 7 days | – | Jobs, Services | – | – | Bazoš terms |
| Leboncoin | Yes (50/category 2026) | from 0,99 € | up to 29,99 € | cars 79,90 € from 3rd/yr | yes (pro) | 5 % + 0,70 € buyer | Margeo, Journal Auto |
| Kleinanzeigen | Yes | ~3,90 € | ~2,90 € / 5,90 € | – | PRO 19,90–159 €/mo | ~4,5 % + 0,35 € buyer | blog (unverified), iFun |
| OLX.pl | Yes (limits) | Mini 3,96 zł | Midi 13,21 / Maxi 38,43 zł | cars 39,99–333,99 zł | packages | % capped 50 zł buyer | Bezprawnik |
| Vinted | Yes | dynamic (3/7 days) | wardrobe spotlight | – | Vinted Pro | 5 % + 0,70 € buyer | Vinted |
| Craigslist | Yes | – | – | cars by-owner $5, jobs $10–75 | – | – | Craigslist |
| Mercari US | Yes | – | – | – | – | 10 % seller + 3,6 % buyer | VAR |
| OfferUp | Yes | – | – | – | – | 12,9 % seller (shipped) | FourWeekMBA |

### Inferences
- Revenue-per-listing benchmarks: OLX ~US$777 m on ~64 m daily listings ≈ US$12 per active listing per year; Vinted take rate ≈ 10 % of GMV. For Tržko, a realistic first-year mix is Bazoš-style TOP fees + paid cars/real-estate/jobs listings for frequent posters (Leboncoin's "2 free car ads per year, then 79,90 €" is a clean rule), with a 5 % + 0,70 € buyer-protection fee as the scalable long-term lever.
- The Vend data (Recommerce EBITDA −32 % despite transaction fees) warn that C2C goods transactions alone are not yet profitable even at Nordic scale; margins come from verticals.

### Gaps
- Official current promotion price lists for Kleinanzeigen, OLX (non-car), Marktplaats, Subito, Wallapop, willhaben, FINN, Blocket, Tori, DBA, Gumtree, Carousell, Xianyu were not retrieved.
- Bazoš TOP SMS price not found in its terms or on fetched pages (reported in guides as SMS/in-app payment without amount).
- Mercari Japan's 10 % selling fee was not confirmed from an official page in this research.
- Adevinta FY2024/FY2025 and Leboncoin-level revenue mix not available (private since 2024); Facebook Marketplace and Karrot monetization not researched.

---

## Q7. EU regulation a new portal must implement from day one: DSA, DAC7, GDPR, consumer law

### Takeaway
From day one a Slovak/Czech portal must (a) run DSA hosting/platform duties (notice-and-action, statement of reasons, complaint handling, point of contact; trader traceability/KYBC once it allows business sellers — with micro/small-enterprise relief for some platform-tier duties), (b) implement DAC7 seller due diligence and annual reporting by 31 January for sellers with ≥30 sales or >2 000 € per year, including account restriction after a 60-day grace period (Vinted blocks the wallet, then selling), (c) GDPR data minimisation (Bazoš keeps contact data 6 months, verification data 1 year, invoices 10 years, no non-EEA transfers), and (d) avoid UCPD breaches in fee display and protection claims (UOKiK precedents against OLX and Vinted).

### Cited Findings
- DSA tiers: hosting services must run notice-and-action (Art. 16) and statements of reasons (Art. 17); online platforms additionally: internal complaint handling, out-of-court dispute settlement, trusted flaggers, measures against misuse, transparency reporting, advertising transparency, ban on dark patterns, protection of minors; online marketplaces additionally: trader traceability (Art. 30), compliance by design (Art. 31), right to information (Art. 32); micro and small enterprises are exempt from the platform-tier obligations; applicable since 17 Feb 2024; fines up to 6 % — [EUR-Lex DSA summary](https://eur-lex.europa.eu/EN/legal-content/summary/digital-services-act.html)
- Art. 30 KYBC: before a trader can operate, collect name, address, phone, e-mail, ID/registration details, self-certification; "best efforts" verification; trader who fails to correct inaccurate data must be suspended "swiftly"; took effect 17 Feb 2024; Irish CCPC is competent authority for Arts. 30–32 — [Mondaq](https://mondaq.co.uk/compliance/1367256/online-marketplaces-and-the-digital-services-act-understanding-trader-traceability); [Pinsent Masons](https://www.pinsentmasons.com/de-de/out-law/analyse/kyc-the-eu-digital-services-act-adds-platforms-dac7-duties)
- DAC7 data set: individuals – first/last name, primary address, TIN, VAT number, date of birth (place of birth if no TIN); entities – legal name, address, TIN, VAT, business registration number, EU permanent establishments; DAC7 gives traders a 60-day grace period before suspension vs. DSA "swiftly" — [Pinsent Masons](https://www.pinsentmasons.com/de-de/out-law/analyse/kyc-the-eu-digital-services-act-adds-platforms-dac7-duties)
- DAC7 thresholds and Vinted's implementation: form required at ≥30 sales or >2 000 € in a calendar year; due early January of the following year or within 60 days of crossing the threshold, whichever is later; if not submitted, Vinted wallet is blocked (no withdrawals/payments), after one more sale selling is blocked; data sent to competent authorities in January — [Vinted help 1308](https://www.vinted.fr/help/1308)
- German reporting goes to the Bundeszentralamt für Steuern by 31 January; reporting itself creates no tax liability — [Fripio](https://fripio.app/de/blog/vinted-pro-gewerblich) (secondary)
- Consumer-law precedents: UOKiK charged OLX (2022) over hidden service fees in price sorting and illusory "Pakiet ochronny"; decision DOZIK-2-2024 ordered refunds and removal of exclusions; UOKiK fined Vinted >5 m zł for similar practices — [Telepolis](https://www.telepolis.pl/tech/prawo-finanse-statystyki/olx-wprowadza-w-blad-uokik-zarzuty-oplaty-sortowanie-ofert-ochrona-kupujacych); [android.com.pl](https://android.com.pl/tech/717325-prezes-uokik-olx-zwrot-pieniedzy/)
- C2C vs B2C: Subito requires professional sellers to grant the 14-day withdrawal right; private sellers do not — [Aranzulla](https://www.aranzulla.it/come-funziona-tuttosubito-1294131.html); Bazoš bans direct advertising of business activity and requires business name + IČO at the end of each ad — [Bazoš.cz Podmínky](https://www.bazos.cz/podminky.php)
- GDPR practice at Bazoš: contact/ad data kept 6 months, SMS/micropayment data 1 year, invoices 10 years, no transfers outside EEA, ad partners get only anonymised data — [Bazoš.sk Podmienky](https://www.bazos.sk/podmienky.php); Verbraucherzentrale criticised Kleinanzeigen for >1 000 third-party ad partners with potential data access — [Verbraucherzentrale](https://www.verbraucherzentrale.de/umwelt-haushalt/apptest-kleinanzeigen-kreislaufwirtschaft-mit-hintertuer-99396)
- Payments regulation (PSD2/EMD2): see Q3 — holding funds requires a licence; use a licensed PSP — [Clifford Chance](https://www.cliffordchance.com/content/dam/cliffordchance/briefings/2017/11/impact-of-psd2-on-online-marketplaces-operating-in-europe.pdf)

### Day-one checklist (inferred from the above)
| Area | Obligation | Practical implementation seen at portals |
|---|---|---|
| DSA hosting tier | Notice-and-action form, statement of reasons, point of contact, annual transparency figures | All portals; required even for micro/small enterprises |
| DSA marketplace tier (Art. 30–32) | KYBC for business sellers, compliance-by-design listing fields, inform buyers of illegal products | Bazoš requires IČO in ad text (weak); Kleinanzeigen PRO/Leboncoin pro accounts (strong) |
| DAC7 | Collect TIN/DoB/address/IBAN at 30 sales or 2 000 €; 60-day grace; report by 31 Jan | Vinted pre-filled form + wallet block |
| PSD2/EMD2 | Never hold client money; contract a licensed PSP with escrow | OPP (Marktplaats), Adyen (Leboncoin, Kleinanzeigen), PayU (OLX) |
| UCPD/consumer law | Fee-inclusive price sorting; explicit fee-free direct deal; protection terms without hidden exclusions; 14-day withdrawal for pro sellers | UOKiK v OLX/Vinted; Subito pro rule |
| GDPR | Retention schedule, EEA-only processing, minimal ad-tech sharing | Bazoš retention table |

### Gaps
- Official EUR-Lex DAC7 page (deadline 31 Jan, penalties) could not be fetched (404); figures rely on Vinted's help page and secondary sources.
- Exact DSA micro/small-enterprise exemption boundaries (which Section 3 duties apply) not verified against the regulation text.
- Slovak/Czech transposition specifics (Act on DAC7 in SK/CZ, Slovak DSA coordinator) not researched.
- Kleinanzeigen's and OLX's DAC7 implementation details (form, blocking) not found.
