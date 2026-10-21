"""Nose calls and values for NACA RM L52J21a fig. 8 (PDF p. 28), lower right
panel (finned body, cylindrical and conical bases, R = 8.06 x 10^6).

usage: python3 -I rm8_symbols.py PAGE.png CALIB.json OUT.json

Legend: circle = conical nose, square = ogive nose, diamond = radome nose
("Flagged symbols denote fixed transition"; no flagged symbol in this panel).
Symbol sizes measured on isolated symbols of the same figure (lower left
panel, M 1.62, pixel maps): circle outer diameter 46 to 48 px, diamond
vertex to vertex 56 to 61 px, square side 43 px, stroke 4 to 5 px, each
with a centre dot.

Centres were read from pixel maps (pixmap.py) of each stack: for squares
the outer edges (or the centre dot where it is clear), for circles the
outer top and bottom of the arc and the free side, for diamonds the free
vertices (the bottom vertex from the crossing of the two lower edges, fitted
as straight lines). Reading error e (px, about 2 sigma) per symbol.

Shape evidence: for each read centre, the support of each legend shape is
the fraction of points along that shape's centre line (circle radius
21.5 px, square half side 19.5 px, diamond half diagonal 27 px, one point per
px of outline) that have ink (gray < 128) within 1 px; it is maximised over
+-2 px about the centre. In a stack, other outlines and gridlines also give
support, so the score is read together with which parts of the outline are
free.

Because overlapping outlines and gridlines feed every shape's support, the
key points that only one shape inks are also checked at the read centre
(ink within 1 px): square corners (+-19.5, +-19.5), diamond vertices (0, +-27)
and (+-27, 0), circle 45-degree points (+-15.2, +-15.2). They are listed in
the order top-left, top-right, bottom-right, bottom-left (square, circle) and
top, right, bottom, left (diamond); a point another symbol of the stack also
covers says nothing.

Value error (about 2 sigma): sqrt(e^2 + 0.8^2) px (0.8 = 2 x 0.4 px
calibration leave-one-out) times the local scale.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
import localgrid  # noqa: E402

Image.MAX_IMAGE_PIXELS = None
NOSE = {"circle": "conical nose", "square": "ogive nose", "diamond": "radome nose"}

# id, base, M group, call, x, y, e (px), confidence, how centre read, features / what would change the call
SYMBOLS = [
    ("CY241-sq", "cylindrical", "M 2.41", "square", 3261.5, 4563.0, 2.0, "high",
     "outer edges x 3240-3283, y 4541-4585",
     "top edge and both upper corners free, straight sides; top of the 3-symbol stack. A different call would "
     "need the straight top edge and corners to belong to another symbol, and no other symbol reaches that high"),
    ("CY241-ci", "cylindrical", "M 2.41", "circle", 3262.0, 4582.5, 3.0, "high",
     "outer top of arc 4559, outer bottom 4606, right side 3287",
     "round top arc rising inside the square and round bottom arc below the square's bottom edge, with a white "
     "oval interior (3255-3273, 4583-4602); middle of the stack. Its left side is hidden under the square's "
     "left side and the M 2.4 gridline"),
    ("CY241-di", "cylindrical", "M 2.41", "diamond", 3261.5, 4604.5, 3.0, "high",
     "vertices: left 3236/4603, right 3288/4606, bottom 3260.5/4632 (crossing of the lower edges)",
     "straight lower edges meeting in a pointed bottom vertex below everything else, side vertices outside "
     "the circle; bottom of the stack. Upper half hidden in the circle and square"),
    ("CO241-sq", "conical", "M 2.41", "square", 3257.5, 4877.5, 1.5, "high",
     "centre dot (outline centre 3257, 4875)",
     "complete square with a centre dot, clear of the other two; top of the stack"),
    ("CO241-ci", "conical", "M 2.41", "circle", 3255.0, 4915.0, 6.0, "medium",
     "outer top of arc 4893 (centre line 4895.5, arc centred near x 3256), right side 3272-3280 from y 4900 "
     "to 4920 (the overlay shows the r 21.5 circle a little outside it, so x is set between the two); interior "
     "white 3248-3270, 4908-4923",
     "round top arc and a vertical right side (a diamond edge there would be diagonal, and that diagonal is "
     "seen separately) between the square and the diamond's side vertices; "
     "its lower half lies on the P_B = -0.06 gridline and inside the diamond, so the centre is less sure. If "
     "the arc belonged to the diamond the top would be pointed, which it is not"),
    ("CO241-di", "conical", "M 2.41", "diamond", 3256.0, 4925.0, 3.0, "high",
     "vertices: top 3255/4898, left 3232/4927, right 3280-3284/4925, bottom 3255/4952",
     "pointed bottom vertex and side vertices on the -0.06 gridline; bottom of the stack"),
    ("CY162-ci", "cylindrical", "M 1.62", "circle", 2289.0, 4363.5, 3.0, "medium",
     "outer top 4341 (wide flat arc 2275-2309), outer bottom 4386 (flat band 2275-2307), sides 2265/2313",
     "a wide round top and a flat round bottom that a diamond's pointed vertices cannot give; superposed on "
     "the diamond CY162-di"),
    ("CY162-di", "cylindrical", "M 1.62", "diamond", 2289.0, 4367.5, 3.0, "high",
     "vertices: top 2288/4338, bottom 2289/4397, left 2261/4367, right 2318/4365",
     "pointed top and bottom vertices above and below the circle; superposed on CY162-ci; one centre dot at "
     "(2291.5, 4367.5) serves both"),
]


STACKS = [
    ("cylindrical base, M 2.41", 3262.0, 4541.0, 4634.0),
    ("conical base, M 2.41", 3256.0, 4854.0, 4955.0),
    ("cylindrical base, M 1.62 (lower)", 2289.0, 4338.0, 4398.0),
]


def outline(shape):
    t = np.linspace(0, 1, 200, endpoint=False)
    if shape == "circle":
        r = 21.5
        n = int(2 * np.pi * r)
        a = np.linspace(0, 2 * np.pi, n, endpoint=False)
        return np.c_[r * np.cos(a), r * np.sin(a)]
    if shape == "square":
        h = 19.5
        n = int(8 * h)
        s = np.linspace(-h, h, n // 4, endpoint=False)
        return np.r_[np.c_[s, -h + 0 * s], np.c_[h + 0 * s, s], np.c_[-s, h + 0 * s], np.c_[-h + 0 * s, -s]]
    h = 27.0
    v = np.array([[0, -h], [h, 0], [0, h], [-h, 0], [0, -h]])
    pts = []
    for p, q in zip(v[:-1], v[1:]):
        m = int(np.hypot(*(q - p)))
        s = np.linspace(0, 1, m, endpoint=False)[:, None]
        pts.append(p + s * (q - p))
    del t
    return np.vstack(pts)


def support(ink, cx, cy, shape):
    pts = outline(shape)
    best = (0.0, cx, cy)
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            hit = 0
            for px, py in pts:
                x, y = int(round(cx + dx + px)), int(round(cy + dy + py))
                if ink[y - 1:y + 2, x - 1:x + 2].any():
                    hit += 1
            f = hit / len(pts)
            if f > best[0]:
                best = (f, cx + dx, cy + dy)
    return best


KEYS = {
    "square": [(-19.5, -19.5), (19.5, -19.5), (19.5, 19.5), (-19.5, 19.5)],
    "diamond": [(0, -27), (27, 0), (0, 27), (-27, 0)],
    "circle": [(-15.2, -15.2), (15.2, -15.2), (15.2, 15.2), (-15.2, 15.2)],
}


def keypoints(ink, cx, cy, shape):
    out = ""
    for px, py in KEYS[shape]:
        x, y = int(round(cx + px)), int(round(cy + py))
        out += "1" if ink[y - 1:y + 2, x - 1:x + 2].any() else "0"
    return out


def main():
    page, calib, out = sys.argv[1:4]
    g = localgrid.LocalGrid.load(calib)
    ink = np.asarray(Image.open(page).convert("L")) < 128
    res = []
    for sid, base, grp, call, x, y, e, conf, how, feat in SYMBOLS:
        M, P = g.to_data(x, y)
        dMx = abs(g.to_data(x + 10, y)[0] - M) / 10
        dPy = abs(g.to_data(x, y + 10)[1] - P) / 10
        ee = float(np.hypot(e, 0.8))
        sup = {s: support(ink, x, y, s) for s in ("circle", "square", "diamond")}
        rec = dict(id=sid, base=base, group=grp, symbol=call, nose=NOSE[call], confidence=conf,
                   centre_px=(x, y), centre_err_px=e, M=M, P_B=P, err_M=ee * dMx, err_P_B=ee * dPy,
                   centre_from=how, features=feat,
                   support={s: round(v[0], 3) for s, v in sup.items()},
                   keypoints={s: keypoints(ink, x, y, s) for s in ("circle", "square", "diamond")},
                   support_centre={s: (v[1], v[2]) for s, v in sup.items()})
        res.append(rec)
        print("%-9s %-11s %-6s %-7s M %.4f +- %.4f  P_B %.4f +- %.4f  support %s  keys %s" % (
            sid, base, grp, call, M, rec["err_M"], P, rec["err_P_B"],
            " ".join("%s=%.2f" % (s[:3], v) for s, v in rec["support"].items()),
            " ".join("%s=%s" % (s[:3], v) for s, v in rec["keypoints"].items())))
    # stacks: outer ink extent (top edge of the highest outline, bottom of the lowest) at the stack's x
    stacks = []
    for name, x, ytop, ybot in STACKS:
        top, bot = g.to_data(x, ytop)[1], g.to_data(x, ybot)[1]
        stacks.append(dict(stack=name, x_px=x, top_px=ytop, bottom_px=ybot, P_B_top_edge=top, P_B_bottom_edge=bot))
        print("stack %-28s ink from P_B %.4f (top edge) to %.4f (bottom edge)" % (name, top, bot))
    with open(out, "w") as f:
        json.dump(dict(symbols=res, stacks=stacks), f, indent=1)


if __name__ == "__main__":
    main()
