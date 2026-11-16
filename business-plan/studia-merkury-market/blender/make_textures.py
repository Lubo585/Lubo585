from PIL import Image, ImageDraw, ImageFont
import math
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
RED = (226, 35, 26, 255); NAVY = (11, 26, 51, 255); YEL = (255, 210, 31, 255)
def m_poly(x, y, h):
    w = h * 1.05
    def q(p0, p1, p2, n=12): return [((1-t)**2*p0[0] + 2*(1-t)*t*p1[0] + t*t*p2[0], (1-t)**2*p0[1] + 2*(1-t)*t*p1[1] + t*t*p2[1]) for t in [i/n for i in range(n+1)]]
    pts = [(x, y+h), (x, y+h*0.35)] + q((x, y+h*0.35), (x, y), (x+w*0.22, y)) + q((x+w*0.22, y), (x+w*0.42, y), (x+w*0.5, y+h*0.45)) + q((x+w*0.5, y+h*0.45), (x+w*0.58, y), (x+w*0.78, y)) + q((x+w*0.78, y), (x+w, y), (x+w, y+h*0.35)) + [(x+w, y+h), (x+w*0.76, y+h), (x+w*0.76, y+h*0.42)] + q((x+w*0.76, y+h*0.42), (x+w*0.76, y+h*0.26), (x+w*0.62, y+h*0.3)) + [(x+w*0.5, y+h*0.75)] + q((x+w*0.38, y+h*0.3), (x+w*0.24, y+h*0.26), (x+w*0.24, y+h*0.42)) + [(x+w*0.24, y+h)]
    return pts, w
def draw_logo(d, x, base, fs, text_col=NAVY, with_outline=True):
    f = ImageFont.truetype(FONT, int(fs)); hM = fs * 0.95
    for word in ("erkury", "arket"):
        pts, w = m_poly(x, base - hM, hM)
        if with_outline: d.line(pts + [pts[0]], fill=YEL, width=max(2, int(hM * 0.08)), joint="curve")
        d.polygon(pts, fill=RED)
        x += w + fs * 0.04; d.text((x, base), word, font=f, fill=text_col, anchor="ls"); x += d.textlength(word + " ", font=f) + fs * 0.12
    return x
# 1 logo transparent
im = Image.new("RGBA", (1800, 300), (0, 0, 0, 0)); d = ImageDraw.Draw(im); draw_logo(d, 60, 235, 165); im.save("tex/logo.png")
# 2 pylon 3 faces yellow
im = Image.new("RGBA", (3072, 1024), YEL); d = ImageDraw.Draw(im)
for k in range(3):
    cx = 512 + k * 1024; f = ImageFont.truetype(FONT, 190)
    for word, y in (("erkury", 470), ("arket", 700)):
        pts, w = m_poly(0, 0, 180); tw = w + 8 + d.textlength(word, font=f); x = cx - tw / 2
        pts, w = m_poly(x, y - 180, 180); d.polygon(pts, fill=RED); d.text((x + w + 8, y), word, font=f, fill=NAVY, anchor="ls")
im.save("tex/pylon.png")
# 3 billboards
def bb(name, text, bg, fg):
    im = Image.new("RGB", (1024, 420), bg); d = ImageDraw.Draw(im); f = ImageFont.truetype(FONT, 120)
    d.rectangle([12, 12, 1011, 407], outline=(255, 255, 255), width=6); d.text((512, 225), text, font=f, fill=fg, anchor="mm"); im.save(f"tex/bb_{name}.png")
bb("kuchyne", "KUCHYNE", (244, 185, 66), (122, 74, 16)); bb("kupelne", "KÚPEĽNE", (106, 169, 216), (20, 58, 90)); bb("podlahy", "PODLAHY", (201, 154, 99), (74, 48, 20)); bb("nabytok", "NÁBYTOK", (155, 123, 184), (54, 32, 74)); bb("dvere", "DVERE", (143, 178, 122), (43, 74, 30)); bb("stavebniny", "STAVEBNINY", (190, 190, 190), (40, 40, 40))
def sign(name, text, bg, fg, size=(1024, 220), fs=120):
    im = Image.new("RGB", size, bg); d = ImageDraw.Draw(im); f = ImageFont.truetype(FONT, fs); d.text((size[0] // 2, size[1] // 2), text, font=f, fill=fg, anchor="mm"); im.save(f"tex/{name}.png")
sign("vstup", "VSTUP", (226, 35, 26), (255, 255, 255), (512, 200), 120); sign("vydaj", "VÝDAJ TOVARU", (255, 210, 31), (11, 26, 51), (1024, 200), 110)
# flags with small M
for name, col in (("flag_o", (230, 74, 25)), ("flag_y", (255, 210, 31)), ("flag_w", (245, 245, 245))):
    im = Image.new("RGB", (400, 600), col); d = ImageDraw.Draw(im); pts, w = m_poly(100, 200, 200); d.polygon(pts, fill=(255, 255, 255) if name != "flag_w" else RED); im.save(f"tex/{name}.png")
print("textures ok")
