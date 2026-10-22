"""Calibrate a graph from its gridlines (items 3 to 5 of round 7).

usage: python3 -I grid_calib.py NAME PAGE.png OUT_calib.json

NAME selects a configuration below: the data value and approximate pixel
position (from rm_probe.py darkness projections) of every gridline, the box
sampled and boxes excluded (legends, lettering). Each gridline is then
followed and sampled on its own and every intersection is found from local
straight-line fits (localgrid.py, rm_calib.follow). Values must be listed in
ascending order. The page is box-filtered 3 x 3 first, which removes the
halftone dither of some scans without moving line centres.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image, ImageFilter  # noqa: E402
import localgrid  # noqa: E402
import rm_calib  # noqa: E402

Image.MAX_IMAGE_PIXELS = None

CONFIG = {
    # R&M 3348 fig. 30a (PDF p. 68): M_0 0.7..1.2 every 0.1; p_b/p_0 0.3 (top) .. 1.0 every 0.1
    "r3348f30a": dict(
        vvals=[round(0.7 + 0.1 * k, 1) for k in range(6)],
        vpos=[232.0, 350.0, 465.0, 582.9, 700.2, 818.0],
        hvals=[round(0.3 + 0.1 * j, 1) for j in range(8)],
        hpos=[935.0, 1052.0, 1171.0, 1289.0, 1408.0, 1524.5, 1641.9, 1758.5],
        box=(234, 816, 937, 1757), exclude=[], half=150),
    # R&M 3348 fig. 30b: M_0 cos(phi) 0.4..1.2 every 0.1; p_b/p_0 0.3 .. 1.0 every 0.1
    "r3348f30b": dict(
        vvals=[round(0.4 + 0.1 * k, 1) for k in range(9)],
        vpos=[933.0, 1050.9, 1167.0, 1283.0, 1399.2, 1517.9, 1634.1, 1751.0, 1867.8],
        hvals=[round(0.3 + 0.1 * j, 1) for j in range(8)],
        hpos=[938.5, 1056.0, 1173.0, 1290.0, 1407.0, 1530.9, 1647.9, 1765.2],
        box=(935, 1866, 940, 1764),
        exclude=[(936, 1355, 942, 1095), (936, 1250, 1095, 1390), (1365, 1866, 1400, 1580)], half=150),
}


def main():
    name, page, out = sys.argv[1:4]
    cfg = CONFIG[name]
    im = Image.open(page).convert("L").filter(ImageFilter.BoxBlur(1))
    d = 255.0 - np.asarray(im).astype(float)
    bx0, bx1, by0, by1 = cfg["box"]
    ymid = 0.5 * (by0 + by1)
    xmid = 0.5 * (bx0 + bx1)
    vs, hs = [], []

    def seeded(orient, pos_ref, seeds, lo, hi):
        """Follow from several seeds along the line (lines broken by the
        draftsman near curves are picked up again); union of samples. A
        skewed page (BRL 934) gives each line's position at a reference
        scan coordinate and a common slope."""
        allp = {}
        slope = cfg.get("vslope" if orient == "v" else "hslope", 0.0)
        ref = cfg.get("vref" if orient == "v" else "href", 0.0)
        for s in seeds:
            pos0 = pos_ref + slope * (s - ref)
            if orient == "v":
                band = d[int(s) - 30:int(s) + 30, int(pos0) - 12:int(pos0) + 13].mean(axis=0)
            else:
                band = d[int(pos0) - 12:int(pos0) + 13, int(s) - 30:int(s) + 30].mean(axis=1)
            p = int(pos0) - 12 + int(np.argmax(band))
            if band.max() < 40:
                continue
            for sc, v in rm_calib.follow(d, orient, float(p), int(s), lo, hi, cfg["exclude"], prior_slope=slope):
                allp.setdefault(round(sc, 1), v)
        out = np.array(sorted(allp.items())) if allp else np.zeros((0, 2))
        return out

    for x0 in cfg["vpos"]:
        seeds = [ymid, by0 + 120, by1 - 120] + cfg.get("vseeds", [])
        vs.append(seeded("v", x0, seeds, by0, by1))
    for y0 in cfg["hpos"]:
        seeds = [xmid, bx0 + 120, bx1 - 120] + cfg.get("hseeds", [])
        hs.append(seeded("h", y0, seeds, bx0, bx1))
    g = localgrid.LocalGrid(cfg["vvals"], cfg["hvals"], vs, hs, half=cfg.get("half", 200), gap=10)
    for vval, hlist in cfg.get("refit_v", []):
        k = int(np.argmin(np.abs(np.array(cfg["vvals"]) - vval)))
        bad = np.array([any(abs(hv - h) < 1e-9 for h in hlist) for hv in cfg["hvals"]])
        m = ~np.isnan(g.X[k]) & ~bad
        c = np.polyfit(g.Y[k][m], g.X[k][m], 2)
        for j in np.where(bad & ~np.isnan(g.X[k]))[0]:
            new = float(np.polyval(c, g.Y[k, j]))
            print("refit M-line %g at %g: x %.1f -> %.1f" % (vval, cfg["hvals"][j], g.X[k, j], new))
            g.X[k, j] = new
    rep = g.dump(out, extra=dict(page=os.path.basename(page), dpi=600, config=name))
    nan = np.isnan(g.X)
    print("intersections measured: %d of %d" % (g.X.size - int(nan.sum()), g.X.size))
    for k in range(len(cfg["vvals"])):
        if nan[k].any():
            print("  missing at x=%g: y=%s" % (cfg["vvals"][k], [cfg["hvals"][j] for j in np.where(nan[k])[0]]))
    gl = rep["global"]
    print("affine fit residual: x rms %.4f max %.4f ; y rms %.5f max %.5f" % (
        gl["affine_rms_x"], gl["affine_max_x"], gl["affine_rms_y"], gl["affine_max_y"]))
    print("projective fit residual: x rms %.4f max %.4f ; y rms %.5f max %.5f" % (
        gl["proj_rms_x"], gl["proj_max_x"], gl["proj_rms_y"], gl["proj_max_y"]))
    print("leave-one-out (px):", rep["leave_one_out_px"])
    print("intersection standard error (px):", rep["intersection_se_px"])
    for ln in rep["lines"]:
        if "slope" in ln:
            print("%s %8.3f n=%3d rej=%2d slope=%+.5f rms=%.2f max=%.2f rms_quad=%.2f" % (
                ln["orient"], ln["value"], ln["n"], ln["rejected"], ln["slope"], ln["rms_line"],
                ln["max_line"], ln["rms_quad"]))
        else:
            print(ln)


if __name__ == "__main__":
    main()
