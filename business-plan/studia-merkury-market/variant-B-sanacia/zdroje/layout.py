"""Variant B (sanácia + prístavba) – geometry in hall-aligned frame H (metres). x = east, y = north, hall SW corner = (0, 0)."""
import json, math, os, sys
import numpy as np
from shapely.geometry import Polygon, box, Point, LineString
from shapely.ops import unary_union
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import geom as G

PARCEL = G.PARCEL
P = Polygon(PARCEL)
# ---------- buildings ----------
HALL = (0, 0, 45, 64)                 # final sales hall (old + extension)
OLD_W = (0, 0, 16.5, 64)              # old hall, west bay (kept, refurbished)
OLD_E = (16.5, 17, 13, 47)            # old hall, east bay (kept, refurbished)
EXT = [(29.5, 0, 15.5, 64), (16.5, 0, 13, 17)]   # new extension (L-shape)
NB = (2, 64, 25, 13)                  # north block, 4 storeys (kept)
ADM = (-5, -19.5, 24.5, 13.5)         # admin building, 3 storeys (kept, outside MM scope)
ENTR = (29.5, -3, 9, 3)            # entrance canopy / portal on the south facade
GARDEN = (27.5, 64, 23.5, 19)         # fenced outdoor seasonal zone attached to hall north wall
GARDEN_CANOPY = (27.5, 64, 23.5, 8)   # roofed part of the garden
YARD = (18, 109, 41, 12.5)            # fenced open storage of building materials + pick-up
LKW_CANOPY = (27, 83.75, 20, 3.5)        # LKW unloading lay-by (south leg, right side)
# existing objects to demolish (approx. from orthophoto)
DEMO = dict(b775_3=(36, 9, 17, 44), b775_4=(55.5, 26, 9.5, 11), b775_5=(50, -14, 7, 12), canopy=[(17, 10, 13, 7), (17, -5, 7, 15)], sheds=[(56, 62, 7, 9), (43, 75, 10, 13), (61, 38, 5, 8)])
# ---------- roads ----------
AISLE = (52, -16, 7, 124.75)             # main two-way aisle + stem to the rear (x 52..59, y -16..108)
RING_C = (27.0, 96.25); R_OUT = 12.5; R_IN = 5.0
SOUTH_LEG = (27, 83.75, 25, 7.5)           # eastbound: lane y 87.5..91, lay-by y 84..87.5
NORTH_LEG = (27, 101.25, 25, 7.5)        # westbound: lane y 101..105, lay-by y 105..108.5
ISLAND = (27, 91.25, 25, 10)
NB_APRON = (2, 77, 25, 7)
def arc(c, r, a0, a1, n=24): return [(c[0] + r * math.cos(math.radians(a)), c[1] + r * math.sin(math.radians(a))) for a in np.linspace(a0, a1, n)]
RING_ARC = Polygon(arc(RING_C, R_OUT, 90, 270) + arc(RING_C, R_IN, 270, 90))
ISLAND_POLY = unary_union([box(27, 91.25, 52, 101.25), Polygon(arc(RING_C, R_IN, 90, 270))])
SOUTH_ROAD = LineString([(-9, -27.5), (28, -27.5), (44, -23.5), (57, -17.5), (65.5, -8.5), (70.5, 1.5)]).buffer(3.25, cap_style=2)
P1_AISLE = (21, -14, 31, 6)
# ---------- parking rows: (x0, y0, n, orientation, kind) – stalls 2.5 x 5.0 m ----------
ROWS = [
    dict(x=47, y=24.5, n=15, o="v", kind="cust"),       # west row along hall east facade (noses to sidewalk), y 24.5..62
    dict(x=47, y=5.5, n=2, o="v", kind="cust"),         # next to the disabled stalls, y 5.5..10.5
    dict(x=59, y=-6, n=27, o="v", kind="cust"),         # east row, y -6..61.5
    dict(x=59, y=66, n=16, o="v", kind="staff"),        # staff row along the stem, y 66..106
    dict(x=21, y=-8, n=4, o="h", kind="cust"),
    dict(x=36, y=-8, n=6, o="h", kind="cust"),         # south forecourt row 1, x 21..48.5
    dict(x=21, y=-19, n=10, o="h", kind="cust"),         # south forecourt row 2, x 21..43.5
]
DIS = dict(x=47, y=10.5, n=4)          # disabled stalls 3.5 m wide, y 10.5..24.5 (closest to the entrance)
SIDEWALKS = [(45, -3, 2, 67), (19.5, -3, 27.5, 3), (51, 64, 1, 19)]
TROLLEY = [(47.2, 2.2, 4.6, 2.6), (53.0, -19.5, 2.4, 4.6)]
PYLON = (-3.5, -22.5)
CROSSING = (31, -8, 5, 5)          # pedestrian crossing in front of the entrance
PICKUP = (27, 105.25, 25, 3.5)      # customer pick-up lay-by along the yard fence
def stalls():
    out = []
    for r in ROWS:
        for i in range(r["n"]):
            if r["o"] == "v": out.append((r["x"], r["y"] + i * 2.5, 5.0, 2.5, r["kind"]))
            else: out.append((r["x"] + i * 2.5, r["y"], 2.5, 5.0, r["kind"]))
    for i in range(DIS["n"]): out.append((DIS["x"], DIS["y"] + i * 3.5, 5.0, 3.5, "dis"))
    return out
STALLS = stalls()
def R(t): return box(t[0], t[1], t[0] + t[2], t[1] + t[3])
def areas():
    built = unary_union([R(HALL), R(NB), R(ADM), R(ENTR), R(GARDEN_CANOPY)])
    paved = unary_union([R(AISLE), R(SOUTH_LEG), R(NORTH_LEG), RING_ARC, R(NB_APRON), SOUTH_ROAD, R(P1_AISLE), R(GARDEN), R(YARD), R(CROSSING)] + [R(s) for s in SIDEWALKS] + [box(s[0], s[1], s[0] + s[2], s[1] + s[3]) for s in STALLS]).intersection(P).difference(built)
    green = P.difference(built).difference(paved)
    n = dict(cust=0, staff=0, dis=0)
    for s in STALLS: n[s[4]] += 1
    return dict(parcel=P.area, built=built.area, paved=paved.area, green=green.area, hall=R(HALL).area, old=R(OLD_W).area + R(OLD_E).area, ext=sum(R(e).area for e in EXT), nb=R(NB).area, adm=R(ADM).area, garden=R(GARDEN).area, garden_canopy=R(GARDEN_CANOPY).area, yard=R(YARD).intersection(P).area, island=ISLAND_POLY.area,
                roads=unary_union([R(AISLE), R(SOUTH_LEG), R(NORTH_LEG), RING_ARC, R(NB_APRON), R(P1_AISLE)]).intersection(P).area, south_road=SOUTH_ROAD.intersection(P).area, stalls_area=sum(s[2] * s[3] for s in STALLS), sidewalks=sum(R(s).area for s in SIDEWALKS), parking=n, parking_total=sum(n.values()),
                inside=all(P.buffer(0.3).contains(box(s[0], s[1], s[0] + s[2], s[1] + s[3])) for s in STALLS), yard_inside=P.contains(R(YARD)), green_poly=green, paved_poly=paved)
if __name__ == "__main__":
    A = areas(); g = A.pop("green_poly"); pv = A.pop("paved_poly")
    for k, v in A.items(): print(k, round(v, 1) if isinstance(v, float) else v)
    print("built %", round(100 * A["built"] / A["parcel"], 1), "green %", round(100 * A["green"] / A["parcel"], 1), "paved %", round(100 * A["paved"] / A["parcel"], 1))
    # clearances
    for name, t in [("YARD", YARD), ("GARDEN", GARDEN), ("AISLE", AISLE)]: print(name, "dist to boundary", round(P.exterior.distance(R(t)), 2), "inside", P.contains(R(t)))
    print("ring arc inside", P.contains(RING_ARC), round(P.exterior.distance(RING_ARC), 2))
    bad = [s for s in STALLS if not P.contains(box(s[0], s[1], s[0] + s[2], s[1] + s[3]))]; print("stalls outside:", bad)
    def polys(geom): return [list(map(lambda c: (round(c[0], 2), round(c[1], 2)), p.exterior.coords)) for p in (geom.geoms if hasattr(geom, "geoms") else [geom])]
    json.dump(dict(PARCEL=PARCEL, HALL=HALL, OLD_W=OLD_W, OLD_E=OLD_E, EXT=EXT, NB=NB, ADM=ADM, ENTR=ENTR, GARDEN=GARDEN, GARDEN_CANOPY=GARDEN_CANOPY, YARD=YARD, LKW_CANOPY=LKW_CANOPY, DEMO=DEMO, AISLE=AISLE, SOUTH_LEG=SOUTH_LEG, NORTH_LEG=NORTH_LEG, ISLAND=polys(ISLAND_POLY)[0], RING_ARC=polys(RING_ARC)[0], NB_APRON=NB_APRON,
                   SOUTH_ROAD=polys(SOUTH_ROAD)[0], P1_AISLE=P1_AISLE, STALLS=STALLS, SIDEWALKS=SIDEWALKS, TROLLEY=TROLLEY, PYLON=PYLON, CROSSING=CROSSING, PICKUP=PICKUP, RING=dict(c=RING_C, r_out=R_OUT, r_in=R_IN), GREEN=polys(g), PAVED=polys(pv), AREAS={k: v for k, v in A.items()}), open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "layout.json"), "w"))
