"""Iterative template detection ("CLEAN") of overlapping open symbols.

usage: python3 -I clean.py degrid.npy ox oy x0 y0 x1 y1 shapes.json maxn thr out.png page.png
shapes.json: {"name": {"kind": ring|diamond|tri|square|disc, ...geometry...}, ...}
  ring:    {"r": stroke-centre radius, "w": stroke width}
  diamond: {"h": stroke-centre half-diagonal, "w": ...}
  square:  {"h": stroke-centre half-side, "w": ...}
  disc:    {"r": radius}
  tri:     {"a": leg length (stroke centre), "w": ..., "corner": "tr"|"tl"|"br"|"bl"}
           right triangle; `corner` is where the right angle is. The
           reported centre is the bounding-box centre of the stroke-centre
           triangle; the vertex centroid is printed too.
At each step the zero-mean normalised correlation of every shape with the
residual is computed over the region; the best (shape, position) above
`thr` is taken, refined to sub-pixel, its least-squares amplitude is
subtracted, and the search repeats (at most maxn times). An overlay of the
found outlines on the page region is written to out.png for checking.
"""
import json
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy.signal import fftconvolve

res = np.load(sys.argv[1]).astype(float)
ox, oy = int(sys.argv[2]), int(sys.argv[3])
x0, y0, x1, y1 = (int(v) for v in sys.argv[4:8])
shapes = json.load(open(sys.argv[8]))
maxn, thr = int(sys.argv[9]), float(sys.argv[10])
out, page = sys.argv[11], sys.argv[12]
SS = 4


def raster(s, dx=0.0, dy=0.0):
    k = s["kind"]
    R = 22
    n = 2 * R + 1
    yy, xx = np.mgrid[0:n * SS, 0:n * SS]
    xx = (xx + 0.5) / SS - R - 0.5 - dx
    yy = (yy + 0.5) / SS - R - 0.5 - dy
    w = s.get("w", 2.0) / 2.0
    if k == "ring":
        m = np.abs(np.hypot(xx, yy) - s["r"]) <= w
    elif k == "disc":
        m = np.hypot(xx, yy) <= s["r"]
    elif k == "diamond":
        m = np.abs(np.abs(xx) + np.abs(yy) - s["h"]) <= w * 1.414
    elif k == "square":
        m = np.abs(np.maximum(abs(xx), abs(yy)) - s["h"]) <= w
    elif k == "tri":
        a = s["a"]
        h = a / 2.0
        c = s["corner"]
        # local coords with the right angle at (+h,-h) for "tr"
        u = xx if c in ("tr", "br") else -xx
        v = yy if c in ("tr", "tl") else -yy
        # legs: top edge v=-h (u in [-h,h]); right edge u=h (v in [-h,h]);
        # hypotenuse from (-h,-h) to (h,h): u - v = 0
        e1 = (np.abs(v + h) <= w) & (u >= -h - w) & (u <= h + w)
        e2 = (np.abs(u - h) <= w) & (v >= -h - w) & (v <= h + w)
        e3 = (np.abs(u - v) / 1.414 <= w) & (u >= -h - w) & (u <= h + w)
        m = e1 | e2 | e3
    else:
        raise SystemExit(k)
    return m.reshape(n, SS, n, SS).mean(axis=(1, 3))


def centroid_offset(s):
    if s["kind"] != "tri":
        return 0.0, 0.0
    h = s["a"] / 2.0
    c = s["corner"]
    cu, cv = h / 3.0, -h / 3.0  # vertex centroid for "tr" in (u,v)
    dx = cu if c in ("tr", "br") else -cu
    dy = cv if c in ("tr", "tl") else -cv
    return dx, dy


R = res[y0 - oy - 30:y1 - oy + 30, x0 - ox - 30:x1 - ox + 30].copy()
found = []
for it in range(maxn):
    best = None
    for name, s in shapes.items():
        t = raster(s)
        tt = t - t.mean()
        tn = np.sqrt((tt ** 2).sum())
        num = fftconvolve(R, tt[::-1, ::-1], mode="same")
        ones = np.ones_like(t)
        s1 = fftconvolve(R, ones, mode="same")
        s2 = fftconvolve(R ** 2, ones, mode="same")
        var = np.maximum(s2 - s1 ** 2 / t.size, 1e-9)
        ncc = num / (np.sqrt(var) * tn)
        # restrict to region
        sub = ncc[30:-30, 30:-30]
        j, i = np.unravel_index(np.argmax(sub), sub.shape)
        if best is None or sub[j, i] > best[0]:
            best = (sub[j, i], name, i, j, ncc)
    sc, name, i, j, ncc = best
    if sc < thr:
        break
    J, I = j + 30, i + 30
    a, b, c = ncc[J, I - 1], ncc[J, I], ncc[J, I + 1]
    fx = 0.5 * (a - c) / (a - 2 * b + c) if (a - 2 * b + c) else 0
    a, b, c = ncc[J - 1, I], ncc[J, I], ncc[J + 1, I]
    fy = 0.5 * (a - c) / (a - 2 * b + c) if (a - 2 * b + c) else 0
    cx, cy = x0 + i + fx, y0 + j + fy
    s = shapes[name]
    t = raster(s)
    n = t.shape[0] // 2
    patch = R[J - n:J + n + 1, I - n:I + n + 1]
    amp = (patch * t).sum() / (t * t).sum()
    R[J - n:J + n + 1, I - n:I + n + 1] -= amp * t
    R = np.maximum(R, 0)
    dx, dy = centroid_offset(s)
    found.append((name, cx, cy, sc, amp, cx + dx, cy + dy))
    print("%-8s centre (%.2f, %.2f) score %.3f amp %.1f  vertex-centroid (%.2f, %.2f)" % found[-1])

img = Image.open(page).convert("RGB").crop((x0 - 10, y0 - 10, x1 + 10, y1 + 10))
S = 6
img = img.resize((img.width * S, img.height * S), Image.NEAREST)
d = ImageDraw.Draw(img)
cols = [(255, 0, 0), (0, 160, 0), (0, 0, 255), (200, 0, 200), (0, 160, 160), (200, 120, 0), (120, 0, 0), (0, 0, 120)]
for k, (name, cx, cy, sc, amp, _, _) in enumerate(found):
    s = shapes[name]
    col = cols[k % len(cols)]
    X = lambda x: (x - (x0 - 10) + 0.5) * S
    Y = lambda y: (y - (y0 - 10) + 0.5) * S
    if s["kind"] in ("ring", "disc"):
        r = s["r"]
        d.ellipse([X(cx - r), Y(cy - r), X(cx + r), Y(cy + r)], outline=col, width=2)
    elif s["kind"] == "diamond":
        h = s["h"]
        d.polygon([(X(cx), Y(cy - h)), (X(cx + h), Y(cy)), (X(cx), Y(cy + h)), (X(cx - h), Y(cy))], outline=col)
    elif s["kind"] == "square":
        h = s["h"]
        d.rectangle([X(cx - h), Y(cy - h), X(cx + h), Y(cy + h)], outline=col, width=2)
    elif s["kind"] == "tri":
        h = s["a"] / 2
        c = s["corner"]
        sx = 1 if c in ("tr", "br") else -1
        sy = 1 if c in ("tr", "tl") else -1
        pts = [(-h, -h), (h, -h), (h, h)]
        d.polygon([(X(cx + sx * u), Y(cy + sy * v)) for u, v in pts], outline=col)
    d.text((X(cx) + 3, Y(cy) + 3), str(k + 1), fill=col)
    d.line([(X(cx) - 4, Y(cy)), (X(cx) + 4, Y(cy))], fill=col)
    d.line([(X(cx), Y(cy) - 4), (X(cx), Y(cy) + 4)], fill=col)
img.save(out)
