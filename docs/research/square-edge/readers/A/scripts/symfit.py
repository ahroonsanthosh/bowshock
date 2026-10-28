"""Find the centre of one plotted symbol from its own strokes.

usage: python3 -I symfit.py IMG TYPE CX CY SIZE [SEARCH] [MASK...]

TYPE   disc     filled circle, SIZE = diameter (px)
       ring     open circle, SIZE = outer diameter
       square   open square, SIZE = side (outer)
       fsquare  filled square, SIZE = side
       diamond  open diamond (square on its corner), SIZE = corner-to-corner
CX CY  rough centre (native pixels) picked by eye
SEARCH half-width of the search box for the centre (px, default 5)
MASK   optional 'x0,y0,x1,y1' boxes (native px) whose pixels are ignored,
       e.g. where a neighbouring symbol overlaps

Method. The page is turned into darkness d = (local background - grey),
with the background taken as the 80th percentile in a 41 px box. A
template of the symbol's strokes (outline or filled area, 1.6 px stroke)
is moved over a 0.25 px lattice of centres and sizes SIZE-2..SIZE+2 px;
the score is the mean darkness on the template strokes minus the mean
darkness on a guard band 2 px outside them (so grid lines, which cross
both, cancel). The best centre is printed with a reading error: the
half-range of centres whose score is within 10 % of the best, combined
with 0.25 px lattice step.
"""
import sys
import numpy as np
from PIL import Image

img, typ = sys.argv[1], sys.argv[2]
cx, cy, size = float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
search = float(sys.argv[6]) if len(sys.argv) > 6 else 5.0
masks = [tuple(float(v) for v in m.split(",")) for m in sys.argv[7:]]

g = np.asarray(Image.open(img).convert("L")).astype(float)
R = int(search + size + 12)
x0, y0 = int(cx) - R, int(cy) - R
sub = g[y0:y0 + 2 * R + 1, x0:x0 + 2 * R + 1]
# local background
pad = 20
big = g[max(0, y0 - pad):y0 + 2 * R + 1 + pad, max(0, x0 - pad):x0 + 2 * R + 1 + pad]
bg = np.percentile(big, 80)
d = np.clip(bg - sub, 0, None)
H, W = d.shape
valid = np.ones_like(d, bool)
for (mx0, my0, mx1, my1) in masks:
    valid[max(0, int(my0) - y0):max(0, int(my1) - y0 + 1), max(0, int(mx0) - x0):max(0, int(mx1) - x0 + 1)] = False

def sample(px, py):
    """bilinear sample of darkness at arrays of points (sub coords)"""
    px = np.clip(px, 0, W - 1.001); py = np.clip(py, 0, H - 1.001)
    ix = px.astype(int); iy = py.astype(int); fx = px - ix; fy = py - iy
    v = (d[iy, ix] * (1 - fx) * (1 - fy) + d[iy, ix + 1] * fx * (1 - fy)
         + d[iy + 1, ix] * (1 - fx) * fy + d[iy + 1, ix + 1] * fx * fy)
    ok = valid[iy, ix] & valid[np.minimum(iy + 1, H - 1), np.minimum(ix + 1, W - 1)]
    return v, ok

def outline_pts(kind, s, inset):
    """points on the stroke centre line of the outline, offset inward/outward by inset"""
    n = 120
    t = np.linspace(0, 1, n, endpoint=False)
    if kind == "ring":
        r = s / 2 - 0.8 + inset
        a = 2 * np.pi * t
        return r * np.cos(a), r * np.sin(a)
    if kind == "square":
        h = s / 2 - 0.8 + inset
        u = (t * 4) % 1 * 2 - 1; side = (t * 4).astype(int)
        xs = np.where(side == 0, u * h, np.where(side == 1, h, np.where(side == 2, -u * h, -h)))
        ys = np.where(side == 0, -h, np.where(side == 1, u * h, np.where(side == 2, h, -u * h)))
        return xs, ys
    if kind == "diamond":
        h = s / 2 - 1.1 + inset * 1.41
        u = (t * 4) % 1; side = (t * 4).astype(int)
        corners = [(0, -h), (h, 0), (0, h), (-h, 0), (0, -h)]
        xs = np.empty(n); ys = np.empty(n)
        for k in range(4):
            m = side == k
            xs[m] = corners[k][0] + (corners[k + 1][0] - corners[k][0]) * u[m]
            ys[m] = corners[k][1] + (corners[k + 1][1] - corners[k][1]) * u[m]
        return xs, ys
    raise ValueError(kind)

def area_pts(kind, s, grow):
    """points filling the symbol area (grow < 0 shrinks) or a band outside it"""
    step = 0.7
    r = s / 2 + grow
    xs, ys = np.meshgrid(np.arange(-r, r + 1e-9, step), np.arange(-r, r + 1e-9, step))
    xs = xs.ravel(); ys = ys.ravel()
    if kind == "disc":
        m = xs ** 2 + ys ** 2 <= r * r
    else:
        m = np.ones_like(xs, bool)
    return xs[m], ys[m]

def score(px, py, s):
    if typ in ("ring", "square", "diamond"):
        on = [outline_pts(typ, s, dd) for dd in (-0.5, 0.0, 0.5)]
        offx = np.concatenate([o[0] for o in on]); offy = np.concatenate([o[1] for o in on])
        out = [outline_pts(typ, s, dd) for dd in (2.5, 3.0)]
        inn = [outline_pts(typ, s, dd) for dd in (-2.5,)] if s > 9 else []
        gx = np.concatenate([o[0] for o in out + inn]); gy = np.concatenate([o[1] for o in out + inn])
    else:
        kind = "disc" if typ == "disc" else "sq"
        offx, offy = area_pts(kind, s, -0.6)
        ax, ay = area_pts(kind, s, 3.0)
        bx, by = area_pts(kind, s, 1.0)
        if kind == "disc":
            m = ax ** 2 + ay ** 2 > (s / 2 + 1.0) ** 2
        else:
            m = (np.abs(ax) > s / 2 + 1.0) | (np.abs(ay) > s / 2 + 1.0)
        gx, gy = ax[m], ay[m]
    v1, ok1 = sample(px + offx, py + offy)
    v2, ok2 = sample(px + gx, py + gy)
    if ok1.sum() < 0.5 * len(v1) or ok2.sum() < 0.3 * len(v2):
        return -1e9
    return v1[ok1].mean() - v2[ok2].mean()

ccx, ccy = cx - x0, cy - y0
best = (-1e18, None)
grid = []
for s in np.arange(size - 2, size + 2.01, 0.5):
    for dy in np.arange(-search, search + 1e-9, 0.25):
        for dx in np.arange(-search, search + 1e-9, 0.25):
            sc = score(ccx + dx, ccy + dy, s)
            grid.append((sc, dx, dy, s))
            if sc > best[0]:
                best = (sc, (dx, dy, s))
sc, (bx, by, bs) = best
arr = np.array(grid)
near = arr[(arr[:, 3] == bs) & (arr[:, 0] >= sc * 0.9)]
ex = (near[:, 1].max() - near[:, 1].min()) / 2 + 0.25
ey = (near[:, 2].max() - near[:, 2].min()) / 2 + 0.25
edge = abs(bx) >= search - 0.01 or abs(by) >= search - 0.01
print(f"centre {cx + bx:.2f} {cy + by:.2f} size {bs:.1f} score {sc:.1f} err_x {ex:.2f} err_y {ey:.2f}{' AT_SEARCH_EDGE' if edge else ''}")
