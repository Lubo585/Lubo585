import json, sys, math, os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Rectangle, FancyArrowPatch, Circle
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
LANG = sys.argv[1] if len(sys.argv) > 1 else "sk"
S = json.load(open(os.path.join(HERE, "layout.json"))); A = S["AREAS"]
OV = json.load(open(os.path.join(HERE, "ortho_H_view.json"))); ORTHO = np.asarray(Image.open(os.path.join(HERE, "ortho_H_view.jpg")))
NAVY = "#010222"; ORANGE = "#FF4000"; GREY = "#52514e"
T = {"sk": dict(
  t_exist="SÚČASNÝ STAV – čo ostáva a čo sa asanuje", t_site="SITUÁCIA – sanácia starej haly + prístavba", t_flow="DOPRAVA – zadný zásobovací a výdajný okruh", t_plan="PÔDORYS 1. NP – hala 45 × 64 m",
  old="PÔVODNÁ HALA\nsanácia\n1 667 m²", ext="PRÍSTAVBA\nnovostavba\n1 213 m²", nb="SEVERNÝ BLOK (4 NP)\npríjem tovaru + sklad\nzázemie zamestnancov", adm="ADMIN. BUDOVA\n(3 NP, ostáva)", garden="VONKAJŠIA ZÓNA\nsezónny tovar\noplotená · 446 m²", canopy="prístrešok", yard="SKLAD STAVEBNÍN (oplotený) · 512 m²",
  pick="VÝDAJ TOVARU – 3 státia", lkw="ZÁSOBOVANIE LKW", island="zeleň", park_e="PARKOVISKO – východ\n48 miest", park_s="PARKOVISKO – juh\n20 miest", staff="zamestnanci 16", entr="VSTUP", road="Levočská (III/3146)", river="rieka Jakubianka", lane="miestna cesta", sroad="existujúca prístupová cesta", vjazd="VJAZD / VÝJAZD",
  keep="ostáva – sanácia", demo="asanácia", newh="obrys novej haly 45 × 64 m", b3="775/3 sklad\nasanácia", b4="775/4", b5="775/5", cpy="prístrešok", sheds="drobné sklady", pylon="pylón", N="S", ztp="4× ZŤP", ring="jednosmerný okruh", trees="vzrastlá zeleň (ostáva)",
  f_cust="zákazníci – osobné autá", f_pick="výdaj tovaru – autá s prívesom", f_lkw="zásobovanie LKW", f_ped="peší",
  p_sales_w="EXPOZÍCIE\nkúpeľne · obklady a dlažby\nkuchyne · nábytok", p_sales_m="PREDAJŇA\npodlahy · dvere · okná\nfarby · svietidlá · dekor", p_sales_e="PREDAJŇA – vysoké regály\nstavebný materiál · náradie\nelektro · záhrada", p_cash="POKLADNE (5 + 2 samoobsl.)", p_info="info ·\nreklamácie", p_wc="WC zákazníci\nprebaľovanie", p_wind="zádverie", p_store="PRÍJEM TOVARU + SKLAD\n325 m² (1. NP sev. bloku)", p_gate="brána 4 m", p_gard="→ vonkajšia zóna", p_old="pôvodná hala – sanácia (svetlá výška cca 5,0 m)", p_new="prístavba (svetlá výška 6,0 m)", p_exit="únikový východ", p_col="existujúce ŽB stĺpy", p_staff="2. NP: šatne, denná miestnosť,\nkancelárie, server"),
 "pl": dict(
  t_exist="STAN OBECNY – co zostaje, a co do rozbiórki", t_site="PLAN ZAGOSPODAROWANIA – modernizacja starej hali + dobudowa", t_flow="KOMUNIKACJA – tylna pętla dostaw i wydawania towaru", t_plan="RZUT PARTERU – hala 45 × 64 m",
  old="ISTNIEJĄCA HALA\nmodernizacja\n1 667 m²", ext="DOBUDOWA\nnowa część\n1 213 m²", nb="BLOK PÓŁNOCNY (4 kond.)\nprzyjęcie towaru + magazyn\nzaplecze pracowników", adm="BUD. ADMIN.\n(3 kond., zostaje)", garden="OGRÓD ZEWNĘTRZNY\ntowar sezonowy\nogrodzony · 446 m²", canopy="wiata", yard="SKŁAD MAT. BUDOWLANYCH (ogrodzony) · 512 m²",
  pick="WYDAWANIE TOWARU – 3 stanowiska", lkw="DOSTAWY LKW", island="zieleń", park_e="PARKING – wschód\n48 miejsc", park_s="PARKING – południe\n20 miejsc", staff="pracownicy 16", entr="WEJŚCIE", road="ul. Levočská (III/3146)", river="rzeka Jakubianka", lane="droga lokalna", sroad="istniejąca droga dojazdowa", vjazd="WJAZD / WYJAZD",
  keep="zostaje – modernizacja", demo="rozbiórka", newh="obrys nowej hali 45 × 64 m", b3="775/3 magazyn\nrozbiórka", b4="775/4", b5="775/5", cpy="wiata", sheds="drobne magazyny", pylon="pylon", N="N", ztp="4× niepełnospr.", ring="pętla jednokierunkowa", trees="zieleń wysoka (zostaje)",
  f_cust="klienci – samochody osobowe", f_pick="wydawanie towaru – auta z przyczepą", f_lkw="dostawy LKW", f_ped="piesi",
  p_sales_w="EKSPOZYCJE\nłazienki · płytki\nkuchnie · meble", p_sales_m="SALA SPRZEDAŻY\npodłogi · drzwi · okna\nfarby · oświetlenie · dekor", p_sales_e="SALA SPRZEDAŻY – wysokie regały\nmateriały budowlane · narzędzia\nelektryka · ogród", p_cash="KASY (5 + 2 samoobsł.)", p_info="info ·\nreklamacje", p_wc="WC klienci\nprzewijak", p_wind="wiatrołap", p_store="PRZYJĘCIE TOWARU + MAGAZYN\n325 m² (parter bloku płn.)", p_gate="brama 4 m", p_gard="→ ogród zewnętrzny", p_old="istniejąca hala – modernizacja (wys. w świetle ok. 5,0 m)", p_new="dobudowa (wys. w świetle 6,0 m)", p_exit="wyjście ewakuacyjne", p_col="istniejące słupy żelbetowe", p_staff="Piętro: szatnie, pom. socjalne,\nbiura, serwer"),
}[LANG]
def rect(ax, r, **kw): ax.add_patch(Rectangle((r[0], r[1]), r[2], r[3], **kw))
def poly(ax, pts, **kw): ax.add_patch(Polygon(pts, closed=True, **kw))
def label(ax, x, y, t, size=7, color=NAVY, bold=False, rot=0, ha="center", va="center", bg=None):
    ax.text(x, y, t, fontsize=size, color=color, ha=ha, va=va, rotation=rot, fontweight="bold" if bold else "normal", linespacing=1.15, zorder=20, bbox=dict(fc=bg, ec="none", alpha=0.85, pad=0.25) if bg else None)
def north(ax, x, y):
    dx, dy = 0.154 * 9, 0.988 * 9
    ax.annotate("", xy=(x + dx, y + dy), xytext=(x, y), arrowprops=dict(arrowstyle="-|>", color=NAVY, lw=1.6), zorder=30); ax.text(x + dx * 1.25, y + dy * 1.2, T["N"], ha="center", fontsize=9, fontweight="bold", color=NAVY, zorder=30)
def scalebar(ax, x, y):
    for i in range(5): ax.add_patch(Rectangle((x + i * 10, y), 10, 1.5, fc="black" if i % 2 == 0 else "white", ec="black", lw=0.6, zorder=30))
    for i in (0, 25, 50): ax.text(x + i, y - 2.6, f"{i} m", fontsize=6.5, ha="center", zorder=30, bbox=dict(fc="white", ec="none", alpha=0.7, pad=0.3))
WIN = (-32, 92, -48, 136)
def base(title, alpha=0.55, figsize=(7.6, 11.3)):
    fig, ax = plt.subplots(figsize=figsize, dpi=200); ax.set_aspect("equal"); ax.axis("off")
    ax.imshow(ORTHO, extent=(OV["X0"], OV["X1"], OV["Y0"], OV["Y1"]), zorder=0)
    ax.add_patch(Rectangle((OV["X0"], OV["Y0"]), OV["X1"] - OV["X0"], OV["Y1"] - OV["Y0"], fc="white", ec="none", alpha=alpha, zorder=1))
    ax.set_xlim(WIN[0], WIN[1]); ax.set_ylim(WIN[2], WIN[3])
    ax.set_title(title, loc="left", fontsize=12, fontweight="bold", color=NAVY)
    label(ax, -19, 30, T["road"], size=7.5, rot=88, bold=True, bg="white"); label(ax, 86, 60, T["river"], size=7, rot=-86, color="#2b5d95", bg="white"); label(ax, 77.5, 96, T["lane"], size=6, rot=-87, color=GREY, bg="white")
    return fig, ax
def parcel(ax, **kw): poly(ax, S["PARCEL"], fc="none", ec="#1a7f1a", lw=2.0, zorder=15, **kw)
# ------------------------------------------------------------------ existing
def existing():
    fig, ax = base(T["t_exist"], alpha=0.25); parcel(ax)
    for r in (S["OLD_W"], S["OLD_E"], S["NB"]): rect(ax, r, fc="#2a78d6", ec="#0b3d91", lw=1.6, alpha=0.35, zorder=5)
    rect(ax, S["ADM"], fc="#9aa0a6", ec=NAVY, lw=1.2, alpha=0.45, zorder=5)
    D = S["DEMO"]
    for r in [D["b775_3"], D["b775_4"], D["b775_5"]] + D["canopy"] + D["sheds"]: rect(ax, r, fc="#e34948", ec="#8f1010", lw=1.2, alpha=0.4, hatch="///", zorder=5)
    rect(ax, S["HALL"], fc="none", ec=ORANGE, lw=2.4, ls="--", zorder=8)
    label(ax, 8.2, 36, T["old"].replace("\n", " · ", 1) if False else T["old"], size=7.5, bold=True, color="#0b3d91", bg="white"); label(ax, 14.5, 70.5, T["nb"].split("\n")[0], size=6.5, bold=True, color="#0b3d91", bg="white"); label(ax, 7, -12.8, T["adm"], size=6.5, bold=True, bg="white")
    label(ax, 44.5, 30, T["b3"], size=6.5, bold=True, color="#8f1010", bg="white"); label(ax, 60, 31.5, T["b4"], size=6, color="#8f1010", bg="white"); label(ax, 53.5, -8, T["b5"], size=6, color="#8f1010", bg="white"); label(ax, 23, 6.5, T["cpy"], size=6, color="#8f1010", bg="white"); label(ax, 49, 81, T["sheds"], size=6, color="#8f1010", bg="white")
    label(ax, 37, 60.5, T["newh"], size=6.5, bold=True, color=ORANGE, bg="white")
    # dimensions
    def dim(a, b, t, off=(0, 0), rot=0):
        ax.annotate("", xy=a, xytext=b, arrowprops=dict(arrowstyle="<->", color=NAVY, lw=0.9), zorder=25); label(ax, (a[0] + b[0]) / 2 + off[0], (a[1] + b[1]) / 2 + off[1], t, size=6.5, rot=rot, bg="white", bold=True)
    dim((0, -1.6), (16.5, -1.6), "16,5 m", (0, -1.8)); dim((16.5, 15.2), (29.5, 15.2), "13 m", (0, -1.8)); dim((-2.2, 0), (-2.2, 64), "64 m", (-2.2, 0), 90); dim((31.3, 17), (31.3, 64), "47 m", (1.8, -8), 90); dim((2, 79), (27, 79), "25 m", (0, 1.8)); dim((28.8, 64), (28.8, 77), "13 m", (2.2, 0), 90)
    items = [("#2a78d6", T["keep"]), ("#e34948", T["demo"]), (ORANGE, T["newh"])]
    for i, (c, t) in enumerate(items):
        ax.add_patch(Rectangle((-30, 131 - i * 4.5), 4, 2.4, fc=c if i < 2 else "none", ec=c, lw=1.5, alpha=0.6 if i < 2 else 1, ls="-" if i < 2 else "--", zorder=30)); label(ax, -25, 132.2 - i * 4.5, t, size=6.5, ha="left", bg="white")
    north(ax, 84, 122); scalebar(ax, 36, -44)
    fig.tight_layout(); fig.savefig(os.path.join(HERE, f"existing_{LANG}.png")); plt.close(fig)
# ------------------------------------------------------------------ site
def site(flows=False):
    fig, ax = base(T["t_flow"] if flows else T["t_site"], alpha=0.5); 
    for g in S["GREEN"]: poly(ax, g, fc="#b5d9a0", ec="none", zorder=2)
    for p in S["PAVED"]: poly(ax, p, fc="#dcdcdc", ec="none", zorder=3)
    poly(ax, S["SOUTH_ROAD"], fc="#c9c9c9", ec="none", zorder=3)
    rect(ax, S["AISLE"], fc="#c4c4c4", ec="none", zorder=4); rect(ax, S["SOUTH_LEG"], fc="#c4c4c4", ec="none", zorder=4); rect(ax, S["NORTH_LEG"], fc="#c4c4c4", ec="none", zorder=4); poly(ax, S["RING_ARC"], fc="#c4c4c4", ec="none", zorder=4); rect(ax, S["NB_APRON"], fc="#cfcfcf", ec="none", zorder=4); rect(ax, S["P1_AISLE"], fc="#c4c4c4", ec="none", zorder=4)
    poly(ax, S["ISLAND"], fc="#9fcf85", ec="#5b9a41", lw=0.8, zorder=5)
    for s in S["STALLS"]:
        c = {"cust": "#efefef", "staff": "#e2e8f2", "dis": "#8fb9e8"}[s[4]]; rect(ax, s[:4], fc=c, ec="#8a8a8a", lw=0.4, zorder=5)
    for r in S["SIDEWALKS"]: rect(ax, r, fc="#f1ead9", ec="none", zorder=5)
    rect(ax, S["GARDEN"], fc="#dff0cf", ec="#2f6b1f", lw=1.4, ls="--", zorder=6); rect(ax, S["GARDEN_CANOPY"], fc="#c5e3ad", ec="#2f6b1f", lw=0.8, hatch="//", zorder=6)
    rect(ax, S["YARD"], fc="#efe3c6", ec="#7a6a3a", lw=1.4, ls="--", hatch="..", zorder=6)
    rect(ax, S["PICKUP"], fc="#ffe9a8", ec="#b08900", lw=0.8, zorder=6)                      # pick-up lay-by
    rect(ax, S["LKW_CANOPY"], fc="#ffd3c2", ec="#a33", lw=0.8, zorder=6)                          # LKW lay-by
    rect(ax, (28.5, 84.2, 16.5, 2.6), fc="#555", ec="white", lw=0.5, alpha=0.85, zorder=7)       # truck
    for i in range(3): rect(ax, (29 + i * 7.6, 105.8, 6.5, 2.4), fc="none", ec="#b08900", lw=0.8, zorder=7)
    c = S["CROSSING"]
    for i in range(5): rect(ax, (c[0] + 0.3 + i * 1.0, c[1], 0.5, c[3]), fc="white", ec="none", zorder=6)
    for r in S["TROLLEY"]: rect(ax, r, fc="#7fa7d6", ec=NAVY, lw=0.5, zorder=7)
    # buildings
    rect(ax, S["OLD_W"], fc="#9db7d1", ec=NAVY, lw=1.2, zorder=8); rect(ax, S["OLD_E"], fc="#9db7d1", ec=NAVY, lw=1.2, zorder=8)
    for e in S["EXT"]: rect(ax, e, fc="#ff8a4c", ec=NAVY, lw=1.2, zorder=8)
    rect(ax, S["HALL"], fc="none", ec=NAVY, lw=1.8, zorder=9)
    rect(ax, S["NB"], fc="#6f8fb0", ec=NAVY, lw=1.4, zorder=8); rect(ax, S["ADM"], fc="#d6d6d6", ec=NAVY, lw=1.0, hatch="xx", zorder=8); rect(ax, S["ENTR"], fc="#111", ec=NAVY, lw=0.8, zorder=9)
    ax.add_patch(Circle(S["PYLON"], 1.3, fc="#ffd21f", ec=NAVY, lw=0.9, zorder=10)); label(ax, S["PYLON"][0] + 0.3, S["PYLON"][1] + 3.2, T["pylon"], size=5.5, bg="white")
    parcel(ax)
    if not flows:
        label(ax, 8.2, 40, T["old"], size=7.5, bold=True); label(ax, 37.2, 40, T["ext"], size=7.5, bold=True, color="white"); label(ax, 14.5, 70.5, T["nb"], size=5.6, bold=True, color="white"); label(ax, 7.2, -12.8, T["adm"], size=5.8, bold=True, bg="white")
        label(ax, 39.2, 77, T["garden"], size=6, bold=True, color="#1f4d12"); label(ax, 39.2, 68, T["canopy"], size=5.5, color="#1f4d12"); label(ax, 38.5, 115, T["yard"], size=6, bold=True, color="#5a4a1a")
        label(ax, 39.5, 107.0, T["pick"], size=5.2, bold=True, color="#6b5200"); label(ax, 37, 85.5, T["lkw"], size=5.2, bold=True, color="#8f1010", bg="white"); label(ax, 38, 96.25, T["island"], size=6, color="#1f4d12")
        label(ax, 55.5, 30, T["park_e"], size=6.8, bold=True, rot=90, bg="white"); label(ax, 35, -11, T["park_s"], size=6.5, bold=True, bg="white"); label(ax, 61.5, 86, T["staff"], size=5.8, rot=90, bg="white"); label(ax, 49.5, 17.5, T["ztp"], size=5.2, rot=90, color="#0b3d91")
        label(ax, 34, -1.5, T["entr"], size=6.2, bold=True, color="white"); label(ax, 12, -27.5, T["sroad"], size=5.8, color=GREY, bg="white"); label(ax, -14, -36, T["vjazd"], size=7, bold=True, color=ORANGE, bg="white")
        label(ax, 16.5, 96, T["ring"], size=5.5, rot=90, color=GREY, bg="white"); label(ax, 6.5, 103, T["trees"], size=5.5, rot=73, color="#1f4d12", bg="white")
        for a, b in [((55.5, 70), (55.5, 97)), ((50, 103), (30, 103)), ((30, 89.2), (50, 89.2)), ((54.2, 80), (54.2, 68)), ((-7, -27.5), (20, -27.5))]:
            ax.add_patch(FancyArrowPatch(a, b, arrowstyle="-|>", mutation_scale=9, color="#555", lw=0.9, ls="--", zorder=12))
        ax.add_patch(FancyArrowPatch((17.5, 104), (17.5, 88), connectionstyle="arc3,rad=0.9", arrowstyle="-|>", mutation_scale=9, color="#555", lw=0.9, ls="--", zorder=12))
    else:
        def flow(pts, color, lw=2.4, ls="-"):
            xs, ys = zip(*pts); ax.plot(xs, ys, color=color, lw=lw, ls=ls, alpha=0.9, zorder=16, solid_capstyle="round")
            ax.add_patch(FancyArrowPatch(pts[-2], pts[-1], arrowstyle="-|>", mutation_scale=14, color=color, lw=lw, zorder=17))
            m = len(pts) // 2; ax.add_patch(FancyArrowPatch(pts[m - 1], pts[m], arrowstyle="-|>", mutation_scale=12, color=color, lw=0, zorder=17))
        arcp = [(27 + 8.2 * math.cos(math.radians(a)), 96.25 + 8.2 * math.sin(math.radians(a))) for a in np.linspace(90, 270, 14)]
        flow([(-16, -29), (-6, -28.5), (24, -28.5), (44, -24.5), (53.8, -19), (57, -10), (57, 28), (57, 40)], "#2a78d6")                        # customers in
        flow([(54, 40), (54, -8), (50, -11), (30, -11)], "#2a78d6", lw=1.8)                                                                   # customers to south field
        flow([(57.2, 42), (57.2, 99), (54, 104.4), (28, 104.4)] + arcp[1:-1] + [(28, 88.1), (50.5, 88.1), (53.8, 84), (53.8, 44)], "#eda100")          # pick-up loop
        flow([(-16, -26), (-6, -26.5), (24, -26.5), (43, -22.5), (55.8, -15), (55.6, 60), (55.6, 98), (52, 102.6), (28, 102.6)] + [(27 + 10.4 * math.cos(math.radians(a)), 96.25 + 10.4 * math.sin(math.radians(a))) for a in np.linspace(90, 270, 14)][1:-1] + [(28, 85.85), (47, 85.85)], "#e34948", lw=2.0)  # LKW
        flow([(33.5, -13), (33.5, -8), (33.5, -1)], "#1baf7a", lw=1.6, ls=(0, (3, 2))); flow([(49.5, 30), (46, 30), (46, -1.5), (36, -1.5), (34, 0.5)], "#1baf7a", lw=1.6, ls=(0, (3, 2)))                                    # pedestrians
        items = [("#2a78d6", T["f_cust"]), ("#eda100", T["f_pick"]), ("#e34948", T["f_lkw"]), ("#1baf7a", T["f_ped"])]
        for i, (c, t) in enumerate(items): ax.add_patch(Rectangle((-30, 131 - i * 4.5), 4, 2.0, fc=c, ec="none", zorder=30)); label(ax, -25, 132 - i * 4.5, t, size=6.5, ha="left", bg="white")
        label(ax, 8.2, 40, T["old"].split("\n")[0], size=7, bold=True); label(ax, 37.2, 40, T["ext"].split("\n")[0], size=7, bold=True, color="white"); label(ax, 39.2, 75, T["garden"].split("\n")[0], size=5.8, bold=True, color="#1f4d12"); label(ax, 38.5, 115, T["yard"].split(" · ")[0], size=5.8, bold=True, color="#5a4a1a")
        label(ax, 39.5, 107.0, T["pick"], size=5.2, bold=True, color="#6b5200"); label(ax, 34, -1.5, T["entr"], size=6.2, bold=True, color="white"); label(ax, -14, -36, T["vjazd"], size=7, bold=True, color=ORANGE, bg="white")
    north(ax, 84, 122); scalebar(ax, 36, -44)
    fig.tight_layout(); fig.savefig(os.path.join(HERE, f"{'flows' if flows else 'site'}_{LANG}.png")); plt.close(fig)
# ------------------------------------------------------------------ floor plan
def plan():
    fig, ax = plt.subplots(figsize=(8.2, 10.2), dpi=200); ax.set_aspect("equal"); ax.axis("off"); ax.set_xlim(-9, 62); ax.set_ylim(-13, 88)
    ax.set_title(T["t_plan"], loc="left", fontsize=12, fontweight="bold", color=NAVY)
    rect(ax, S["OLD_W"], fc="#e3ecf5", ec="none"); rect(ax, S["OLD_E"], fc="#e3ecf5", ec="none")
    for e in S["EXT"]: rect(ax, e, fc="#ffe8da", ec="none")
    # zones
    rect(ax, (16.5, 0, 28.5, 3.2), fc="#f4f4f4", ec="none")
    rect(ax, (29.5, 0, 9, 3.6), fc="#cfe8f0", ec=NAVY, lw=0.8); label(ax, 34, 1.8, T["p_wind"], size=6)
    rect(ax, (16.5, 0, 8.5, 7.5), fc="#d9e6f2", ec=NAVY, lw=0.8); label(ax, 20.7, 3.7, T["p_wc"], size=5.8)
    rect(ax, (39.5, 0, 5.5, 7.5), fc="#fff3e8", ec=NAVY, lw=0.8); label(ax, 42.2, 3.7, T["p_info"], size=5.8)
    rect(ax, (25.5, 4.2, 13.5, 6.8), fc="#ffe2d5", ec=NAVY, lw=0.6, ls="--"); label(ax, 32.2, 9.6, T["p_cash"], size=6, bold=True)
    for i in range(5): rect(ax, (26.3 + i * 2.1, 5.0, 1.0, 3.2), fc=NAVY, ec="none")
    for i in range(2): rect(ax, (37.0, 5.0 + i * 1.8, 1.4, 1.2), fc="#555", ec="none")
    # racks
    for x in np.arange(2.0, 15.0, 3.3):
        for (y0, y1) in [(12, 33), (36, 60)]: rect(ax, (x, y0, 1.3, y1 - y0), fc="#c9d6e3", ec="#8aa0b8", lw=0.3)
    for x in np.arange(18.6, 27, 3.3):
        for (y0, y1) in [(20, 38), (41, 61)]: rect(ax, (x, y0, 1.3, y1 - y0), fc="#c9d6e3", ec="#8aa0b8", lw=0.3)
    for x in np.arange(31.3, 44.0, 3.3):
        for (y0, y1) in [(14, 35), (38, 60)]: rect(ax, (x, y0, 1.4, y1 - y0), fc="#f3c9ae", ec="#c98a5e", lw=0.3)
    label(ax, 8.3, 34.5, T["p_sales_w"], size=6.3, bold=True, bg="white"); label(ax, 23, 39.5, T["p_sales_m"], size=6.0, bold=True, bg="white"); label(ax, 37.3, 36.5, T["p_sales_e"], size=6.0, bold=True, bg="white")
    # columns
    for cx in (0.35, 16.5, 29.5, 44.65):
        for cy in np.arange(0.35, 64.1, 6.33): ax.add_patch(Rectangle((cx - 0.3, cy - 0.3), 0.6, 0.6, fc=NAVY if cx < 30 else "#b3541e", ec="none", zorder=6))
    # walls
    rect(ax, S["HALL"], fc="none", ec=NAVY, lw=2.2, zorder=7)
    ax.plot([16.5, 16.5], [0, 17], color=NAVY, lw=0.8, ls=":"); ax.plot([29.5, 29.5], [0, 64], color="#b3541e", lw=0.9, ls="--", zorder=5); ax.plot([16.5, 29.5], [17, 17], color="#b3541e", lw=0.9, ls="--", zorder=5)
    # north block + garden
    rect(ax, S["NB"], fc="#dfe6ee", ec=NAVY, lw=1.8); label(ax, 14.5, 71.5, T["p_store"], size=6.3, bold=True); label(ax, 14.5, 80.3, T["p_staff"], size=5.5, color=GREY)
    for gx in (8, 18): rect(ax, (gx, 76.6, 4, 0.8), fc="white", ec=NAVY, lw=0.8, zorder=8)
    rect(ax, (10, 63.6, 4, 0.8), fc="white", ec=NAVY, lw=0.8, zorder=8); label(ax, 12, 61.6, T["p_gate"], size=5.2, bg="white")
    rect(ax, S["GARDEN"], fc="#eef7e6", ec="#2f6b1f", lw=1.2, ls="--"); rect(ax, S["GARDEN_CANOPY"], fc="#d5ebc3", ec="#2f6b1f", lw=0.6, hatch="//"); label(ax, 39.2, 77, T["garden"], size=6, bold=True, color="#1f4d12")
    rect(ax, (35, 63.6, 4, 0.8), fc="white", ec="#2f6b1f", lw=0.8, zorder=8); label(ax, 37, 61.6, T["p_gard"], size=5.2, bg="white", color="#1f4d12")
    # entrance + exits
    ax.add_patch(FancyArrowPatch((34, -6), (34, 0.8), arrowstyle="-|>", mutation_scale=14, color=ORANGE, lw=2.2, zorder=9)); label(ax, 34, -7.4, T["entr"], size=7.5, bold=True, color=ORANGE, bg="white")
    for (x, y, dx, dy) in [(0, 20, -3, 0), (0, 48, -3, 0), (45, 22, 3, 0), (45, 50, 3, 0)]: ax.add_patch(FancyArrowPatch((x, y), (x + dx, y + dy), arrowstyle="-|>", mutation_scale=9, color="#1baf7a", lw=1.2, zorder=9))
    label(ax, -5.6, 34, T["p_exit"], size=5.3, rot=90, color="#12805a"); label(ax, 50.4, 36, T["p_exit"], size=5.3, rot=90, color="#12805a")
    # dims + legend
    def dim(a, b, t, off, rot=0): ax.annotate("", xy=a, xytext=b, arrowprops=dict(arrowstyle="<->", color=NAVY, lw=0.8)); label(ax, (a[0] + b[0]) / 2 + off[0], (a[1] + b[1]) / 2 + off[1], t, size=6.5, rot=rot)
    dim((0, 85.5), (45, 85.5), "45,0 m", (0, 1.2)); dim((56, 0), (56, 64), "64,0 m", (1.4, 0), 90); dim((0, -3.2), (16.5, -3.2), "16,5", (0, 1.0)); dim((16.5, -3.2), (29.5, -3.2), "13,0", (-1.5, 1.0)); dim((29.5, -3.2), (45, -3.2), "15,5", (3.2, 1.0))
    for i, (c, t) in enumerate([("#e3ecf5", T["p_old"]), ("#ffe8da", T["p_new"])]): ax.add_patch(Rectangle((-8.5, -5.6 - i * 2.4 - 20 + 20 - 0, ), 0, 0)); 
    ax.add_patch(Rectangle((-8, -10.3), 2.2, 1.3, fc="#e3ecf5", ec=NAVY, lw=0.5)); label(ax, -5.3, -9.65, T["p_old"], size=5.8, ha="left")
    ax.add_patch(Rectangle((-8, -12.3), 2.2, 1.3, fc="#ffe8da", ec=NAVY, lw=0.5)); label(ax, -5.3, -11.65, T["p_new"], size=5.8, ha="left")
    north(ax, 57, 72)
    fig.tight_layout(); fig.savefig(os.path.join(HERE, f"plan_{LANG}.png")); plt.close(fig)
existing(); site(); site(flows=True); plan(); print("done", LANG)
