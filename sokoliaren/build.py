# -*- coding: utf-8 -*-
"""Generuje index.html štúdie sokoliarne zo šablóny a z geom.json (situačný plán)."""
import json, math, html
G = json.load(open('geom.json'))
PXM = G['pxm']
C = G['center']; LR = G['lounge_r']
def pts(poly): return ' '.join(f'{x:.0f},{y:.0f}' for x, y in poly)
sec_cols = ['#e3202b', '#e6cf96', '#8fc3ff']
sec_names = ['Sekcia A · Gyr pure', 'Sekcia B · Golden Saker', 'Sekcia C · Gyr × Shaheen']
sec_dirs = ['východ', 'juh', 'západ']
areas = G['sector_areas']
# label positions = centroid of sector polygon
def centroid(poly):
    xs=[p[0] for p in poly]; ys=[p[1] for p in poly]; return sum(xs)/len(xs), sum(ys)/len(ys)
sectors_svg = ''
for i,(poly,col) in enumerate(zip(G['sectors'],sec_cols)):
    mid=math.radians(-30+120*i); cx,cy = C[0]+300*math.cos(mid), C[1]+300*math.sin(mid)
    sectors_svg += f'<polygon points="{pts(poly)}" fill="{col}" fill-opacity="0.32" stroke="#ffffff" stroke-width="4"/>\n'
    sectors_svg += f'<g font-family="Outfit, Inter, sans-serif" text-anchor="middle"><rect x="{cx-170:.0f}" y="{cy-52:.0f}" width="340" height="104" rx="14" fill="#06080c" fill-opacity="0.78"/>'
    sectors_svg += f'<text x="{cx:.0f}" y="{cy-10:.0f}" font-size="38" font-weight="700" fill="{col}">{sec_names[i]}</text>'
    sectors_svg += f'<text x="{cx:.0f}" y="{cy+34:.0f}" font-size="32" fill="#f5f7fa">≈ {areas[i]:,} m² · {sec_dirs[i]}</text></g>\n'.replace(',', ' ')
# net masts along sector boundaries (rays) and perimeter: draw small circles every ~9 m on parcel perimeter
masts = ''
parcel = G['parcel']
for i in range(4):
    x0,y0 = parcel[i]; x1,y1 = parcel[(i+1)%4]
    L = math.hypot(x1-x0,y1-y0); n = int(L/(9*PXM))
    for k in range(n+1):
        t=k/n; masts += f'<circle cx="{x0+(x1-x0)*t:.0f}" cy="{y0+(y1-y0)*t:.0f}" r="7" fill="#f5f7fa" stroke="#06080c" stroke-width="2"/>'
# rays
rays=''
for k in range(3):
    a=math.radians(-90+120*k)
    rays += f'<line x1="{C[0]+LR*math.cos(a):.0f}" y1="{C[1]+LR*math.sin(a):.0f}" x2="{C[0]+2000*math.cos(a):.0f}" y2="{C[1]+2000*math.sin(a):.0f}" stroke="#ffffff" stroke-width="10" stroke-dasharray="26 18" clip-path="url(#parcelClip)"/>'
# lounge: outer ring (terrace/walkway), glass bays, core
lounge = f'<circle cx="{C[0]}" cy="{C[1]}" r="{LR:.0f}" fill="#0c1016" stroke="#e6cf96" stroke-width="5"/>'
lounge += f'<circle cx="{C[0]}" cy="{C[1]}" r="{8*PXM:.0f}" fill="#1c2430" stroke="#f5f7fa" stroke-width="3"/>'
lounge += f'<circle cx="{C[0]}" cy="{C[1]}" r="{2.6*PXM:.0f}" fill="#06080c" stroke="#9aa6b5" stroke-width="2"/>'
# glass bays: arcs centred on each sector direction (-30, 90, 210 deg), 90° wide, on r=8 m
for k in range(3):
    mid = -30+120*k; a0=math.radians(mid-44); a1=math.radians(mid+44); r=8*PXM
    lounge += f'<path d="M {C[0]+r*math.cos(a0):.0f} {C[1]+r*math.sin(a0):.0f} A {r:.0f} {r:.0f} 0 0 1 {C[0]+r*math.cos(a1):.0f} {C[1]+r*math.sin(a1):.0f}" fill="none" stroke="#8fc3ff" stroke-width="12" stroke-linecap="round"/>'
lounge += f'<text x="{C[0]}" y="{C[1]+LR+48:.0f}" font-family="Outfit, Inter, sans-serif" font-size="34" font-weight="700" fill="#e6cf96" text-anchor="middle">Loža · majlis ∅ 22 m</text>'
# corridor from house 439 to lounge
hx,hy = G['house']
corr = f'<line x1="{hx+45}" y1="{hy+40}" x2="{C[0]:.0f}" y2="{C[1]-LR:.0f}" stroke="#e6cf96" stroke-width="22" stroke-linecap="round" opacity="0.9"/>'
corr += f'<line x1="{hx+45}" y1="{hy+40}" x2="{C[0]:.0f}" y2="{C[1]-LR:.0f}" stroke="#06080c" stroke-width="6" stroke-dasharray="20 20" stroke-linecap="round"/>'
house = f'<rect x="{hx-80}" y="{hy-100}" width="160" height="200" rx="8" fill="#e6cf96" fill-opacity="0.85" stroke="#06080c" stroke-width="3" transform="rotate(-12 {hx} {hy})"/>'
house += f'<text x="{hx-150}" y="{hy-125}" font-family="Outfit, Inter, sans-serif" font-size="30" font-weight="700" fill="#f5f7fa" text-anchor="middle">Recepcia · dom č. 439</text>'
# hall polygon
hall_poly = [(170,280),(760,190),(860,700),(300,870)]
hall = f'<polygon points="{pts(hall_poly)}" fill="#8fc3ff" fill-opacity="0.22" stroke="#8fc3ff" stroke-width="6"/>'
hall += '<g font-family="Outfit, Inter, sans-serif" text-anchor="middle"><rect x="300" y="430" width="470" height="150" rx="14" fill="#06080c" fill-opacity="0.8"/>'
hall += '<text x="535" y="485" font-size="40" font-weight="700" fill="#8fc3ff">Chovná hala · 4930/15</text><text x="535" y="535" font-size="32" fill="#f5f7fa">2 podlažia · chovné komory</text>'
hall += '<text x="535" y="568" font-size="26" fill="#9aa6b5">liaheň · odchovňa · veterina · sklady</text></g>'
yard = '<g font-family="Outfit, Inter, sans-serif"><rect x="880" y="560" width="300" height="60" rx="10" fill="#06080c" fill-opacity="0.7"/><text x="1030" y="600" font-size="26" fill="#f5f7fa" text-anchor="middle">Dvor · zásobovanie · parkovanie</text></g>'
# scale bar 50 m & north arrow
sb = f'<g font-family="Inter, sans-serif"><rect x="60" y="1760" width="{50*PXM:.0f}" height="14" fill="#f5f7fa"/><rect x="60" y="1760" width="{25*PXM:.0f}" height="14" fill="#e3202b"/><text x="60" y="1745" font-size="30" fill="#f5f7fa">0</text><text x="{60+50*PXM-40:.0f}" y="1745" font-size="30" fill="#f5f7fa">50 m</text></g>'
sb += '<g transform="translate(1800 120)"><polygon points="0,-60 22,30 0,15 -22,30" fill="#f5f7fa" stroke="#06080c" stroke-width="3"/><text x="0" y="70" font-family="Outfit, sans-serif" font-size="40" font-weight="700" fill="#f5f7fa" text-anchor="middle">S</text></g>'
parcel_svg = f'<clipPath id="parcelClip"><polygon points="{pts(parcel)}"/></clipPath>'
parcel_outline = f'<polygon points="{pts(parcel)}" fill="none" stroke="#ff8a1f" stroke-width="7"/>'
# corner labels
for i,(x,y) in enumerate(parcel):
    parcel_svg += ''
corner_lbl = ''
for n,(x,y) in zip(['4','1','3','2'], parcel):
    corner_lbl += f'<circle cx="{x:.0f}" cy="{y:.0f}" r="22" fill="#ff8a1f" stroke="#06080c" stroke-width="3"/><text x="{x:.0f}" y="{y+11:.0f}" font-family="Inter, sans-serif" font-size="30" font-weight="700" fill="#06080c" text-anchor="middle">{n}</text>'
site_svg = f'''<svg viewBox="0 0 1900 1870" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="siteplan" role="img" aria-label="Situačný plán areálu">
<defs>{parcel_svg}</defs>
<image href="img/satelit-z20-areal.jpg" x="0" y="0" width="1900" height="1870"/>
<rect x="0" y="0" width="1900" height="1870" fill="#06080c" fill-opacity="0.18"/>
{hall}{yard}
{sectors_svg}{rays}{masts}{parcel_outline}{corner_lbl}
{corr}{house}{lounge}{sb}
</svg>'''

tpl = open('template.html', encoding='utf-8').read()
out = tpl.replace('{{SITE_SVG}}', site_svg)
out = out.replace('{{AREA_A}}', f'{areas[0]:,}'.replace(',',' ')).replace('{{AREA_B}}', f'{areas[1]:,}'.replace(',',' ')).replace('{{AREA_C}}', f'{areas[2]:,}'.replace(',',' '))
out = out.replace('{{AREA_SUM}}', f'{sum(areas):,}'.replace(',',' ')).replace('{{PARCEL}}', f'{G["parcel_area"]:,}'.replace(',',' '))
open('index.html','w',encoding='utf-8').write(out)
print('index.html written', len(out))
