import json, math, sys, numpy as np, cv2
# usage: pano_crop.py <name> <tx> <ty> <tz> <fovh> <W> <H> <out>
name, tx, ty, tz, fovh, W, H, out = sys.argv[1], *map(float, sys.argv[2:6]), int(sys.argv[6]), int(sys.argv[7]), sys.argv[8]
G = json.load(open("gmaps/georef.json")); P = json.load(open("gmaps/pano_local.json")); S = json.load(open("mm_study/layout.json"))
cx, cy = P[name]; cz = 2.6
bear_y = -math.degrees(G["theta"])  # bearing of local +y
# car heading: OSM Levočská bearing ~3.9 deg (way 65047203 runs S->N)
CAR = {"south": 3.9, "mid": 3.9, "far_south": 3.9}[name]
pano = cv2.imread(f"gmaps/pano/{name}.jpg"); PH, PW = pano.shape[:2]
def bearing_of(dx, dy): return (math.degrees(math.atan2(dx, dy)) + bear_y) % 360
yaw0 = bearing_of(tx - cx, ty - cy); dist = math.hypot(tx - cx, ty - cy); pitch0 = math.degrees(math.atan2(tz - cz, dist))
f = (W / 2) / math.tan(math.radians(fovh) / 2)
i, j = np.meshgrid(np.arange(W), np.arange(H))
x = (i - W / 2) / f; y = -(j - H / 2) / f
# camera basis: forward (yaw0, pitch0), right, up
p0, y0 = math.radians(pitch0), math.radians(yaw0)
fwd = np.array([math.sin(y0) * math.cos(p0), math.cos(y0) * math.cos(p0), math.sin(p0)])  # (E, N, up) with bearing from N clockwise
right = np.array([math.cos(y0), -math.sin(y0), 0.0]); up = np.cross(right, fwd)
d = fwd[None, None, :] + x[..., None] * right[None, None, :] + y[..., None] * up[None, None, :]
d /= np.linalg.norm(d, axis=2, keepdims=True)
bear = (np.degrees(np.arctan2(d[..., 0], d[..., 1]))) % 360; pitch = np.degrees(np.arcsin(np.clip(d[..., 2], -1, 1)))
u = (((bear - CAR) / 360.0 + 0.5) % 1.0) * PW; v = (0.5 - pitch / 180.0) * PH
crop = cv2.remap(pano, u.astype(np.float32), v.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
# mask of old site objects: parcel bearing range (relative to view centre), pitch -0.5..CAP -> fill with mirrored sky
CAP = 22.0
NOMASK = len(sys.argv) > 9 and sys.argv[9] == 'nomask'
rel = lambda b: ((b - yaw0 + 180) % 360) - 180
bs = [rel(bearing_of(px - cx, py - cy)) for px, py in S["parcel"]]
bmin, bmax = min(bs) - 2, max(bs) + 2
relb = ((bear - yaw0 + 180) % 360) - 180
mask = (relb >= bmin) & (relb <= bmax) & (pitch > -0.5) & (pitch < CAP)
pm = 2 * CAP - pitch  # mirror about CAP
v2 = (0.5 - pm / 180.0) * PH
sky = cv2.remap(pano, u.astype(np.float32), v2.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
sky = cv2.GaussianBlur(sky, (0, 0), 2.0)
m8 = (mask.astype(np.uint8) * 255); m8 = cv2.GaussianBlur(m8, (0, 0), 28.0).astype(np.float32) / 255.0
if NOMASK: m8[:] = 0
crop = (crop.astype(np.float32) * (1 - m8[..., None]) + sky.astype(np.float32) * m8[..., None]).astype(np.uint8)
cv2.imwrite(out, crop); print("yaw", round(yaw0, 1), "pitch", round(pitch0, 1), "parcel bearings", round(bmin, 1), round(bmax, 1))
