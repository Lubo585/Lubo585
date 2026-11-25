"""Variant B – indicative cost model (EUR excl. VAT, price level 2026). Produces cost.json + bilingual xlsx with live formulas."""
import json, os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
HERE = os.path.dirname(os.path.abspath(__file__)); A = json.load(open(os.path.join(HERE, "layout.json")))["AREAS"]
OLD, EXT, HALL, NB, NBF = 1667, 1213, 2880, 325, 1300
ROADS = round(A["roads"] + A["south_road"]); STALLS = round(A["stalls_area"]); SIDE = round(A["sidewalks"]); GARDEN = round(A["garden"]); CANOPY = round(A["garden_canopy"]); YARD = round(A["yard"]); VYD = round(A["vydaj"]); VYDR = round(A["vydaj_roof"]); GREEN = round(A["green"], -1)
# (code, SK, PL, unit, qty, unit price)
SO = [
 ("SO 00", "Príprava územia a asanácie", "Przygotowanie terenu i rozbiórki", [
  ("Asanácia skladu parc. 775/3 (598 m², murovaný/oceľový)", "Rozbiórka magazynu dz. 775/3 (598 m²)", "m³ OP", 3590, 24),
  ("Asanácia objektov parc. 775/4 a 775/5", "Rozbiórka obiektów dz. 775/4 i 775/5", "m³ OP", 645, 24),
  ("Asanácia drobných skladov a prístreškov", "Rozbiórka drobnych magazynów i wiat", "m³ OP", 690, 20),
  ("Demontáž oceľového prístrešku pri hale", "Demontaż wiaty stalowej przy hali", "m²", 200, 18),
  ("Vybúranie starých spevnených plôch vr. odvozu a recyklácie", "Rozbiórka starych nawierzchni z wywozem i recyklingiem", "m²", 3500, 9),
  ("Výrub náletovej zelene, vyčistenie pozemku", "Wycinka samosiewów, oczyszczenie terenu", "kpl", 1, 6000),
  ("Rezerva – environmentálna záťaž (býv. sklad olejov), sanácia zemín", "Rezerwa – obciążenia środowiskowe (były magazyn olejów)", "kpl", 1, 25000),
  ("Hrubé terénne úpravy, výškové vyrovnanie", "Roboty ziemne, niwelacja terenu", "m²", 6000, 7),
  ("Prekládky a odpojenia jestvujúcich sietí", "Przełożenia i odłączenia istniejących sieci", "kpl", 1, 15000)]),
 ("SO 01a", f"Sanácia pôvodnej haly ({OLD} m²)", f"Modernizacja istniejącej hali ({OLD} m²)", [
  ("Stavebno-technický a statický prieskum, diagnostika ŽB skeletu", "Ekspertyza techniczna i konstrukcyjna, diagnostyka szkieletu żelbetowego", "kpl", 1, 12000),
  ("Vypratanie, vnútorné búracie práce (priečky, podlahy, technológie)", "Opróżnienie, wewnętrzne roboty rozbiórkowe", "m²", OLD, 22),
  ("Demontáž obvodového plášťa (siporex panely) a výplní otvorov", "Demontaż ścian osłonowych (płyty siporex) i stolarki", "m²", 990, 18),
  ("Sanácia ŽB skeletu – reprofilácia, injektáž, ochranné nátery", "Naprawa szkieletu żelbetowego – reprofilacja, iniekcje, powłoki", "m²", OLD, 38),
  ("Úprava základov a nové pätky v mieste nových otvorov", "Wzmocnienie fundamentów, nowe stopy przy otworach", "kpl", 1, 28000),
  ("Nová priemyselná podlaha – drátkobetón 20 cm vr. podkladu a vsypu", "Nowa posadzka przemysłowa – fibrobeton 20 cm z podbudową", "m²", OLD, 72),
  ("Strecha – nová skladba: PIR 20 cm, PVC fólia, svetlíky, odvodnenie", "Dach – nowy układ: PIR 20 cm, membrana PVC, świetliki, odwodnienie", "m²", OLD, 105),
  ("Nový obvodový plášť – sendvičové PIR panely RAL 9006 vr. podkonštrukcie", "Nowa elewacja – płyty warstwowe PIR RAL 9006 z podkonstrukcją", "m²", 560, 98),
  ("Výplne otvorov – únikové dvere, okná", "Stolarka – drzwi ewakuacyjne, okna", "kpl", 1, 14000),
  ("Vnútorné úpravy – nátery konštrukcií, maľby, podhľady", "Wykończenie wnętrz – powłoki, malowanie, sufity", "m²", OLD, 24),
  ("Protipožiarne úpravy nosných konštrukcií", "Zabezpieczenia przeciwpożarowe konstrukcji", "m²", OLD, 12)]),
 ("SO 01b", f"Prístavba haly ({EXT} m²)", f"Dobudowa hali ({EXT} m²)", [
  ("Zemné práce a základy (pätky, základové prahy)", "Roboty ziemne i fundamenty (stopy, belki podwalinowe)", "m²", EXT, 82),
  ("Nosná konštrukcia – ŽB stĺpy + oceľové priehradové väzníky", "Konstrukcja – słupy żelbetowe + stalowe dźwigary kratowe", "m²", EXT, 158),
  ("Strešný plášť – trapézový plech, PIR 20 cm, PVC, svetlíky", "Dach – blacha trapezowa, PIR 20 cm, PVC, świetliki", "m²", EXT, 112),
  ("Obvodový plášť – sendvičové PIR panely RAL 9006", "Elewacja – płyty warstwowe PIR RAL 9006", "m²", 790, 98),
  ("Vstupný portál RAL 9004, presklená stena, automatické dvere, markíza", "Portal wejściowy RAL 9004, przeszklenie, drzwi automatyczne, daszek", "kpl", 1, 68000),
  ("Priemyselná podlaha – drátkobetón 22 cm vr. podkladu", "Posadzka przemysłowa – fibrobeton 22 cm z podbudową", "m²", EXT, 68),
  ("Brány, únikové a vnútorné dvere", "Bramy, drzwi ewakuacyjne i wewnętrzne", "kpl", 1, 18000),
  ("Vnútorné konštrukcie – zádverie, WC zákazníkov, info, priečky", "Zabudowa wewnętrzna – wiatrołap, WC klientów, info, ścianki", "kpl", 1, 64000),
  ("Prepojenie so starou halou – búranie steny, dilatácia", "Połączenie ze starą halą – wyburzenie ściany, dylatacja", "kpl", 1, 26000)]),
 ("SO 02", f"Severný blok – 4 NP ({NBF} m² HPP)", f"Blok północny – 4 kondygnacje ({NBF} m² PC)", [
  ("Stavebno-technický a statický prieskum", "Ekspertyza techniczna i konstrukcyjna", "kpl", 1, 6000),
  ("1. NP – príjem tovaru a sklad: podlaha, 2 sekčné brány, požiarna brána do haly", "Parter – przyjęcie towaru i magazyn: posadzka, 2 bramy, brama ppoż.", "m²", NB, 260),
  ("2. NP – zázemie zamestnancov: šatne, sprchy, denná miestnosť, kancelárie", "Piętro – zaplecze pracowników: szatnie, natryski, pom. socjalne, biura", "m²", NB, 520),
  ("3.–4. NP – vypratanie a konzervácia (rezerva na budúce využitie)", "3.–4. kond. – opróżnienie i zabezpieczenie (rezerwa)", "m²", 2 * NB, 60),
  ("Fasáda – zateplenie, obklad, výmena okien", "Elewacja – ocieplenie, okładzina, wymiana okien", "m²", 1100, 135),
  ("Strecha – nová hydroizolácia a zateplenie", "Dach – nowa hydroizolacja i ocieplenie", "m²", NB, 110),
  ("Úprava schodiska, zábradlia, požiarne úseky", "Klatka schodowa, balustrady, strefy pożarowe", "kpl", 1, 18000),
  ("TZB severného bloku (ZTI, ÚK, VZT, elektro) – 1. a 2. NP", "Instalacje bloku płn. (wod-kan, c.o., went., elektr.) – 2 kond.", "m²", 2 * NB, 165)]),
 ("SO 03", f"Technické zariadenia haly ({HALL} m²)", f"Instalacje hali ({HALL} m²)", [
  ("Zdravotechnika, požiarny vodovod (hydranty)", "Instalacje wod-kan, hydranty", "m²", HALL, 28),
  ("Vykurovanie, chladenie, vetranie s rekuperáciou (strešné jednotky)", "Ogrzewanie, chłodzenie, wentylacja z odzyskiem (centrale dachowe)", "m²", HALL, 82),
  ("Silnoprúd – rozvádzače, rozvody, LED osvetlenie, bleskozvod", "Instalacje elektryczne – rozdzielnice, oświetlenie LED, odgromowa", "m²", HALL, 66),
  ("Slaboprúd – EPS, hlasová signalizácia, CCTV, EZS, dátová sieť", "Instalacje niskoprądowe – SSP, DSO, CCTV, SSWiN, sieć", "m²", HALL, 28),
  ("Odvod dymu a tepla (ZOTaSH)", "Oddymianie", "m²", HALL, 9),
  ("Meranie a regulácia", "Automatyka (BMS)", "m²", HALL, 8)]),
 ("SO 04", "Vonkajšie objekty, doprava a siete", "Zagospodarowanie terenu, drogi i sieci", [
  ("Komunikácie pre ťažkú dopravu – asfalt (okruh, hlavná ulička, južná cesta)", "Drogi dla ruchu ciężkiego – asfalt (pętla, aleja główna, droga płd.)", "m²", ROADS, 92),
  ("Parkovacie státia vr. zadného parkoviska – zámková dlažba 80 mm", "Miejsca postojowe z parkingiem tylnym – kostka 80 mm", "m²", STALLS, 64),
  ("Chodníky a plochy pre peších", "Chodniki i ciągi piesze", "m²", SIDE, 52),
  ("Obrubníky, vodorovné a zvislé dopravné značenie", "Krawężniki, oznakowanie poziome i pionowe", "kpl", 1, 22000),
  ("Vonkajšia zóna – spevnená plocha", "Ogród zewnętrzny – nawierzchnia", "m²", GARDEN, 58),
  ("Vonkajšia zóna – oceľový prístrešok s polykarbonátom", "Ogród zewnętrzny – wiata stalowa z poliwęglanem", "m²", CANOPY, 240),
  ("Vonkajšia zóna – oplotenie 2,4 m a brány", "Ogród zewnętrzny – ogrodzenie 2,4 m i bramy", "kpl", 1, 9000),
  ("Výdaj tovaru pri hale – oceľový prístrešok vr. presahu nad výdajné státia", "Wydawanie towaru przy hali – wiata stalowa z okapem nad stanowiskami", "m²", VYDR, 240),
  ("Výdaj tovaru – spevnená plocha krytého dvora", "Wydawanie towaru – nawierzchnia zadaszonego placu", "m²", VYD, 62),
  ("Výdaj tovaru – brána 4 × 4 m v severnej stene haly, oplotenie a brána dvora", "Wydawanie towaru – brama 4 × 4 m w północnej ścianie hali, ogrodzenie i brama placu", "kpl", 1, 14000),
  ("Sklad stavebnín – spevnená plocha pre ťažkú manipuláciu", "Skład mat. budowlanych – nawierzchnia ciężka", "m²", YARD, 62),
  ("Sklad stavebnín – oplotenie a posuvná brána 6 m", "Skład mat. budowlanych – ogrodzenie i brama przesuwna 6 m", "kpl", 1, 15500),
  ("Prístrešok príjmu tovaru pri severnom bloku", "Zadaszenie strefy przyjęcia towaru", "m²", 63, 260),
  ("Dažďová kanalizácia, ORL, retenčná nádrž 120 m³", "Kanalizacja deszczowa, separator, zbiornik retencyjny 120 m³", "kpl", 1, 118000),
  ("Splašková kanalizácia a vodovod – úprava prípojok", "Kanalizacja sanitarna i wodociąg – przyłącza", "kpl", 1, 18000),
  ("Areálové osvetlenie – 11 stožiarov LED", "Oświetlenie terenu – 11 słupów LED", "ks", 11, 3200),
  ("Trafostanica – navýšenie príkonu, prípojka NN", "Stacja trafo – zwiększenie mocy, przyłącze nN", "kpl", 1, 45000),
  ("Plynová prípojka – úprava (alt. tepelné čerpadlá)", "Przyłącze gazu – dostosowanie (alt. pompy ciepła)", "kpl", 1, 12000),
  ("Reklamný pylón 14 m", "Pylon reklamowy 14 m", "kpl", 1, 38000),
  ("Svetelné logá na fasádach, navigačné značenie", "Logo świetlne na elewacjach, oznakowanie", "kpl", 1, 42000),
  ("Sadové úpravy – trávniky, výsadba stromov", "Zieleń – trawniki, nasadzenia drzew", "m²", GREEN, 9),
  ("Oplotenie areálu – doplnenie, vstupná brána", "Ogrodzenie terenu – uzupełnienie, brama wjazdowa", "kpl", 1, 16000),
  ("Prístrešky na nákupné vozíky, mobiliár", "Wiaty na wózki, mała architektura", "kpl", 1, 9000),
  ("Rezerva – výškové napojenie, oporné múriky pri Levočskej", "Rezerwa – dowiązanie wysokościowe, murki oporowe", "kpl", 1, 30000)]),
]
PCT = [("VRN – zariadenie staveniska, koordinácia", "Koszty ogólne budowy – zaplecze, koordynacja", 0.03), ("Projekt, inžiniering, autorský a stavebný dozor", "Projekt, obsługa inwestycji, nadzory", 0.06), ("Rezerva na nepredvídané práce", "Rezerwa na roboty nieprzewidziane", 0.08)]
OPT = [("Stabilné hasiace zariadenie (sprinklery) – len ak ho vyžiada požiarny projekt", "Instalacja tryskaczowa – tylko jeśli wymagana przez projekt ppoż.", "m²", HALL + NB, 78),
       ("Fotovoltika na streche 100 kWp", "Fotowoltaika na dachu 100 kWp", "kWp", 100, 720),
       ("Asanácia administratívnej budovy + 20 parkovacích miest navyše", "Rozbiórka budynku administracyjnego + 20 dodatkowych miejsc", "kpl", 1, 135000),
       ("Druhý (severný) výjazd na Levočskú – rampa, súhlas správcu cesty", "Drugi (północny) wyjazd na ul. Levočską – rampa, zgoda zarządcy", "kpl", 1, 60000)]
VAT = 0.23
def compute():
    so = [(c, sk, pl, sum(q * p for *_, q, p in it)) for c, sk, pl, it in SO]; zrn = sum(s[3] for s in so); pc = [(sk, pl, r, zrn * r) for sk, pl, r in PCT]; total = zrn + sum(p[3] for p in pc)
    new_demo = (OLD + 29) * 6.3 * 24 + NB * 14.5 * 26; new_shell = (OLD) * (sum(q * p for *_, q, p in SO[2][3]) / EXT); refurb = so[1][3]
    nb_new = 2 * NB * 700; nb_ref = so[3][3]
    delta_zrn = (new_demo + new_shell + nb_new) - (refurb + nb_ref)
    it4 = SO[5][3]; grp = lambda key: sum(q * p for sk_, _, _, q, p in it4 if sk_.startswith(key))
    return dict(n_items=sum(len(x[3]) for x in SO), garden_cost=grp('Vonkajšia zóna'), vydaj_cost=grp('Výdaj tovaru'), yard_cost=grp('Sklad stavebnín'), roads_m2=ROADS, so=so, zrn=zrn, pct=pc, total=total, vat=total * VAT, gross=total * (1 + VAT), per_m2_op=total / (HALL + NB), per_m2_gfa=total / (HALL + NBF), opt=[(sk, pl, q * p) for sk, pl, u, q, p in OPT],
                cmp=dict(new_demo=new_demo, new_shell=new_shell, refurb=refurb, nb_new=nb_new, nb_ref=nb_ref, delta_zrn=delta_zrn, delta_total=delta_zrn * (1 + sum(r for *_, r in PCT)), new_total=total + delta_zrn * (1 + sum(r for *_, r in PCT))))
NAVY = "010222"; ORANGE = "FF4000"; LIGHT = "F3F4F6"
def build(path):
    wb = Workbook(); thin = Side(style="thin", color="C9CDD3"); bd = Border(top=thin, bottom=thin, left=thin, right=thin)
    hf = Font(bold=True, color="FFFFFF", name="Arial", size=10); nf = Font(name="Arial", size=10); bf = Font(name="Arial", size=10, bold=True); EUR = '#,##0 "€"'
    # ---- detail sheet ----
    wd = wb.active; wd.title = "Položky – Pozycje"
    heads = ["Kód", "Položka (SK)", "Pozycja (PL)", "MJ", "Množstvo", "Jedn. cena €", "Spolu €"]
    for i, w in enumerate([9, 62, 62, 8, 11, 13, 15]): wd.column_dimensions[get_column_letter(i + 1)].width = w
    wd["A1"] = "Merkury Market Stará Ľubovňa – variant B: sanácia + prístavba · položkový odhad nákladov (bez DPH, cenová úroveň 2026)"; wd["A1"].font = Font(name="Arial", size=12, bold=True, color=NAVY); wd.merge_cells("A1:G1")
    r = 3
    for j, h in enumerate(heads): c = wd.cell(r, j + 1, h); c.font = hf; c.fill = PatternFill("solid", fgColor=NAVY); c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True); c.border = bd
    wd.freeze_panes = "A4"; sub_cells = {}
    for code, sk, pl, items in SO:
        r += 1
        for j, v in enumerate([code, sk, pl, "", "", "", ""]): c = wd.cell(r, j + 1, v); c.font = Font(name="Arial", size=10, bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor=ORANGE); c.border = bd
        hdr = r; first = r + 1
        for k, (isk, ipl, u, q, p) in enumerate(items):
            r += 1; vals = [f"{code}.{k + 1:02d}", isk, ipl, u, q, p, f"=E{r}*F{r}"]
            for j, v in enumerate(vals):
                c = wd.cell(r, j + 1, v); c.font = nf; c.border = bd; c.alignment = Alignment(wrap_text=True, vertical="top", horizontal="left" if j < 3 else ("center" if j == 3 else "right"))
            wd.cell(r, 5).number_format = "#,##0"; wd.cell(r, 6).number_format = EUR; wd.cell(r, 7).number_format = EUR; wd.cell(r, 5).font = Font(name="Arial", size=10, color="0000FF"); wd.cell(r, 6).font = Font(name="Arial", size=10, color="0000FF")
        wd.cell(hdr, 7, f"=SUM(G{first}:G{r})").number_format = EUR; wd.cell(hdr, 7).font = Font(name="Arial", size=10, bold=True, color="FFFFFF"); wd.cell(hdr, 7).fill = PatternFill("solid", fgColor=ORANGE); wd.cell(hdr, 7).alignment = Alignment(horizontal="right"); sub_cells[code] = f"'{wd.title}'!G{hdr}"
    r += 2; wd.cell(r, 2, "Voliteľné položky (nie sú v súčte)").font = bf; wd.cell(r, 3, "Pozycje opcjonalne (poza sumą)").font = bf; opt_first = r + 1
    for k, (isk, ipl, u, q, p) in enumerate(OPT):
        r += 1
        for j, v in enumerate([f"OPT.{k + 1}", isk, ipl, u, q, p, f"=E{r}*F{r}"]):
            c = wd.cell(r, j + 1, v); c.font = nf; c.border = bd; c.alignment = Alignment(wrap_text=True, vertical="top", horizontal="left" if j < 3 else ("center" if j == 3 else "right"))
        wd.cell(r, 5).number_format = "#,##0"; wd.cell(r, 6).number_format = EUR; wd.cell(r, 7).number_format = EUR
    # ---- summary sheet ----
    ws = wb.create_sheet("Súhrn – Podsumowanie", 0)
    for i, w in enumerate([10, 58, 58, 12, 18, 14]): ws.column_dimensions[get_column_letter(i + 1)].width = w
    ws["A1"] = "MERKURY MARKET STARÁ ĽUBOVŇA – VARIANT B: SANÁCIA PÔVODNEJ HALY + PRÍSTAVBA"; ws["A1"].font = Font(name="Arial", size=13, bold=True, color=NAVY); ws.merge_cells("A1:F1")
    ws["A2"] = "Orientačný odhad investičných nákladov · Szacunkowy koszt inwestycji · EUR bez DPH / netto · cenová úroveň 2026 · presnosť ±15 %"; ws["A2"].font = Font(name="Arial", size=10, italic=True, color="52514E"); ws.merge_cells("A2:F2")
    ws["A3"] = "BauHausEurope s. r. o. · Levočská 11, Stará Ľubovňa · parc. 775/1–775/5, 10 789 m²"; ws["A3"].font = Font(name="Arial", size=10, color="52514E"); ws.merge_cells("A3:F3")
    r = 5
    for j, h in enumerate(["Kód", "Stavebný objekt (SK)", "Obiekt (PL)", "Podiel", "Náklady € bez DPH", "€/m² *"]): c = ws.cell(r, j + 1, h); c.font = hf; c.fill = PatternFill("solid", fgColor=NAVY); c.alignment = Alignment(horizontal="center", wrap_text=True); c.border = bd
    first = r + 1
    for code, sk, pl, items in SO:
        r += 1
        for j, v in enumerate([code, sk, pl, None, f"={sub_cells[code]}", None]): c = ws.cell(r, j + 1, v); c.font = nf; c.border = bd
        ws.cell(r, 5).number_format = EUR
    last = r; r += 1; zr = r
    for j, v in enumerate(["", "ZRN – základné rozpočtové náklady spolu", "Koszty robót budowlanych razem", None, f"=SUM(E{first}:E{last})", None]): c = ws.cell(r, j + 1, v); c.font = bf; c.fill = PatternFill("solid", fgColor=LIGHT); c.border = bd
    ws.cell(r, 5).number_format = EUR
    for rr in range(first, last + 1): ws.cell(rr, 4, f"=E{rr}/$E${zr}").number_format = "0.0%"; ws.cell(rr, 6, f"=E{rr}/$E${zr + 12}").number_format = EUR
    pr0 = r + 1
    for sk, pl, rate in PCT:
        r += 1
        for j, v in enumerate(["", sk, pl, rate, f"=$E${zr}*D{r}", None]): c = ws.cell(r, j + 1, v); c.font = nf; c.border = bd
        ws.cell(r, 4).number_format = "0.0%"; ws.cell(r, 4).font = Font(name="Arial", size=10, color="0000FF"); ws.cell(r, 5).number_format = EUR
    r += 1; tr = r
    for j, v in enumerate(["", "INVESTIČNÉ NÁKLADY SPOLU BEZ DPH", "KOSZT INWESTYCJI RAZEM NETTO", None, f"=E{zr}+SUM(E{pr0}:E{r - 1})", None]): c = ws.cell(r, j + 1, v); c.font = Font(name="Arial", size=11, bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor=ORANGE); c.border = bd
    ws.cell(r, 5).number_format = EUR
    r += 1; ws.cell(r, 2, "DPH").font = nf; ws.cell(r, 3, "VAT").font = nf; ws.cell(r, 4, VAT).number_format = "0%"; ws.cell(r, 4).font = Font(name="Arial", size=10, color="0000FF"); ws.cell(r, 5, f"=E{tr}*D{r}").number_format = EUR
    r += 1; ws.cell(r, 2, "Investičné náklady spolu s DPH").font = bf; ws.cell(r, 3, "Koszt inwestycji brutto").font = bf; ws.cell(r, 5, f"=E{tr}+E{r - 1}").number_format = EUR; ws.cell(r, 5).font = bf
    # key figures block (row zr+12 holds operating area used for €/m²)
    kr = zr + 9
    ws.cell(kr, 2, "Kľúčové ukazovatele · Wskaźniki").font = Font(name="Arial", size=11, bold=True, color=NAVY)
    rows = [("Zastavaná plocha haly po dostavbe (m²)", "Powierzchnia zabudowy hali po rozbudowie (m²)", HALL, "#,##0"), ("– z toho sanácia pôvodnej haly / prístavba (m²)", "– w tym modernizacja / dobudowa (m²)", f"{OLD} / {EXT}", None),
            ("Prevádzková plocha 1. NP: hala + príjem tovaru (m²)  *", "Powierzchnia operacyjna parteru: hala + przyjęcie towaru (m²)  *", HALL + NB, "#,##0"), ("Hrubá podlažná plocha vr. 4 NP severného bloku (m²)", "Powierzchnia całkowita z 4 kond. bloku płn. (m²)", HALL + NBF, "#,##0"),
            ("Investičné náklady na m² prevádzkovej plochy (€/m²)", "Koszt na m² powierzchni operacyjnej (€/m²)", f"=E{tr}/E{kr + 3}", EUR), ("Investičné náklady na m² hrubej podlažnej plochy (€/m²)", "Koszt na m² powierzchni całkowitej (€/m²)", f"=E{tr}/E{kr + 4}", EUR),
            ("Parkovacie miesta (zákazníci + ZŤP + zamestnanci)", "Miejsca postojowe (klienci + niepełnospr. + pracownicy)", f"{A['parking']['cust']} + {A['parking']['dis']} + {A['parking']['staff']} = {A['parking_total']}", None), ("Zastavanosť / zeleň (limit ÚPN: ≤ 50 % / ≥ 20 %)", "Zabudowa / zieleń (limit planu: ≤ 50 % / ≥ 20 %)", f"{100 * A['built'] / A['parcel']:.1f} % / {100 * A['green'] / A['parcel']:.1f} %", None)]
    for k, (sk, pl, v, fmt) in enumerate(rows):
        rr = kr + 1 + k; ws.cell(rr, 2, sk).font = nf; ws.cell(rr, 3, pl).font = nf; c = ws.cell(rr, 5, v); c.font = bf; c.alignment = Alignment(horizontal="right")
        if fmt: c.number_format = fmt
    assert kr + 3 == zr + 12
    r = kr + len(rows) + 3; ws.cell(r, 2, "Voliteľné položky (nie sú v súčte) · Opcje (poza sumą)").font = Font(name="Arial", size=11, bold=True, color=NAVY)
    for k, (isk, ipl, u, q, p) in enumerate(OPT):
        r += 1; ws.cell(r, 2, isk).font = nf; ws.cell(r, 3, ipl).font = nf; ws.cell(r, 5, f"='{wd.title}'!G{opt_first + k}").number_format = EUR
    r += 2; ws.cell(r, 2, "Predpoklady a vylúčenia").font = Font(name="Arial", size=11, bold=True, color=NAVY); ws.cell(r, 3, "Założenia i wyłączenia").font = Font(name="Arial", size=11, bold=True, color=NAVY)
    notes = [("Odhad v stupni architektonickej štúdie; jednotkové ceny sú expertné ukazovatele pre SR 2026, bez výkazu výmer.", "Szacunek na etapie koncepcji; ceny jednostkowe to wskaźniki eksperckie dla Słowacji 2026, bez przedmiaru."),
             ("Náklady sanácie závisia od výsledku stavebno-technického prieskumu ŽB skeletu, základov a strechy pôvodnej haly.", "Koszt modernizacji zależy od wyników ekspertyzy szkieletu, fundamentów i dachu istniejącej hali."),
             ("Nezahrnuté: pozemok, interiérové vybavenie nájomcu (regály, pokladne, IT), poplatky za pripojenie, financovanie, DPH.", "Nie obejmuje: gruntu, wyposażenia najemcy (regały, kasy, IT), opłat przyłączeniowych, finansowania, VAT."),
             ("Administratívna budova (súp. č. 345) ostáva mimo rozsahu – bez nákladov v tomto odhade.", "Budynek administracyjny (nr 345) pozostaje poza zakresem – bez kosztów w tym szacunku."),
             ("Modré hodnoty sú vstupy – po zmene množstva alebo ceny sa súčty prepočítajú automaticky.", "Niebieskie wartości to dane wejściowe – po zmianie sumy przeliczą się automatycznie.")]
    for sk, pl in notes:
        r += 1; ws.cell(r, 2, "• " + sk).font = nf; ws.cell(r, 3, "• " + pl).font = nf; ws.cell(r, 2).alignment = Alignment(wrap_text=True, vertical="top"); ws.cell(r, 3).alignment = Alignment(wrap_text=True, vertical="top"); ws.row_dimensions[r].height = 30
    # ---- comparison sheet ----
    C = compute()["cmp"]; wc = wb.create_sheet("Porovnanie – Porównanie")
    for i, w in enumerate([64, 64, 18]): wc.column_dimensions[get_column_letter(i + 1)].width = w
    wc["A1"] = "Sanácia + prístavba vs. úplná asanácia a novostavba rovnakého programu (rozdiel ZRN) · Modernizacja + dobudowa vs. rozbiórka i nowy obiekt"; wc["A1"].font = Font(name="Arial", size=11, bold=True, color=NAVY)
    rows = [("Novostavba: asanácia pôvodnej haly a severného bloku navyše", "Nowy obiekt: dodatkowa rozbiórka hali i bloku płn.", round(C["new_demo"])), (f"Novostavba: {OLD} m² haly v cene prístavby (stavebná časť)", f"Nowy obiekt: {OLD} m² hali w cenie dobudowy (część budowlana)", round(C["new_shell"])), ("Novostavba: nový 2-podlažný sklad a zázemie 650 m²", "Nowy obiekt: nowy 2-kond. magazyn i zaplecze 650 m²", C["nb_new"]),
            ("Variant B: sanácia pôvodnej haly (SO 01a)", "Wariant B: modernizacja hali (SO 01a)", f"=-{sub_cells['SO 01a']}"), ("Variant B: severný blok (SO 02)", "Wariant B: blok północny (SO 02)", f"=-{sub_cells['SO 02']}")]
    for k, (sk, pl, v) in enumerate(rows): wc.cell(3 + k, 1, sk).font = nf; wc.cell(3 + k, 2, pl).font = nf; wc.cell(3 + k, 3, v).number_format = EUR
    wc.cell(9, 1, "Úspora variantu B v ZRN").font = bf; wc.cell(9, 2, "Oszczędność wariantu B (roboty)").font = bf; wc.cell(9, 3, "=SUM(C3:C7)").number_format = EUR; wc.cell(9, 3).font = bf
    wc.cell(10, 1, "Úspora vrátane VRN, projektu a rezervy").font = bf; wc.cell(10, 2, "Oszczędność łącznie z kosztami pośrednimi i rezerwą").font = bf; wc.cell(10, 3, f"=C9*(1+SUM('{ws.title}'!D{pr0}:D{pr0 + len(PCT) - 1}))").number_format = EUR; wc.cell(10, 3).font = bf
    wc.cell(12, 1, "Pozn.: severný blok vychádza cenovo neutrálne, prináša však 650 m² rezervy a reklamnú vežu k hlavnej ceste.").font = nf; wc.cell(12, 2, "Uwaga: blok północny jest kosztowo neutralny, daje jednak 650 m² rezerwy i wieżę reklamową przy drodze głównej.").font = nf
    for w_ in (ws, wd, wc): w_.sheet_view.showGridLines = False; w_.page_setup.orientation = "landscape"; w_.page_setup.fitToWidth = 1; w_.sheet_properties.pageSetUpPr.fitToPage = True; w_.page_setup.fitToHeight = 0
    wb.save(path)
if __name__ == "__main__":
    C = compute(); json.dump(C, open(os.path.join(HERE, "cost.json"), "w"), ensure_ascii=False, indent=1)
    for c, sk, pl, v in C["so"]: print(c, round(v))
    print("ZRN", round(C["zrn"]), "TOTAL", round(C["total"]), "gross", round(C["gross"]), "per m2 op", round(C["per_m2_op"]), "gfa", round(C["per_m2_gfa"])); print({k: round(v) for k, v in C["cmp"].items()})
    build(os.path.join(HERE, "Rozpocet_Merkury_Market_variant_B.xlsx"))
