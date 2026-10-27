"""Find symbol stacks along a station line after removing long straight
lines (grid, frame, axis) and thin strokes.

Usage: python -I blobfind.py PAGE.png SPEC.json OUT.json [STRIP.png]
SPEC: {"thr": 128, "maxrun": 45, "open": 3, "band": 10, "minarea": 60,
       "stations": [{"id": .., "x": px, "y0": .., "y1": ..}, ...]}
Steps per station window (x-40..x+40, y0..y1): ink = grey < thr; every
horizontal or vertical run of ink longer than maxrun px is erased
(straight lines; symbols are smaller); the rest is opened with an
open x open square (removes curves and thin remnants); connected
components with area >= minarea whose centroid lies within x +- band
are kept and merged when they overlap vertically or are within 2 px.
Each stack: top, bottom, mid, height, x-centre (mean of left and right
extremes over its rows), width.
"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


def erase_runs(b, maxrun):
    out = b.copy()
    for axis in (0, 1):
        a = b if axis == 1 else b.T
        o = out if axis == 1 else out.T
        for i in range(a.shape[0]):
            row = a[i]
            j = 0
            n = len(row)
            while j < n:
                if row[j]:
                    k = j
                    while k + 1 < n and row[k + 1]:
                        k += 1
                    if k - j + 1 > maxrun:
                        o[i, j:k + 1] = False
                    j = k + 1
                else:
                    j += 1
    return out


def main():
    page, specf, outf = sys.argv[1:4]
    strip = sys.argv[4] if len(sys.argv) > 4 else None
    spec = json.load(open(specf))
    img = np.asarray(Image.open(page).convert("L"), float)
    rgb = Image.open(page).convert("RGB")
    thr = spec.get("thr", 128)
    maxrun = spec.get("maxrun", 45)
    op = spec.get("open", 3)
    band = spec.get("band", 10)
    minarea = spec.get("minarea", 60)
    res = []
    tiles = []
    for st in spec["stations"]:
        x, y0, y1 = st["x"], st["y0"], st["y1"]
        X0 = int(round(x)) - 40
        b = img[y0:y1, X0:X0 + 81] < thr
        e = erase_runs(b, maxrun)
        o = ndimage.binary_opening(e, structure=np.ones((op, op)))
        lab, n = ndimage.label(o)
        comps = []
        for k in range(1, n + 1):
            ys, xs = np.nonzero(lab == k)
            if len(ys) < minarea:
                continue
            cx = xs.mean() + X0
            if abs(cx - x) > band:
                continue
            comps.append([ys.min() + y0, ys.max() + y0, xs.min() + X0, xs.max() + X0, len(ys)])
        comps.sort()
        merged = []
        for c in comps:
            if merged and c[0] <= merged[-1][1] + spec.get("gap", 5):
                m = merged[-1]
                merged[-1] = [m[0], max(m[1], c[1]), min(m[2], c[2]), max(m[3], c[3]), m[4] + c[4]]
            else:
                merged.append(c)
        stacks = []
        for t, bt, l, r, area in merged:
            stacks.append({"top": int(t), "bottom": int(bt), "mid": 0.5 * (t + bt), "height": int(bt - t + 1),
                           "xc": 0.5 * (l + r), "width": int(r - l + 1), "area": int(area)})
        res.append({"id": st["id"], "x": x, "stacks": stacks})
        if strip:
            z = 3
            c = rgb.crop((X0, y0, X0 + 81, y1)).resize((81 * z, (y1 - y0) * z), Image.NEAREST)
            d = ImageDraw.Draw(c)
            for s in stacks:
                d.rectangle([((s["xc"] - s["width"] / 2 - X0) * z, (s["top"] - y0) * z),
                             ((s["xc"] + s["width"] / 2 - X0) * z, (s["bottom"] - y0 + 1) * z)], outline=(255, 0, 0))
            for yy in range((y0 // 20 + 1) * 20, y1, 20):
                d.line([(0, (yy - y0) * z), (8, (yy - y0) * z)], fill=(0, 0, 255))
                d.text((10, (yy - y0) * z - 5), str(yy), fill=(0, 0, 255))
            T = Image.new("RGB", (c.size[0], c.size[1] + 12), (255, 255, 255))
            ImageDraw.Draw(T).text((2, 0), st["id"], fill=(0, 0, 0))
            T.paste(c, (0, 12))
            tiles.append(T)
    json.dump(res, open(outf, "w"), indent=1)
    if strip and tiles:
        W = sum(t.size[0] + 4 for t in tiles)
        H = max(t.size[1] for t in tiles)
        S = Image.new("RGB", (W, H), (255, 190, 190))
        xx = 0
        for t in tiles:
            S.paste(t, (xx, 0))
            xx += t.size[0] + 4
        S.save(strip)
    for r in res:
        print(r["id"], " | ".join("%d-%d mid %.1f h%d xc %.1f w%d" % (s["top"], s["bottom"], s["mid"], s["height"], s["xc"], s["width"]) for s in r["stacks"]))


if __name__ == "__main__":
    main()
