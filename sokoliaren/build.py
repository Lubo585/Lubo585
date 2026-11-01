# -*- coding: utf-8 -*-
"""Generuje index.html (SK/EN) štúdie sokoliarne zo šablóny template.html.

- geom.json      – obvod pozemku a stred (px satelitnej snímky img/satelit-z20-areal.jpg, 10,29 px/m)
- pieniny.json   – galéria fotiek Pienin (súbor, popisy SK/EN, autor/licencia)
"""
import json, math, os
from shapely.geometry import Polygon, Point, LineString

G = json.load(open('geom.json', encoding='utf-8'))
PXM = G['pxm']
parcel_pts = [tuple(p) for p in G['parcel']]
parcel = Polygon(parcel_pts)
C0 = tuple(G['center'])
LR = 11 * PXM                      # loža ∅ 22 m vrátane terasy

def pts(poly): return ' '.join(f'{x:.0f},{y:.0f}' for x, y in poly)
def ray(a, r=2000): return (C[0] + r * math.cos(math.radians(a)), C[1] + r * math.sin(math.radians(a)))
def wedge(a0, a1): return Polygon([C] + [ray(a) for a in range(a0, a1 + 1, 2)])

# chodba pre hostí: po severnej hranici od juhovýchodného rohu haly k severnému lúču, potom k loži
hall_poly = [(165, 290), (700, 165), (840, 765), (305, 890)]   # strecha haly podľa satelitu (53 × 60 m)
hall_se = hall_poly[2]

def make_sectors(c):
    global C, lounge, entry, walk, walk_buf
    C = c; lounge = Point(C).buffer(LR)
    t = (C[0] - parcel_pts[0][0]) / (parcel_pts[1][0] - parcel_pts[0][0])
    entry = (C[0], parcel_pts[0][1] + (parcel_pts[1][1] - parcel_pts[0][1]) * t)
    # začiatok chodby: kolmý priemet juhovýchodného rohu haly na severnú hranicu pozemku
    p0, p1 = parcel_pts[0], parcel_pts[1]
    ex, ey = p1[0] - p0[0], p1[1] - p0[1]; L2 = ex * ex + ey * ey
    tt = ((hall_se[0] - p0[0]) * ex + (hall_se[1] - p0[1]) * ey) / L2
    start = (p0[0] + ex * tt, p0[1] + ey * tt)
    walk = LineString([hall_se, start, entry, (C[0], C[1] - LR)])
    walk_buf = walk.buffer(1.6 * PXM, cap_style=2)
    out = []
    for k in range(3):
        w = wedge(-90 + 120 * k, -90 + 120 * (k + 1)).intersection(parcel).difference(lounge).difference(walk_buf)
        if w.geom_type != 'Polygon':
            w = max(w.geoms, key=lambda g: g.area)
        out.append(w)
    return out
# stred lože: hľadáme polohu (± 12 m od ťažiska), pri ktorej sú plochy sekcií najvyrovnanejšie
best = None
for dx in range(-120, 121, 10):
    for dy in range(-120, 121, 10):
        secs = make_sectors((C0[0] + dx, C0[1] + dy))
        a = [w.area for w in secs]
        spread = max(a) - min(a)
        if best is None or spread < best[0]: best = (spread, (C0[0] + dx, C0[1] + dy))
sectors = make_sectors(best[1])
print('stred lože posun px', best[1][0] - C0[0], best[1][1] - C0[1])
areas = [round(s.area / PXM ** 2 / 10) * 10 for s in sectors]
parcel_area = round(parcel.area / PXM ** 2 / 10) * 10
hall_w = math.hypot(hall_poly[1][0] - hall_poly[0][0], hall_poly[1][1] - hall_poly[0][1]) / PXM
hall_h = math.hypot(hall_poly[3][0] - hall_poly[0][0], hall_poly[3][1] - hall_poly[0][1]) / PXM
hall_area = round(hall_w * hall_h / 100) * 100
print('sektory m2', areas, 'pozemok', parcel_area, 'hala', round(hall_w), 'x', round(hall_h), hall_area)

sec_cols = ['#e3202b', '#e6cf96', '#8fc3ff']
sec_sk = ['Sekcia A · Gyr pure', 'Sekcia B · Golden Saker', 'Sekcia C · Gyr × Shaheen']
sec_en = ['Section A · Pure Gyr', 'Section B · Golden Saker', 'Section C · Gyr × Shaheen']
dir_sk = ['východ', 'juh', 'západ']; dir_en = ['east', 'south', 'west']
F = 'font-family="Outfit, Inter, sans-serif"'
def bi(sk, en): return f'<tspan class="sk">{sk}</tspan><tspan class="en">{en}</tspan>'
def fmt(n): return f'{n:,}'.replace(',', ' ')

svg = ''
for i, (poly, col) in enumerate(zip(sectors, sec_cols)):
    off = [(190, -250), (0, 300), (-280, -140)][i]; cx, cy = C[0] + off[0], C[1] + off[1]
    svg += f'<polygon points="{pts(poly.exterior.coords)}" fill="{col}" fill-opacity="0.32" stroke="#ffffff" stroke-width="4"/>\n'
    svg += f'<g {F} text-anchor="middle"><rect x="{cx-175:.0f}" y="{cy-52:.0f}" width="350" height="104" rx="14" fill="#06080c" fill-opacity="0.78"/>'
    svg += f'<text x="{cx:.0f}" y="{cy-10:.0f}" font-size="38" font-weight="700" fill="{col}">{bi(sec_sk[i], sec_en[i])}</text>'
    svg += f'<text x="{cx:.0f}" y="{cy+34:.0f}" font-size="32" fill="#f5f7fa">≈ {fmt(areas[i])} m² · {bi(dir_sk[i], dir_en[i])}</text></g>\n'
# stĺpy po obvode
masts = ''
for i in range(4):
    x0, y0 = parcel_pts[i]; x1, y1 = parcel_pts[(i + 1) % 4]
    n = int(math.hypot(x1 - x0, y1 - y0) / (9 * PXM))
    for k in range(n + 1):
        t = k / n; masts += f'<circle cx="{x0+(x1-x0)*t:.0f}" cy="{y0+(y1-y0)*t:.0f}" r="7" fill="#f5f7fa" stroke="#06080c" stroke-width="2"/>'
rays = ''
for k in range(3):
    a = math.radians(-90 + 120 * k); e = ray(a)
    rays += f'<line x1="{C[0]+LR*math.cos(a):.0f}" y1="{C[1]+LR*math.sin(a):.0f}" x2="{e[0]:.0f}" y2="{e[1]:.0f}" stroke="#ffffff" stroke-width="10" stroke-dasharray="26 18" clip-path="url(#parcelClip)"/>'
# chodba
walk_svg = f'<polygon points="{pts(walk_buf.exterior.coords)}" fill="#e6cf96" fill-opacity="0.9" stroke="#06080c" stroke-width="3"/>'
walk_svg += f'<polyline points="{pts(walk.coords)}" fill="none" stroke="#06080c" stroke-width="5" stroke-dasharray="20 20"/>'
walk_svg += f'<g {F}><rect x="{entry[0]+30:.0f}" y="{entry[1]-10:.0f}" width="520" height="54" rx="10" fill="#06080c" fill-opacity="0.75"/><text x="{entry[0]+290:.0f}" y="{entry[1]+28:.0f}" font-size="28" fill="#e6cf96" text-anchor="middle">{bi("krytá chodba pre hostí z haly · 70 m", "covered guest walkway from the hall · 70 m")}</text></g>'
walk_svg += f'<circle cx="{entry[0]:.0f}" cy="{entry[1]:.0f}" r="18" fill="#e6cf96" stroke="#06080c" stroke-width="3"/>'
# loža
lounge_svg = f'<circle cx="{C[0]}" cy="{C[1]}" r="{LR:.0f}" fill="#0c1016" stroke="#e6cf96" stroke-width="5"/>'
lounge_svg += f'<circle cx="{C[0]}" cy="{C[1]}" r="{8*PXM:.0f}" fill="#1c2430" stroke="#f5f7fa" stroke-width="3"/>'
lounge_svg += f'<circle cx="{C[0]}" cy="{C[1]}" r="{2.6*PXM:.0f}" fill="#06080c" stroke="#9aa6b5" stroke-width="2"/>'
for k in range(3):
    mid = -30 + 120 * k; a0 = math.radians(mid - 44); a1 = math.radians(mid + 44); r = 8 * PXM
    lounge_svg += f'<path d="M {C[0]+r*math.cos(a0):.0f} {C[1]+r*math.sin(a0):.0f} A {r:.0f} {r:.0f} 0 0 1 {C[0]+r*math.cos(a1):.0f} {C[1]+r*math.sin(a1):.0f}" fill="none" stroke="#8fc3ff" stroke-width="12" stroke-linecap="round"/>'
lounge_svg += f'<text x="{C[0]}" y="{C[1]+LR+48:.0f}" {F} font-size="34" font-weight="700" fill="#e6cf96" text-anchor="middle">{bi("Loža · majlis ∅ 22 m", "Lounge · majlis ∅ 22 m")}</text>'
# hala
hall = f'<polygon points="{pts(hall_poly)}" fill="#8fc3ff" fill-opacity="0.22" stroke="#8fc3ff" stroke-width="6"/>'
hall += f'<g {F} text-anchor="middle"><rect x="270" y="430" width="500" height="150" rx="14" fill="#06080c" fill-opacity="0.8"/>'
hall += f'<text x="520" y="485" font-size="40" font-weight="700" fill="#8fc3ff">{bi("Chovná hala · 4930/15", "Breeding hall · 4930/15")}</text>'
hall += f'<text x="520" y="535" font-size="32" fill="#f5f7fa">{round(hall_w)} × {round(hall_h)} m · {bi("2 podlažia · chovné komory", "2 floors · breeding chambers")}</text>'
hall += f'<text x="520" y="568" font-size="26" fill="#9aa6b5">{bi("recepcia · liaheň · odchovňa · veterina", "reception · hatchery · rearing · vet")}</text></g>'
yard = f'<g {F}><rect x="880" y="560" width="300" height="60" rx="10" fill="#06080c" fill-opacity="0.7"/><text x="1030" y="600" font-size="26" fill="#f5f7fa" text-anchor="middle">{bi("Dvor · zásobovanie · parkovanie", "Yard · deliveries · parking")}</text></g>'
sb = f'<g font-family="Inter, sans-serif"><rect x="60" y="1760" width="{50*PXM:.0f}" height="14" fill="#f5f7fa"/><rect x="60" y="1760" width="{25*PXM:.0f}" height="14" fill="#e3202b"/><text x="60" y="1745" font-size="30" fill="#f5f7fa">0</text><text x="{60+50*PXM-40:.0f}" y="1745" font-size="30" fill="#f5f7fa">50 m</text></g>'
sb += f'<g transform="translate(1800 120)"><polygon points="0,-60 22,30 0,15 -22,30" fill="#f5f7fa" stroke="#06080c" stroke-width="3"/><text x="0" y="70" {F} font-size="40" font-weight="700" fill="#f5f7fa" text-anchor="middle">{bi("S", "N")}</text></g>'
corner_lbl = ''
for n, (x, y) in zip(['4', '1', '3', '2'], parcel_pts):
    corner_lbl += f'<circle cx="{x:.0f}" cy="{y:.0f}" r="22" fill="#ff8a1f" stroke="#06080c" stroke-width="3"/><text x="{x:.0f}" y="{y+11:.0f}" font-family="Inter, sans-serif" font-size="30" font-weight="700" fill="#06080c" text-anchor="middle">{n}</text>'
site_svg = f'''<svg viewBox="0 0 1900 1870" xmlns="http://www.w3.org/2000/svg" class="siteplan" role="img" aria-label="Situačný plán / site plan">
<defs><clipPath id="parcelClip"><polygon points="{pts(parcel_pts)}"/></clipPath></defs>
<image href="img/satelit-z20-areal.jpg" x="0" y="0" width="1900" height="1870"/>
<rect x="0" y="0" width="1900" height="1870" fill="#06080c" fill-opacity="0.18"/>
{hall}{yard}
{svg}{rays}{masts}
<polygon points="{pts(parcel_pts)}" fill="none" stroke="#ff8a1f" stroke-width="7"/>{corner_lbl}
{walk_svg}{lounge_svg}{sb}
</svg>'''

# galéria Pienin
gallery = ''
if os.path.exists('pieniny.json'):
    for ph in json.load(open('pieniny.json', encoding='utf-8')):
        if not os.path.exists(ph['file']): continue
        gallery += (f'<figure><img src="{ph["file"]}" alt="{ph["alt"]}"><figcaption><b><span class="sk">{ph["sk"]}</span><span class="en">{ph["en"]}</span></b> '
                    f'<span class="credit">{ph["credit"]}</span></figcaption></figure>\n')

tpl = open('template.html', encoding='utf-8').read()
out = (tpl.replace('{{SITE_SVG}}', site_svg).replace('{{PIENINY_GALLERY}}', gallery)
          .replace('{{AREA_A}}', fmt(areas[0])).replace('{{AREA_B}}', fmt(areas[1])).replace('{{AREA_C}}', fmt(areas[2]))
          .replace('{{AREA_SUM}}', fmt(sum(areas))).replace('{{PARCEL}}', fmt(parcel_area))
          .replace('{{HALL_AREA}}', fmt(hall_area)).replace('{{HALL_DIMS}}', f'{round(hall_w)} × {round(hall_h)} m'))
open('index.html', 'w', encoding='utf-8').write(out)
json.dump({'areas': areas, 'parcel_area': parcel_area, 'hall_area': hall_area, 'hall_w': round(hall_w), 'hall_h': round(hall_h)}, open('build-info.json', 'w'))
print('index.html written', len(out))
