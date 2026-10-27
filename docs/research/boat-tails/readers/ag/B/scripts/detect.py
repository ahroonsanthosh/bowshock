"""Detect plotted symbols of several shapes in a region by template
correlation (outline templates for open symbols, area templates for
filled ones).

Usage: python -I detect.py PAGE.png SPEC.json OUT.json OVERLAY.png
SPEC: {"thr": 170, "region": [x0, y0, x1, y1],
       "shapes": [{"name": "circle_open", "shape": "circle", "size": 11.5,
                   "aspect": 1.0, "fill": false, "min": 0.45}, ...],
       "nms": 8}
For open shapes the score is mean ink on the outline minus the mean of
the ink on the outline shrunk and grown by 4 px; for filled shapes the
mean ink inside minus the mean ink on a ring 4 px outside.  Local maxima
above "min" are kept, then a global non-maximum suppression across all
shapes keeps the best detection within "nms" px.  Every detection is
listed with its score and the scores of all other shapes at the same
place, so a doubtful identification can be judged.
"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage, signal


def poly(shape, s, a=1.0):
    h = s * a
    if shape == "circle":
        t = np.linspace(0, 2 * np.pi, 64, endpoint=False)
        return np.c_[s * np.cos(t), h * np.sin(t)]
    v = {"square": [(-s, -h), (s, -h), (s, h), (-s, h)],
         "diamond": [(0, -h), (s, 0), (0, h), (-s, 0)],
         "tri_up": [(0, -h), (s, h), (-s, h)],
         "tri_dn": [(0, h), (s, -h), (-s, -h)]}[shape]
    return np.array(v, float)


def raster(pts, R, width=1, fill=False, grow=0.0):
    c = pts.mean(axis=0) * 0
    p = pts.copy()
    if grow:
        r = np.hypot(p[:, 0], p[:, 1])
        r[r == 0] = 1
        p = p * ((r + grow) / r)[:, None]
    im = Image.new("L", (2 * R + 1, 2 * R + 1), 0)
    d = ImageDraw.Draw(im)
    q = [(float(x + R), float(y + R)) for x, y in p]
    if fill:
        d.polygon(q, fill=1)
    else:
        d.line(q + [q[0]], fill=1, width=width)
    return np.asarray(im, float)


def tri_offset(shape, s, a):
    h = s * a
    return {"tri_up": (0.0, h / 3.0), "tri_dn": (0.0, -h / 3.0)}.get(shape, (0.0, 0.0))


def main():
    page, specf, outf, ovf = sys.argv[1:5]
    spec = json.load(open(specf))
    img = np.asarray(Image.open(page).convert("L"), float)
    x0, y0, x1, y1 = spec["region"]
    sub = img[y0:y1, x0:x1]
    ink = ndimage.gaussian_filter((sub < spec.get("thr", 170)).astype(float), 0.7)
    maps = {}
    for sh in spec["shapes"]:
        s, a = sh["size"], sh.get("aspect", 1.0)
        R = int(s * max(1, a) + 8)
        P = poly(sh["shape"], s, a)
        if sh.get("fill"):
            T1 = raster(P, R, fill=True, grow=-1.0)
            T2 = raster(P, R, width=2, grow=4.0)
            m = signal.fftconvolve(ink, T1[::-1, ::-1], mode="same") / T1.sum() \
                - signal.fftconvolve(ink, T2[::-1, ::-1], mode="same") / T2.sum()
        else:
            T0 = raster(P, R, width=2)
            Ti = raster(P, R, width=2, grow=-4.0)
            To = raster(P, R, width=2, grow=4.0)
            m = signal.fftconvolve(ink, T0[::-1, ::-1], mode="same") / T0.sum() \
                - 0.5 * (signal.fftconvolve(ink, Ti[::-1, ::-1], mode="same") / Ti.sum()
                         + signal.fftconvolve(ink, To[::-1, ::-1], mode="same") / To.sum())
        maps[sh["name"]] = m
    cands = []
    for sh in spec["shapes"]:
        m = maps[sh["name"]]
        mx = ndimage.maximum_filter(m, size=5)
        ys, xs = np.nonzero((m == mx) & (m >= sh["min"]))
        for y, x in zip(ys, xs):
            cands.append((float(m[y, x]), sh["name"], int(x), int(y)))
    cands.sort(reverse=True)
    kept = []
    nms = spec.get("nms", 8)
    for c in cands:
        if all((c[2] - k[2]) ** 2 + (c[3] - k[3]) ** 2 > nms ** 2 for k in kept):
            kept.append(c)
    out = []
    byname = {sh["name"]: sh for sh in spec["shapes"]}
    for sc, nm, x, y in kept:
        sh = byname[nm]
        others = {n: round(float(maps[n][y, x]), 3) for n in maps}
        out.append({"shape_name": nm, "shape": sh["shape"], "fill": sh.get("fill", False),
                    "size": sh["size"], "aspect": sh.get("aspect", 1.0),
                    "bx": x + x0, "by": y + y0, "score": round(sc, 3), "others": others})
    out.sort(key=lambda d: (d["bx"], d["by"]))
    json.dump(out, open(outf, "w"), indent=1)
    im = Image.open(page).convert("RGB").crop((x0, y0, x1, y1))
    sc = spec.get("ov_scale", 3)
    im = im.resize((im.size[0] * sc, im.size[1] * sc), Image.NEAREST)
    d = ImageDraw.Draw(im)
    col = {"circle": (255, 0, 0), "square": (0, 120, 255), "diamond": (0, 170, 0),
           "tri_up": (255, 120, 0), "tri_dn": (200, 0, 200)}
    for k, o in enumerate(out):
        P = poly(o["shape"], o["size"], o["aspect"]) + np.array([o["bx"], o["by"]])
        q = [((x - x0) * sc, (y - y0) * sc) for x, y in P]
        d.line(q + [q[0]], fill=col[o["shape"]], width=2 if o["fill"] else 1)
        d.text(((o["bx"] - x0) * sc + o["size"] * sc + 2, (o["by"] - y0) * sc - 6), str(k), fill=col[o["shape"]])
    im.save(ovf)
    for k, o in enumerate(out):
        print(k, o["shape_name"], o["bx"], o["by"], o["score"])


if __name__ == "__main__":
    main()
