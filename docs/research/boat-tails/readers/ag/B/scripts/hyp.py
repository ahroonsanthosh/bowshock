"""Draw hypothesised symbol outlines over a zoomed crop, for checking.

Usage: python -I hyp.py PAGE.png OUT.png x0 y0 x1 y1 scale "shape:cx:cy:size[:aspect];..."
Outlines are drawn 1 px wide in rotating colours, centres as small
crosses.  Prints, for each symbol, the fraction of its outline lying on
ink (grey < 175 after a light blur), all round and per quadrant
(top, right, bottom, left) so a hidden-line stack can be judged.
"""
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

COL = [(255, 0, 0), (0, 150, 255), (0, 190, 0), (255, 140, 0), (200, 0, 200), (0, 200, 200), (120, 60, 0)]


def outline(shape, s, aspect=1.0, n=160):
    if shape == "circle":
        t = np.linspace(0, 2 * np.pi, n, endpoint=False)
        return np.c_[s * np.cos(t), s * aspect * np.sin(t)]
    h = s * aspect
    if shape == "square":
        v = [(-s, -h), (s, -h), (s, h), (-s, h)]
    elif shape == "diamond":
        v = [(0, -h), (s, 0), (0, h), (-s, 0)]
    elif shape == "tri_up":
        v = [(0, -h), (s, h), (-s, h)]
    elif shape == "tri_dn":
        v = [(0, h), (s, -h), (-s, -h)]
    elif shape == "tri_ur":
        v = [(-s, h), (s, h), (s, -h)]
    elif shape == "tri_r":
        v = [(s, 0), (-s, h), (-s, -h)]
    elif shape == "tri_l":
        v = [(-s, 0), (s, h), (s, -h)]
    elif shape == "octagon":
        a = s * np.tan(np.pi / 8)
        v = [(-a, -h), (a, -h), (s, -a), (s, a), (a, h), (-a, h), (-s, a), (-s, -a)]
    else:
        raise ValueError(shape)
    v = np.array(v, float)
    m = len(v)
    pts = []
    per = n // m
    for i in range(m):
        a, b = v[i], v[(i + 1) % m]
        for k in range(per):
            pts.append(a + (b - a) * k / per)
    return np.array(pts)


def main():
    a = sys.argv[1:]
    page = Image.open(a[0]).convert("RGB")
    g = np.asarray(page.convert("L"), float)
    ink = ndimage.gaussian_filter((g < 175).astype(float), 0.7) > 0.3
    x0, y0, x1, y1 = (int(v) for v in a[2:6])
    s = float(a[6])
    syms = [t for t in a[7].split(";") if t.strip()]
    c = page.crop((x0, y0, x1, y1)).resize((int((x1 - x0) * s), int((y1 - y0) * s)), Image.NEAREST)
    d = ImageDraw.Draw(c)
    for k, t in enumerate(syms):
        f = t.split(":")
        shape, cx, cy, size = f[0], float(f[1]), float(f[2]), float(f[3])
        asp = float(f[4]) if len(f) > 4 else 1.0
        o = outline(shape, size, asp) + np.array([cx, cy])
        col = COL[k % len(COL)]
        q = [((p[0] - x0 + 0.5) * s, (p[1] - y0 + 0.5) * s) for p in o]
        d.line(q + [q[0]], fill=col, width=1)
        X, Y = (cx - x0 + 0.5) * s, (cy - y0 + 0.5) * s
        d.line([(X - 4, Y), (X + 4, Y)], fill=col)
        d.line([(X, Y - 4), (X, Y + 4)], fill=col)
        on = ink[np.clip(np.round(o[:, 1]).astype(int), 0, g.shape[0] - 1),
                 np.clip(np.round(o[:, 0]).astype(int), 0, g.shape[1] - 1)]
        rel = o - np.array([cx, cy])
        ang = np.degrees(np.arctan2(-rel[:, 1], rel[:, 0])) % 360
        quad = {"top": (ang >= 45) & (ang < 135), "left": (ang >= 135) & (ang < 225),
                "bottom": (ang >= 225) & (ang < 315), "right": (ang >= 315) | (ang < 45)}
        qs = " ".join("%s=%.2f" % (kk, on[m].mean()) for kk, m in quad.items())
        print("%d %s (%.1f,%.1f) s=%.2f all=%.2f %s" % (k, shape, cx, cy, size, on.mean(), qs))
    c.save(a[1])


if __name__ == "__main__":
    main()
