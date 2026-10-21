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
    # NASA CR-149372 fig. 8b (PDF p. 26): theta 0..180 deg every 30, Cp -1.2..1.6 every 0.4
    "cr8b": dict(
        vvals=[0, 30, 60, 90, 120, 150, 180],
        vpos=[1650.6, 2097.5, 2555.8, 2998.2, 3435.6, 3876.5, 4331.8],
        hvals=[-1.2, -0.8, -0.4, 0.0, 0.4, 0.8, 1.2, 1.6],
        hpos=[5907.0, 5322.4, 4732.3, 4145.1, 3549.1, 2964.6, 2379.5, 1784.5],
        box=(1655, 4327, 1789, 5902),
        exclude=[(3010, 4340, 1790, 2670)], half=320),
    # NACA TN 3861 fig. 15 (PDF p. 31, landscape): Mc 0..9 every 0.5, ordinate 0..3.0 every 0.25
    "t3861f15": dict(
        vvals=[0.5 * k for k in range(19)],
        vpos=[1080.7 + 236.25 * k for k in range(19)],
        hvals=[0.25 * j for j in range(13)],
        hpos=[3398.1 - 237.5 * j for j in range(13)],
        box=(1085, 5332, 565, 3394),
        exclude=[(1800, 5380, 565, 1250)], half=200),
    # NACA TN 3861 fig. 16 (PDF p. 32, landscape): Mc 0..8 every 0.5, ordinate -0.9..0.4 every 0.1
    "t3861f16": dict(
        vvals=[0.5 * k for k in range(17)],
        vpos=[1561.0 + 229.66 * k for k in range(17)],
        hvals=[round(-0.9 + 0.1 * j, 2) for j in range(14)],
        hpos=[3665.6 - 231.33 * j for j in range(14)],
        box=(1565, 5231, 662, 3661),
        exclude=[(3640, 5240, 2490, 3290)], half=200),
    # BRL Report 934 Graph I (PDF p. 24 rotated clockwise): graph paper with heavy rulings every
    # 0.05 in M and every 0.025 in C_D (labels 1.0, 1.4, ... every 8th vertical ruling, 0.3, 0.4, ...
    # every 4th horizontal ruling). The page is sheared: vertical rulings lean by dx/dy = -0.012,
    # horizontal rulings by dy/dx = +0.020, so positions are given at a reference coordinate.
    "brl934": dict(
        vvals=[round(0.95 + 0.05 * k, 2) for k in range(36)],
        vpos=[1267.0, 1363.9, 1459.2, 1556.3, 1650.1, 1745.4, 1842.5, 1937.6, 2034.7, 2130.5, 2227.5,
              2323.1, 2420.0, 2514.7, 2610.4, 2707.3, 2802.5, 2899.4, 2995.7, 3092.4, 3188.9, 3284.4,
              3382.0, 3478.9, 3574.5, 3670.1, 3767.5, 3862.2, 3960.1, 4054.6, 4151.3, 4246.9, 4343.2,
              4438.5, 4536.9, 4629.3],
        vref=3550.0, vslope=-0.012,
        hvals=[round(0.3 + 0.025 * j, 3) for j in range(27)],
        hpos=[3737.5 - 95.9 * j for j in range(27)],
        href=3240.0, hslope=0.0203,
        box=(1262, 4635, 1180, 3790),
        exclude=[(2300, 3760, 740, 1235), (2740, 4980, 1745, 2255)], half=200,
        # the M 1.25 ruling is broken (dashed in the scan) at C_D 0.60 to 0.75 and the D symbols (M 1.26)
        # touch it; its intersections there sat up to 4.8 px off the ruling's own quadratic and are
        # replaced by that quadratic, fitted to the ruling's other intersections
        refit_v=[(1.25, [0.6, 0.625, 0.65, 0.675, 0.7, 0.725, 0.75])]),
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
