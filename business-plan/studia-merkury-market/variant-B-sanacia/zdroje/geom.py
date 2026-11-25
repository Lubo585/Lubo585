import json, math, os
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
O = np.array([24.5, 7.0]); _v = np.array([8.0 - 24.5, 73.0 - 7.0]); UY = _v / np.linalg.norm(_v); UX = np.array([UY[1], -UY[0]])
def to_H(p): d = np.array(p, float) - O; return (float(d @ UX), float(d @ UY))
def to_local(p): q = O + p[0] * UX + p[1] * UY; return (float(q[0]), float(q[1]))
PARCEL_LOCAL = json.load(open(os.path.join(HERE, "parcel_local.json")))["parcel_local"]
PARCEL = [to_H(p) for p in PARCEL_LOCAL]
