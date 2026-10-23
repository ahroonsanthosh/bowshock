"""Calibrate panel (d) of NACA RM L52J21a figs. 31, 32 or 33 from its gridlines.

usage: python3 -I rm_calib.py FIG PAGE.png OUT_calib.json
FIG is 31, 32 or 33. Pages rendered at 600 dpi from PDF pp. 58, 59, 60.

Nominal gridline positions came from rm_probe.py (darkness projections over
the panel). Every gridline is then followed and sampled on its own and every
intersection is located from local straight-line fits (localgrid.py). The
x axis is R in millions, the y axis is P_B.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
import localgrid  # noqa: E402

Image.MAX_IMAGE_PIXELS = None

# per figure: R lines (first value, step, count, x of first, px per step),
# P lines (first value, step, count, y of first, px per step), sampling box,
# exclusion boxes (x0, x1, y0, y1)
CONFIG = {
    31: dict(R=(0.0, 1.0, 12, 2164.3, 133.1), P=(-0.20, 0.02, 11, 3275.4, 133.1),
             box=(2168, 3752, 3280, 4602), exclude=[(3150, 3640, 4400, 4540)]),
    32: dict(R=(0.0, 1.0, 12, 2496.1, 136.1), P=(-0.22, 0.02, 12, 3099.5, 137.3),
             box=(2500, 3989, 3104, 4602), exclude=[(3340, 3880, 4370, 4540)]),
    33: dict(R=(0.0, 1.0, 12, 2158.5, 133.2), P=(-0.16, 0.02, 11, 3224.3, 132.9),
             box=(2162, 3745, 3228, 4549), exclude=[(3170, 3700, 4300, 4470)]),
}


def follow(d, orient, seed_pos, seed_s, s_lo, s_hi, exclude, prior_slope=0.0, step=16, win=7):
    pts = []
    for direction in (+1, -1):
        hist = [(seed_s, seed_pos)]
        s = seed_s if direction > 0 else seed_s - step
        while s_lo <= s <= s_hi - step:
            sc_next = s + step / 2.0
            h = np.array(hist[-30:])
            span = h[:, 0].max() - h[:, 0].min()
            if len(h) >= 8 and span > 200:
                c = np.polyfit(h[:, 0], h[:, 1], 1)
                pred = float(np.polyval(c, sc_next))
            else:
                pred = float(h[-1, 1] + prior_slope * (sc_next - h[-1, 0]))
            gap = abs(sc_next - h[-1, 0])
            tol = 2.5 if gap < 80 else 4.0
            a = localgrid.sample_line(d, orient, pred, s, s + step, strip=step, step=step,
                                      win=win, exclude=exclude, track=False)
            if len(a):
                sc, pos = a[0]
                if abs(pos - pred) < tol:
                    pts.append((sc, pos))
                    hist.append((sc, pos))
            s += direction * step
    pts.sort()
    return np.array(pts) if pts else np.zeros((0, 2))


def main():
    fig, page, out = int(sys.argv[1]), sys.argv[2], sys.argv[3]
    cfg = CONFIG[fig]
    d = 255.0 - np.asarray(Image.open(page).convert("L")).astype(float)
    bx0, bx1, by0, by1 = cfg["box"]
    r0, rs, rn, rx0, rpx = cfg["R"]
    p0, ps, pn, py0, ppx = cfg["P"]
    vvals = [round(r0 + rs * k, 4) for k in range(rn)]
    hvals = [round(p0 + ps * j, 4) for j in range(pn)]
    ymid = 0.5 * (by0 + by1)
    xmid = 0.5 * (bx0 + bx1)
    band = d[int(ymid) - 40:int(ymid) + 40, :].mean(axis=0)
    hband = d[:, int(xmid) - 40:int(xmid) + 40].mean(axis=1)
    vs = []
    for k in range(rn):
        x0 = rx0 + rpx * k
        a, b = int(x0) - 12, int(x0) + 13
        xs = a + int(np.argmax(band[a:b]))
        vs.append(follow(d, "v", float(xs), int(ymid), by0, by1, cfg["exclude"]))
    hs = []
    for j in range(pn):
        y0 = py0 + ppx * j
        a, b = int(y0) - 12, int(y0) + 13
        ys = a + int(np.argmax(hband[a:b]))
        hs.append(follow(d, "h", float(ys), int(xmid), bx0, bx1, cfg["exclude"]))
    g = localgrid.LocalGrid(vvals, hvals, vs, hs, half=150, gap=10)
    hv_sorted = sorted(range(pn), key=lambda j: hvals[j])
    if hvals != sorted(hvals):
        raise SystemExit("P values must be ascending")
    rep = g.dump(out, extra=dict(page=os.path.basename(page), dpi=600, figure=fig,
                                 note="RM L52J21a fig. %d(d); x = R (millions), y = P_B" % fig))
    del hv_sorted
    nan = np.isnan(g.X)
    print("intersections measured: %d of %d" % (g.X.size - int(nan.sum()), g.X.size))
    for k in range(rn):
        if nan[k].any():
            print("  missing at R=%g: P=%s" % (vvals[k], [hvals[j] for j in np.where(nan[k])[0]]))
    gl = rep["global"]
    print("affine fit residual: R rms %.4f max %.4f ; P rms %.5f max %.5f" % (
        gl["affine_rms_x"], gl["affine_max_x"], gl["affine_rms_y"], gl["affine_max_y"]))
    print("projective fit residual: R rms %.4f max %.4f ; P rms %.5f max %.5f" % (
        gl["proj_rms_x"], gl["proj_max_x"], gl["proj_rms_y"], gl["proj_max_y"]))
    print("leave-one-out (px):", rep["leave_one_out_px"])
    print("intersection standard error (px):", rep["intersection_se_px"])
    for ln in rep["lines"]:
        if "slope" in ln:
            print("%s %6.2f n=%3d rej=%2d slope=%+.5f rms=%.2f max=%.2f rms_quad=%.2f" % (
                ln["orient"], ln["value"], ln["n"], ln["rejected"], ln["slope"], ln["rms_line"],
                ln["max_line"], ln["rms_quad"]))
        else:
            print(ln)


if __name__ == "__main__":
    main()
