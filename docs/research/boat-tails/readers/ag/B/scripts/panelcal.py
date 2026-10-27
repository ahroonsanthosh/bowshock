"""Build digit.py grid entries for a panel from approximate positions.

Usage: python -I panelcal.py PAGE.png x0 y0 x1 y1 XSPEC YSPEC [thr]
XSPEC: "v1@p1,v2@p2,step" two labelled abscissae with approximate pixel
       positions and the label step; lines are searched at every label
       value between the panel edges (+-6 px around the prediction).
YSPEC: same for the ordinate.
Prints JSON {"xgrid": [...], "ygrid": [...], "frame": [...]} with the
measured line positions (darkness-weighted centre of the nearest line
with frac >= 0.5 over the panel).
"""
import json
import sys

import numpy as np
from PIL import Image


MINF = 0.45
HALF = 6


def find(prof, pred, half=None):
    half = HALF if half is None else half
    lo = max(0, int(pred) - half)
    hi = min(len(prof), int(pred) + half + 1)
    seg = prof[lo:hi]
    if seg.max() < MINF:
        return None
    k = int(np.argmax(seg))
    a = k
    while a > 0 and seg[a - 1] > 0.5 * seg[k]:
        a -= 1
    b = k
    while b < len(seg) - 1 and seg[b + 1] > 0.5 * seg[k]:
        b += 1
    w = seg[a:b + 1]
    return lo + (np.arange(a, b + 1) * w).sum() / w.sum()


def main():
    a = sys.argv[1:]
    img = np.asarray(Image.open(a[0]).convert("L"), float)
    x0, y0, x1, y1 = (int(v) for v in a[1:5])
    thr = float(a[7]) if len(a) > 7 else 128
    global MINF, HALF
    if len(a) > 8:
        MINF = float(a[8])
    if len(a) > 9:
        HALF = int(a[9])
    sub = img[y0:y1, x0:x1] < thr
    vprof = sub.mean(axis=0)
    hprof = sub.mean(axis=1)
    out = {"frame": [x0, y0, x1, y1]}
    for key, spec, prof, off, n in (("xgrid", a[5], vprof, x0, x1 - x0), ("ygrid", a[6], hprof, y0, y1 - y0)):
        p1, p2, step = spec.split(",")
        v1, q1 = (float(t) for t in p1.split("@"))
        v2, q2 = (float(t) for t in p2.split("@"))
        step = float(step)
        slope = (q2 - q1) / (v2 - v1)
        ents = []
        k = int(np.floor((min(v1, v2) - 20 * step) / step))
        vals = []
        v = v1
        while True:
            q = q1 + (v - v1) * slope
            if q < off - 3 or q > off + n + 3:
                break
            vals.append(v)
            v = round(v - step, 6)
        v = round(v1 + step, 6)
        while True:
            q = q1 + (v - v1) * slope
            if q < off - 3 or q > off + n + 3:
                break
            vals.append(v)
            v = round(v + step, 6)
        for v in sorted(vals):
            q = q1 + (v - v1) * slope
            pos = find(prof, q - off)
            if pos is None:
                print("# no line for", key, v, "near", round(q, 1), file=sys.stderr)
                continue
            ents.append([round(v, 6), round(pos + off, 2), "v" if key == "xgrid" else "h"])
        out[key] = ents
    print(json.dumps(out))


if __name__ == "__main__":
    main()
