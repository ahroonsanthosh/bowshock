"""Centre dots inside stacks of overlapping open symbols.

A pixel is a dot pixel if the ink run through it is short in all four
directions (horizontal, vertical, both diagonals): outline strokes and
curves are long along themselves, a dot is short every way. Components of
dot pixels of dot size and compact shape are the centre dots. Each dot's
nose (symbol shape) is the outline template, centred on the dot, that
covers most ink; the score of the runner-up is kept to flag doubt.
"""
import numpy as np

import dig


def run_len(m, dy, dx):
    """Length of the ink run through each pixel along direction (dy, dx)."""
    H, W = m.shape
    fwd = np.zeros((H, W), np.int16)
    bwd = np.zeros((H, W), np.int16)
    ys = range(H) if dy >= 0 else range(H - 1, -1, -1)
    # simple two-pass accumulation along the direction
    a = m.astype(np.int16)
    f = a.copy()
    if (dy, dx) == (0, 1):
        for x in range(1, W):
            f[:, x] = (f[:, x - 1] + 1) * a[:, x]
        b = a.copy()
        for x in range(W - 2, -1, -1):
            b[:, x] = (b[:, x + 1] + 1) * a[:, x]
    elif (dy, dx) == (1, 0):
        for y in range(1, H):
            f[y] = (f[y - 1] + 1) * a[y]
        b = a.copy()
        for y in range(H - 2, -1, -1):
            b[y] = (b[y + 1] + 1) * a[y]
    else:
        s = dx  # +1: down-right, -1: down-left
        for y in range(1, H):
            prev = np.zeros(W, np.int16)
            if s == 1:
                prev[1:] = f[y - 1, :-1]
            else:
                prev[:-1] = f[y - 1, 1:]
            f[y] = (prev + 1) * a[y]
        b = a.copy()
        for y in range(H - 2, -1, -1):
            nxt = np.zeros(W, np.int16)
            if s == 1:
                nxt[:-1] = b[y + 1, 1:]
            else:
                nxt[1:] = b[y + 1, :-1]
            b[y] = (nxt + 1) * a[y]
    return f + b - a


def dots(m, region, max_run=12, nmin=12, nmax=90):
    x0, y0, x1, y1 = region
    sub = m[y0:y1, x0:x1]
    short = sub.copy()
    for d in ((0, 1), (1, 0), (1, 1), (1, -1)):
        short &= run_len(sub, *d) <= max_run
    comps, _ = dig.components(short, min_px=nmin)
    out = []
    for c in comps:
        bx0, by0, bx1, by1 = c["bbox"]
        w, h = bx1 - bx0 + 1, by1 - by0 + 1
        if c["n"] > nmax or w > 13 or h > 13 or c["n"] < 0.4 * w * h:
            continue
        out.append((c["cx"] + x0, c["cy"] + y0, c["n"]))
    return out


def nose(m, cx, cy, shapes, stroke=5.0):
    """Best centred outline template: [(score, name, shape)] sorted."""
    res = []
    for sh in shapes:
        best = 0.0
        for rr in (sh["r"] - 1, sh["r"], sh["r"] + 1):
            if sh["shape"].startswith("triangle"):
                from fig import tri_template
                t = tri_template(rr, stroke, down=sh["shape"] == "triangle_down")
            else:
                t = dig.ring_template(rr, stroke, sh["shape"])
            R = t.shape[0] // 2
            for ddy in (-1, 0, 1):
                for ddx in (-1, 0, 1):
                    Y, X = int(round(cy)) + ddy, int(round(cx)) + ddx
                    if Y - R < 0 or X - R < 0 or Y + R + 1 > m.shape[0] or X + R + 1 > m.shape[1]:
                        continue
                    g = m[Y - R:Y + R + 1, X - R:X + R + 1]
                    best = max(best, float((g & t).sum() / t.sum()))
        res.append((best, sh["name"], sh["shape"]))
    return sorted(res, reverse=True)
