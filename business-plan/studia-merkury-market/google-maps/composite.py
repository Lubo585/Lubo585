import sys, numpy as np, cv2
r = cv2.imread(sys.argv[1], cv2.IMREAD_UNCHANGED); bg = cv2.imread(sys.argv[2])
bg = cv2.resize(bg, (r.shape[1], r.shape[0]))
a = r[..., 3:4].astype(np.float32) / 255.0; rgb = r[..., :3].astype(np.float32)
# slight colour match: shift render toward bg mean tint
out = rgb * a + bg.astype(np.float32) * (1 - a)
cv2.imwrite(sys.argv[3], out.astype(np.uint8)); print("ok", sys.argv[3])
