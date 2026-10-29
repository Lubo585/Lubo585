# Cross-cutting innovation, AI, UX patterns and market data of leading C2C classifieds portals (state 2025–2026)

Scope: Leboncoin, Kleinanzeigen, Marktplaats, Willhaben, Wallapop, Subito, Vinted, Gumtree, Finn.no, Blocket, DBA, Tori, OLX, Facebook Marketplace, Craigslist, OfferUp, Mercari, Karrot, Xianyu, Carousell; baseline Bazoš.sk / Bazoš.cz. Research date: 29 October 2026. Every number is dated and attributed; where only secondary coverage exists this is flagged. Items that could not be verified are in the "Gaps" subsections rather than in the tables.

Method note: ~50 web searches and ~35 page fetches. Several primary pages (OpenAI "Mercari" customer story, Google Cloud "Carousell" and "Mercari" case studies, ThredUp 2026 press release, GlobeNewswire Craigslist report) returned HTTP 403 or truncated content, so their figures are cited from the search-result snippets of those exact pages or from secondary coverage, and marked as such.

---

## Key question 1: AI listing creation (photo → title, category, description, price)

### Takeaway
By end-2025 nearly every major horizontal portal in scope has shipped (or is piloting) photo-to-listing generation; the best-documented impacts are Carousell (+20 % items listed per seller, median listing time < 2 min on Gemini), Xianyu (87 % adoption of AI copy, 230 M items cumulatively, then a 5-second "AI camera" that produced 50 M listings in ~2 months), OLX (posting time −35–55 %, ad quality +37 %) and Mercari ("a few hundred" AI-assisted listings per minute, higher listing conversion). Vinted, Wallapop, Willhaben, Subito, DBA/Tori/Blocket/FINN, Gumtree, Craigslist, OfferUp and Karrot have no verifiable native photo-to-listing feature in the sources found.

### Comparison table A — AI listing creation (as of Oct 2026)

| Portal | What ships | Model / vendor (if disclosed) | Launch date | Platforms / scope | Measured impact (source type) |
|---|---|---|---|---|---|
| Xianyu (Alibaba) | "AI智能发布": recognises category/model/spec and writes copy; March 2026 "AI相机" (AI camera): one photo → listing in ~5 s incl. AI price | Pricing model co-trained by Xianyu and Qwen (千问); internal "LLP" pricing model, "GSID" generative semantic IDs | AI publishing 2025; AI camera 25 Mar 2026 | App, homepage slot "一张照片就能卖" | Copy adoption > 87 %, 230 M items cumulatively (CEO at Wuzhen 2025); AI-publish MAU 18.08 M (QuestMobile); AI camera: 12 M users, 50 M new listings by 1 Jun 2026 (company figures via press) |
| Carousell | "List with AI": start a listing from a short video or set of photos; AI fills title, description, price | Google Gemini (multimodal) | 2024–2025 (undated on Google page) | Non-merchant sellers; video AI in Singapore; photo AI in SG, MY, HK, PH | +20 % items listed per seller; median listing time < 2 min; target < 45 s (Google Cloud customer story = vendor marketing) |
| Mercari (Japan) | "AI出品サポート" (AI Listing Support): photo + category → description, condition, price; "as few as 3 taps"; on by default | OpenAI (GPT-4o mini for two features; earlier GPT-4 offline attribute mining) | 10 Sep 2024 | JP app, staged roll-out | "A few hundred AI-assisted listings per minute", listing conversion rose (OpenAI customer story); feature reached > 20 M users in two months (Google Cloud) |
| Facebook Marketplace (Meta) | "Create listing details": photos → title, description, category, suggested price (based on similar listings); 4 tone options; prepaid shipping label in flow; Seller app with bulk listing | Meta AI (Llama family implied, not stated) | Listing AI 12 Mar 2026; Seller app 24 Jul 2026 (US, iOS, 18+) | US first; Android "in testing" | No accuracy benchmarks published; independent test judged it better than Mercari/Poshmark/Depop/eBay tools |
| OLX Group (Prosus) | GenAI ad posting: auto attributes + descriptions; AutoIQ dealer descriptions in dealer's tone; real-estate AI posting | Not disclosed | 2024–FY2026 | PL, RO, PT, BG, UA, ZA, FR | Posting time −35–55 %; ad quality +37 % (olxgroup.com); real-estate listing time −50 % (FY2026 results) |
| Kleinanzeigen (Adevinta) | Summer 2025: photo + title + category → description (iOS first). 18 Nov 2025: photo only → title, category, description; keywords; voice input (iOS). Jul 2026: "PRO" reply suggestions, real-estate Q&A assistant | Not disclosed | Jul/Aug 2025 (text), 18 Nov 2025 (photo), 7 Jul 2026 (PRO/real estate) | iOS + Android apps, gradual; excludes vehicles, jobs, services | None published |
| Marktplaats (Adevinta) | "Supersnelle advertenties": photo(s) + asking price → category, title, description "in a few seconds" | Google Gemini `gemini-2.0-flash-001` (named in terms) | Undated (live Oct 2026) | iOS/Android app only; optional; excludes cars, housing, jobs, services, animals, tickets, holidays | None published |
| Leboncoin (Adevinta) | Photo + title → description, market price suggestion, delivery recommendation; May 2025 car module: photo + licence plate + title → full listing | CamemBERT (Meta's French LM) mentioned; generative vendor not disclosed | 16 Dec 2024 (toys, video games, appliances; all categories planned early 2025); 20 May 2025 cars | Web + app, FR | Company claim: AI-written listings "20 % plus efficaces" (no methodology) |
| Depop (Etsy; comparator) | Single photo → description + category, colour, sub-category, brand | Not disclosed | 2024 | App | None published |
| Vinted | No native photo-to-listing found; ecosystem of third-party extensions (Vintapp, AutoLister, Vindy) | — | — | — | — |
| Wallapop | No native AI listing found; flow starts with one keyword then photos; AI partnership is on discovery (Albatross AI) | — | — | — | — |
| Willhaben, Subito, FINN, Blocket, DBA, Tori, Gumtree, Craigslist, OfferUp, Karrot | No verifiable AI listing feature found in this research | — | — | — | see Gaps |
| Bazoš (baseline) | No AI features found; classic form; ads free, "topping" 59 CZK by SMS / 39 CZK by card (2018) | — | — | — | — |

### Cited Findings
- Kleinanzeigen added an AI assistant in summer 2025 that generates a first description proposal after the seller uploads a photo, enters a title and picks a category; initially iOS-only, Android "in development" (Aug 2025) — [giga.de](https://www.giga.de/tech/kleinanzeigen-praktische-funktion-spart-euch-massig-zeit--01K222J50RCBE8BX2KP1ZPJV7W); [mobiflip](https://www.mobiflip.de/kleinanzeigen-startet-ki-revolution-so-einfach-war-inserieren-noch-nie/amp/)
- On 18 Nov 2025 Kleinanzeigen enabled creating a listing from a single photo: AI suggests title, description and category; keywords optional; voice dictation on iOS only; iOS + Android gradual roll-out; vehicles, jobs and services excluded; users can accept all, part or none of the suggestions; "Wer die Funktion deaktiviert, verliert keine Daten" — [mobiflip, 18 Nov 2025](https://www.mobiflip.de/kleinanzeigen-fuehrt-ki-gestuetzte-anzeigenerstellung-per-foto-ein/amp/); [retail-news.de, 19 Nov 2025](https://retail-news.de/ki-anzeigen-per-foto-kleinanzeigen-app/)
- On 7 Jul 2026 Kleinanzeigen added a "PRO" reply suggestion for commercial sellers (drafts replies from listing + message history) and a real-estate AI assistant answering questions inside apartment listings; no user numbers disclosed — [mobiflip, 7 Jul 2026](https://www.mobiflip.de/kleinanzeigen-startet-ki-offensive-mit-neuen-funktionen/amp/)
- Facebook Marketplace (12 Mar 2026): upload an image → AI creates full item summary with recommended price "based on similar listings"; more shipping options incl. prepaid labels generated in the listing flow; Meta AI auto-replies to "is this still available" (tested since Nov 2025); AI-generated seller profile summaries; Marketplace "over 1.1 billion active users" (CNBC, Mar 2025) — [Social Media Today](https://www.socialmediatoday.com/news/facebook-adds-ai-powered-updates-to-marketplace/814639/)
- Hands-on test (16 Mar 2026): "Create listing details" drafts title, price, description; four tones (Recommended, Friendly, Professional, Concise); correctly identified a mouse pad eBay's tool had mis-identified; also picked up an unintended coaster; Meta has published no accuracy benchmarks — [Value Added Resource](https://www.valueaddedresource.net/meta-ai-listing-facebook-marketplace/)
- Meta "Seller" app (24 Jul 2026): free iOS app for US sellers 18+, Meta AI drafts title/description/price/category from photos, bulk listing, unified inbox, performance dashboard; ~430 M items listed globally per month; > 1 billion active users; Marketplace's 10th anniversary; Android in testing — [The Next Web](https://thenextweb.com/news/meta-seller-app-facebook-marketplace-ai-listing); [PYMNTS](https://www.pymnts.com/meta/2026/meta-ai-writes-listings-and-sets-prices-for-facebook-marketplace-sellers/)
- Mercari "AI出品サポート" launched 10 Sep 2024: photo + category → auto-filled description, condition and price; "最短3タップで出品が完了" (as few as 3 taps); on by default; motivated by a 2023 user survey showing listing-detail entry felt burdensome and caused abandonment — [ECnomikata](http://ecnomikata.com/ecnews/44437/)
- OpenAI customer story on Mercari: AI Listing Support introduced Sep 2024; earlier Mercari AI Assistant Oct 2023 used GPT-4 offline to mine key attributes of top listings per category; "a few hundred AI-assisted listings are created per minute", listing conversion rates rose; multi-image input improved output; two features integrated via GPT-4o mini — [OpenAI (page returned 403; figures from search snippets of the same page)](https://openai.com/index/mercari)
- Google Cloud: Mercari "launched a new AI listing feature to more than 20 million users in two months"; image search on Vertex AI — [Google Cloud customer page (truncated on fetch; from snippet)](https://cloud.google.com/customers/mercari-data)
- Xianyu AI publishing: copy adoption rate > 87 %, 230 M items cumulatively assisted (CEO Ding Jian, Wuzhen World Internet Conference 2025); AI-publishing feature MAU 18.078 M, No. 1 in AI copywriting (QuestMobile); Xianyu MAU 217 M, +19.64 % YoY; AI tool suite covers 45 M users; AI tools (publish, smart hosting/consignment, smart search, market-price monitoring) drove > 10 bn yuan GMV; daily sell-through of newly listed items +10 %; pricing model "LLP", generative semantic IDs "GSID" — [Lanjinger, 10 Feb 2026](https://www.lanjinger.com/d/1770626062244097201)
- Xianyu AI camera launched 25 Mar 2026: photo → listing in ~5 s; AI price from a model co-trained by Xianyu and Qwen; by 1 Jun 2026 > 12 M users had used it and > 50 M new items were listed; helped expansion into "sixth-tier cities"; reporter's sofa test produced a full description and 200–450 yuan valuation in ~5 s — [Beijing News, 25 Mar 2026](https://m.bjnews.com.cn/detail/1774420829129188.html); [Beijing News, 1 Jun 2026](https://www.bjnews.com.cn/detail/1780312372129695.html)
- China second-hand e-commerce: 645.02 bn yuan GMV in 2024, +17.56 %; 660 M users, +13.79 % (电数宝 data cited by Beijing News) — [Beijing News](https://m.bjnews.com.cn/detail/1774420829129188.html)
- OLX "AI at OLX" page: GenAI ad posting automates attributes and descriptions, cutting posting time 35–55 % and improving ad quality up to 37 %; US$30 M invested in AI in FY26; ~150 staff in AI; 85+ live AI use cases; 12+ agentic solutions; AI content is disclosed; prices are not set by AI without voluntary consent — [OLX Group](https://www.olxgroup.com/ai-at-olx/)
- OLX FY2026 (year to 31 Mar 2026, published 29 Jun 2026): revenue US$992 M (+28 %, +16 % local ex-M&A), adj. EBITDA +53 %, margin +8 pp; AI posting tools cut real-estate listing time by 50 %; CompassGPT conversational search; > US$200 M invested in AI since 2018; "nearly 60 million daily listings" across 7 markets (BG, FR, PL, PT, RO, ZA, UA) — [OLX Group](https://www.olxgroup.com/?p=5024)
- OLX launched CompassGPT and AutoIQ (AI dealer descriptions in the dealer's tone, pricing recommendations, inventory summaries, lead dashboard) in Lisbon, Feb 2026 — [Business Wire, 25 Feb 2026](https://www.businesswire.com/news/home/20260225053516/en); AutoTrader SA auto-generates vehicle descriptions, "up to 10,000 hours" saved — [ITWeb](https://www.itweb.co.za/article/olx-invests-over-r300m-to-enhance-ai-capabilities/JN1gPvOAjneMjL6m)
- Carousell "List with AI" built on Gemini: seller starts from a short video or photos; "boosts items listed per seller by 20 %"; median listing time < 2 min; goal < 45 s — [Google Cloud customer story (fetch truncated; from search snippets of the same page)](https://cloud.google.com/customers/carousell); App Store copy: "list in 30 seconds", AI listing for non-merchant sellers, video AI in Singapore, photo AI in SG/MY/HK/PH — [Apple App Store](https://apps.apple.com/us/app/-/id548607187)
- Leboncoin 16 Dec 2024: from a photo and title the AI writes a detailed description, suggests a market-aligned price and delivery options; initially "Jeux et Jouets", "Jeux Vidéo", "Électroménager", all categories planned early 2025; image search in app; personalised homepage; 26.8 M monthly users, 67 M ads, up to 5 M requests/s, 600 tech staff (~40 % of workforce); uses CamemBERT — [Presse-citron](https://www.presse-citron.net/leboncoin-passe-a-lintelligence-artificielle-ce-que-ca-va-changer-concretement/); [Siècle Digital](https://siecledigital.fr/2024/12/16/leboncoin-annonce-de-nombreuses-nouveautes-et-ambitionne-de-devenir-le-leader-du-e-commerce/)
- Leboncoin car module (announced 20 May 2025): private seller gives photo + registration plate + title → generated listing; automotive director Olivier Flavier claims AI listings are "20 % plus efficaces" (consumer goods, no data published) — [Journal de l'Automobile](https://journalauto.com/services/leboncoin-adresse-lia-generative-aux-revendeurs-particuliers/)
- Marktplaats "Supersnelle advertenties": upload photo + asking price → AI proposes category, title, description and details "in a few seconds"; model `gemini-2.0-flash-001`; app-only (Android/iOS); optional; excluded: cars, contacts, services/tradespeople, animals, housing, tickets, jobs, holidays, misc.; terms warn suggestions may be "incorrect, outdated or biased" — [Marktplaats](http://www.marktplaats.nl/m/supersnelle-advertenties/); Marktplaats said it is working on image recognition and a chatbot giving listing advice from what sells fastest — [Emerce](https://www.emerce.nl/interviews/marktplaats-werkt-beeldherkenning-chatbot-advertentieadvies)
- Depop: upload a single photo → generated description plus category, colour, sub-category, brand — [Apparel Resources](https://apparelresources.com/technology-news/retail-tech/depop-launches-ai-powered-description-generation-streamline-listing-process-sellers/); [Retail Dive](https://www.retaildive.com/news/depop-generative-artificial-intelligence-product-descriptions-photo/727860/)
- Wallapop listing flow starts with "una única palabra" to define the product, photos afterwards; no native AI listing found; its disclosed AI partnership (Albatross AI) is for real-time catalogue personalisation — [Xataka](https://www.xataka.com/basics/como-poner-un-anuncio-en-wallapop); [mind.eu](https://www.mind.eu.com/retail/en/article/personalisation-why-wallapop-second-hand-marketplace-chose-albatrossai); [citybiz](https://www.citybiz.co/?p=805753)
- Vinted: only third-party tools (Vintapp, FlipFlow, AutoLister AI, Vindy) claim photo-to-listing; no Vinted help-centre or press source found — [Vintapp on hunted.space](https://hunted.space/product/vintapp); [AutoLister AI](https://chromeboard.com/extension/autolister-ai-mommklhpammnlojjobejddmidmdcalcl)
- FINN.no shows AI-generated summaries at the top of job ads; its marketplace photo tips use AI-generated example images; ad rules require images to show the actual item — [FINN jobb](https://www.finn.no/bedriftskunde/aktuelt/finn-jobb/ai-losninger); [FINN torget tips](https://www.finn.no/bedriftskunde/ressurser/vare-beste-tips-til-annonsering-pa-finn-torget); [FINN rules](https://hjelpesenter.finn.no/hc/no/articles/22619113173650-Annonseregler-for-FINN-no)
- eBay (comparator) shipped AI-powered bulk listing in Jan 2025 — [eBay UK seller centre](https://ebay.co.uk/sellercentre/news/2025-january/ai-bulk-listings)

### Inferences
- The industry standard by 2026 is: photo(s) → category + title + description + price, opt-out/editable, with vehicles/real estate/jobs excluded from generic flows. A new portal that launches without this is behind every incumbent in its peer group except Bazoš.
- Vendors cluster on Google Gemini (Carousell, Marktplaats), OpenAI (Mercari), in-house/Qwen (Xianyu), Meta AI (Facebook); Adevinta brands do not name vendors. A Gemini Flash-class model is sufficient for the Marktplaats-style flow.
- The only independently comparable throughput metric is Xianyu's (adoption 87 %, +10 % daily sell-through); all other impact figures are vendor case studies. Reasonable planning assumption for Tržko: +15–20 % listings per active seller and listing time under 1–2 minutes if the flow is photo-first.
- Price suggestion from sold data is bundled into listing AI at Facebook ("based on similar listings"), Leboncoin, Mercari and Xianyu; OLX explicitly does not auto-set prices without consent — a useful compliance pattern for EU (DSA/AI Act transparency).

### Gaps
- No verified AI listing feature for Willhaben, Subito, DBA, Tori, Blocket, Gumtree, Craigslist, OfferUp, Karrot or Vinted (the last two searches for Subito/Willhaben could not run: search budget exhausted).
- Vendors/models for Kleinanzeigen, Leboncoin (generative part), OLX, Facebook not disclosed.
- No portal publishes listing-completion-rate deltas; Mercari/Carousell/OLX figures are vendor marketing without methodology.
- Mercari "app for ChatGPT" (2026, via MCP) appeared in search snippets but the primary source could not be confirmed.

---

## Key question 2: AI in search, discovery, chat, pricing and translation

### Takeaway
Image search (Mercari, Leboncoin, Xianyu), conversational/semantic search (OLX CompassGPT & "OLX Magic", Leboncoin in ChatGPT, Mercari "Merchat AI"), deep personalisation (OLX: +230 % listing views, +450 % replies) and AI chat assistance (Facebook auto-replies, Kleinanzeigen PRO replies/real-estate assistant, Xianyu smart hosting) are the proven buyer-side features; AI negotiation exists only as experiments or third-party seller bots. No portal in scope was found to document cross-language auto-translation of listings or chats.

### Comparison table B — AI in discovery and communication

| Feature | Portals with it (date) | Evidence of impact |
|---|---|---|
| Image / visual search | Mercari JP (Vertex AI; also used by sellers for price research); Leboncoin app (Dec 2024, "Circle to Search"-like); Xianyu "AI智搜" (2025) | Mercari: "millions of searches and tens of thousands of transactions" in first months (Google Cloud) |
| Conversational / semantic search | OLX CompassGPT (Feb 2026), "OLX Magic" (Prosus, planned); Leboncoin app inside ChatGPT (Feb 2026, 89 M ads); Mercari US "Merchat AI" on ChatGPT (beta 2023) | No public metrics |
| Personalised feed | OLX (6 years of ML; LTR, near-real-time embeddings); Leboncoin personalised homepage (Dec 2024); Wallapop + Albatross AI (2025); Carousell weekly personalised recommendations | OLX: +230 % listing views, +450 % replies, +118 % deliveries, +22 % VAS revenue (Prosus case study, undated, "over 6 years"); Carousell CTR +73 % |
| Price suggestion engines | Facebook (similar listings), Leboncoin (market price), Mercari (auto price), Xianyu (LLP; Qwen-trained AI camera pricing; "AI行情" market monitor) | Xianyu: pricing aims at "highest likely sale rate"; no accuracy data |
| AI chat assistants / auto-replies | Facebook auto-replies (tested Nov 2025, GA Mar 2026) + AI seller summaries; Kleinanzeigen PRO reply suggestions + real-estate assistant (Jul 2026); Xianyu smart hosting (consignment) & third-party XianyuAutoAgent seller bots | None published |
| AI negotiation | Only a registered field experiment on Xianyu (AI-assisted bargaining) and open-source seller bots with "tiered price reduction" | No results published |
| AI moderation / trust | OLX: AI moderates 95 % of ~2 M listings/day, > 7 M images/day, GenAI cut bad-content detection cost another 15 %; Karrot: AI fraud flags + trust scores; Facebook AI seller summaries | OLX numbers from Prosus investor case study |
| Auto-translation | Not found for any portal (Vinted help centre search returned only extensions) | — |

### Cited Findings
- Mercari image search runs on Vertex AI; sellers use it for price research; "in the first few months of launching image-enabled search, Mercari has seen millions of searches and tens of thousands of transactions attributed to the feature" — [Google Cloud (snippet)](https://cloud.google.com/customers/mercari-data); Japanese report: matches photos to similar items using ~5 years of training data — [ECnomikata](https://ecnomikata.com/ecnews/ecmall/21981/)
- Mercari US "Merchat AI", a ChatGPT-based shopping assistant in beta since Apr 2023 — [The Bridge](https://thebridge.jp/2023/04/us-mercari-launches-merchat-ai-a-new-shopping-assistant-powered-by-chatgpt)
- Leboncoin launched an app inside ChatGPT (Feb 2026) giving conversational access to its 89 M ads via an official tool — [Siècle Digital, 9 Feb 2026](https://siecledigital.fr/2026/02/09/leboncoin-arrive-dans-chatgpt/); [Solutions Numériques](https://www.solutions-numeriques.com/?p=244898)
- Leboncoin image search ("façon Google Lens") in the mobile apps; "Supersmartbump" re-ranks boosted ads by relevance to searches — [Journal de l'Automobile](https://journalauto.com/services/leboncoin-adresse-lia-generative-aux-revendeurs-particuliers/); [Presse-citron](https://www.presse-citron.net/leboncoin-passe-a-lintelligence-artificielle-ce-que-ca-va-changer-concretement/)
- OLX personalisation: before, feed was freshness-sorted; after, > 230 % increase in listing views, +450 % replies, +118 % deliveries, +22 % more VAS revenue; moderation: AI handles 95 % of 2 M listings/day, > 7 M images/day at human-level accuracy, GenAI −15 % cost; marketing ROI models +17 %; "OLX Magic" conversational buying experience "coming soon" to attract younger users — [Prosus "AI at Prosus: OLX case study" (PDF)](https://www.prosus.com/~/media/Files/P/prosus-corp-v2/investors/ai-at-prosus-olx-case-study.pdf)
- OLX CompassGPT conversational search for buyers (Feb 2026) — [OLX FY2026 results](https://www.olxgroup.com/?p=5024)
- Xianyu showcased "AI智搜" (smart search) and "AI行情" (market price) buyer tools at the 2025 World Internet Conference; AI service orders on Xianyu reached 9.816 M in H1 2026, +157 % (these are sellers offering AI services, a different business) — [Yangtse Evening Post](https://www.yzwb.net/news/kj/202511/t20251108_287006.html); [IT之家](https://www.ithome.com/0/983/021.htm)
- Facebook Marketplace: Meta AI drafts and sends replies to "still available" questions using listing details (sellers enable/preview/edit); AI summaries of seller profiles (connections, account age, Marketplace activity) — [Social Media Today](https://www.socialmediatoday.com/news/facebook-adds-ai-powered-updates-to-marketplace/814639/)
- Wallapop chose Albatross AI for real-time personalisation of its catalogue — [mind.eu](https://www.mind.eu.com/retail/en/article/personalisation-why-wallapop-second-hand-marketplace-chose-albatrossai); [citybiz](https://www.citybiz.co/?p=805753)
- Randomised field experiment registered: "AI-Assisted Decision-Making: An Experimental Study of Bargaining in the Second-Hand Market" on Xianyu, buyers contacting real sellers; no results in registry — [AEA RCT Registry](https://www.socialscienceregistry.org/trials/17607); open-source "XianyuAutoAgent" automates seller-side negotiation with tiered price cuts — [SourcePulse](https://www.sourcepulse.org/projects/1929160)
- Karrot uses GPS user verification, AI to flag fraud/danger, and assigns trust scores — [BetaKit](https://betakit.com/south-koreas-neighbourhood-buy-and-sell-app-karrot-hits-one-million-canadian-users-builds-toronto-engineering-hub/)
- Vinted Help Centre offers an AI-summarised answer and an AI virtual assistant based on help articles; no article on listing/message translation was found — [Vinted help](https://www.vinted.com/help/265)
- ThredUp 2026 report: 48 % of secondhand shoppers use AI shopping tools in their journey; 63 % comfortable with agentic buying; 46 % discover resale via social feeds, creators and in-person browsing — [Retail Dive](https://retaildive.com/news/us-resale-market-surpass-78-billion-in-2030-secondhand/816470/)

### Inferences
- The highest-leverage discovery investment for a liquidity-constrained portal is personalised ranking (OLX's +450 % replies is the largest effect in any source), which needs behavioural data, so instrumentation should precede the feature.
- For a joint SK+CZ market, machine translation is a differentiator no incumbent documents; given Slovak/Czech mutual intelligibility the bigger value is cross-border search normalisation (price in EUR/CZK, delivery options) rather than translation per se.
- "Portal inside ChatGPT" (Leboncoin, Mercari) is an emerging distribution channel in 2026; an MCP/app endpoint is cheap to expose.

### Gaps
- No metrics for conversational search adoption (CompassGPT, Leboncoin in ChatGPT, Merchat).
- No evidence of production AI negotiation on any portal; Xianyu experiment results not published.
- Auto-translation: no source for any portal; Vinted's cross-border behaviour could not be verified from its help centre.

---

## Key question 3: UX and growth patterns that measurably work

### Takeaway
Documented benchmarks: Carousell median listing time < 2 min (goal 45 s, marketing "30 s"), Xianyu AI camera ~5 s, Mercari 3 taps, OLX −35–55 % posting time. The only published retention effects are Carousell's personalised push (+71 % week-3 retention, +73 % CTR) and generic push-opt-in studies (Airship: 40–90 % longer retention). Hyperlocal GPS radius (Karrot, 5 km in Canada), prepaid shipping labels in flow (Facebook, Vinted Go / 500 k PUDO points) and trust signals (AI seller summaries, trust scores) are the recurring structural choices; Bazoš's own engagement (13–14 pages/visit, 7–9 min/visit, ~25 % bounce) shows a lean form-based UX still retains well in SK/CZ.

### Comparison table C — UX benchmarks found

| Pattern | Benchmark / implementation | Source |
|---|---|---|
| Time to publish | Carousell: median < 2 min with AI, target < 45 s; App Store "list in 30 seconds" | Google Cloud; App Store |
| | Xianyu AI camera: ~5 s photo → published listing | Beijing News, 25 Mar & 1 Jun 2026 |
| | Mercari: "as few as 3 taps" | ECnomikata, Sep 2024 |
| | OLX: posting time −35–55 % (generic), −50 % (real estate) | olxgroup.com; FY2026 results |
| | Marktplaats: listing created "in a few seconds" after photo + price | Marktplaats |
| Voice input in listing | Kleinanzeigen (iOS, Nov 2025) | mobiflip |
| Hyperlocal radius | Karrot Canada initial radius 5 km; GPS-verified neighbourhood; avg Korean household 20–25 min/day in app | BetaKit, May 2024 |
| Push / saved-search alerts | Carousell personalised push with listings user showed interest in → +71 % week-3 retention, +73 % CTR | CleverTap case study (vendor) |
| | Push opt-in users retained 90 % longer (Android) / 40 % longer (iOS); any push in first 90 days → ~3x retention | Airship/Urban Airship studies (vendor, retail apps) |
| Shipping label in listing flow | Facebook Marketplace prepaid labels (Mar 2026); Vinted: > 500 000 PUDO points, Vinted Go in 5 countries (2025); Seznam's Zavezu.cz used by Sbazar | Social Media Today; FashionUnited; MediaGuru |
| Trust signals | Facebook AI seller summaries; Karrot trust scores; OLX AI moderation 95 % | SMT; BetaKit; Prosus |
| Opt-out AI | Kleinanzeigen: switch back to classic flow keeps data; Marktplaats optional; OLX discloses AI content | mobiflip; Marktplaats; OLX |
| Bazoš engagement (baseline) | bazos.cz: 13.33 pages/visit, 7 min 25 s, bounce 25.6 %; bazos.sk: 14.46 pages/visit, 8 min 44 s, bounce 25.5 % (Sep 2026) | Similarweb |
| Vinted.cz engagement | 10.93 pages/visit, 8 min 16 s, bounce 19.5 % (Sep 2026) | Similarweb |

### Cited Findings
- Carousell + CleverTap: personalised push notifications with listings the user showed interest in, weekly personalised recommendations, funnel analysis → "71 % increase in Week 3 retention rates", "73 % improvement in average CTRs"; "250 million listings", 7 countries — [CleverTap case study](https://clevertap.com/case-study/how-carousell-increased-week-3-retention/)
- Airship (Urban Airship) retail-app studies: push opt-in users retained 90 % longer on Android, 40 % longer on iOS; users receiving any push in first 90 days have ~3x (190 %) higher retention — [Airship newsroom](https://www.airship.com/newsroom/urban-airships-mobile-app-retention-study-for-key-industry-verticals/); [Adweek](https://www.adweek.com/performance-marketing/how-to-double-user-retention-with-push-notifications-urban-airship-shares-best-practices/)
- Karrot Canada: initial radius 5 km; GPS verification; AI flags fraud; trust scores; first North American launch Toronto early 2022; 1 M registered Canadian users Apr 2024; cities Toronto, Vancouver, other ON/BC cities, New York, Chicago; plan: > 50 new markets in 5 years; average Korean household uses the app 20–25 min/day — [BetaKit, 2 May 2024](https://betakit.com/south-koreas-neighbourhood-buy-and-sell-app-karrot-hits-one-million-canadian-users-builds-toronto-engineering-hub/)
- Karrot passed 2 M cumulative Canadian users (Feb 2025, ~8 months after 1 M); 36 M cumulative subscribers and ~19 M MAU at end-2023; available in > 1,400 regions in UK, Canada, US and parts of Japan — [Startup Recipe, 19 Feb 2025](https://en.startuprecipe.co.kr/archives/18104)
- Vinted FY2025: delivery network > 500 000 pick-up/drop-off points in Europe; Vinted Go in BE, FR, NL, PT, ES; new sorting centre in France; CEO Thomas Plantenga: strengthening "the pillars that underpin the marketplace: shipping and payments" — [FashionUnited, Apr 2026](https://fashionunited.uk/news/business/vinted-reaches-1-1-billion-euros-in-revenue-for-2025-accepting-a-strategic-drop-in-profits/2026040987347)
- Vinted CZ introduced buyer-protection fee 18 CZK + 5 % with a "buy now" button (Nov 2021); forum users threatened to switch to Facebook Marketplace; Glami's Hana Zachová expected the simple secure payment to also attract new users — [E15, 28 Nov 2021](https://www.e15.cz/byznys/obchod-a-sluzby/secondhandovy-odevni-obr-vinted-zpoplatni-sluzby-hrozi-mu-utek-casti-uzivatelu-1385716)
- Bazoš model (2018): ads free, no investment ever taken, revenue from contextual ads and "topping" an ad (59 CZK via SMS, 39 CZK via transfer/card) — [CzechCrunch, 12 Sep 2018](https://cc.cz/cesky-bazos-cz-vstupuje-do-polska/)
- Similarweb Sep 2026: bazos.cz 15.7 M monthly visits, global rank 1,735, #9 in CZ, #1 Marketplace CZ, 13.33 pages/visit, 7:25, bounce 25.55 %, −3.8 % MoM — [Similarweb](https://www.similarweb.com/website/bazos.cz/); bazos.sk 11.1 M visits last 3 months, global 2,504, #5 SK, #1 Classifieds SK, 14.46 pages/visit, 8:44, bounce 25.53 %, −2.2 % MoM — [Similarweb](https://www.similarweb.com/website/bazos.sk/); vinted.cz 4.9 M visits/3 months, #58 CZ, 10.93 pages/visit, 8:16, bounce 19.51 %, +15.37 % MoM — [Similarweb](https://www.similarweb.com/website/vinted.cz/); sbazar.cz 3.6 M visits/3 months, #85 CZ, 6.27 pages/visit, 5:37, bounce 33.0 %, −9.07 % MoM — [Similarweb](https://www.similarweb.com/website/sbazar.cz/)
- Blocket's new shared platform (autumn 2025) "faced strong criticism in recent months for lacking functionality"; Vend Q4 2025 call: user satisfaction recovering more slowly after the Tori and DBA platform transitions — [Placera, 18 Dec 2025](https://www.placera.se/analys/analys-blocket-agaren-ger-en-unik-exponering--2025-12-18); [Vend Q4 2025 transcript (roic.ai)](https://www.roic.ai/quote/SBSNF/transcripts/2025-year/4-quarter)
- Facebook Marketplace appeal to young users is attributed to profile-based trust vs anonymous Craigslist (CNBC) — [NBC/CNBC](https://www.nbcboston.com/news/business/money-report/how-facebook-marketplace-is-keeping-young-people-on-the-platform/3652079/)
- Slovak Gen Z (DPD 2025): 79 % say it is important to know the delivery company; 70 % of parcels go to lockers, pick-up points or seller's store; 56 % rate delivery as simple — [DPD E-shopper Barometer 2025 (SK PDF)](https://www.dpd.com/wp-content/uploads/sites/225/2026/02/E-shopper-barometer-2025-1.pdf)

### Inferences
- Lean, information-dense, form-based UX (Bazoš) still yields top-tier engagement in SK/CZ; the measurable gain from AI is in listing time and listings per seller, not necessarily in session depth.
- Platform migrations (Blocket/Tori/DBA 2025) are a documented retention risk; a new portal should avoid forced re-platforming of users.
- Personalised push tied to saved interests is the one retention lever with a classifieds-specific number (+71 % W3); saved searches + push alerts should be in v1.

### Gaps
- No published data on reserved/sold states, chat templates/quick replies, dark mode, bottom-tab structure, PWA vs native, or accessibility for any portal in scope.
- No classifieds-specific study linking saved-search alerts to retention (Zillow figure on Dataford is an unsourced interview scenario — excluded).
- Device split (mobile vs desktop) for Bazoš not shown on the public Similarweb page.

---

## Key question 4: Growth and liquidity tactics (chicken-and-egg)

### Takeaway
The documented playbooks are: city-by-city hyperlocal seeding with a hard radius (Karrot: Toronto 2022 → 1 M users in 2 years → 2 M eight months later), media-for-equity TV blitz (Wallapop/Atresmedia €1.3 M, 2014, top-5 App Store within a week), absorbing a local leader and keeping the brand (Vinted ← VotočVohoz.cz; Vend keeps FINN/Blocket/Tori/DBA brands), zero-cost supply from an existing social graph (Facebook: 430 M listings/month), and M&A-driven consolidation (Adevinta/eBay Classifieds, Naver ← Wallapop €600 M). Carrier/payment partnerships (Vinted Go, 500 k PUDO; Zavezu.cz for Sbazar) and performance-marketing for listers (Wallapop +36 % listers YoY via Jampp) are the operational levers.

### Comparison table D — Growth tactics

| Tactic | Portal / example (date) | Documented result | Source |
|---|---|---|---|
| Hyperlocal city-by-city launch, strict radius | Karrot: UK Nov 2019 "open globally, watch organic growth, then narrow focus"; Toronto 2022; 5 km radius | Canada 1 M (Apr 2024) → 2 M (Feb 2025); 1,400 regions in 4 countries; Japan MAU ×3.5 YoY (early 2024) | KED Global; BetaKit; Startup Recipe |
| Media-for-equity TV | Wallapop + Atresmedia (Apr 2014, ~€1.3 M of airtime for shares); later "Súbelo" spots | Top-5 App Store "in less than a week" (agency claim) | Panorama Audiovisual; TechCrunch 2015; LBB |
| Performance marketing for supply | Wallapop + Jampp | +36 % YoY lister growth | Jampp (vendor) |
| Absorb local leader, keep users | Vinted merged VotočVohoz.cz (CZ, founded 2011; 500 k monthly UV in 2013) | "Every third Czech woman uses it" (2019 claim) | CzechCrunch 2019 |
| Country roll-out | Vinted: 11 markets (2019) → 15 (2021) → LV, EE, SI in 2025, US Jan 2026 | GMV €10.8 bn (+47 %) 2025 | CzechCrunch; E15; FashionUnited |
| Zero-cost supply from social graph | Facebook Marketplace (10 years old in 2026) | > 1 bn active users; ~430 M items listed/month | TNW; SMT |
| M&A consolidation | Adevinta ← eBay Classifieds; Naver ← Wallapop (€600 M, completed Jan 2026); letgo–Wallapop merger (2016) | Wallapop > 21 M monthly users S. Europe; 2024 revenue €101 M, loss €25 M | FashionUnited ES; El Referente; Ara; Retail Dive |
| Keep local brands under group | Vend (ex-Schibsted Marketplaces, May 2025) keeps FINN, Blocket, Tori, Oikotie, DBA, Bilbasen | — | vend.com; FINN |
| Carrier / payments integration | Vinted Go + 500 k PUDO; Facebook prepaid labels; Seznam took stake in Zavezu.cz, Sbazar first user; Vinted CZ buyer-protection fee 18 CZK + 5 % | — | FashionUnited; SMT; MediaGuru; E15 |
| Cross-border expansion of a lean incumbent | Bazoš → Bazos.pl (Sep 2018), earlier Austria test; no outside capital | 700 k daily UV CZ+SK, 100 k new ads/day (2018) | CzechCrunch |
| AI as supply lever | Xianyu AI camera | 12 M users, 50 M listings in ~2 months; expansion into low-tier cities | Beijing News |

### Cited Findings
- Danggeun launched Karrot in the UK in Nov 2019, later US, Canada, Japan; strategy: open globally, observe organic growth, then narrow focus to specific countries and cities; co-CEO credits hyperlocal strategy in North America and Japan where "few services serve neighborhoods"; > 21 M registered users in Korea; 10 M WAU in Mar 2021; first annual profit 2023 — [KED Global, Apr 2024](https://www.kedglobal.com/newsView/ked202404220007); [KED Global, Jul 2024](https://www.kedglobal.com/newsView/ked202407040005)
- Karrot raised $162 M at $2.7 bn valuation (Aug 2021) — [TechCrunch](https://techcrunch.com/2021/08/17/south-korean-online-secondhand-marketplace-danggeun-market-raises-162m-at-a-2-7b-valuation)
- Atresmedia entered Wallapop's shareholding in exchange for advertising space (media-for-equity, Apr 2014) — [Panorama Audiovisual](https://www.panoramaaudiovisual.com/en/2014/04/25/atresmedia-entra-en-el-accionariado-de-wallapop-bajo-un-modelo-media-for-equity); "took in €1.3 million from Atresmedia as part of a 'media for equity' deal"; TV adverts "supercharged growth" — [TechCrunch, May 2015](https://techcrunch.com/2015/05/19/wallapop-is-poised-to-disrupt-classifieds-as-accel-insight-fidelity-pack-its-war-chest/); agency claim "in less than a week, we took Wallapop to the top 5 in Apple Store" — [LBB Online](https://www.lbbonline.com/news/how-to-take-a-startup-from-seed-phase-to-industry-leader)
- Wallapop + Jampp: 36 % YoY lister growth — [Jampp](https://www.jampp.com/blog/wallapop-drives-36-yoy-lister-growth-with-jampp); Wallapop's US launch was unsuccessful; later launched in Italy — [Sifted](https://sifted.eu/articles/wallapop-international-expansion)
- letgo–Wallapop merger (2016) seen as threat to Craigslist/Close5 — [Retail Dive / Mobile Commerce Daily](https://retaildive.com/ex/mobilecommercedaily/letgo-wallapop-merger-threatens-craigslist-close5-as-mobile-classified-space-crowds)
- Naver completed the acquisition of Wallapop (~€600 M) from Prosus Ventures, Letgo Global, Northzone, Korelya, etc. (Jan 2026); 2024 revenue €101 M, loss ~€25 M, breakeven in Spain; CEO Rob Cassedy guided ~€100 M revenue 2025; > 21 M monthly users in Southern Europe — [FashionUnited ES](https://fashionunited.es/noticias/empresas/la-surcorena-naver-completa-la-compra-de-wallapop/2026013048271); [El Referente](https://elreferente.es/actualidad/naver-completa-la-compra-de-wallapop-por-600-millones-y-refuerza-su-apuesta-por-europa/); [Ara](https://en.ara.cat/economy/wallapop-loses-25-million-despite-improving-revenue_1_5492126.html)
- Vinted: VotočVohoz.cz founded 2011, 500 k monthly UV and 36 M page views in 2013, 95 % women, fully merged into Vinted's Czech domain; Vinted 2019: 11 markets, €128 M round, unicorn, revenue €33 M (2018), ~25 M registered users, 180 M listings, 75 % of users had never bought/sold second-hand before, near-bankruptcy turnaround under Thomas Plantenga with "rapid international expansion" a major earlier problem — [CzechCrunch, 2 Dec 2019](https://cc.cz/z-nenapadne-burzy-obleceni-az-k-prvnimu-miliardovemu-startupu-v-litve-vinted-ma-silnou-stopu-i-v-cesku/)
- Vinted 2021: 15 markets incl. CZ, > 700 employees, > 45 M users — [E15](https://www.e15.cz/byznys/obchod-a-sluzby/secondhandovy-odevni-obr-vinted-zpoplatni-sluzby-hrozi-mu-utek-casti-uzivatelu-1385716); 2025: launched Latvia, Estonia, Slovenia; US entry Jan 2026; "26 countries" — [FashionUnited (search snippet)](https://fashionunited.com/news/business/vinted-reaches-1-1-billion-euros-in-revenue-for-2025-accepting-a-strategic-drop-in-profits/2026040971654)
- Facebook Marketplace: ~430 M items listed per month globally, > 1 bn active users, 10th anniversary (Jul 2026) — [The Next Web](https://thenextweb.com/news/meta-seller-app-facebook-marketplace-ai-listing); "1.1 billion users across 70 countries" (BusinessDasher via CNBC affiliates) — [NBC](https://www.nbcboston.com/news/business/money-report/how-facebook-marketplace-is-keeping-young-people-on-the-platform/3652079/)
- Schibsted Marketplaces renamed Vend (effective 12 May 2025), keeping FINN, Oikotie, Tori, Blocket, DBA, Bilbasen brands — [Vend](https://vend.com/news/schibsted-marketplaces-becomes-vend-a-new-name-for-a-smarter-future); [FINN](https://www.finn.no/bedriftskunde/aktuelt/vend/schibsted-vend)
- Seznam.cz took a stake in transport service Zavezu.cz; Sbazar was the first service to use it — [MediaGuru](https://www.mediaguru.cz/seznam-ziskava-17-ve-sluzbe-zavezu-cz)
- Bazoš entered Poland (Bazos.pl) Sep 2018, first expansion beyond CZ/SK apart from an Austrian test; founder Radim Smička; never took investment — [CzechCrunch](https://cc.cz/cesky-bazos-cz-vstupuje-do-polska/)

### Inferences
- For Tržko the cheapest documented supply tactic is AI-assisted listing + import/cross-posting, but no portal in scope publishes cross-posting/import tools data (gap). Karrot's radius-based seeding and Wallapop's media-for-equity are the two tactics with dated outcomes that a Slovak/Czech launch could replicate (regional TV/media-for-equity deals; city-by-city Bratislava/Košice/Praha/Brno seeding).
- Vinted's CZ history shows that absorbing or partnering with an existing niche community (VotočVohoz) transferred a large female fashion audience; an equivalent SK/CZ niche community acquisition would be a faster liquidity route than paid acquisition.

### Gaps
- No sources on referral programmes, cross-posting tools or listing-import features for any portal in scope.
- OLX Group's acquisition history (letgo, etc.) and OfferUp–letgo 2020 merger could not be verified (search budget exhausted; TechCrunch fetch returned a 2016 funding article only).
- Danggeun 2025 revenue (reported 270.7 bn KRW, +43 %, advertisers +37 % in a search snippet) could not be traced to a primary page — treat as unverified.

---

## Key question 5: Market size, traffic rankings and SK/CZ specifics

### Takeaway
Online classifieds leaders are profitable and growing double digits (OLX FY2026 revenue $992 M +28 %; Vinted 2025 GMV €10.8 bn +47 %, revenue €1.1 bn +38 %; Karrot first profit 2023), while US resale is forecast at $78.8 bn by 2030 (7.3 % CAGR) and global secondhand apparel at $393 bn by 2030 (ThredUp 2026). Europe recommerce estimates range widely by definition ($43 bn, ResearchAndMarkets 2025; €23.8 bn "second-chance" goods, Amazon 2025). In SK (DPD 2025) 77 % of the population shops online, 65 % of regular e-shoppers buy or sell C2C and 78 % of Gen Z do; Czech e-commerce was CZK 206 bn in 2025 (+6 %, APEK). Bazoš remains dominant (bazos.cz 15.7 M visits/month, #9 site in CZ; bazos.sk #5 site in SK, #22 classifieds site worldwide), with vinted.cz growing fast (+15 % MoM) and sbazar.cz shrinking (−9 % MoM).

### Comparison table E — Scale and performance of portals (latest available)

| Portal (owner) | Scale metric | Period | Source |
|---|---|---|---|
| Facebook Marketplace (Meta) | > 1 bn active users; ~430 M items listed/month | Jul 2026 | TNW |
| Xianyu (Alibaba) | MAU 217 M (+19.6 %) | 2025 (QuestMobile) | Lanjinger |
| OLX Group (Prosus) | Revenue $992 M (+28 %), ~60 M daily listings, 7 markets | FY to Mar 2026 | OLX Group |
| Vinted | GMV €10.8 bn (+47 %), revenue €1.1 bn (+38 %), net €62 M (−19 %), FCF €137 M (+36 %), 26 countries | FY2025 | FashionUnited |
| Leboncoin (Adevinta) | 26.8 M monthly users, 67 M ads (Dec 2024); 89 M ads (Feb 2026); #2 classifieds site worldwide | 2024–2026 | Presse-citron; Solutions Numériques; Similarweb |
| Wallapop (Naver) | > 21 M monthly users S. Europe; revenue €101 M (2024), ~€100 M guided 2025; sold for ~€600 M | 2024–Jan 2026 | Ara; El Referente |
| Karrot / Danggeun | ~19 M MAU, 36 M cumulative (end-2023); first profit 2023; Canada 2 M cumulative (Feb 2025) | 2023–2025 | Startup Recipe; KED |
| Carousell | 250 M listings, 7 countries | undated (CleverTap) | CleverTap |
| Mercari JP | AI listing reached > 20 M users in 2 months | 2024 | Google Cloud |
| Vend (ex-Schibsted) | FINN #9, Blocket #11, Tori #14 classifieds worldwide; est. ~6.5 bn (currency not stated) annual revenue; mobility 39 % | Sep 2026; Dec 2025 | Similarweb; Placera |
| Craigslist | #4 worldwide; est. revenue $302 M (2024) vs $660 M (2021), "steady six-year decline" | Apr 2025 | ResearchAndMarkets via GlobeNewswire (snippet) |
| Gumtree | #17 classifieds site worldwide | Sep 2026 | Similarweb |
| Subito | #6 classifieds site worldwide | Sep 2026 | Similarweb |
| Bazoš.cz | 15.7 M visits/month; #9 site in CZ; #1 Marketplace CZ | Sep 2026 | Similarweb |
| Bazoš.sk | 11.1 M visits/3 months; #5 site in SK; #22 classifieds site worldwide | Sep 2026 | Similarweb |
| Vinted.cz | 4.9 M visits/3 months; #58 CZ; +15.4 % MoM | Sep 2026 | Similarweb |
| Sbazar.cz (Seznam) | 3.6 M visits/3 months; #85 CZ; −9.1 % MoM | Sep 2026 | Similarweb |

### Comparison table F — Similarweb "Classifieds" category, worldwide top 20 (Sep 2026)

| Rank | Site | Rank | Site |
|---|---|---|---|
| 1 | avito.ru | 11 | blocket.se |
| 2 | leboncoin.fr | 12 | kufar.by |
| 3 | sahibinden.com | 13 | olx.ro |
| 4 | craigslist.org | 14 | tori.fi |
| 5 | olx.ua | 15 | redbrain.shop |
| 6 | subito.it | 16 | kupujemprodajem.com |
| 7 | olx.in | 17 | gumtree.com |
| 8 | otomoto.pl | 18 | kijiji.ca |
| 9 | finn.no | 19 | olx.kz |
| 10 | opensooq.com | 20 | jiji.ng |

bazos.sk ranks #22 in the same list; kleinanzeigen.de, marktplaats.nl, willhaben.at, mercari and facebook.com are not in the Classifieds category top 50 (categorised elsewhere by Similarweb). Source: [Similarweb top classifieds websites](https://www.similarweb.com/top-websites/e-commerce-and-shopping/classifieds/). Note: the page shows ranks and engagement only, not visit counts.

### Comparison table G — Market-size and generational data

| Metric | Value | Period | Source |
|---|---|---|---|
| US online resale (apparel) | $26 bn 2025 (from $22 bn 2024) | ThredUp 2025 report (GlobalData) | Business Wire / Treet summary |
| US secondhand apparel | → $78.8 bn by 2030, ~7.3 % CAGR; 2025 grew ~4x faster than retail clothing; 2025 growth 19 % (strongest since 2021) | ThredUp 2026 report | Retail Dive; Business Wire snippet |
| Global secondhand apparel | → $393 bn by 2030, 2x apparel growth rate | ThredUp 2026 | Retail Dive |
| Growth share by generation | Gen Z + millennials > 70 % of resale growth to 2030 | ThredUp 2026 | Retail Dive |
| Gen Z/millennial behaviour (US) | 46 % of apparel budget on secondhand; 55 % won't buy new if secondhand exists; 39 % bought secondhand via social commerce; 50 % bought to create content | ThredUp 2025 | Business Wire |
| Europe recommerce | US$43.0 bn 2025; CAGR 15.6 % 2020–24; 10.6 % to 2029 | ResearchAndMarkets Q2 2025 | Business Wire |
| Europe "second-chance" goods (used/open-box/refurbished) | > €23.8 bn 2025, +€2 bn YoY | Amazon-commissioned 2025 | Retail Systems; Retail Gazette |
| Europe second-hand (broad) | €75 bn 2023 → > €120 bn 2027 | trade newsletter (weak) | ProCarrier |
| Back Market | GMV > €3.5 bn 2025 | 2025 | Cross-Border Magazine |
| Young Europeans' wardrobes | 28 % secondhand | Vestiaire survey Apr–May 2025 | FashionUnited |
| US Gen Z closets | 32 % secondhand; Europe handbags 39 % | BCG 2025 | BCG PDF |
| Austria | 62 % of under-30s bought secondhand vs 1 in 3 Boomers | spring 2025 | vol.at |
| China second-hand e-commerce | 645 bn yuan 2024 (+17.6 %), 660 M users | 2024 | Beijing News (电数宝) |
| AI in resale journey | 48 % use AI shopping tools; 63 % comfortable with agentic buying | ThredUp 2026 | Retail Dive |

### Comparison table H — Slovakia and Czechia

| Metric | SK | CZ | Source |
|---|---|---|---|
| Population shopping online | 77 % (80 % in 2023) | — | DPD 2025 |
| Regular e-shoppers (monthly) | 47 % of online shoppers; 85 % of online purchases; 42 purchases/yr; 17.2 % share of all purchases | — | DPD 2025 |
| C2C participation (regular e-shoppers) | 65 % buy or sell second-hand online (22 % both, 31 % buy only, 13 % sell only, 35 % neither) | — | DPD 2025 |
| Gen Z C2C | 78 % buy or sell on C2C platforms; 61 % buy (60 % of them at least monthly; 14.3 purchases/yr); 44 % sell (58 % at least monthly; 17.1 sales/yr) | — | DPD 2025 |
| Delivery preference | 70 % of parcels to lockers/pick-up/store; 79 % want to know carrier | — | DPD 2025 |
| Cross-border | > 65 % buy abroad; 59 % of cross-border purchases from Czech Republic; Gen Z cross-border slightly weakening | — | DPD 2025 |
| Social commerce | 74 % discover products on social media, 48 % buy via them | — | DPD 2025 |
| E-commerce turnover | €1.84 bn 2024 (2nd highest after €2.08 bn 2021); ~5 % of retail, 10 % ex-food | CZK 206 bn 2025 (+6 %), 2nd time > 200 bn; AOV ~1,900 CZK; ~5,000 CZK/month per shopper | TASR/Heureka; APEK via Lupa/CzechCrunch/MediaGuru |
| Internet penetration | > 94 %, > 5.1 M online (early 2025) | — | Delante |
| Second-hand share (old) | — | 12 % of Czechs shop second-hand (Glami 2019); Vinted claimed "every third Czech woman" (2019) | MediaGuru 2019; CzechCrunch 2019 |
| Bazoš traffic (old, company) | 700 k daily UV CZ+SK, 100 k new ads/day, > 1 M active ads CZ (2018) | — | CzechCrunch 2018 |
| Bazoš traffic (Similarweb) | bazos.sk 11.1 M visits/3 mo, #5 SK | bazos.cz 15.7 M visits/mo, #9 CZ | Similarweb Sep 2026 |
| Vinted / Sbazar | — | vinted.cz 4.9 M/3 mo (+15 % MoM); sbazar.cz 3.6 M/3 mo (−9 % MoM) | Similarweb Sep 2026 |

### Cited Findings
- Similarweb worldwide Classifieds ranking (Sep 2026, updated 1 Oct 2026): top 20 as in table F; bazos.sk #22 — [Similarweb](https://www.similarweb.com/top-websites/e-commerce-and-shopping/classifieds/)
- Avito overtook Craigslist as most-visited classifieds site in Nov 2021 (279.6 M visits) — [MyTechDecisions](https://mytechdecisions.com/latest-news/avito-named-worlds-most-visited-classified-ads-site-by-similarweb/)
- Craigslist "remains the No. 1 U.S. classified site by traffic and revenue but is facing a steady six-year decline"; projected 2024 revenue $302 M vs $660 M in 2021 — [ResearchAndMarkets via GlobeNewswire, 28 Apr 2025 (fetch 403; from snippet)](https://www.globenewswire.com/fr/news-release/2025/04/28/3069004/0/en/Craigslist-s-Dominance-in-U-S-Horizontal-Classified-Market-and-Emerging-Competition.html)
- Vinted FY2025: GMV €10.8 bn (+47 %), revenue €1.1 bn (+38 %), adj. EBITDA €151 M (−5 %), net profit €62 M (−19 % from €77 M), FCF €137 M (+36 %); investments in Germany, categories, logistics, payments — [FashionUnited UK](https://fashionunited.uk/news/business/vinted-reaches-1-1-billion-euros-in-revenue-for-2025-accepting-a-strategic-drop-in-profits/2026040987347)
- OLX FY2026 revenue $992 M, +28 % — [OLX Group](https://www.olxgroup.com/?p=5024); FY2025: revenue +18 %, profit +61 % — [OLX Group, 23 Jun 2025](https://www.olxgroup.com/news/olx-group-reports-strong-fy-2025-results-with-18-revenue-growth-and-61-profit-uplift-year-on-year/)
- Adevinta completed sale of its Spanish business to EQT (Jul 2025); Jefferies break-up equity value €19–24 bn mid-point — [Stockopedia/Jefferies](https://www.stockopedia.com/share-prices/autotrader-LON:AUTO/news/adevinta-asset-sales-to-shape-2025-for-european-classifieds-jefferies-says-019e6dc8-4cf2-7bd1-8153-c45e798e9bfd/)
- ThredUp 2025 report: US online resale $26 bn 2025 (from $22 bn); Gen Z/millennials to spend 46 % of apparel budget secondhand; 55 % won't buy new if secondhand available; 39 % bought secondhand via social commerce; 50 % bought to create content — [Business Wire, 19 Mar 2025](https://www.businesswire.com/news/home/20250319230685/en); [Treet summary](https://www.treet.co/post/key-takeaways-from-thredups-2025-resale-report)
- ThredUp 2026 (14th) report: US secondhand apparel → $78.8 bn by 2030 (~7.3 %/yr); 2025 grew ~4x faster than retail clothing; global → $393 bn by 2030; Gen Z + millennials > 70 % of growth; 48 % use AI shopping tools; 63 % comfortable with agentic buying — [Retail Dive](https://retaildive.com/news/us-resale-market-surpass-78-billion-in-2030-secondhand/816470/); "grew 19 % in 2025, strongest since 2021" — [Business Wire, 2 Apr 2026 (fetch 403; snippet)](https://secure.businesswire.com/news/home/20260402799816/en/ThredUps-14th-Annual-Resale-Report-Reveals-New-Era-of-Structural-Competition-and-AI-Driven-Discovery)
- Europe recommerce US$43.0 bn in 2025, CAGR 15.6 % (2020–24), 10.6 % to 2029 — [Business Wire / ResearchAndMarkets, 27 Jun 2025](https://www.businesswire.com/news/home/20250627489258/en); Amazon-commissioned: "second-chance" economy > €23.8 bn in 2025 — [Retail Systems](https://www.retail-systems.com/rs/Online_Resale_Market_To_Grow_By_2bn_Across_Europe_In_2025_Says_Amazon.php); Back Market GMV > €3.5 bn 2025 — [Cross-Border Magazine](https://cross-border-magazine.com/back-market-surpasses-e3-5-billion-gmv/)
- Vestiaire Collective 2025: secondhand = 28 % of young consumers' wardrobes in Europe; second-hand grows 3x faster than new — [FashionUnited](https://fashionunited.com/news/business/vestiaire-collective-report-second-hand-market-grows-three-times-faster-than-new-goods/2025100968640); BCG: 32 % of US Gen Z closets, 39 % Europe handbags — [BCG PDF](https://web-assets.bcg.com/pdf-src/prod-live/how-fashion-luxury-brands-can-win-secondhand-market.pdf); Austria: 62 % of under-30s bought secondhand — [vol.at](https://www.vol.at/almost-half-of-austrians-also-buy-second-hand/9503885)
- DPD E-shopper Barometer 2025 (SK, n = 1,250, May–Jul 2025): 77 % of population shops online (80 % 2023); 47 % regular; regular shoppers = 85 % of purchases, 42/yr, 17.2 % of all purchases; C2C: 22 % buy & sell, 31 % buy, 13 % sell, 35 % neither → 65 % active in C2C; "C2C segment sa posúva od rastu počtu kupujúcich k rastu ich aktivity"; Gen Z: 78 % buy or sell on C2C, 61 % buy (60 % monthly+, 14.3/yr), 44 % sell (58 % monthly+, 17.1/yr); > 65 % buy cross-border, Czech Republic 59 % of origins; 74 % discover on social, 48 % buy there; 70 % of Gen Z parcels to lockers/PUDO — [DPD SK PDF](https://www.dpd.com/wp-content/uploads/sites/225/2026/02/E-shopper-barometer-2025-1.pdf)
- Slovak e-commerce: €1.84 bn 2024, second highest after €2.08 bn (2021); ~5 % of retail, 10 % ex-food (Heureka director) — [TASR/teraz.sk](https://www.teraz.sk/ekonomika/heureka-e-commerce-na-slovensku-vlani-n/848854-clanok.html); first-ever drop recorded (−0.7 %, €1.8 bn) — [Heureka Group](https://heureka.group/cz-en/about-us/group-news/press-releases/slovak-e-commerce-recorded-a-drop-for-the-first-time-in-history) (year of the −0.7 % figure ambiguous between 2023 and 2025 in the sources); internet penetration > 94 %, > 5.1 M Slovaks online, early 2025 — [Delante](https://delante.co/?p=145695)
- Czech e-commerce 2025: CZK 206 bn (+6 %), AOV ~1,900 CZK — [Lupa.cz/APEK](https://www.lupa.cz/n/apek/); [CzechCrunch](https://cc.cz/e-commerce-prekonala-ocekavani-cesi-podruhe-v-historii-v-e-shopech-nakoupili-za-vice-nez-200-miliard/); monthly spend ~5,000 CZK per shopper, APEK panel of 1,000 since Jan 2024, data at data.apek.cz — [MediaGuru](https://www.mediaguru.cz/clanky/2025/09/prumerna-mesicni-utrata-na-internetu-mezirocne-vzrostla/); [MediaGuru](https://www.mediaguru.cz/apek-spousti-portal-s-daty-z-ceske-e-commerce)
- Glami 2019: 12 % of Czechs shop second-hand; Vinted then in 12 markets with 12 M users; Czechs use Facebook Marketplace to sell clothing — [MediaGuru, 30 Jul 2019](https://www.mediaguru.cz/roste-obliba-second-handu-nakupuje-v-nich-12-cechu)
- Vend/Schibsted: ~6.5 bn annual revenue (currency not stated), mobility 39 % — [Placera](https://www.placera.se/analys/analys-blocket-agaren-ger-en-unik-exponering--2025-12-18)

### Inferences
- Measured by Similarweb engagement, Bazoš is roughly 4x Vinted.cz and 13x Sbazar.cz in CZ visits; Vinted is the fastest-growing C2C property in CZ (+15 % MoM, lowest bounce), Sbazar is in decline. Tržko's realistic wedge is general goods (non-fashion) where Vinted is absent and Bazoš has no AI/trust layer.
- SK demand side is already formed (65 % of regular e-shoppers transact C2C; 78 % of Gen Z); the growth is in frequency ("from more buyers to more activity"), so retention features beat acquisition.
- 59 % of Slovak cross-border purchases come from CZ — a joint SK+CZ catalogue with locker delivery is aligned with existing behaviour.

### Gaps
- No reliable mobile share of classifieds traffic (only a low-authority "74 %" figure; Similarweb pages fetched show no device split).
- Kleinanzeigen, Willhaben, Subito, Marktplaats user numbers for 2025 could not be verified from primary sources (secondary estimates 30–42 M for Kleinanzeigen conflict).
- Adevinta FY2025 consolidated figures not found (private since 2024; secondary estimates €1.45–2.1 bn conflict).
- Statista/Similarweb visitor counts for the global ranking are paywalled; only ranks are available.
- No 2025 Czech or Slovak survey on Vinted vs Facebook Marketplace vs Bazoš usage shares; no NetMonitor/IAB data retrieved (search budget exhausted before SK-specific Vinted query).
- Bazoš company revenue/profit not found.

---

## Key question 6: Failures, absorptions and lessons

### Takeaway
The documented failure modes are (a) regulatory/strategic divestment that strands a product (Shpock and Gumtree UK sold as CMA remedies for Adevinta–eBay in 2021; Shpock cut from 180 to ~100 staff in 2018 and now sells subscriptions), (b) trust erosion (Gumtree's reputation for criminal activity; Craigslist's anonymity vs Facebook profiles), (c) product stagnation (Craigslist unchanged, revenue est. −54 % 2021→2024), (d) over-expansion before liquidity (Vinted near-bankruptcy 2019; Wallapop US failure; analysts questioning Karrot's early overseas push), (e) forced platform migrations hurting satisfaction (Blocket/Tori/DBA 2025), and (f) a local incumbent losing to a social-graph rival (Sbazar −9 % MoM, 1/13 of Bazoš's visits, while Facebook Marketplace needs no acquisition cost).

### Comparison table I — Failures and lessons

| Portal | What happened (dated) | Lesson | Source |
|---|---|---|---|
| Shpock | Founded as Finderly; Schibsted bought at ~€190 M (2015); headcount 180 → ~100 (Nov 2018); sold to Russmedia Equity Partners (Jun 2021) as CMA remedy; 2025 reviews complain about mandatory subscription fees | Growth bought by a corporate parent is cut when the parent's priorities change; monetisation switch angers C2C base | Trending Topics; ProductMint; Trustpilot |
| Gumtree UK | Sold with Motors.co.uk to O3 Industries & Novum Capital (2021) to enable Adevinta–eBay deal; earlier reputation "as a hub for criminal activity"; still #17 classifieds site worldwide (Sep 2026); CB Insights claims Feb 2025 acquisition by 58.com (unverified) | Trust & safety and owner attention matter more than brand age | Adevinta PR; ChannelX; Similarweb |
| Letgo | Merged with Wallapop (2016); "Letgo Global" remained a Wallapop shareholder until Naver's 2026 purchase; US fate not verified | Mobile-first entrants consolidated rather than beating incumbents | Retail Dive; El Referente |
| Craigslist | "Famously unchanged"; app only in 2019; est. revenue $660 M (2021) → $302 M (2024); "steady six-year decline"; still #4 classifieds site worldwide | Zero product investment + anonymity cedes young users to Facebook | Shopify; ResearchAndMarkets; CNBC |
| Sbazar (Seznam) | Still live; 3.6 M visits/3 months, −9 % MoM, #4 CZ marketplace vs Bazoš #1 | Portal-owned classifieds lose to a focused, free, lean leader | Similarweb |
| Wallapop | US launch "unsuccessful"; sold to Naver for ~€600 M after 2024 loss of €25 M on €101 M revenue | Cross-border expansion without local liquidity fails; exit via strategic buyer | Sifted; Ara |
| Vinted (2019) | Near bankruptcy after rapid international expansion; turnaround by cost cuts and model change (buyer-pays fee) | Expansion must follow liquidity; buyer-protection fee funded growth | CzechCrunch |
| Blocket / Tori / DBA (Vend) | New shared platform (autumn 2025) criticised for missing functionality; satisfaction recovering slowly after transitions | Migrating users to a group platform costs satisfaction | Placera; Vend Q4 2025 call |
| Karrot overseas | Analysts questioned whether it expanded overseas "too early, before dominating Korea" (2024); hyperlocal "needs more time and effort abroad" | Hyperlocal requires patient, city-level investment | KED Global |

### Cited Findings
- Shpock: founded as Finderly, acquired by Schibsted in 2015 at ~€190 M valuation; "massive wave of layoffs" 2018; CMA-proposed sale to Russmedia Equity Partners (Apr 2021) — [Trending Topics, 27 Apr 2021](https://www.trendingtopics.eu/russmedia-shpock/); Schibsted reduced Shpock headcount from 180 to ~100 in Nov 2018 — [ProductMint](https://productmint.com/shpock-business-model-how-does-shpock-make-money/); Russmedia acquisition completed Jun 2021 — [PR Newswire](https://prnewswire.co.uk/news-releases/russmedia-equity-partners-acquires-online-marketplace-shpock-893041513.html); 2025 Trustpilot reviews complain "they now charge subscription fees if you want to sell stuff" — [Trustpilot](https://pt.trustpilot.com/review/shpock.com?page=4)
- Gumtree UK and Motors.co.uk sold to O3 Industries and Novum Capital — [Adevinta press release](https://adevinta.com/press-releases/adevinta-sells-gumtree-uk-and-motors-co-uk-to-o3-industries-and-novum-capital/); Gumtree's reputation "as a hub for criminal activity" and "corporate abandonment" — [ChannelX](https://channelx.world/2017/06/shpock-update-so-far-so-good/); "In February 2025, Gumtree was acquired by 58.com" (aggregator, unverified) — [CB Insights](https://www.cbinsights.com/investor/gumtree)
- letgo–Wallapop merger (2016) — [Retail Dive](https://retaildive.com/ex/mobilecommercedaily/letgo-wallapop-merger-threatens-craigslist-close5-as-mobile-classified-space-crowds); Letgo Global among sellers to Naver — [El Referente](https://elreferente.es/actualidad/naver-completa-la-compra-de-wallapop-por-600-millones-y-refuerza-su-apuesta-por-europa/)
- Craigslist "famously remained mostly unchanged since its inception, though it did launch an app in 2019" — [Shopify](https://www.shopify.com/blog/craigslist-vs-facebook-marketplace); revenue est. $302 M 2024 vs $660 M 2021, six-year decline — [GlobeNewswire (snippet)](https://www.globenewswire.com/fr/news-release/2025/04/28/3069004/0/en/Craigslist-s-Dominance-in-U-S-Horizontal-Classified-Market-and-Emerging-Competition.html)
- Wallapop US launch unsuccessful — [Sifted](https://sifted.eu/articles/wallapop-international-expansion); 2024 loss ~€25 M — [Ara](https://en.ara.cat/economy/wallapop-loses-25-million-despite-improving-revenue_1_5492126.html)
- Vinted near bankruptcy; rapid international expansion a major cause; CEO Plantenga changed model and cut costs — [CzechCrunch 2019](https://cc.cz/z-nenapadne-burzy-obleceni-az-k-prvnimu-miliardovemu-startupu-v-litve-vinted-ma-silnou-stopu-i-v-cesku/)
- Blocket platform criticism; Tori/DBA satisfaction — [Placera](https://www.placera.se/analys/analys-blocket-agaren-ger-en-unik-exponering--2025-12-18); [Vend Q4 2025 transcript](https://www.roic.ai/quote/SBSNF/transcripts/2025-year/4-quarter)
- Karrot: analysts questioned early overseas expansion; official: hyperlocal "needs more time and effort abroad" — [KED Global](https://www.kedglobal.com/newsView/ked202407040005)
- Sbazar.cz traffic −9.07 % MoM, 3.6 M visits/3 months (Sep 2026) — [Similarweb](https://www.similarweb.com/website/sbazar.cz/)
- OfferUp: 29 M US installs one year after launch (2016), $119 M raise led by Warburg Pincus; photo-based listings, in-app messaging without sharing phone numbers — [TechCrunch, Sep 2016](https://techcrunch.com/?p=1381701); 2025 user estimates conflict (20 M monthly per blogs; 42 M → 44 M "lackluster" 2018–2019 per ProductMint); search traffic ~1.4 M visits May 2025 — [Ahrefs](https://ahrefs.com/websites/offerup.com); [ProductMint](https://productmint.com/?p=1346)

### Inferences
- Monetisation switches that feel punitive to private sellers (Shpock subscriptions, Vinted's 2021 CZ fee backlash) generate churn risk; Vinted survived because the fee bought buyer protection, Shpock did not have the liquidity cushion.
- For Tržko, the Sbazar case is the most direct warning: a portal-backed classifieds with weaker engagement (6.3 pages/visit vs Bazoš 13.3) is losing share without a distinctive proposition; "free + lean" (Bazoš) and "social trust + AI" (Facebook) are the two surviving positions in CZ/SK.

### Gaps
- No post-mortem with internal metrics for Letgo, Shpock or Gumtree; Letgo's 2020 fate (reported OfferUp merger) unverified.
- Sbazar: no closure announcement found; status is "declining, still live".
- Craigslist and OfferUp current user numbers rely on secondary estimates.
- 58.com/Gumtree 2025 claim unverified against any press release.

---

## Appendix: prioritisation signals for Tržko (synthesised from the cited evidence)

| Priority | Feature / tactic | Evidence strength | Why |
|---|---|---|---|
| 1 | Photo-first AI listing (category, title, description, price) on a Gemini-Flash-class model, opt-out, excluded verticals | Strong (Carousell +20 % listings/seller; Xianyu 87 % adoption; OLX −35–55 % time; Marktplaats names `gemini-2.0-flash-001`) | Table-stakes vs every incumbent except Bazoš |
| 2 | Saved searches + personalised push | Medium (Carousell +71 % W3 retention; vendor study) | Only classifieds-specific retention number found |
| 3 | Personalised ranking once data exists | Strong but single source (OLX +230 % views, +450 % replies) | Largest effect size in any source |
| 4 | Locker/PUDO shipping + buyer protection in flow | Strong behavioural evidence (SK: 70 % of Gen Z parcels to lockers; Vinted 500 k PUDO; Facebook labels) | Aligns with SK/CZ delivery habits and cross-border (59 % from CZ) |
| 5 | AI moderation + trust signals (seller summaries, scores) | Strong (OLX 95 % automated; Facebook/Karrot) | Addresses Gumtree/Craigslist failure mode |
| 6 | City-by-city hyperlocal seeding with radius | Medium (Karrot Canada 1 M → 2 M in 8 months) | Proven cold-start pattern |
| 7 | Media-for-equity / TV for brand | Medium (Wallapop 2014; agency-claimed top-5 App Store) | Fastest documented awareness lever |
| 8 | Expose catalogue to ChatGPT/agents (MCP) | Weak/emerging (Leboncoin Feb 2026, Mercari 2026; ThredUp: 48 % use AI tools, 63 % OK with agentic buying) | Low cost, future distribution |
| Later | AI negotiation, auto-translation | None (no production evidence) | Not validated anywhere |
