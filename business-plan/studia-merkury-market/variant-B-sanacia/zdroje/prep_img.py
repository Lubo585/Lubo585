import os, shutil
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(HERE, "..", "varB", "blender", "out"); VB = os.path.join(HERE, "..", "varB")
CROP = {"aerial_sw": (0.06, 0.13, 0.93, 1.0), "aerial_ne": (0.0, 0.07, 0.93, 1.0), "aerial_se": (0.04, 0.10, 0.94, 1.0), "top": (0.14, 0.0, 0.86, 1.0), "road": (0.30, 0.25, 1.0, 0.80)}
for v in ["aerial_sw", "entrance", "rear", "aerial_ne", "top", "east", "road", "aerial_se"]:
    p = os.path.join(SRC, v + ".png")
    if not os.path.exists(p): print("missing", v); continue
    im = Image.open(p).convert("RGB"); W, H = im.size
    if v in CROP: a, b, c, d = CROP[v]; im = im.crop((int(a * W), int(b * H), int(c * W), int(d * H)))
    im.save(os.path.join(HERE, "img", v + ".jpg"), quality=90); print(v, im.size)
for l in ("sk", "pl"):
    for n in ("existing", "site", "flows", "plan"): shutil.copy(os.path.join(VB, f"{n}_{l}.png"), os.path.join(HERE, "img", f"{n}_{l}.png"))
