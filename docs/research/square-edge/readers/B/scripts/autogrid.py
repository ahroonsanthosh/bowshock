"""Build a gridfit spec from approximate end positions of two labelled axes.

usage: python3 -I autogrid.py image out_spec.json out_map.json \
        xv0 xv1 x0 x1 yv0 yv1 y0 y1 xstep ystep [slope_v slope_h]
xv0..xv1: first and last labelled X values; x0,x1 their approximate pixel x.
yv0..yv1: first and last labelled Y values; y0,y1 their approximate pixel y.
xstep/ystep: spacing of labelled ticks in axis units.
Each labelled line is snapped to the nearest grid-line peak (darkness
profile, gridlines.py logic) within +-8 px of the linear prediction.
"""
import json
import sys
import numpy as np
from PIL import Image

img = sys.argv[1]
spec_out, map_out = sys.argv[2], sys.argv[3]
xv0, xv1, x0, x1, yv0, yv1, y0, y1, xs, ys = (float(v) for v in sys.argv[4:14])
sv = float(sys.argv[14]) if len(sys.argv) > 14 else 0.0
sh = float(sys.argv[15]) if len(sys.argv) > 15 else 0.0
g = 255.0 - np.asarray(Image.open(img).convert("L"), dtype=float)


def peak(prof, i0, off):
    lo, hi = max(1, int(i0) - 8), int(i0) + 9
    seg = prof[lo:hi]
    i = lo + int(np.argmax(seg))
    a, b, c = prof[i - 1], prof[i], prof[i + 1]
    den = a - 2 * b + c
    return i + (0.5 * (a - c) / den if den else 0.0) + off


ymid = int((y0 + y1) / 2)
xmid = int((x0 + x1) / 2)
# profiles in a band in the middle of the plot (median is robust to symbols)
band = g[ymid - 150:ymid + 150, :]
pv = np.median(band, axis=0)
bandh = g[:, xmid - 300:xmid + 300]
ph = np.median(bandh, axis=1)
nx = int(round((xv1 - xv0) / xs))
ny = int(round((yv1 - yv0) / ys))
V = []
for k in range(nx + 1):
    v = xv0 + k * xs
    pred = x0 + (x1 - x0) * k / nx
    V.append([round(v, 6), peak(pv, pred, 0)])
H = []
for k in range(ny + 1):
    v = yv0 + k * ys
    pred = y0 + (y1 - y0) * k / ny
    H.append([round(v, 6), peak(ph, pred, 0)])
spec = {"image": img, "v": V, "h": H, "x_ref": xmid, "y_ref": ymid,
        "vslope": sv, "hslope": sh,
        "vrange": [min(y0, y1) + 12, max(y0, y1) - 12],
        "hrange": [min(x0, x1) + 12, max(x0, x1) - 12],
        "seg": 40, "half": 6, "out": map_out}
json.dump(spec, open(spec_out, "w"), indent=1)
print(json.dumps({"v": V, "h": H}))
