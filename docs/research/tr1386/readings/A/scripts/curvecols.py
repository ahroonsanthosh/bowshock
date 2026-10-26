"""For target x-values, find the page column (at an approximate y) and list
dark runs in that column band, with grid-line positions marked.

usage: curvecols.py scriptdir results.json page.png scale y_approx y0 y1 hw thr X1 X2 ...
"""
import sys, json
sys.path.insert(0, sys.argv[1])
import numpy as np
import digi, calib

res = json.load(open(sys.argv[2]))
page = digi.load(sys.argv[3])
scale = sys.argv[4]
ya = float(sys.argv[5]); y0, y1, hw = int(sys.argv[6]), int(sys.argv[7]), int(sys.argv[8])
thr = float(sys.argv[9])
vf = res["vfits"]
hf = [f for f in res["hfits"] if scale in f["vals"]]
for Xs in sys.argv[10:]:
    X = float(Xs)
    # invert: find px with interp(...) == X at y=ya
    lo, hi = 0.0, float(page.shape[1])
    for _ in range(60):
        mid = 0.5 * (lo + hi)
        v, _ = calib.interp(vf, [f["val"] for f in vf], mid, ya)
        if v < X:
            lo = mid
        else:
            hi = mid
    x = int(round(0.5 * (lo + hi)))
    gl = sorted(calib.at(f, x) for f in hf)
    prof = page[y0:y1, x - hw:x + hw + 1].mean(axis=1)
    runs = []
    i = 0
    while i < len(prof):
        if prof[i] > thr:
            j = i
            while j < len(prof) and prof[j] > thr:
                j += 1
            seg = prof[i:j]
            c = y0 + (seg * np.arange(i, j)).sum() / seg.sum()
            g = any(abs(c - q) < 5 for q in gl) and (j - i) < 9
            Y, _ = calib.interp(hf, [f["vals"][scale] for f in hf], c, x)
            runs.append(f"{y0+i}-{y0+j-1}(c={c:.1f},w={j-i},v={Y:.3f}{',GRID' if g else ''})")
            i = j
        else:
            i += 1
    print(f"X={X} px={x}:", " ".join(runs))
