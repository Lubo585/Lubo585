"""Variant B deck (SK / PL) – python-pptx, template = existing study deck (BHE branding)."""
import sys, os, json
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION, XL_LABEL_POSITION
from PIL import Image
LANG = sys.argv[1]; HERE = os.path.dirname(os.path.abspath(__file__)); VB = os.path.join(HERE, "..", "varB"); IMG = os.path.join(HERE, "img")
REPO = "/home/user/Lubo585/business-plan/studia-merkury-market/"
TPL = REPO + ("Studia_predajne_Merkury_Market_Stara_Lubovna_SK.pptx" if LANG == "sk" else "Studia_sklepu_Merkury_Market_Stara_Lubovna_PL.pptx")
OUT = os.path.join(HERE, "Merkury_Market_Stara_Lubovna_variant_B_sanacia_pristavba_SK.pptx" if LANG == "sk" else "Merkury_Market_Stara_Lubovna_wariant_B_modernizacja_dobudowa_PL.pptx")
C = json.load(open(os.path.join(VB, "cost.json"))); A = json.load(open(os.path.join(VB, "layout.json")))["AREAS"]
def T(sk, pl): return sk if LANG == "sk" else pl
NAVY = RGBColor(0x01, 0x02, 0x22); ORANGE = RGBColor(0xFF, 0x40, 0x00); GREY = RGBColor(0x52, 0x51, 0x4E); LIGHT = RGBColor(0xF3, 0xF4, 0xF6); WHITE = RGBColor(255, 255, 255); MID = RGBColor(0xC9, 0xCD, 0xD3)
def num(v, d=0): s = f"{v:,.{d}f}".replace(",", " ").replace(".", ","); return s
def eur(v): return num(round(v)) + " €"
def mil(v): return num(v / 1e6, 2) + T(" mil. €", " mln €")
prs = Presentation(TPL)
logo_blob = prs.slides[0].shapes[0].image.blob; open(os.path.join(HERE, "logo_white.png"), "wb").write(logo_blob)
lst = prs.slides._sldIdLst
for sid in list(lst): prs.part.drop_rel(sid.rId); lst.remove(sid)
L_DARK = [l for l in prs.slide_layouts if l.name == "DARK"][0]; L_CONT = [l for l in prs.slide_layouts if l.name == "CONTENT"][0]
NOTE = T("Pracovná štúdia na účely rokovania. Rozmery, plochy a náklady sú orientačné, overia sa prieskumom a projektom stavebného zámeru.", "Studium robocze do negocjacji. Wymiary, powierzchnie i koszty są orientacyjne, do weryfikacji w ekspertyzie i projekcie zamierzenia budowlanego.")
n_slide = [0]; K = [1.0]
def tb(s, x, y, w, h, paras, size=12, bold=False, color=NAVY, font="Calibri", align=PP_ALIGN.LEFT, bullet=False, anchor=MSO_ANCHOR.TOP, space=4, italic=False):
    box = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h)); tf = box.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(0.04); tf.margin_top = tf.margin_bottom = Inches(0.02)
    if isinstance(paras, str): paras = [paras]
    if bullet: size = size * K[0]
    for i, p_ in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph(); p.alignment = align; p.space_after = Pt(space)
        segs = p_ if isinstance(p_, list) else [(p_, bold)]
        if bullet:
            r0 = p.add_run(); r0.text = "■  "; r0.font.size = Pt(size * 0.6); r0.font.color.rgb = ORANGE; r0.font.name = font
        for txt, b in segs:
            r = p.add_run(); r.text = txt; r.font.size = Pt(size); r.font.bold = b; r.font.color.rgb = color; r.font.name = font; r.font.italic = italic
    return box
def content(title, note=True, k=1.15):
    s = prs.slides.add_slide(L_CONT); n_slide[0] += 1; K[0] = k
    ph = [p for p in s.placeholders][0]; ph.text_frame.text = title; r = ph.text_frame.paragraphs[0].runs[0]; r.font.name = "Arial"; r.font.size = Pt(26); r.font.bold = True; r.font.color.rgb = NAVY; ph.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    if note: tb(s, 0.5, 7.05, 10.6, 0.3, NOTE, size=8, color=GREY, italic=True)
    tb(s, 12.4, 7.05, 0.6, 0.3, str(n_slide[0]), size=9, color=GREY, align=PP_ALIGN.RIGHT)
    return s
def pic(s, name, x, y, w, h, border=False):
    path = name if os.path.isabs(name) else os.path.join(IMG, name); iw, ih = Image.open(path).size; ar = iw / ih
    if w / h > ar: nw, nh = h * ar, h
    else: nw, nh = w, w / ar
    p = s.shapes.add_picture(path, Inches(x + (w - nw) / 2), Inches(y + (h - nh) / 2), Inches(nw), Inches(nh))
    if border: p.line.color.rgb = MID; p.line.width = Pt(0.75)
    return p
def card(s, x, y, w, h, big, small, big_size=28):
    r = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h)); r.fill.solid(); r.fill.fore_color.rgb = LIGHT; r.line.color.rgb = MID; r.line.width = Pt(0.5); r.adjustments[0] = 0.06; r.shadow.inherit = False
    tb(s, x + 0.12, y + 0.08, w - 0.24, 0.62, big, size=big_size, bold=True, color=ORANGE, font="Arial", anchor=MSO_ANCHOR.MIDDLE); tb(s, x + 0.12, y + 0.72, w - 0.24, h - 0.78, small, size=12, color=NAVY)
def table(s, x, y, w, rows, widths, size=10.5, row_h=0.3, header=True, bold_last=False, align_right=()):
    size = size * K[0]; row_h = row_h * K[0]
    gt = s.shapes.add_table(len(rows), len(rows[0]), Inches(x), Inches(y), Inches(w), Inches(row_h * len(rows))); t = gt.table
    tblPr = gt._element.graphic.graphicData.tbl.tblPr; tblPr.set("bandRow", "0"); tblPr.set("firstRow", "0")
    tot = sum(widths)
    for j, cw in enumerate(widths): t.columns[j].width = Inches(w * cw / tot)
    for i, row in enumerate(rows):
        t.rows[i].height = Inches(row_h)
        for j, v in enumerate(row):
            c = t.cell(i, j); c.margin_left = c.margin_right = Inches(0.06); c.margin_top = c.margin_bottom = Inches(0.025); c.vertical_anchor = MSO_ANCHOR.MIDDLE
            tf = c.text_frame; tf.word_wrap = True; p = tf.paragraphs[0]; r = p.add_run(); r.text = str(v); r.font.size = Pt(size); r.font.name = "Calibri"
            hd = header and i == 0; last = bold_last and i == len(rows) - 1
            r.font.bold = hd or last; r.font.color.rgb = WHITE if hd else NAVY; c.fill.solid(); c.fill.fore_color.rgb = NAVY if hd else (RGBColor(0xFF, 0xE8, 0xDA) if last else (LIGHT if i % 2 == 0 else WHITE))
            if j in align_right and not hd: p.alignment = PP_ALIGN.RIGHT
    return gt
def h2(s, x, y, w, text): tb(s, x, y, w, 0.35, text, size=15, bold=True, color=ORANGE, font="Arial")
BUILT = 100 * A["built"] / A["parcel"]; GREEN = 100 * A["green"] / A["parcel"]; PAVED = 100 * A["paved"] / A["parcel"]
# ============ 1 title ============
s = prs.slides.add_slide(L_DARK); n_slide[0] += 1
s.shapes.add_picture(os.path.join(HERE, "logo_white.png"), Emu(548640), Emu(457200), Emu(2011680), Emu(603504))
tb(s, 0.6, 1.5, 6.3, 1.4, T("Merkury Market Stará Ľubovňa", "Merkury Market Stará Ľubovňa"), size=34, bold=True, color=WHITE, font="Arial")
tb(s, 0.6, 2.85, 6.2, 0.9, T("Variant B: sanácia pôvodnej haly + prístavba", "Wariant B: modernizacja istniejącej hali + dobudowa"), size=22, bold=True, color=ORANGE, font="Arial")
tb(s, 0.6, 3.95, 6.0, 1.2, T("Dispozícia, zadný zásobovací a výdajný okruh, vonkajšia oplotená zóna, parkovanie a odhad nákladov výstavby · areál „Stará Pekáreň“, Levočská 11", "Układ, tylna pętla dostaw i wydawania towaru, ogrodzony ogród zewnętrzny, parking i szacunek kosztów budowy · teren „Stará Pekáreň”, ul. Levočská 11"), size=15, color=WHITE)
bar = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(5.35), Inches(1.2), Inches(0.06)); bar.fill.solid(); bar.fill.fore_color.rgb = ORANGE; bar.line.fill.background()
tb(s, 0.6, 5.55, 6.0, 0.4, T("BauHausEurope s. r. o. · november 2026 · pracovná štúdia pre rokovanie", "BauHausEurope s. r. o. · listopad 2026 · studium robocze do negocjacji"), size=12, color=WHITE)
pic(s, "aerial_sw.jpg", 6.95, 1.2, 6.0, 5.1)
# ============ 2 brief ============
s = content(T("Zadanie a riešenie v skratke", "Założenia i rozwiązanie w skrócie"), k=1.2)
cards = [(num(2880) + " m²", T("predajná hala 45 × 64 m: 1 667 m² sanácia + 1 213 m² prístavba", "hala sprzedaży 45 × 64 m: 1 667 m² modernizacja + 1 213 m² dobudowa")), ("321 m²", T("vonkajšia oplotená zóna na sezónny tovar, z toho 108 m² krytých", "ogrodzony ogród zewnętrzny na towar sezonowy, w tym 108 m² pod wiatą")),
         ("178 m²", T("krytý výdaj tovaru napojený na halu, 3 výdajné státia", "zadaszone wydawanie towaru połączone z halą, 3 stanowiska")), ("98", T("parkovacích miest: 78 zákazníci + 4 ZŤP + 16 zamestnanci", "miejsc postojowych: 78 klienci + 4 niepełnospr. + 16 pracownicy")), (mil(C["total"]), T("odhad investičných nákladov bez DPH vrátane projektu a rezervy", "szacunkowy koszt inwestycji netto z projektem i rezerwą"))]
for i, (b, sm) in enumerate(cards): card(s, 0.5 + i * 2.48, 1.55, 2.36, 1.75, b, sm, 26 if i < 4 else 24)
h2(s, 0.5, 3.55, 6, T("Čo ste zadali", "Zadanie"))
tb(s, 0.5, 3.95, 5.9, 3.0, [T("Sanácia pôvodnej haly a prístavba novej časti podľa vyznačeného obdĺžnika 45 × 68 m", "Modernizacja istniejącej hali i dobudowa nowej części według zaznaczonego prostokąta 45 × 68 m"), T("Zokruhovanie areálu tak, aby sa tovar odoberal aj dodával kamiónmi (LKW) zozadu", "Pętla komunikacyjna, aby towar był wydawany i dostarczany ciężarówkami (LKW) od tyłu"),
    T("Vonkajšia oplotená zóna na sezónne produkty", "Ogrodzona strefa zewnętrzna na produkty sezonowe"), T("Parkovisko – rozloženie a počet státí", "Parking – układ i liczba miejsc"), T("Kompletné nacenenie výstavby", "Pełna wycena budowy")], size=12.5, bullet=True)
h2(s, 6.8, 3.55, 6, T("Ako to riešime", "Rozwiązanie"))
tb(s, 6.8, 3.95, 6.0, 3.0, [T("Hala 45 × 64 m po hranu 4-podlažného severného bloku; ten ostáva ako príjem tovaru, sklad a zázemie", "Hala 45 × 64 m do krawędzi 4-kondygnacyjnego bloku północnego; blok zostaje jako przyjęcie towaru, magazyn i zaplecze"),
    T("Jednosmerný okruh v zadnom dvore (R 12,5 m) s odstavným pruhom pre LKW a zadným parkoviskom (14 státí)", "Jednokierunkowa pętla na tylnym placu (R 12,5 m) z zatoką dla LKW i parkingiem tylnym (14 miejsc)"),
    T("Výdaj tovaru: krytý dvor napojený na severnú stenu haly, brána priamo z predajne, 3 výdajné státia", "Wydawanie towaru: zadaszony plac przy północnej ścianie hali, brama bezpośrednio z sali, 3 stanowiska"),
    T("Vonkajšia zóna pri severnej stene haly – vstup priamo z predajne, zásobovanie z okruhu", "Ogród zewnętrzny przy północnej ścianie hali – wejście z sali sprzedaży, dostawy z pętli"),
        T("Vzhľad podľa nových predajní Olkusz / Kęty: strieborné panely RAL 9006, čierny portál, červené logo", "Wygląd jak nowe sklepy Olkusz / Kęty: srebrne płyty RAL 9006, czarny portal, czerwone logo")], size=12.5, bullet=True)
# ============ 3 references ============
s = content(T("Referencie: nové predajne Merkury Market v Poľsku", "Referencje: nowe sklepy Merkury Market w Polsce"), note=False, k=1.0)
pic(s, "olkusz_elev.jpg", 0.45, 1.5, 6.3, 1.25, border=True); tb(s, 0.45, 2.78, 6.3, 0.3, T("Olkusz – vstupná fasáda (projekt MOFO Architekci, 01/2026)", "Olkusz – elewacja wejściowa (projekt MOFO Architekci, 01/2026)"), size=9, color=GREY, italic=True)
pic(s, "kety_pzt.jpg", 0.45, 3.1, 3.9, 3.75, border=True); tb(s, 4.45, 3.15, 2.3, 3.6, [T("Kęty – situácia: objazd okolo budovy, zásobovanie („DOSTAWY“) vzadu, záhradná zóna na boku, parkovisko pred vstupom.", "Kęty – zagospodarowanie: objazd wokół budynku, dostawy z tyłu, ogród z boku, parking przed wejściem."), T("Rovnaký princíp používame v Starej Ľubovni.", "Tę samą zasadę stosujemy w Starej Ľubovni.")], size=10.5, color=GREY)
rows = [[T("Parameter", "Parametr"), "Olkusz", "Kęty", T("Stará Ľubovňa – var. B", "Stará Ľubovňa – war. B")],
        [T("Rozmer haly", "Wymiary hali"), "63,2 × 51,4 m", "72,4 × 51,0 m", "45 × 64 m + 25 × 13 m"], [T("Zastavaná plocha", "Pow. zabudowy"), "3 152 m²", "≈ 3 690 m²", "3 205 m²"],
        [T("Predajná plocha + expozície", "Sala sprzedaży + ekspozycje"), "1 856 m²", "1 819 m²", "≈ 2 650 m²"], [T("Sklad / príjem tovaru", "Magazyn / przyjęcie"), "220 m² + dvor", "1 094 + 389 m²", T("325 m² + výdaj 178 m² + dvor 349 m²", "325 m² + wydawanie 178 m² + plac 349 m²")],
        [T("Vonkajšia záhradná zóna", "Ogród zewnętrzny"), T("áno, s prístreškom", "tak, z wiatą"), T("510 m² prístrešok", "510 m² wiata"), T("321 m², 108 m² krytých", "321 m², 108 m² pod wiatą")],
        [T("Parkovanie", "Parking"), "–", T("90 áut + 7 LKW", "90 aut + 7 LKW"), T("98 áut + 3 výdaj + LKW", "98 aut + 3 wydawanie + LKW")], [T("Zásobovanie", "Dostawy"), T("brány v úrovni terénu", "bramy w poziomie terenu"), T("vzadu, objazd", "z tyłu, objazd"), T("vzadu, okruh R 12,5 m", "z tyłu, pętla R 12,5 m")],
        [T("Výška / konštrukcia", "Wysokość / konstrukcja"), T("7,9 m · ŽB stĺpy + oceľ", "7,9 m · słupy żelb. + stal"), "–", T("6,4 m (stará) / 7,6 m (nová)", "6,4 m (stara) / 7,6 m (nowa)")],
        [T("Fasáda", "Elewacja"), "RAL 9006 + RAL 9004", "–", "RAL 9006 + RAL 9004"]]
table(s, 6.95, 1.5, 5.95, rows, [2.1, 1.6, 1.5, 2.2], size=9.5, row_h=0.36)
tb(s, 6.95, 5.25, 5.95, 1.6, [T("Podklady ste označili ako „Krakow“ – ide o projekty Olkusz (investor BOIG Property Consulting) a Kęty (MM Land 1). Obe lokality sú pri Krakove.", "Materiały dotyczą projektów Olkusz (inwestor BOIG Property Consulting) i Kęty (MM Land 1), oba w regionie Krakowa."),
    T("Stará Ľubovňa vychádza veľkosťou medzi nimi, s väčšou predajnou plochou vďaka využitiu existujúcej haly.", "Stará Ľubovňa mieści się wielkością między nimi, z większą salą sprzedaży dzięki wykorzystaniu istniejącej hali.")], size=10.5, color=GREY)
# ============ 4 existing ============
s = content(T("Súčasný stav: čo ostáva a čo sa asanuje", "Stan obecny: co zostaje, a co do rozbiórki"), k=1.1)
pic(s, f"existing_{LANG}.png", 0.4, 1.45, 4.3, 5.55)
h2(s, 5.0, 1.5, 7.8, T("Ostáva a sanuje sa", "Zostaje i jest modernizowane"))
tb(s, 5.0, 1.9, 7.9, 1.75, [T("Jednopodlažná výrobná hala – ŽB montovaný skelet, cca 1 670 m², výška atiky cca 6,3 m, plochá strecha", "Parterowa hala produkcyjna – szkielet żelbetowy prefabrykowany, ok. 1 670 m², attyka ok. 6,3 m, dach płaski"),
    T("4-podlažný severný blok 25 × 13 m – príjem tovaru, sklad, zázemie; fasáda k hlavnej ceste ako reklamná veža", "4-kondygnacyjny blok północny 25 × 13 m – przyjęcie towaru, magazyn, zaplecze; elewacja do drogi głównej jako wieża reklamowa"),
    T("3-podlažná administratívna budova (súp. č. 345) – mimo rozsahu Merkury Market, bez zásahu", "3-kondygnacyjny budynek administracyjny (nr 345) – poza zakresem Merkury Market, bez ingerencji")], size=12, bullet=True)
h2(s, 5.0, 3.8, 7.8, T("Asanuje sa", "Do rozbiórki"))
tb(s, 5.0, 4.2, 7.9, 1.3, [T("Sklad na parc. 775/3 (598 m²) – stojí presne v mieste prístavby a parkoviska", "Magazyn na dz. 775/3 (598 m²) – stoi dokładnie w miejscu dobudowy i parkingu"), T("Objekty 775/4 (111 m²) a 775/5 (57 m²), oceľový prístrešok pri hale, drobné sklady v zadnom dvore", "Obiekty 775/4 (111 m²) i 775/5 (57 m²), wiata stalowa przy hali, drobne magazyny na tylnym placu")], size=12, bullet=True)
h2(s, 5.0, 5.35, 7.8, T("Úprava oproti vášmu náčrtu", "Korekta względem szkicu"))
tb(s, 5.0, 5.75, 7.9, 1.25, [T("Oranžový obdĺžnik 45 × 68 m zasahoval 4 m do 4-podlažného bloku. Halu preto končíme na jeho južnej stene (64 m); blok s halou prepájame bránou.", "Pomarańczowy prostokąt 45 × 68 m wchodził 4 m w blok 4-kondygnacyjny. Halę kończymy więc na jego południowej ścianie (64 m); blok łączymy z halą bramą."),
    T("Rozmery sú odčítané z ortofotomapy a katastra, presne ich určí geodetické zameranie.", "Wymiary odczytano z ortofotomapy i katastru, dokładnie określi je pomiar geodezyjny.")], size=12, bullet=True)
# ============ 5 site plan ============
s = content(T("Situácia: nová hala, okruh, vonkajšia zóna a parkovanie", "Zagospodarowanie: nowa hala, pętla, ogród i parking"), k=1.06)
pic(s, f"site_{LANG}.png", 0.4, 1.45, 4.3, 5.55)
rows = [[T("Objekt / plocha", "Obiekt / powierzchnia"), T("Rozmer", "Wymiar"), "m²"], [T("Pôvodná hala – sanácia", "Istniejąca hala – modernizacja"), "16,5 × 64 + 13 × 47 m", num(1667)], [T("Prístavba – novostavba", "Dobudowa – nowa część"), "15,5 × 64 + 13 × 17 m", num(1213)],
        [T("Predajná hala spolu", "Hala sprzedaży razem"), "45 × 64 m", num(2880)], [T("Severný blok (1. NP príjem a sklad)", "Blok północny (parter: przyjęcie, magazyn)"), "25 × 13 m, 4 NP", num(325)],
        [T("Krytý výdaj tovaru pri hale", "Zadaszone wydawanie towaru przy hali"), "7,5 × 23,75 m", num(A["vydaj"])], [T("Vonkajšia oplotená zóna", "Ogrodzony ogród zewnętrzny"), "13,5 × 23,75 m", num(A["garden"])], [T("Sklad stavebnín (oplotený)", "Skład mat. budowlanych (ogrodzony)"), "41 × 8,5 m", num(A["yard"])],
        [T("Komunikácie a okruh", "Drogi i pętla"), T("ulička 7,0 m, okruh 7,5 m", "aleja 7,0 m, pętla 7,5 m"), num(A["roads"] + A["south_road"])], [T("Parkovacie státia (98) vr. zadného parkoviska", "Miejsca postojowe (98) z parkingiem tylnym"), "2,5 × 5,0 m", num(A["stalls_area"])], [T("Zeleň", "Zieleń"), f"{num(GREEN, 1)} %", num(A["green"])]]
table(s, 5.0, 1.5, 7.85, rows, [3.6, 2.6, 1.0], size=10.5, row_h=0.31, align_right=(2,))
tb(s, 5.0, 5.3, 7.85, 1.7, [T("Vjazd ostáva existujúci z Levočskej na juhozápade – bez nového napojenia na cestu III/3146", "Wjazd pozostaje istniejący z ul. Levočskiej od południowego zachodu – bez nowego włączenia do drogi III/3146"),
    T("Vstup do predajne na južnej fasáde prístavby, čelom k parkovisku a k príjazdu", "Wejście do sklepu w południowej elewacji dobudowy, frontem do parkingu i dojazdu"),
    T("Výdaj tovaru je vzadu a napojený priamo na halu; zásobovanie a sklad stavebnín sú v zadnom dvore", "Wydawanie towaru jest z tyłu i połączone bezpośrednio z halą; dostawy i skład materiałów są na tylnym placu"),
    T("Vzrastlá zeleň pri Levočskej ostáva ako clona; pylón pri vjazde", "Zieleń wysoka przy ul. Levočskiej zostaje jako osłona; pylon przy wjeździe")], size=11.5, bullet=True)
# ============ 6 top render ============
s = content(T("Návrh osadený do ortofotomapy", "Projekt na tle ortofotomapy"), note=False, k=1.2)
pic(s, "top.jpg", 0.4, 1.45, 8.2, 5.5)
tb(s, 8.85, 1.55, 4.1, 5.3, [T("3D model je osadený na satelitnú snímku v skutočnej mierke a polohe podľa katastra (parc. 775/1–775/5, 10 789 m²)", "Model 3D osadzono na zdjęciu satelitarnym w rzeczywistej skali i położeniu według katastru (dz. 775/1–775/5, 10 789 m²)"),
    T("Sever je približne hore; Levočská (III/3146) vľavo, rieka Jakubianka vpravo", "Północ w przybliżeniu u góry; ul. Levočská (III/3146) po lewej, rzeka Jakubianka po prawej"),
    T("Hala vypĺňa stred pozemku; okolo nej vzniká súvislý dopravný priestor: vjazd → parkovisko → zadný okruh → späť", "Hala wypełnia środek działki; wokół niej powstaje ciągła przestrzeń komunikacyjna: wjazd → parking → tylna pętla → powrót"),
    T(f"Zastavanosť {num(BUILT, 1)} % (limit 50 %), zeleň {num(GREEN, 1)} % (min. 20 %)", f"Zabudowa {num(BUILT, 1)} % (limit 50 %), zieleń {num(GREEN, 1)} % (min. 20 %)")], size=12, bullet=True)
# ============ 7 floor plan ============
s = content(T("Pôdorys 1. NP: predajná hala 45 × 64 m", "Rzut parteru: hala sprzedaży 45 × 64 m"), k=1.1)
pic(s, f"plan_{LANG}.png", 0.4, 1.4, 4.6, 5.6)
rows = [[T("Zóna", "Strefa"), "m²", T("Poznámka", "Uwagi")], [T("Predajňa a expozície", "Sala sprzedaży i ekspozycje"), "≈ 2 650", T("3 trakty: 16,5 + 13 + 15,5 m", "3 trakty: 16,5 + 13 + 15,5 m")], [T("Vstup, pokladne, info, WC", "Wejście, kasy, info, WC"), "≈ 230", T("pri južnej fasáde, 5 + 2 pokladne", "przy elewacji płd., 5 + 2 kasy")],
        [T("Príjem tovaru a sklad", "Przyjęcie towaru i magazyn"), "325", T("1. NP sev. bloku, 2 brány 4 × 4 m", "parter bloku płn., 2 bramy 4 × 4 m")], [T("Zázemie zamestnancov", "Zaplecze pracowników"), "325", T("2. NP sev. bloku", "piętro bloku płn.")], [T("Rezerva", "Rezerwa"), "650", T("3.–4. NP sev. bloku", "3.–4. kond. bloku płn.")],
        [T("Výdaj tovaru – krytý dvor", "Wydawanie towaru – zadaszony plac"), "178", T("brána 4 × 4 m z predajne, 3 státia", "brama 4 × 4 m z sali, 3 stanowiska")], [T("Vonkajšia zóna", "Ogród zewnętrzny"), "321", T("brána priamo z predajne", "brama bezpośrednio z sali")]]
table(s, 5.3, 1.5, 7.55, rows, [2.6, 0.9, 3.4], size=10.5, row_h=0.32, align_right=(1,))
tb(s, 5.3, 4.5, 7.55, 2.5, [T("Stará časť (svetlá výška cca 5,0 m): expozície kúpeľní, kuchýň, obkladov, nábytok – nižšie regály a vzorkovne", "Stara część (wys. w świetle ok. 5,0 m): ekspozycje łazienek, kuchni, płytek, meble – niższe regały i wzorcownie"),
    T("Prístavba (svetlá výška 6,0 m): vysoké regály 4,5 m – stavebný materiál, náradie, elektro, záhrada", "Dobudowa (wys. w świetle 6,0 m): wysokie regały 4,5 m – materiały budowlane, narzędzia, elektryka, ogród"),
    T("Modul prístavby 6,3 m nadväzuje na osi pôvodného skeletu; medzi starou a novou časťou dilatácia", "Moduł dobudowy 6,3 m nawiązuje do osi istniejącego szkieletu; między starą a nową częścią dylatacja"),
    T("Tovar prúdi zo severu (príjem) na juh (pokladne), zákazník opačne – bez kríženia so zásobovaním", "Towar płynie z północy (przyjęcie) na południe (kasy), klient odwrotnie – bez kolizji z dostawami"),
    T("Rozmiestnenie oddelení je ilustračné – upraví sa podľa typového layoutu Merkury Market", "Układ działów jest ilustracyjny – zostanie dostosowany do typowego layoutu Merkury Market")], size=11.5, bullet=True)
# ============ 8 logistics ============
s = content(T("Doprava: zadný zásobovací a výdajný okruh", "Komunikacja: tylna pętla dostaw i wydawania towaru"), k=1.22)
pic(s, f"flows_{LANG}.png", 0.4, 1.45, 4.3, 5.55)
h2(s, 5.0, 1.5, 7.8, T("Zásobovanie LKW", "Dostawy LKW"))
tb(s, 5.0, 1.9, 7.9, 1.7, [T("Kamión vojde existujúcim vjazdom, prejde hlavnou uličkou (7,0 m) do zadného dvora a zastaví v odstavnom pruhu 20 × 3,5 m", "Ciężarówka wjeżdża istniejącym wjazdem, przejeżdża aleją główną (7,0 m) na tylny plac i staje w zatoce 20 × 3,5 m"),
    T("Vykládka vozíkom v úrovni terénu (bez rámp, ako Olkusz) – do príjmu tovaru, vonkajšej zóny aj skladu stavebnín", "Rozładunek wózkiem w poziomie terenu (bez ramp, jak Olkusz) – do przyjęcia towaru, ogrodu i składu materiałów"),
    T("Odjazd po okruhu bez cúvania: vonkajší polomer 12,5 m, vnútorný 5,0 m, šírka vetvy 7,5 m (náves 16,5 m)", "Wyjazd pętlą bez cofania: promień zewn. 12,5 m, wewn. 5,0 m, szerokość 7,5 m (naczepa 16,5 m)")], size=11.5, bullet=True)
h2(s, 5.0, 3.75, 7.8, T("Výdaj tovaru zákazníkom", "Wydawanie towaru klientom"))
tb(s, 5.0, 4.15, 7.9, 1.5, [T("Výdaj je napojený na halu: krytý dvor 7,5 × 24 m pri severnej stene, brána priamo z predajne (oddelenie stavebnín)", "Wydawanie jest połączone z halą: zadaszony plac 7,5 × 24 m przy północnej ścianie, brama bezpośrednio z sali (dział materiałów budowlanych)"),
    T("Zákazník zaplatí, obíde jednosmerný zadný okruh a zastaví na 3 výdajných státiach pod prístreškom; odchádza priamo von, bez cúvania", "Klient płaci, objeżdża jednokierunkową tylną pętlę i staje na 3 stanowiskach pod wiatą; wyjeżdża na wprost, bez cofania")], size=11.5, bullet=True)
h2(s, 5.0, 5.5, 7.8, T("Na overenie v projekte", "Do weryfikacji w projekcie"))
tb(s, 5.0, 5.9, 7.9, 1.2, [T("Vlečné krivky návesovej súpravy na okruhu a v oblúku južnej cesty", "Krzywe przejazdu zestawu z naczepą na pętli i na łuku drogi południowej"), T("Voliteľne druhý výjazd na Levočskú na severe (súhlas správcu cesty) – priamy prejazd areálom", "Opcjonalnie drugi wyjazd na ul. Levočską od północy (zgoda zarządcy drogi) – przejazd przez teren na wprost")], size=11.5, bullet=True)
# ============ 9 rear render ============
s = content(T("Výdaj tovaru: krytý dvor napojený na halu", "Wydawanie towaru: zadaszony plac połączony z halą"), note=False, k=1.2)
pic(s, "vydaj.jpg", 0.4, 1.45, 8.6, 4.85)
tb(s, 9.2, 1.55, 3.8, 5.3, [T("Krytý výdajný dvor 7,5 × 24 m je pristavaný k severnej stene haly; brána 4 × 4 m vedie priamo z predajne", "Zadaszony plac 7,5 × 24 m przylega do północnej ściany hali; brama 4 × 4 m prowadzi bezpośrednio z sali sprzedaży"), T("Prístrešok presahuje nad 3 výdajné státia – nakladanie vozíkom v suchu", "Wiata wysunięta nad 3 stanowiska – załadunek wózkiem pod dachem"),
    T("Zákazník príde po okruhu, zastaví pri zadnom rohu haly a odchádza priamo von", "Klient przyjeżdża pętlą, staje przy tylnym narożniku hali i wyjeżdża na wprost"), T("Vedľa je vonkajšia zóna a príjem tovaru; kamión stojí v odstavnom pruhu za dvorom", "Obok ogród zewnętrzny i przyjęcie towaru; ciężarówka stoi w zatoce za placem")], size=12, bullet=True)
tb(s, 0.4, 6.35, 8.6, 0.5, T("Vizualizácia: Blender Cycles, model v mierke; materiály a vybavenie sú ilustračné.", "Wizualizacja: Blender Cycles, model w skali; materiały i wyposażenie są ilustracyjne."), size=9, color=GREY, italic=True)
# ============ 10 outdoor zone ============
s = content(T("Vonkajšia oplotená zóna na sezónny tovar", "Ogrodzony ogród zewnętrzny na towar sezonowy"), k=1.1)
pic(s, "aerial_ne.jpg", 0.4, 1.45, 7.4, 4.2)
rows = [[T("Parameter", "Parametr"), T("Návrh", "Projekt")], [T("Plocha", "Powierzchnia"), "13,5 × 23,75 m = 321 m²"], [T("Krytá časť", "Część zadaszona"), T("prístrešok 13,5 × 8 m = 108 m², výška 4,6 m", "wiata 13,5 × 8 m = 108 m², wys. 4,6 m")], [T("Oplotenie", "Ogrodzenie"), T("panelové 2,4 m, 2 brány", "panelowe 2,4 m, 2 bramy")],
        [T("Vstup zákazníkov", "Wejście klientów"), T("bránou z predajne (cez pokladne)", "bramą z sali sprzedaży (przez kasy)")], [T("Zásobovanie", "Dostawy"), T("priamo z odstavného pruhu LKW", "bezpośrednio z zatoki LKW")], [T("Povrch", "Nawierzchnia"), T("zámková dlažba, odvodnenie", "kostka, odwodnienie")]]
table(s, 8.0, 1.5, 4.9, rows, [1.6, 3.3], size=10.5, row_h=0.4)
tb(s, 8.0, 4.75, 4.9, 2.3, [T("Sortiment: rastliny, substráty, záhradný nábytok, grily, bazény, v zime stromčeky a posypy", "Asortyment: rośliny, podłoża, meble ogrodowe, grille, baseny, zimą choinki i posypki"), T("Regály do 4,5 m pri stene haly pod prístreškom (ako „ogród“ v Olkuszi)", "Regały do 4,5 m przy ścianie hali pod wiatą (jak „ogród” w Olkuszu)"),
    T("Zadné parkovisko (14 státí) je hneď vedľa – pre zákazníkov vonkajšej zóny a výdaja", "Parking tylny (14 miejsc) jest tuż obok – dla klientów ogrodu i wydawania")], size=11.5, bullet=True)
tb(s, 0.4, 5.75, 7.4, 1.2, T("Pohľad od severovýchodu: pri hale krytý výdaj tovaru a vedľa neho vonkajšia zóna, vpravo severný blok s logom, v strede okruhu zadné parkovisko, vpredu sklad stavebnín.", "Widok od północnego wschodu: przy hali zadaszone wydawanie towaru i obok ogród zewnętrzny, po prawej blok północny z logo, w środku pętli parking tylny, z przodu skład materiałów."), size=10.5, color=GREY, italic=True)
# ============ 11 parking ============
s = content(T("Parkovanie: rozloženie a počet státí", "Parking: układ i liczba miejsc"), k=1.1)
rows = [[T("Zóna", "Strefa"), T("Typ státia", "Typ miejsca"), T("Počet", "Liczba")], [T("Východ – rad pri fasáde haly", "Wschód – rząd przy elewacji hali"), "2,5 × 5,0 m", "17"], [T("Východ – ZŤP pri vstupe", "Wschód – niepełnosprawni przy wejściu"), "3,5 × 5,0 m", "4"], [T("Východ – rad pri hranici pozemku", "Wschód – rząd przy granicy działki"), "2,5 × 5,0 m", "27"],
        [T("Juh – pred vstupom, 2 rady", "Południe – przed wejściem, 2 rzędy"), "2,5 × 5,0 m", "20"], [T("Zadný dvor – šikmé státia v strede okruhu", "Tylny plac – miejsca skośne w środku pętli"), "2,5 × 5,0 m · 45°", "14"], [T("Zamestnanci – zadná ulička", "Pracownicy – tylna aleja"), "2,5 × 5,0 m", "16"], [T("Spolu", "Razem"), "", "98"]]
table(s, 0.5, 1.5, 6.1, rows, [3.3, 1.6, 0.8], size=11, row_h=0.36, bold_last=True, align_right=(2,))
tb(s, 0.5, 4.85, 6.1, 2.15, [T("Navyše: 3 výdajné státia 7,6 × 3,5 m (auto s prívesom) a odstavný pruh pre 1 návesovú súpravu", "Dodatkowo: 3 stanowiska wydawania 7,6 × 3,5 m (auto z przyczepą) i zatoka dla 1 zestawu z naczepą"), T("Hlavná ulička 7,0 m obojsmerná, kolmé státia po oboch stranách; južná ulička 6,0 m", "Aleja główna 7,0 m dwukierunkowa, miejsca prostopadłe po obu stronach; aleja południowa 6,0 m"),
    T("Chodník 2,0 m pozdĺž východnej fasády, priechod pred vstupom, 2 prístrešky na vozíky", "Chodnik 2,0 m wzdłuż elewacji wschodniej, przejście przed wejściem, 2 wiaty na wózki"), T("Zadné státia sú v zásobovacom dvore: nájazd z jednosmerného okruhu, vhodné najmä pre zamestnancov a zákazníkov výdaja", "Miejsca tylne są na placu dostaw: wjazd z jednokierunkowej pętli, odpowiednie głównie dla pracowników i klientów wydawania")], size=11.5, bullet=True)
h2(s, 6.95, 1.5, 6, T("Orientačná potreba státí", "Orientacyjne zapotrzebowanie"))
rows = [[T("Ukazovateľ", "Wskaźnik"), T("Výpočet", "Obliczenie"), T("Státia", "Miejsca")], [T("Zákazníci – rozmerný tovar", "Klienci – towar wielkogabarytowy"), T("≈ 2 650 m² : 30–40 m²", "≈ 2 650 m² : 30–40 m²"), "66–88"], [T("Zamestnanci", "Pracownicy"), T("≈ 30 v smene : 4", "≈ 30 na zmianie : 4"), "8"], [T("Potreba spolu", "Zapotrzebowanie razem"), "", "74–96"], [T("Návrh", "Projekt"), T("98 + 3 výdajné", "98 + 3 wydawanie"), "101"]]
table(s, 6.95, 1.9, 5.95, rows, [2.8, 2.2, 0.95], size=10.5, row_h=0.36, bold_last=True, align_right=(2,))
tb(s, 6.95, 4.15, 5.95, 2.8, [T("Porovnanie: Kęty má 90 státí na 3 607 m² (1 státie / 40 m²); Stará Ľubovňa 98 na 3 205 m² (1 / 33 m²)", "Porównanie: Kęty ma 90 miejsc na 3 607 m² (1 miejsce / 40 m²); Stará Ľubovňa 98 na 3 205 m² (1 / 33 m²)"),
    T("Rezerva: asanáciou administratívnej budovy pribudne cca 20 státí pri vjazde (spolu 118)", "Rezerwa: po rozbiórce budynku administracyjnego przybędzie ok. 20 miejsc przy wjeździe (razem 118)"),
    T("Presný výpočet podľa STN 73 6110/Z2 bude súčasťou projektu stavebného zámeru", "Dokładne obliczenie według normy STN 73 6110/Z2 będzie częścią projektu zamierzenia budowlanego")], size=11.5, bullet=True)
# ============ 12-15 renders ============
for img, ttl, cap in [("rear.jpg", T("Zadný dvor: okruh, zadné parkovisko a sklad stavebnín", "Tylny plac: pętla, parking tylny i skład materiałów"), T("V strede okruhu 14 šikmých státí, vpravo oplotený sklad stavebnín, vzadu kamión v odstavnom pruhu, krytý výdaj pri hale a severný blok; vľavo parkovanie zamestnancov.", "W środku pętli 14 miejsc skośnych, po prawej ogrodzony skład materiałów, w głębi ciężarówka w zatoce, zadaszone wydawanie przy hali i blok północny; po lewej parking pracowników.")),
                      ("aerial_sw.jpg", T("3D pohľad od juhozápadu – od Levočskej", "Widok 3D od południowego zachodu – od ul. Levočskiej"), T("Vľavo hore severný blok ako reklamná veža k hlavnej ceste, vpravo dole administratívna budova a vjazd s pylónom. Hala je jednotne opláštená striebornými panelmi.", "U góry po lewej blok północny jako wieża reklamowa przy drodze głównej, na dole po prawej budynek administracyjny i wjazd z pylonem. Hala jednolicie obłożona srebrnymi płytami.")),
                      ("entrance.jpg", T("Vstup: čierny portál s červeným logom", "Wejście: czarny portal z czerwonym logo"), T("Vstupná fasáda podľa štandardu Olkusz: čierny kazetový obklad RAL 9004, presklená stena, červené logo, vlajky. Parkovisko je priamo pred vstupom.", "Elewacja wejściowa w standardzie Olkusz: czarna okładzina kasetonowa RAL 9004, przeszklenie, czerwone logo, flagi. Parking bezpośrednio przed wejściem.")),
                      ("aerial_se.jpg", T("3D pohľad od juhovýchodu: vstup a hlavné parkovisko", "Widok 3D od południowego wschodu: wejście i parking główny"), T("Prístavba so vstupným portálom a sortimentnými tabuľami smerom k parkovisku; státia ZŤP najbližšie k vstupu, vzadu zadný okruh a sklad stavebnín.", "Dobudowa z portalem wejściowym i tablicami asortymentowymi od strony parkingu; miejsca dla niepełnosprawnych najbliżej wejścia, w głębi tylna pętla i skład materiałów.")),
                      ("road.jpg", T("Pohľad z Levočskej: sanovaná hala a severný blok", "Widok z ul. Levočskiej: zmodernizowana hala i blok północny"), T("Pôvodná hala dostane nový plášť RAL 9006 s logom a sortimentnými tabuľami; severný blok nesie logo viditeľné z oboch smerov cesty III/3146.", "Istniejąca hala otrzyma nową elewację RAL 9006 z logo i tablicami asortymentowymi; blok północny niesie logo widoczne z obu kierunków drogi III/3146."))]:
    s = content(ttl, note=False, k=1.0); pic(s, img, 1.2, 1.4, 10.93, 5.15); tb(s, 1.2, 6.55, 10.93, 0.5, cap, size=11, color=GREY, align=PP_ALIGN.CENTER)
# ============ 16 areas ============
s = content(T("Bilancia plôch a súlad s územným plánom", "Bilans powierzchni i zgodność z planem miejscowym"))
rows = [[T("Ukazovateľ", "Wskaźnik"), T("Návrh", "Projekt"), T("Regulatív ÚPI", "Wymóg planu"), T("Súlad", "Zgodność")], [T("Plocha pozemku", "Powierzchnia działki"), "10 789 m²", "–", "–"],
        [T("Zastavaná plocha (hala, sev. blok, admin. budova, prístrešky)", "Pow. zabudowy (hala, blok płn., bud. admin., wiaty)"), f"{num(A['built'])} m² · {num(BUILT, 1)} %", "max. 50 %", "✓"], [T("Zeleň na teréne", "Zieleń na gruncie"), f"{num(A['green'])} m² · {num(GREEN, 1)} %", "min. 20 %", "✓"],
        [T("Spevnené plochy", "Nawierzchnie utwardzone"), f"{num(A['paved'])} m² · {num(PAVED, 1)} %", "–", "–"], [T("Podlažnosť", "Liczba kondygnacji"), T("1 NP hala, 4 NP sev. blok (existujúci)", "1 kond. hala, 4 kond. blok płn. (istniejący)"), "max. 8 NP", "✓"],
        [T("Parkovanie", "Parking"), T("98 státí na vlastnom pozemku", "98 miejsc na własnej działce"), "STN 73 6110", "✓"], [T("Funkcia", "Funkcja"), T("obchod – občianska vybavenosť", "handel – usługi"), T("V06 polyfunkcia", "V06 funkcja mieszana"), "✓"]]
table(s, 0.5, 1.55, 7.9, rows, [3.3, 2.4, 1.5, 1.1], size=10.5, row_h=0.42)
cd = CategoryChartData(); cd.categories = [T("Zastavaná plocha", "Zabudowa"), T("Zeleň", "Zieleń"), T("Spevnené plochy", "Nawierzchnie")]; cd.add_series("m²", (round(A["built"]), round(A["green"]), round(A["paved"])))
gf = s.shapes.add_chart(XL_CHART_TYPE.DOUGHNUT, Inches(8.7), Inches(1.45), Inches(4.2), Inches(3.9), cd); ch = gf.chart; ch.has_legend = True; ch.legend.position = XL_LEGEND_POSITION.BOTTOM; ch.legend.include_in_layout = False; ch.legend.font.size = Pt(10)
pl_ = ch.plots[0]; pl_.has_data_labels = True; pl_.data_labels.show_percentage = True; pl_.data_labels.show_value = False; pl_.data_labels.number_format = "0%"; pl_.data_labels.number_format_is_linked = False; pl_.data_labels.font.size = Pt(11); pl_.data_labels.font.bold = True; pl_.data_labels.font.color.rgb = WHITE
for i, col in enumerate([ORANGE, RGBColor(0x6A, 0xA8, 0x4F), RGBColor(0x9A, 0xA0, 0xA6)]): pt = pl_.series[0].points[i]; pt.format.fill.solid(); pt.format.fill.fore_color.rgb = col
tb(s, 0.5, 5.6, 7.9, 1.4, [T("Regulatívy podľa územnoplánovacej informácie MsÚ-SL-151/195/2025 (zóna V06)", "Wymogi według informacji planistycznej MsÚ-SL-151/195/2025 (strefa V06)"), T("Sanácia a prístavba sú „zmena dokončenej stavby“ – funkcia obchodu je v zóne prípustná", "Modernizacja i dobudowa to „zmiana istniejącego obiektu” – funkcja handlowa jest w strefie dopuszczalna"),
    T(f"Rezerva zastavanosti cca {num(round(0.5 * A['parcel'] - A['built'], -1))} m² umožňuje neskoršie rozšírenie", f"Rezerwa zabudowy ok. {num(round(0.5 * A['parcel'] - A['built'], -1))} m² umożliwia późniejszą rozbudowę")], size=11.5, bullet=True)
# ============ 17 scope ============
s = content(T("Rozsah prác: sanácia a prístavba", "Zakres robót: modernizacja i dobudowa"), k=1.4)
cols = [(T("Sanácia pôvodnej haly · 1 667 m²", "Modernizacja istniejącej hali · 1 667 m²"), [T("Stavebno-technický a statický prieskum ŽB skeletu, základov a strechy", "Ekspertyza techniczna szkieletu, fundamentów i dachu"), T("Odstránenie starého plášťa, priečok, podláh a technológií", "Usunięcie starej obudowy, ścianek, posadzek i technologii"), T("Sanácia skeletu: reprofilácia, injektáž, ochranné nátery", "Naprawa szkieletu: reprofilacja, iniekcje, powłoki ochronne"),
            T("Nová priemyselná podlaha 20 cm", "Nowa posadzka przemysłowa 20 cm"), T("Nová strecha: PIR 20 cm + PVC, svetlíky", "Nowy dach: PIR 20 cm + PVC, świetliki"), T("Nový plášť: sendvičové panely RAL 9006", "Nowa elewacja: płyty warstwowe RAL 9006")]),
        (T("Prístavba · 1 213 m²", "Dobudowa · 1 213 m²"), [T("Základové pätky a prahy", "Stopy i belki fundamentowe"), T("ŽB stĺpy + oceľové priehradové väzníky, rozpon 15,5 m, modul 6,3 m", "Słupy żelbetowe + stalowe dźwigary kratowe, rozpiętość 15,5 m, moduł 6,3 m"), T("Strecha: trapézový plech TR160, PIR 20 cm, PVC", "Dach: blacha TR160, PIR 20 cm, PVC"),
            T("Plášť RAL 9006, vstupný portál RAL 9004 s presklením", "Elewacja RAL 9006, portal wejściowy RAL 9004 z przeszkleniem"), T("Podlaha 22 cm pre vysoké regály", "Posadzka 22 cm pod wysokie regały"), T("Zádverie, WC zákazníkov, info, pokladničná zóna", "Wiatrołap, WC klientów, info, strefa kas")]),
        (T("Technika a areál", "Instalacje i teren"), [T("Vykurovanie a chladenie strešnými jednotkami, vetranie s rekuperáciou", "Ogrzewanie i chłodzenie centralami dachowymi, wentylacja z odzyskiem"), T("EPS, hlasová signalizácia, hydranty, odvod dymu – bez sprinklerov (ak ich nevyžiada požiarny projekt)", "SSP, DSO, hydranty, oddymianie – bez tryskaczy (jeśli nie wymaga ich projekt ppoż.)"),
            T("LED osvetlenie, príprava na fotovoltiku", "Oświetlenie LED, przygotowanie pod fotowoltaikę"), T("Komunikácie pre ťažkú dopravu, okruh, 98 státí", "Drogi dla ruchu ciężkiego, pętla, 98 miejsc"), T("Dažďová kanalizácia s ORL a retenciou 120 m³", "Kanalizacja deszczowa z separatorem i retencją 120 m³"), T("Pylón 14 m, svetelné logá, oplotenie, zeleň", "Pylon 14 m, logo świetlne, ogrodzenie, zieleń")])]
for i, (hd, items) in enumerate(cols):
    x = 0.5 + i * 4.2; r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(1.5), Inches(4.0), Inches(0.5)); r.fill.solid(); r.fill.fore_color.rgb = NAVY; r.line.fill.background(); r.shadow.inherit = False
    tb(s, x + 0.1, 1.5, 3.8, 0.5, hd, size=13, bold=True, color=WHITE, font="Arial", anchor=MSO_ANCHOR.MIDDLE); tb(s, x, 2.15, 4.0, 4.8, items, size=11.5, bullet=True, space=7)
# ============ 18 cost summary ============
s = content(T("Odhad nákladov výstavby – súhrn", "Szacunek kosztów budowy – podsumowanie"), k=1.12)
names = {"SO 00": T("Príprava územia a asanácie", "Przygotowanie terenu i rozbiórki"), "SO 01a": T("Sanácia pôvodnej haly (1 667 m²)", "Modernizacja istniejącej hali (1 667 m²)"), "SO 01b": T("Prístavba haly (1 213 m²)", "Dobudowa hali (1 213 m²)"), "SO 02": T("Severný blok – 4 NP (1 300 m²)", "Blok północny – 4 kond. (1 300 m²)"), "SO 03": T("Technické zariadenia haly", "Instalacje hali"), "SO 04": T("Vonkajšie objekty, doprava, siete", "Zagospodarowanie terenu, drogi, sieci")}
rows = [[T("Kód", "Kod"), T("Stavebný objekt", "Obiekt"), T("€ bez DPH", "€ netto"), T("Podiel", "Udział")]] + [[c, names[c], eur(v), f"{num(100 * v / C['zrn'], 1)} %"] for c, _, _, v in C["so"]] + [["", T("Stavebné náklady spolu (ZRN)", "Roboty budowlane razem"), eur(C["zrn"]), "100 %"]]
pn = [T("Zariadenie staveniska, koordinácia (3 %)", "Zaplecze budowy, koordynacja (3 %)"), T("Projekt, inžiniering, dozory (6 %)", "Projekt, obsługa inwestycji, nadzory (6 %)"), T("Rezerva na nepredvídané práce (8 %)", "Rezerwa na roboty nieprzewidziane (8 %)")]
rows += [["", pn[i], eur(p[3]), ""] for i, p in enumerate(C["pct"])] + [["", T("INVESTIČNÉ NÁKLADY SPOLU BEZ DPH", "KOSZT INWESTYCJI RAZEM NETTO"), eur(C["total"]), ""]]
table(s, 0.5, 1.5, 7.6, rows, [0.8, 4.2, 1.6, 0.9], size=11, row_h=0.37, bold_last=True, align_right=(2, 3))
cd = CategoryChartData(); cd.categories = [c for c, *_ in C["so"]][::-1]; cd.add_series(T("tis. €", "tys. €"), [round(v / 1000) for *_, v in C["so"]][::-1])
gf = s.shapes.add_chart(XL_CHART_TYPE.BAR_CLUSTERED, Inches(8.4), Inches(1.45), Inches(4.5), Inches(3.3), cd); ch = gf.chart; ch.has_legend = False; ch.has_title = True; ch.chart_title.text_frame.text = T("tis. € bez DPH", "tys. € netto"); ch.chart_title.text_frame.paragraphs[0].runs[0].font.size = Pt(10)
pl_ = ch.plots[0]; pl_.gap_width = 60; pl_.has_data_labels = True; pl_.data_labels.font.size = Pt(10); pl_.data_labels.number_format = "#,##0"; pl_.data_labels.number_format_is_linked = False; pl_.data_labels.position = XL_LABEL_POSITION.OUTSIDE_END; pl_.series[0].format.fill.solid(); pl_.series[0].format.fill.fore_color.rgb = ORANGE
ch.category_axis.tick_labels.font.size = Pt(10); ch.value_axis.visible = False; ch.value_axis.has_major_gridlines = False
card(s, 8.4, 4.85, 2.15, 1.45, eur(C["per_m2_op"]), T("na m² prevádzkovej plochy (3 205 m²)", "na m² powierzchni operacyjnej (3 205 m²)"), 20); card(s, 10.75, 4.85, 2.15, 1.45, mil(C["gross"]), T("s DPH 23 %", "z VAT 23 % (stawka słowacka)"), 20)
tb(s, 8.4, 6.4, 4.5, 0.6, T("Cenová úroveň 2026, presnosť ±15 %. Položkový rozpočet (" + str(C["n_items"]) + " položiek) je v priloženom Exceli.", "Poziom cen 2026, dokładność ±15 %. Kosztorys pozycyjny (" + str(C["n_items"]) + " pozycji) w załączonym Excelu."), size=10, color=GREY, italic=True)
# ============ 19 cost detail ============
s = content(T("Odhad nákladov – hlavné položky", "Szacunek kosztów – główne pozycje"), k=1.12)
so = {c: v for c, _, _, v in C["so"]}
rows = [[T("Objekt", "Obiekt"), T("Čo je v cene", "Co obejmuje"), T("Ukazovateľ", "Wskaźnik"), "€"],
  ["SO 00", T("Asanácia 775/3, 775/4, 775/5 a drobných stavieb (≈ 4 900 m³), staré spevnené plochy, terénne úpravy, rezerva na environmentálnu záťaž 25 tis. €", "Rozbiórka 775/3, 775/4, 775/5 i drobnych obiektów (≈ 4 900 m³), stare nawierzchnie, roboty ziemne, rezerwa środowiskowa 25 tys. €"), T("22 €/m² pozemku", "22 €/m² działki"), eur(so["SO 00"])],
  ["SO 01a", T("Prieskum, búracie práce, sanácia skeletu 38 €/m², podlaha 72 €/m², strecha 105 €/m², nový plášť 98 €/m²", "Ekspertyza, rozbiórki, naprawa szkieletu 38 €/m², posadzka 72 €/m², dach 105 €/m², nowa elewacja 98 €/m²"), f"{num(so['SO 01a'] / 1667)} €/m²", eur(so["SO 01a"])],
  ["SO 01b", T("Základy 82 €/m², nosná konštrukcia 158 €/m², strecha 112 €/m², plášť 98 €/m², portál a presklenie 68 tis. €, podlaha 68 €/m²", "Fundamenty 82 €/m², konstrukcja 158 €/m², dach 112 €/m², elewacja 98 €/m², portal i przeszklenie 68 tys. €, posadzka 68 €/m²"), f"{num(so['SO 01b'] / 1213)} €/m²", eur(so["SO 01b"])],
  ["SO 02", T("1. NP príjem a sklad 260 €/m², 2. NP zázemie 520 €/m², konzervácia 3.–4. NP, nová fasáda a okná 1 100 m², strecha, TZB", "Parter: przyjęcie i magazyn 260 €/m², piętro: zaplecze 520 €/m², zabezpieczenie 3.–4. kond., nowa elewacja i okna 1 100 m², dach, instalacje"), f"{num(so['SO 02'] / 1300)} €/m²", eur(so["SO 02"])],
  ["SO 03", T("Vykurovanie, chladenie a vetranie 82 €/m², elektro a LED 66 €/m², EPS/CCTV/dáta 28 €/m², ZTI a hydranty 28 €/m², odvod dymu, MaR", "Ogrzewanie, chłodzenie i wentylacja 82 €/m², elektryka i LED 66 €/m², SSP/CCTV/sieć 28 €/m², wod-kan i hydranty 28 €/m², oddymianie, BMS"), f"{num(so['SO 03'] / 2880)} €/m²", eur(so["SO 03"])],
  ["SO 04", T("Asfalt pre ťažkú dopravu " + num(C["roads_m2"]) + " m² × 92 €, státia " + num(A["stalls_area"]) + " m² × 64 €, krytý výdaj tovaru " + num(C["vydaj_cost"] / 1000) + " tis. €, vonkajšia zóna " + num(C["garden_cost"] / 1000) + " tis. €, sklad stavebnín " + num(C["yard_cost"] / 1000) + " tis. €, dažďová kanalizácia a retencia 118 tis. €, trafostanica, pylón, logá, osvetlenie, zeleň", "Asfalt dla ruchu ciężkiego " + num(C["roads_m2"]) + " m² × 92 €, miejsca postojowe " + num(A["stalls_area"]) + " m² × 64 €, zadaszone wydawanie " + num(C["vydaj_cost"] / 1000) + " tys. €, ogród " + num(C["garden_cost"] / 1000) + " tys. €, skład materiałów " + num(C["yard_cost"] / 1000) + " tys. €, kanalizacja deszczowa i retencja 118 tys. €, trafo, pylon, logo, oświetlenie, zieleń"), T(f"{num(so['SO 04'] / 10789)} €/m² pozemku", f"{num(so['SO 04'] / 10789)} €/m² działki"), eur(so["SO 04"])]]
table(s, 0.5, 1.5, 12.35, rows, [0.9, 8.1, 1.6, 1.5], size=10.5, row_h=0.62, align_right=(3,))
tb(s, 0.5, 6.42, 12.35, 0.6, [T("Nezahrnuté: pozemok, vybavenie nájomcu (regály, pokladne, IT), poplatky za pripojenie, financovanie, DPH. Administratívna budova je mimo rozsahu.", "Nie obejmuje: gruntu, wyposażenia najemcy (regały, kasy, IT), opłat przyłączeniowych, finansowania, VAT. Budynek administracyjny jest poza zakresem."),
    T("Jednotkové ceny sú expertné ukazovatele pre Slovensko 2026; spresnia sa po prieskume pôvodnej haly a ponukách zhotoviteľov.", "Ceny jednostkowe to wskaźniki eksperckie dla Słowacji 2026; zostaną doprecyzowane po ekspertyzie hali i ofertach wykonawców.")], size=10.5, bullet=True, color=GREY)
# ============ 20 comparison + options ============
s = content(T("Porovnanie s novostavbou a voliteľné položky", "Porównanie z nowym obiektem i pozycje opcjonalne"), k=1.18)
cm = C["cmp"]
h2(s, 0.5, 1.5, 6, T("Sanácia + prístavba vs. asanácia a novostavba", "Modernizacja + dobudowa vs. rozbiórka i nowy obiekt"))
rows = [["", T("Variant B", "Wariant B"), T("Novostavba", "Nowy obiekt")], [T("Investičné náklady bez DPH", "Koszt inwestycji netto"), mil(C["total"]), mil(cm["new_total"])], [T("Na m² prevádzkovej plochy", "Na m² pow. operacyjnej"), eur(C["per_m2_op"]), eur(cm["new_total"] / 3205)],
        [T("Asanácia hlavnej haly a sev. bloku", "Rozbiórka hali głównej i bloku płn."), T("nie", "nie"), T("áno, +0,38 mil. €", "tak, +0,38 mln €")], [T("Rezerva plôch v sev. bloku", "Rezerwa powierzchni w bloku płn."), "650 m²", "–"], [T("Riziko skrytých vád", "Ryzyko wad ukrytych"), T("vyššie – overí prieskum", "wyższe – zweryfikuje ekspertyza"), T("nízke", "niskie")]]
table(s, 0.5, 1.95, 6.2, rows, [2.8, 1.7, 1.7], size=10.5, row_h=0.4)
card(s, 0.5, 5.05, 3.0, 1.6, "−" + mil(cm["delta_total"]), T(f"úspora variantu B oproti novostavbe (≈ {round(100 * cm['delta_total'] / cm['new_total'])} %)", f"oszczędność wariantu B względem nowego obiektu (≈ {round(100 * cm['delta_total'] / cm['new_total'])} %)"), 22)
tb(s, 3.7, 5.05, 3.0, 1.8, T("Úspora vzniká využitím skeletu a základov pôvodnej haly a vynechaním jej asanácie. Severný blok vychádza cenovo neutrálne.", "Oszczędność wynika z wykorzystania szkieletu i fundamentów istniejącej hali oraz rezygnacji z jej rozbiórki. Blok północny jest kosztowo neutralny."), size=12.5, color=GREY)
h2(s, 7.0, 1.5, 6, T("Voliteľné položky (nie sú v súčte)", "Pozycje opcjonalne (poza sumą)"))
on = [T("Sprinklery – len ak ich vyžiada požiarny projekt", "Tryskacze – tylko jeśli wymaga ich projekt ppoż."), T("Fotovoltika na streche 100 kWp", "Fotowoltaika na dachu 100 kWp"), T("Asanácia admin. budovy + 20 státí", "Rozbiórka bud. admin. + 20 miejsc"), T("Severný výjazd na Levočskú", "Północny wyjazd na ul. Levočską")]
rows = [[T("Položka", "Pozycja"), "€"]] + [[on[i], eur(o[2])] for i, o in enumerate(C["opt"])]
table(s, 7.0, 1.95, 5.85, rows, [4.3, 1.5], size=10.5, row_h=0.4, align_right=(1,))
h2(s, 7.0, 4.5, 6, T("Kde sa dá ušetriť", "Gdzie można oszczędzić"))
tb(s, 7.0, 4.9, 5.85, 2.1, [T("Severný blok: len náter fasády a ponechanie okien → cca −90 tis. €", "Blok północny: tylko malowanie elewacji i pozostawienie okien → ok. −90 tys. €"), T("Zázemie zamestnancov v hale namiesto 2. NP bloku → cca −70 tis. €", "Zaplecze pracowników w hali zamiast piętra bloku → ok. −70 tys. €"),
    T("Ponechanie vyhovujúcej časti starých spevnených plôch a južnej cesty → cca −60 tis. €", "Pozostawienie dobrej części starych nawierzchni i drogi południowej → ok. −60 tys. €"), T("Ak prieskum potvrdí dobrý stav strešných panelov, stačí nové zateplenie a fólia → cca −50 tis. €", "Jeśli ekspertyza potwierdzi dobry stan płyt dachowych, wystarczy nowe ocieplenie i membrana → ok. −50 tys. €")], size=11, bullet=True)
# ============ 21 timeline ============
s = content(T("Harmonogram prípravy a výstavby", "Harmonogram przygotowania i budowy"), k=1.12)
rows = [[T("Fáza", "Etap"), T("Obsah", "Zakres"), T("Mesiace", "Miesiące")],
        ["1", T("Potvrdenie zadania Merkury Market, zmluvy; stavebno-technický prieskum, statika, geodetické zameranie", "Potwierdzenie założeń Merkury Market, umowy; ekspertyza techniczna, konstrukcyjna, pomiar geodezyjny"), "1–2"],
        ["2", T("Projekt stavebného zámeru, stanoviská dotknutých orgánov, záväzné stanovisko mesta", "Projekt zamierzenia budowlanego (słow. projekt stavebného zámeru), uzgodnienia, wiążące stanowisko miasta"), "3–5"],
        ["3", T("Rozhodnutie o stavebnom zámere; projekt stavby a jeho overenie; výber zhotoviteľa", "Decyzja o zamierzeniu budowlanym (rozhodnutie o stavebnom zámere); projekt budowlany i jego weryfikacja; wybór wykonawcy"), "6–8"],
        ["4", T("Asanácie, príprava územia, prekládky sietí", "Rozbiórki, przygotowanie terenu, przełożenia sieci"), "9–10"],
        ["5", T("Sanácia skeletu a strechy pôvodnej haly; základy, konštrukcia a opláštenie prístavby", "Naprawa szkieletu i dachu istniejącej hali; fundamenty, konstrukcja i obudowa dobudowy"), "10–14"],
        ["6", T("Podlahy, technické zariadenia, severný blok, vstupný portál", "Posadzki, instalacje, blok północny, portal wejściowy"), "13–17"],
        ["7", T("Komunikácie, okruh, parkovisko, vonkajšia zóna; kolaudačné osvedčenie; odovzdanie na vybavenie predajne", "Drogi, pętla, parking, ogród; świadectwo odbioru (kolaudačné osvedčenie); przekazanie do wyposażenia sklepu"), "15–18"],
        ["8", T("Vybavenie predajne nájomcom a otvorenie", "Wyposażenie sklepu przez najemcę i otwarcie"), "19–20"]]
table(s, 0.5, 1.5, 12.35, rows, [0.7, 9.8, 1.2], size=11, row_h=0.46)
tb(s, 0.5, 6.25, 12.35, 0.8, [T("Podľa nového stavebného zákona (č. 25/2025 Z. z.) sa namiesto územného a stavebného konania vedie jedno konanie o stavebnom zámere.", "Według nowej słowackiej ustawy budowlanej (nr 25/2025 Z. z.) zamiast decyzji lokalizacyjnej i pozwolenia na budowę prowadzi się jedno postępowanie w sprawie zamierzenia budowlanego."),
    T("Termíny sú orientačné; závisia od lehôt dotknutých orgánov a od výsledkov prieskumu pôvodnej haly.", "Terminy są orientacyjne; zależą od terminów organów i wyników ekspertyzy istniejącej hali.")], size=11, bullet=True, color=GREY)
# ============ 22 assumptions ============
s = content(T("Predpoklady a riziká", "Założenia i ryzyka"), k=1.4)
cols = [(T("Predpoklady návrhu", "Założenia projektu"), [T("Rozmery budov sú z ortofotomapy a katastra – presnosť cca ±0,5 m", "Wymiary budynków z ortofotomapy i katastru – dokładność ok. ±0,5 m"), T("Svetlá výška pôvodnej haly cca 5,0 m postačuje pre expozície; vysoké regály sú v prístavbe", "Wysokość istniejącej hali ok. 5,0 m wystarcza na ekspozycje; wysokie regały są w dobudowie"),
            T("Južná prístupová cesta ostáva na pozemku a môže slúžiť aj susedom", "Droga południowa pozostaje na działce i może służyć także sąsiadom"), T("Administratívna budova ostáva; jej využitie (prenájom, kancelárie) je samostatná téma", "Budynek administracyjny zostaje; jego wykorzystanie (najem, biura) to osobny temat")]),
        (T("Riziká", "Ryzyka"), [T("Stav ŽB skeletu, základov a strešných panelov – rozhodne prieskum (prvý krok)", "Stan szkieletu, fundamentów i płyt dachowych – rozstrzygnie ekspertyza (pierwszy krok)"), T("Požiarne riešenie: jeden požiarny úsek 2 880 m² – môže vyžadovať sprinklery (+250 tis. €)", "Ochrona ppoż.: jedna strefa pożarowa 2 880 m² – może wymagać tryskaczy (+250 tys. €)"),
            T("Environmentálna záťaž po bývalej prevádzke (sklad olejov) – v odhade rezerva 25 tis. €", "Obciążenia środowiskowe po dawnej działalności (magazyn olejów) – w szacunku rezerwa 25 tys. €"), T("Výškový rozdiel voči Levočskej (cesta na násype) – odvodnenie a oporné múriky", "Różnica wysokości względem ul. Levočskiej (droga na nasypie) – odwodnienie i murki oporowe")]),
        (T("Čo potrebujeme od Merkury Market", "Czego potrzebujemy od Merkury Market"), [T("Potvrdenie veľkosti a členenia predajne, typový layout oddelení", "Potwierdzenie wielkości i podziału sklepu, typowy layout działów"), T("Požadovaná svetlá výška a nosnosť podlahy", "Wymagana wysokość w świetle i nośność posadzki"), T("Štandard technických zariadení (podľa Olkusz / Kęty)", "Standard instalacji (jak Olkusz / Kęty)"),
            T("Počet a typ zásobovacích vozidiel za deň", "Liczba i rodzaj pojazdów dostawczych dziennie"), T("Rozsah vonkajšej zóny a skladu stavebnín", "Zakres ogrodu zewnętrznego i składu materiałów")])]
for i, (hd, items) in enumerate(cols):
    x = 0.5 + i * 4.2; r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(1.5), Inches(4.0), Inches(0.5)); r.fill.solid(); r.fill.fore_color.rgb = NAVY if i < 2 else ORANGE; r.line.fill.background(); r.shadow.inherit = False
    tb(s, x + 0.1, 1.5, 3.8, 0.5, hd, size=13, bold=True, color=WHITE, font="Arial", anchor=MSO_ANCHOR.MIDDLE); tb(s, x, 2.15, 4.0, 4.8, items, size=11.5, bullet=True, space=7)
# ============ 23 closing ============
K[0] = 1.0; s = prs.slides.add_slide(L_DARK); n_slide[0] += 1
s.shapes.add_picture(os.path.join(HERE, "logo_white.png"), Emu(548640), Emu(457200), Emu(2011680), Emu(603504))
tb(s, 0.6, 1.6, 7, 0.8, T("Ďalšie kroky", "Dalsze kroki"), size=32, bold=True, color=WHITE, font="Arial")
tb(s, 0.6, 2.5, 6.6, 3.0, [T("Potvrdenie variantu B a zadania zo strany Merkury Market", "Potwierdzenie wariantu B i założeń przez Merkury Market"), T("Obhliadka areálu a stavebno-technický prieskum pôvodnej haly", "Wizja lokalna i ekspertyza techniczna istniejącej hali"), T("Spresnenie rozpočtu podľa prieskumu a ponúk zhotoviteľov", "Doprecyzowanie kosztorysu po ekspertyzie i ofertach wykonawców"),
    T("Projekt stavebného zámeru a návrh zmluvných podmienok", "Projekt zamierzenia budowlanego i propozycja warunków umowy")], size=15, color=WHITE, bullet=True, space=10)
bar = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(5.35), Inches(1.2), Inches(0.06)); bar.fill.solid(); bar.fill.fore_color.rgb = ORANGE; bar.line.fill.background()
tb(s, 0.6, 5.55, 6.6, 1.3, ["BauHausEurope s. r. o.", T("Konventná 9, 811 03 Bratislava", "Konventná 9, 811 03 Bratysława, Słowacja"), T("Bc. Ľubomír Kruk, konateľ", "Bc. Ľubomír Kruk, prezes zarządu (konateľ)"), "+421 904 027 703 · info@bauhauseurope.de · www.bauhauseurope.sk"], size=12, color=WHITE)
pic(s, "entrance.jpg", 7.4, 1.9, 5.5, 3.6)
prs.save(OUT); print("saved", OUT, n_slide[0], "slides")
