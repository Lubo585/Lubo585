import json, math, sys
from PIL import Image, ImageDraw
G = json.load(open("gmaps/georef.json")); S = json.load(open("mm_study/layout.json")); T = json.load(open("gmaps/sat_z20.json"))
th, tx, ty, lat0, lon0 = G["theta"], G["tx"], G["ty"], G["lat0"], G["lon0"]
c, s = math.cos(th), math.sin(th)
def loc2ll(x, y):
    ex, ny = c * x - s * y + tx, s * x + c * y + ty
    return lat0 + ny / 110574, lon0 + ex / (111320 * math.cos(math.radians(lat0)))
n = 2 ** T["z"]
def ll2px(lat, lon):
    X = (lon + 180) / 360 * n; Y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
    return (X - T["x0"]) * 256, (Y - T["y0"]) * 256
def loc2px(x, y): return ll2px(*loc2ll(x, y))
if __name__ == "__main__":
    im = Image.open("gmaps/sat_z20.jpg"); d = ImageDraw.Draw(im)
    for key, col in [("parcel", (0, 255, 0)), ("ELANE", (255, 128, 0)), ("PAVED", (255, 255, 0))]:
        pts = [loc2px(x, y) for x, y in S[key]]; d.line(pts + [pts[0]], fill=col, width=6)
    hx, hy, hw, hd = S["HALL"]; d.line([loc2px(*p) for p in [(hx, hy), (hx + hw, hy), (hx + hw, hy + hd), (hx, hy + hd), (hx, hy)]], fill=(255, 0, 255), width=6)
    for (x, y) in [(18.6, 0), (58.6, 170.9), (0, 87.9)]:
        px, py = loc2px(x, y); d.ellipse([px - 12, py - 12, px + 12, py + 12], outline=(255, 0, 0), width=5)
    px = [loc2px(x, y) for x, y in S["parcel"]]; xs = [p[0] for p in px]; ys = [p[1] for p in px]
    box = (int(min(xs)) - 400, int(min(ys)) - 400, int(max(xs)) + 400, int(max(ys)) + 400)
    im.crop(box).resize(((box[2] - box[0]) // 3, (box[3] - box[1]) // 3)).save("gmaps/georef_check.jpg", quality=85); print(box)
