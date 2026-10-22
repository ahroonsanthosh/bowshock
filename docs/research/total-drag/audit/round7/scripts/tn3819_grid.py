"""Fit every gridline of NACA TN 3819 fig. 18 (PDF p. 49 rendered at 600 dpi).

usage: python3 -I tn3819_grid.py PAGE.png OUT_grid.json
Nominal positions came from a first darkness-profile probe (probe.py): the
M = 1.0 border near x = 802 px with about 119.2 px per 0.2 in M, and P_B = 0
near y = 3613 px with about 120.1 px per 0.02 in P_B. Each line is then found
and fitted independently (gridfit.locate_line / robust_fit).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
import gridfit  # noqa: E402

Image.MAX_IMAGE_PIXELS = None


def main():
    page, out = sys.argv[1], sys.argv[2]
    d = 255.0 - np.asarray(Image.open(page).convert("L")).astype(float)
    g = gridfit.Grid()
    # vertical gridlines: M = 1.0 ... 8.6 every 0.2
    for k in range(0, 39):
        m = round(1.0 + 0.2 * k, 3)
        x0 = 802.5 + 119.2 * k
        smp = gridfit.locate_line(d, "v", x0, 615, 3608, strip=30, win=14)
        # refine with the median position found, then relocate tightly
        if len(smp) > 10:
            xm = float(np.median([p[1] for p in smp]))
            smp = gridfit.locate_line(d, "v", xm, 615, 3608, strip=30, win=8)
        rec = g.add("v", m, smp)
        print("V M=%.1f n=%d rej=%d x(y=600)=%.2f slope=%.6f rms=%.3f max=%.3f quad=%.2e rmsq=%.3f" % (
            m, rec["n"], rec["nrej"], np.polyval(rec["coef"], 600), rec["coef"][0], rec["rms"],
            rec["maxres"], rec["quad"], rec["rms_quad"]))
    # horizontal gridlines: P_B = 0 ... -0.50 every 0.02
    for k in range(0, 26):
        p = round(-0.02 * k, 3)
        y0 = 3613.0 - 120.1 * k
        smp = gridfit.locate_line(d, "h", y0, 807, 5327, strip=30, win=14)
        if len(smp) > 10:
            ym = float(np.median([q[1] for q in smp]))
            smp = gridfit.locate_line(d, "h", ym, 807, 5327, strip=30, win=8)
        rec = g.add("h", p, smp)
        print("H P=%.2f n=%d rej=%d y(x=800)=%.2f slope=%.6f rms=%.3f max=%.3f quad=%.2e rmsq=%.3f" % (
            p, rec["n"], rec["nrej"], np.polyval(rec["coef"], 800), rec["coef"][0], rec["rms"],
            rec["maxres"], rec["quad"], rec["rms_quad"]))
    g.sort()
    res = g.dump(out)
    gf = res["global_fit"]
    print("global fit over %d intersections" % gf["n_intersections"])
    print("affine: M rms %.5f max %.5f ; P rms %.6f max %.6f" % (
        gf["affine_rms_X"], gf["affine_max_X"], gf["affine_rms_Y"], gf["affine_max_Y"]))
    print("projective: M rms %.5f max %.5f ; P rms %.6f max %.6f" % (
        gf["proj_rms_X"], gf["proj_max_X"], gf["proj_rms_Y"], gf["proj_max_Y"]))
    # spacing of gridlines (px per cell) at mid-plot
    xs = [np.polyval(r["coef"], 2100) for r in g.v]
    ys = [np.polyval(r["coef"], 1500) for r in g.h]
    print("vertical spacing px:", np.round(np.diff(xs), 2).tolist())
    print("horizontal spacing px:", np.round(np.diff(ys), 2).tolist())


if __name__ == "__main__":
    main()
