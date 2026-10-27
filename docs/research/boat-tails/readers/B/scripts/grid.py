"""Find straight grid lines in a box of a page image.

Usage: python3 -I grid.py IMG u0 v0 u1 v1 ORIENT [nstrips] [minfrac] [thr]
ORIENT: h (horizontal lines, reports row v) or v (vertical lines, reports column u)
The box is split into nstrips strips along the line direction; in each strip
the darkness (255 - grey) is summed across the strip, rows/columns whose dark
pixel fraction exceeds minfrac are grouped, and each group is reported as the
darkness-weighted centroid (sub-pixel). Comparing strips measures skew.
"""
import sys
import numpy as np
from PIL import Image


def lines_in(arr, axis, minfrac, thr):
    # arr: grey strip. axis=1 -> sum along columns -> profile per row
    dark = (arr < thr)
    frac = dark.mean(axis=axis)
    w = (255.0 - arr.astype(float)).clip(0, None)
    wsum = w.sum(axis=axis)
    idx = np.where(frac > minfrac)[0]
    groups = []
    if len(idx):
        start = idx[0]
        prev = idx[0]
        for i in idx[1:]:
            if i != prev + 1:
                groups.append((start, prev))
                start = i
            prev = i
        groups.append((start, prev))
    out = []
    for a, b in groups:
        lo, hi = max(a - 2, 0), min(b + 3, len(wsum))
        seg = wsum[lo:hi]
        base = np.median(wsum)
        segw = (seg - base).clip(0, None)
        pos = (np.arange(lo, hi) * segw).sum() / segw.sum()
        out.append((pos, a, b, frac[a:b + 1].max()))
    return out


def main():
    a = sys.argv[1:]
    img = np.asarray(Image.open(a[0]).convert('L'))
    u0, v0, u1, v1 = (int(x) for x in a[1:5])
    orient = a[5]
    ns = int(a[6]) if len(a) > 6 else 1
    minfrac = float(a[7]) if len(a) > 7 else 0.5
    thr = int(a[8]) if len(a) > 8 else 160
    box = img[v0:v1, u0:u1]
    if orient == 'h':
        edges = np.linspace(0, box.shape[1], ns + 1).astype(int)
        for s in range(ns):
            strip = box[:, edges[s]:edges[s + 1]]
            ls = lines_in(strip, 1, minfrac, thr)
            mid = u0 + (edges[s] + edges[s + 1]) / 2
            print(f"strip u~{mid:.0f}: " + ", ".join(f"{v0 + p:.2f}[{b - a2 + 1}]" for p, a2, b, f in ls))
    else:
        edges = np.linspace(0, box.shape[0], ns + 1).astype(int)
        for s in range(ns):
            strip = box[edges[s]:edges[s + 1], :]
            ls = lines_in(strip, 0, minfrac, thr)
            mid = v0 + (edges[s] + edges[s + 1]) / 2
            print(f"strip v~{mid:.0f}: " + ", ".join(f"{u0 + p:.2f}[{b - a2 + 1}]" for p, a2, b, f in ls))


if __name__ == '__main__':
    main()
