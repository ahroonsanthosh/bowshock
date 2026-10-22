"""Symbols with centre dots (the NACA plotting templates of TN 2360, TN 3372,
RM L52E06 and others): find every centre dot inside a plot, and name its
series by matching the outline around it against the legend's own glyphs.

The dot is the plotted point: on the legend glyphs it sits at the bounding
box centre of circles, squares and diamonds and one third of the height above
the base of the triangles (checked in each method note), so reading the dot
is reading 0008's centroid.

Used from read.py through the spec key "dots":
  {"legend": [{"series": name, "at": [X, Y]} ...],   page px of legend dots
   "region": [x0, y0, x1, y1],                        page px to search
   "R": 40, "dot_min": 3, "dot_max": 16, "min_score": 0.5}
"""
import numpy as np

import dig


def dot_blobs(m, region, dot_min=3, dot_max=16, clear_in=None, ring=(None, None)):
    """Small compact blobs whose surroundings (an annulus) are mostly white.
    region in local px. Returns [(cx, cy, w, h, n)] local px."""
    x0, y0, x1, y1 = region
    sub = m[y0:y1, x0:x1]
    comps, lab = dig.components(sub, min_px=max(4, dot_min * dot_min // 2))
    out = []
    r_in = ring[0] if ring[0] is not None else dot_max * 0.6
    r_out = ring[1] if ring[1] is not None else dot_max * 1.1
    for c in comps:
        bx0, by0, bx1, by1 = c["bbox"]
        w, h = bx1 - bx0 + 1, by1 - by0 + 1
        if not (dot_min <= w <= dot_max and dot_min <= h <= dot_max):
            continue
        if c["n"] < 0.45 * w * h:  # a filled dot, not a stroke fragment
            continue
        cx, cy = c["cx"] + x0, c["cy"] + y0
        R = int(np.ceil(r_out))
        yy, xx = np.mgrid[-R:R + 1, -R:R + 1]
        d = np.hypot(xx, yy)
        ann = (d >= r_in) & (d <= r_out)
        Y = np.clip(np.round(cy + yy).astype(int), 0, m.shape[0] - 1)
        X = np.clip(np.round(cx + xx).astype(int), 0, m.shape[1] - 1)
        frac = m[Y[ann], X[ann]].mean()
        if frac > 0.25:
            continue
        out.append((float(cx), float(cy), int(w), int(h), int(c["n"])))
    return out


def glyph(m, cx, cy, R, dot_r):
    """Outline around a dot, the dot itself removed (bool array 2R+1)."""
    Y0, X0 = int(round(cy)) - R, int(round(cx)) - R
    g = np.zeros((2 * R + 1, 2 * R + 1), dtype=bool)
    ys0, xs0 = max(0, Y0), max(0, X0)
    ys1, xs1 = min(m.shape[0], Y0 + 2 * R + 1), min(m.shape[1], X0 + 2 * R + 1)
    g[ys0 - Y0:ys1 - Y0, xs0 - X0:xs1 - X0] = m[ys0:ys1, xs0:xs1]
    yy, xx = np.mgrid[-R:R + 1, -R:R + 1]
    g[np.hypot(xx, yy) <= dot_r] = False
    return g


def dilate(b, k):
    out = b.copy()
    for _ in range(k):
        o = out.copy()
        o[1:, :] |= out[:-1, :]
        o[:-1, :] |= out[1:, :]
        o[:, 1:] |= out[:, :-1]
        o[:, :-1] |= out[:, 1:]
        out = o
    return out


def rule_offset(g, R, rule):
    """Offset (dx, dy) in px from the glyph's dot (the glyph's centre) to
    0008's centroid: rule 'bbox' (circles, squares, diamonds, and shapes the
    rule does not name) or 'third' (triangles: one third of the height above
    the base, the base being the glyph's lower edge). The outline is the
    largest component of the glyph."""
    comps, lab = dig.components(g, min_px=20)
    c = max(comps, key=lambda q: q["n"])
    x0, y0, x1, y1 = c["bbox"]
    dx = 0.5 * (x0 + x1) - R
    if rule == "third":
        dy = (y1 - (y1 - y0) / 3.0) - R
    else:
        dy = 0.5 * (y0 + y1) - R
    return float(dx), float(dy), (x1 - x0 + 1, y1 - y0 + 1)


def scaled(tpl, s, Rout):
    """The glyph template scaled by s and centred in a (2*Rout+1) window."""
    from PIL import Image
    n = tpl.shape[0]
    m = max(3, int(round(n * s)) | 1)
    im = Image.fromarray((tpl * 255).astype(np.uint8)).resize((m, m), Image.BILINEAR)
    t = np.asarray(im) > 96
    out = np.zeros((2 * Rout + 1, 2 * Rout + 1), dtype=bool)
    o = Rout - m // 2
    if o < 0:
        t = t[-o:m + o, -o:m + o]
        o = 0
    out[o:o + t.shape[0], o:o + t.shape[1]] = t
    return out


def match_scaled(g, tpl, scales, shift=3):
    """Best match over template scales; returns (score, scale)."""
    Rout = g.shape[0] // 2
    best = (-1.0, 1.0)
    for s in scales:
        sc = match(g, scaled(tpl, s, Rout), shift)
        if sc > best[0]:
            best = (sc, s)
    return best


def match(g, tpl, shift=3):
    """Best overlap fraction of template outline pixels found in g (dilated
    by 2 px), over shifts of +-shift px; penalised a little by ink in g that
    the template (dilated by 3 px) does not cover, since curves run into the
    symbols."""
    n = tpl.sum()
    if n == 0:
        return 0.0
    gd = dilate(g, 2)
    td0 = dilate(tpl, 3)
    gs = max(1, g.sum())
    best = -1.0
    for dy in range(-shift, shift + 1):
        for dx in range(-shift, shift + 1):
            t = np.roll(np.roll(tpl, dy, axis=0), dx, axis=1)
            td = np.roll(np.roll(td0, dy, axis=0), dx, axis=1)
            sc = (t & gd).sum() / n - 0.3 * (g & ~td).sum() / gs
            best = max(best, sc)
    return float(best)
