"""Calibrate a plot that has axes with tick marks but no grid.

usage: python3 -I tick_calib.py NAME PAGE.png OUT_calib.json

NAME selects a configuration below:
  xaxis  (y0, x_from, x_to)  approximate row of the x axis and its extent
  yaxis  (x0, y_from, y_to)  approximate column of the y axis and its extent
  xticks [(value, approx_x), ...] ticks on the x axis; xtick_side +1 if the
         marks rise from the axis into the plot (rows above it), -1 below
  yticks [(value, approx_y), ...] ticks on the y axis; ytick_side +1 if the
         marks point right of the axis into the plot, -1 left
  tick_len  how far the marks reach from the axis line (px)

Each axis line is sampled along its length (ink centroid across it, ink =
gray < 128) and fitted with a straight line, which gives its tilt. Each
tick is located by the ink centroid of the mark between 3 px and tick_len
px from the axis, within +-6 px of the approximate position, measured
along the axis direction. Data value against tick position is fitted with
a straight line per axis; its residuals and leave-one-out errors are the
quality reported.

The calibration is written in the LocalGrid format (localgrid.py): virtual
lines through the ticks, parallel to the other axis, with intersections
computed analytically. Only the two axes are real ink lines, and they are
listed in "mask_lines" so that symbol and curve masks use only them.
"""
import json
import sys

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

CONFIG = {
    # R&M 3427 fig. 9 (PDF p. 36): u* 0..1.0 ticks every 0.2 (rising from the axis); y (inches) 0, 0.05, 0.10
    # (marks pointing right from the axis)
    "r3427f9": dict(xaxis=(724.7, 975, 1470), yaxis=(969.8, 260, 720),
                    xticks=[(0.2, 1072), (0.4, 1172), (0.6, 1272), (0.8, 1372), (1.0, 1474)], xtick_side=1,
                    yticks=[(0.05, 528), (0.10, 330)], ytick_side=1, tick_len=14,
                    origin=(0.0, 0.0)),
    # R&M 3427 fig. 10 (PDF p. 36): M_inf ticks at 0.5 and 1.0 (rising); delta/h ticks at 0.1 and 0.2
    # (pointing right)
    "r3427f10": dict(xaxis=(1714.5, 980, 1590), yaxis=(971.6, 1210, 1705),
                     xticks=[(0.5, 1223), (1.0, 1474)], xtick_side=1,
                     yticks=[(0.1, 1517), (0.2, 1318)], ytick_side=1, tick_len=14,
                     origin=(0.0, 0.0)),
    # R&M 3427 fig. 15 (PDF p. 39): spanwise distance -4 (at the Cp axis) .. 3 in. every 1 (rising ticks);
    # Cp_b 0 (at the x axis) .. -1.0 every 0.2 (ticks pointing right)
    "r3427f15": dict(xaxis=(1202.5, 926, 1615), yaxis=(921.5, 690, 1198),
                     xticks=[(-3.0, 1021), (-2.0, 1121), (-1.0, 1221), (0.0, 1321), (1.0, 1420), (2.0, 1520),
                             (3.0, 1618)], xtick_side=1,
                     yticks=[(-0.2, 1102), (-0.4, 1002), (-0.6, 902), (-0.8, 802), (-1.0, 702)], ytick_side=1,
                     tick_len=14, origin=(-4.0, 0.0)),
    # Round 11. R&M 3427 fig. 39 (PDF p. 56, a 300 dpi grey JPEG page): x/h ticks at -2 and -1 rising from
    # the x axis, the Cp axis standing at x/h = 0; Cp ticks every 0.2 to -1.0 pointing right of the Cp axis
    # (the ticks are the marks left of the Cp axis, 10 px long; the dashes right of the axis are the minus
    # signs of the labels and are not used)
    "r3427f39": dict(xaxis=(1546.5, 1960, 2570), yaxis=(2575.5, 520, 1540),
                     xticks=[(-2.0, 2075.5), (-1.0, 2324.0)], xtick_side=1,
                     yticks=[(-0.2, 1345), (-0.4, 1142), (-0.6, 939), (-0.8, 739), (-1.0, 534)], ytick_side=-1,
                     tick_len=10, origin=(0.0, 0.0)),
    # Round 11. NACA RM A51J25 fig. 7 (PDF p. 14, 300 dpi CCITT): M' ticks at 2, 3 and 4 rising from the
    # x axis, which starts at M' = 1 on the p_b/p' axis; p_b/p' ticks every 0.2 to 1.0 pointing right
    "a51j25f7": dict(xaxis=(1256.5, 690, 1480), yaxis=(670.5, 610, 1245),
                     xticks=[(2.0, 942.6), (3.0, 1215.9), (4.0, 1489.2)], xtick_side=1,
                     yticks=[(0.2, 1126.5), (0.4, 994.5), (0.6, 862.5), (0.8, 731.6), (1.0, 598.5)], ytick_side=1,
                     tick_len=12, origin=(1.0, 0.0)),
}


def centroid_across(ink, orient, pos, s, half=6):
    """Centroid of ink across a line at along-coordinate s, near pos."""
    if orient == "h":  # horizontal line: sample a column at x = s
        a = int(round(pos)) - half
        col = ink[a:a + 2 * half + 1, int(s)]
        if col.sum() == 0:
            return None
        return a + (np.arange(len(col)) * col).sum() / col.sum()
    a = int(round(pos)) - half
    row = ink[int(s), a:a + 2 * half + 1]
    if row.sum() == 0:
        return None
    return a + (np.arange(len(row)) * row).sum() / row.sum()


def fit_axis(ink, orient, pos, s0, s1, avoid):
    ss, vs = [], []
    for s in range(int(s0), int(s1), 3):
        if any(abs(s - a) < 8 for a in avoid):
            continue
        c = centroid_across(ink, orient, pos, s)
        if c is not None:
            ss.append(s)
            vs.append(c)
    ss, vs = np.array(ss, float), np.array(vs, float)
    c = np.polyfit(ss, vs, 1)
    for _ in range(3):
        r = vs - np.polyval(c, ss)
        k = np.abs(r) < max(1.0, 2.5 * np.std(r))
        c = np.polyfit(ss[k], vs[k], 1)
    r = vs[k] - np.polyval(c, ss[k])
    return c, float(np.sqrt(np.mean(r ** 2))), int(k.sum())


def tick_pos(ink, axis_c, orient, approx, side, L):
    """Centroid (along the axis) of a tick mark that leaves the axis."""
    vals, wts = [], []
    for d in range(3, L + 1):
        if orient == "x":  # x axis horizontal, mark vertical; rows above (side +1) or below
            y = int(round(np.polyval(axis_c, approx))) - side * d
            a = int(round(approx)) - 6
            seg = ink[y, a:a + 13]
        else:
            x = int(round(np.polyval(axis_c, approx))) + side * d
            a = int(round(approx)) - 6
            seg = ink[a:a + 13, x]
        if seg.sum() > 0:
            vals.append(a + (np.arange(13) * seg).sum() / seg.sum())
            wts.append(seg.sum())
    return float(np.average(vals, weights=wts)), len(vals)


def lin_quality(vals, pos):
    vals, pos = np.array(vals, float), np.array(pos, float)
    c = np.polyfit(vals, pos, 1)
    res = pos - np.polyval(c, vals)
    loo = []
    for i in range(len(vals)):
        m = np.arange(len(vals)) != i
        if m.sum() >= 2:
            ci = np.polyfit(vals[m], pos[m], 1)
            loo.append(pos[i] - np.polyval(ci, vals[i]))
    return c, res, np.array(loo)


def main():
    name, page, out = sys.argv[1:4]
    cfg = CONFIG[name]
    ink = (np.asarray(Image.open(page).convert("L")) < 128).astype(float)
    y0, xa, xb = cfg["xaxis"]
    x0, ya, yb = cfg["yaxis"]
    L = cfg["tick_len"]
    xax, xrms, xn = fit_axis(ink, "h", y0, xa, xb, [t[1] for t in cfg["xticks"]])
    yax, yrms, yn = fit_axis(ink, "v", x0, ya, yb, [t[1] for t in cfg["yticks"]])
    print("x axis: y = %.5f x + %.2f (rms %.2f px, n %d)" % (xax[0], xax[1], xrms, xn))
    print("y axis: x = %.5f y + %.2f (rms %.2f px, n %d)" % (yax[0], yax[1], yrms, yn))
    # origin = intersection of the two axes
    yo = y0
    for _ in range(10):
        xo = np.polyval(yax, yo)
        yo = np.polyval(xax, xo)
    xt = [(cfg["origin"][0], xo)]
    for v, a in cfg["xticks"]:
        p, n = tick_pos(ink, xax, "x", a, cfg["xtick_side"], L)
        xt.append((v, p))
        print("x tick %g at x %.2f (%d rows)" % (v, p, n))
    yt = [(cfg["origin"][1], yo)]
    for v, a in cfg["yticks"]:
        p, n = tick_pos(ink, yax, "y", a, cfg["ytick_side"], L)
        yt.append((v, p))
        print("y tick %g at y %.2f (%d columns)" % (v, p, n))
    cx, rx, lx = lin_quality([t[0] for t in xt], [t[1] for t in xt])
    cy, ry, ly = lin_quality([t[0] for t in yt], [t[1] for t in yt])
    print("x ticks: %.2f px per unit, residual rms %.2f px, leave-one-out rms %.2f px" %
          (cx[0], np.sqrt(np.mean(rx ** 2)), np.sqrt(np.mean(lx ** 2))))
    print("y ticks: %.2f px per unit, residual rms %.2f px, leave-one-out rms %.2f px" %
          (cy[0], np.sqrt(np.mean(ry ** 2)), np.sqrt(np.mean(ly ** 2))))
    # virtual grid: vertical lines through the x ticks parallel to the y axis, horizontal lines through
    # the y ticks parallel to the x axis
    vvals = [t[0] for t in xt]
    hvals = [t[0] for t in yt]
    ordx = np.argsort(vvals)
    ordy = np.argsort(hvals)
    vvals = [vvals[i] for i in ordx]
    hvals = [hvals[i] for i in ordy]
    xpos = [xt[i][1] for i in ordx]
    ypos = [yt[i][1] for i in ordy]
    X = np.zeros((len(vvals), len(hvals)))
    Y = np.zeros_like(X)
    for k, xp in enumerate(xpos):
        for j, yp in enumerate(ypos):
            # line through (xp, x-axis) parallel to the y axis: x = xp + yax[0] (y - y_axis(xp))
            yb_ = np.polyval(xax, xp)
            # line through (y-axis(yp), yp) parallel to the x axis: y = yp + xax[0] (x - x_axis(yp))
            xb_ = np.polyval(yax, yp)
            y = yp
            for _ in range(20):
                x = xp + yax[0] * (y - yb_)
                y = yp + xax[0] * (x - xb_)
            X[k, j], Y[k, j] = x, y
    m = np.ones(X.shape, bool)
    kk, jj = np.where(m)
    A = np.c_[np.ones(m.sum()), X[m], Y[m]]
    V = np.array(vvals)[kk]
    H = np.array(hvals)[jj]
    cV, *_ = np.linalg.lstsq(A, V, rcond=None)
    cH, *_ = np.linalg.lstsq(A, H, rcond=None)
    rep = dict(
        method="tick_calib", page=page.split("/")[-1], dpi=300, config=name,
        axes=dict(x_axis=dict(slope=float(xax[0]), intercept=float(xax[1]), rms_px=xrms, n=xn),
                  y_axis=dict(slope=float(yax[0]), intercept=float(yax[1]), rms_px=yrms, n=yn)),
        ticks=dict(x=[dict(value=v, px=float(p)) for v, p in xt], y=[dict(value=v, px=float(p)) for v, p in yt],
                   x_px_per_unit=float(cx[0]), y_px_per_unit=float(cy[0]),
                   x_residual_rms_px=float(np.sqrt(np.mean(rx ** 2))),
                   y_residual_rms_px=float(np.sqrt(np.mean(ry ** 2)))),
        global_=None,
        leave_one_out_px=dict(n=int(len(lx) + len(ly)), rms_x=float(np.sqrt(np.mean(lx ** 2))),
                              rms_y=float(np.sqrt(np.mean(ly ** 2))), max_x=float(np.abs(lx).max()),
                              max_y=float(np.abs(ly).max())),
        vvals=vvals, hvals=hvals, X=X.tolist(), Y=Y.tolist(),
        mask_lines=[["v", int(np.argmin(np.abs(np.array(vvals) - cfg["origin"][0])))],
                    ["h", int(np.argmin(np.abs(np.array(hvals) - cfg["origin"][1])))]])
    rep["global"] = dict(affine_x=cV.tolist(), affine_y=cH.tolist())
    del rep["global_"]
    json.dump(rep, open(out, "w"), indent=1)
    print("wrote", out)


if __name__ == "__main__":
    main()
