"""Joint fit of two overlapping hollow symbols with an occlusion model (top symbol opaque).

usage: python3 -I pairfit.py PAGE TOP_SHAPE XT YT ST BOTTOM_SHAPE XB YB SB [SEARCH] [OUT.png]
Searches centres of both symbols within +-SEARCH px (sizes fixed), maximising
mean darkness on the visible outline minus mean darkness of the visible interior.
Prints best centres and score; also tries the opposite stacking order.
"""
import sys
import os
import itertools
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import symfit  # noqa: E402

THICK = 2.2


def masks(shape, cx, cy, s, X, Y):
    r = symfit.shape_dist(shape, X - cx, Y - cy, s)
    band = THICK / s
    outline = np.abs(r - 1.0) <= band / 2
    inside = r < 1.0 - band / 2
    interior = r <= 1.0 - band * 1.2
    return outline, inside, interior


def score(d, X, Y, top, bot):
    (st, xt, yt, sz_t), (sb, xb, yb, sz_b) = top, bot
    ot, it, int_t = masks(st, xt, yt, sz_t, X, Y)
    ob, ib, int_b = masks(sb, xb, yb, sz_b, X, Y)
    vis_ob = ob & ~it & ~ot
    outline = ot | vis_ob
    interior = (int_t | (int_b & ~it & ~ot)) & ~outline
    if outline.sum() < 5 or interior.sum() < 5:
        return -9
    return d[outline].mean() - d[interior].mean()


def fit(page, top, bot, search):
    _, d = symfit.load(page)
    xs = [top[1], bot[1]]
    ys = [top[2], bot[2]]
    R = 40
    x0, x1 = int(min(xs)) - R, int(max(xs)) + R
    y0, y1 = int(min(ys)) - R, int(max(ys)) + R
    sub = d[y0:y1, x0:x1]
    Y, X = np.mgrid[y0:y1, x0:x1].astype(np.float64)
    best = (-9, None, None)
    rng = range(-search, search + 1)
    for dxt, dyt, dxb, dyb in itertools.product(rng, rng, rng, rng):
        t = (top[0], top[1] + dxt, top[2] + dyt, top[3])
        b = (bot[0], bot[1] + dxb, bot[2] + dyb, bot[3])
        sc = score(sub, X, Y, t, b)
        if sc > best[0]:
            best = (sc, t, b)
    # half-pixel refinement
    sc0, t0, b0 = best
    steps = [-0.5, 0, 0.5]
    for dxt, dyt, dxb, dyb in itertools.product(steps, steps, steps, steps):
        t = (t0[0], t0[1] + dxt, t0[2] + dyt, t0[3])
        b = (b0[0], b0[1] + dxb, b0[2] + dyb, b0[3])
        sc = score(sub, X, Y, t, b)
        if sc > best[0]:
            best = (sc, t, b)
    return best


def main():
    page = int(sys.argv[1])
    top = (sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]))
    bot = (sys.argv[6], float(sys.argv[7]), float(sys.argv[8]), float(sys.argv[9]))
    search = int(sys.argv[10]) if len(sys.argv) > 10 else 4
    out = sys.argv[11] if len(sys.argv) > 11 else None
    b1 = fit(page, top, bot, search)
    b2 = fit(page, bot, top, search)
    print(f"order top={top[0]}: score={b1[0]:.3f} top=({b1[1][1]:.1f},{b1[1][2]:.1f}) bottom=({b1[2][1]:.1f},{b1[2][2]:.1f})")
    print(f"order top={bot[0]}: score={b2[0]:.3f} top=({b2[1][1]:.1f},{b2[1][2]:.1f}) bottom=({b2[2][1]:.1f},{b2[2][2]:.1f})")
    if out:
        best = b1 if b1[0] >= b2[0] else b2
        g, _ = symfit.load(page)
        cx = (best[1][1] + best[2][1]) / 2
        cy = (best[1][2] + best[2][2]) / 2
        h = 30
        X0, Y0 = int(cx) - h, int(cy) - h
        im = Image.fromarray(g[Y0:Y0 + 2 * h, X0:X0 + 2 * h].astype(np.uint8)).convert("RGB")
        sc = 8
        im = im.resize((im.width * sc, im.height * sc), Image.NEAREST)
        dr = ImageDraw.Draw(im)
        for sym, col in ((best[1], (255, 0, 0)), (best[2], (0, 160, 255))):
            pts = symfit.outline_points(sym[0], (sym[1] - X0 + 0.5) * sc, (sym[2] - Y0 + 0.5) * sc, sym[3] * sc)
            dr.polygon(pts, outline=col)
        im.save(out)


if __name__ == "__main__":
    main()
