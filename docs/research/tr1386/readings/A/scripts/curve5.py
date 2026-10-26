"""Trace the two curves of figure 5 at target Mach numbers.

For each target X, examine single-pixel columns over X +- span px, find dark
runs (darkness > thr) between y0 and y1 that are not horizontal grid lines,
and print the runs per column so lines can be identified.
usage: curve5.py scriptdir results.json page.png y0 y1 thr span X1 X2 ...
"""
import sys, json
sys.path.insert(0, sys.argv[1])
import numpy as np
import digi, calib

res = json.load(open(sys.argv[2]))
page = digi.load(sys.argv[3])
y0, y1 = int(sys.argv[4]), int(sys.argv[5])
thr = float(sys.argv[6]); span = int(sys.argv[7])
vf = res["vfits"]
hf = res["hfits"]


def xpix(X, ya):
    lo, hi = 0.0, float(page.shape[1])
    for _ in range(60):
        mid = 0.5 * (lo + hi)
        v, _ = calib.interp(vf, [f["val"] for f in vf], mid, ya)
        lo, hi = (mid, hi) if v < X else (lo, mid)
    return 0.5 * (lo + hi)


for Xs in sys.argv[8:]:
    X = float(Xs)
    xc = xpix(X, 0.5 * (y0 + y1))
    allruns = []
    for dx in range(-span, span + 1, 2):
        x = int(round(xc + dx))
        gl = [calib.at(f, x) for f in hf]
        prof = page[y0:y1, x]
        i = 0
        runs = []
        while i < len(prof):
            if prof[i] > thr:
                j = i
                while j < len(prof) and prof[j] > thr:
                    j += 1
                seg = prof[i:j]
                c = y0 + (seg * np.arange(i, j)).sum() / seg.sum()
                isgrid = (j - i) <= 8 and any(abs(c - q) < 4.5 for q in gl)
                if not isgrid:
                    Y, _ = calib.interp(hf, [f["vals"]["CDW"] for f in hf], c, x)
                    Xv, _ = calib.interp(vf, [f["val"] for f in vf], x, c)
                    runs.append((round(c, 1), j - i, round(Y, 4), round(Xv, 3)))
                i = j
            else:
                i += 1
        allruns.append((x, runs))
    print(f"== X={X} xc={xc:.1f}")
    for x, runs in allruns:
        print(f"   x={x}: " + " ".join(f"[y={c} w={w} v={Y} X={Xv}]" for c, w, Y, Xv in runs))
