"""Run the fixed-size sector Hough (circles.py method) for several
shapes in station windows and list merged candidates.

Usage: python -I houghst.py PAGE.png SPEC.json
SPEC: {"thr": 190, "minsec": 28,
       "shapes": {"circle": 13, "square": 11.5, "diamond": 15.5},
       "windows": [{"id": .., "x0": .., "y0": .., "x1": .., "y1": ..}, ...]}
For each window and shape, candidate centres (0.5 px grid) with at
least minsec of 36 sectors are clustered (3 px); each cluster prints
its best sector count and the mean centre of the best-scoring cells.
"""
import json
import sys

import numpy as np
from PIL import Image
from scipy import ndimage


def ridges(g, thr):
    r = np.zeros(g.shape, bool)
    h = (g[:, 1:-1] <= g[:, :-2]) & (g[:, 1:-1] <= g[:, 2:])
    v = (g[1:-1, :] <= g[:-2, :]) & (g[1:-1, :] <= g[2:, :])
    r[:, 1:-1] |= h
    r[1:-1, :] |= v
    return r & (g < thr)


def dist(dx, dy, shape, s):
    if shape == "circle":
        return np.abs(np.hypot(dx, dy) - s)
    if shape == "square":
        ax, ay = np.abs(dx), np.abs(dy)
        out = np.hypot(np.maximum(ax - s, 0), np.maximum(ay - s, 0))
        inside = np.minimum(s - ax, s - ay)
        return np.where((ax <= s) & (ay <= s), inside, out)
    if shape == "diamond":
        return np.abs((np.abs(dx) + np.abs(dy) - s) / np.sqrt(2))
    raise ValueError(shape)


def main():
    img = np.asarray(Image.open(sys.argv[1]).convert("L"), float)
    spec = json.load(open(sys.argv[2]))
    thr = spec.get("thr", 190)
    minsec = spec.get("minsec", 28)
    for w in spec["windows"]:
        x0, y0, x1, y1 = w["x0"], w["y0"], w["x1"], w["y1"]
        m = 25
        sub = img[y0 - m:y1 + m, x0 - m:x1 + m]
        rg = ridges(ndimage.gaussian_filter(sub, 0.6), thr)
        ys, xs = np.nonzero(rg)
        xs = xs + x0 - m
        ys = ys + y0 - m
        line = [w["id"]]
        for shape, s in spec["shapes"].items():
            cands = []
            for cy in np.arange(y0, y1 + 0.01, 0.5):
                for cx in np.arange(x0, x1 + 0.01, 0.5):
                    sel = dist(xs - cx, ys - cy, shape, s) <= 1.0
                    if sel.sum() < minsec:
                        continue
                    ang = (np.degrees(np.arctan2(-(ys[sel] - cy), xs[sel] - cx)) % 360) // 10
                    n = len(np.unique(ang))
                    if n >= minsec:
                        cands.append((n, cx, cy))
            cands.sort(reverse=True)
            clusters = []
            for n, cx, cy in cands:
                for c in clusters:
                    if abs(c["x"] - cx) <= 3 and abs(c["y"] - cy) <= 3:
                        if n == c["n"]:
                            c["pts"].append((cx, cy))
                        break
                else:
                    clusters.append({"n": n, "x": cx, "y": cy, "pts": [(cx, cy)]})
            for c in sorted(clusters, key=lambda c: c["y"]):
                px = np.mean([p[0] for p in c["pts"]])
                py = np.mean([p[1] for p in c["pts"]])
                line.append("%s(%.1f,%.1f)n%d" % (shape[0], px, py, c["n"]))
        print(" ".join(line))


if __name__ == "__main__":
    main()
