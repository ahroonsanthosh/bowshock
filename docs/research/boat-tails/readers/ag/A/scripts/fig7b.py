# usage: python3 -I fig7b.py <spec.json> <out_prefix>
# Stack extents by band ink. For each station: band = columns px-10..px+10 minus vertical gridline
# columns (columns dark over > 60 % of the panel height, +-1 px); ink(row) = dark fraction in the band,
# smoothed over 3 rows; stack rows: ink >= 0.45. Runs closer than 5 rows are joined; runs shorter than
# 7 rows (thin gridlines) are dropped unless joined. Solid fairing line: at columns px-24 and px+24
# (outside the symbols), the y of thick dark runs (>= 4 rows) is listed. The stack chosen is the run
# containing (or nearest to) the mean y of a run present on both sides (solid line). Outputs extents.
import sys, json
import numpy as np
from PIL import Image, ImageDraw
S = json.load(open(sys.argv[1])); outp = sys.argv[2]
cal = json.load(open(S['cal'])); g = np.asarray(Image.open(cal['spec']['png']).convert('L'))
B = g < 128
ax, ay = cal['ax'], cal['ay']
def data(px, py): return ax[0] + ax[1] * px + ax[2] * py, ay[0] + ay[1] * px + ay[2] * py
def topx(X, py): return (X - ax[0] - ax[2] * py) / ax[1]
y0, y1 = S['panel_y']
out = []
for st in S['stations']:
    px = int(round(topx(st, (y0 + y1) / 2)))
    cols = np.arange(px - 10, px + 11)
    colfrac = B[y0:y1, px - 12:px + 13].mean(axis=0)
    vline = set()
    for i, f in enumerate(colfrac):
        if f > 0.6: vline.update([px - 12 + i - 1, px - 12 + i, px - 12 + i + 1])
    keep = [c for c in cols if c not in vline]
    ink = B[y0:y1, keep].mean(axis=1).astype(float)
    ink = np.convolve(ink, np.ones(3) / 3, mode='same')
    rows = np.where(ink >= 0.45)[0]
    runs = []
    for r in rows:
        if runs and r - runs[-1][1] <= 5: runs[-1][1] = r
        else: runs.append([r, r])
    runs = [[int(a + y0), int(b + y0)] for a, b in runs if b - a + 1 >= 7]
    def thick(c):
        col = B[y0:y1, c - 1:c + 2].mean(axis=1) > 0.5
        rr = []; cur = None
        for i, v in enumerate(col):
            if v and cur is None: cur = i
            if not v and cur is not None:
                if i - cur >= 4: rr.append(float((cur + i - 1) / 2 + y0))
                cur = None
        return rr
    L, R = thick(px - 24), thick(px + 24)
    def hline_y(v, x):
        for val, co in cal['hlines']:
            if val == v: return co[0] + co[1] * x
    majors = [co[0] + co[1] * px for val, co in cal['hlines']]
    solid = [(l + r) / 2 for l in L for r in R if abs(l - r) < 14 and min(abs((l + r) / 2 - m) for m in majors) > 5]
    # choose run: the lowest run at least 12 px tall (the jet-off circle is the lowest symbol on the solid
    # fairing in every panel of fig. 7; jet-on points move up at the aft stations)
    big = [rn for rn in runs if rn[1] - rn[0] + 1 >= 12]
    ch = big[-1] if big else None
    out.append(dict(station=st, px=px, runs=runs, left=L, right=R, solid=solid, ncols=len(keep), chosen=ch))
    print(f"st {st:5.2f} px {px}: chosen {ch} runs {runs} solid {[round(s) for s in solid]} L {[round(v) for v in L]} R {[round(v) for v in R]}")
json.dump(out, open(outp + '.bres.json', 'w'), indent=0)
