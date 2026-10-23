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
    # Round 11. NASA TN 3548 fig. 6 (PDF p. 17, a 300 dpi colour JPEG, rotated 90 deg clockwise so that M runs
    # to the right; see method.md): M 0.6..1.8 every 0.05; Cp_b -0.9 (top) .. 0 every 0.05. The legend (upper
    # right, where the gridlines stop) and the NACA badge are excluded.
    "tn3548f6": dict(
        vvals=[round(0.6 + 0.05 * k, 2) for k in range(25)],
        vpos=[851.0, 906.1, 961.5, 1016.0, 1070.9, 1126.5, 1180.9, 1236.0, 1291.1, 1346.1, 1401.9, 1456.5,
              1510.5, 1566.0, 1621.5, 1676.4, 1731.5, 1787.5, 1843.0, 1897.5, 1953.5, 2008.4, 2062.5, 2118.5,
              2174.5],
        hvals=[round(-0.9 + 0.05 * j, 2) for j in range(19)],
        hpos=[526.5, 581.5, 637.5, 693.1, 748.9, 804.1, 860.1, 915.9, 971.5, 1027.4, 1082.5, 1137.6, 1193.2,
              1249.5, 1304.9, 1360.5, 1416.0, 1471.5, 1527.1],
        box=(853, 2172, 529, 1525),
        exclude=[(1680, 2180, 520, 870), (1905, 2145, 1435, 1510)], half=120),
    # R&M 3427 fig. 13 (PDF p. 37, 300 dpi CCITT): M 0..1.2 every 0.2; Cp 0 (bottom) .. -0.8 every 0.2 (the top
    # frame, about -0.9, is not labelled and is left out); lettering boxes excluded
    "r3427f13": dict(
        vvals=[round(0.2 * k, 1) for k in range(7)],
        vpos=[670.5, 867.5, 1066.5, 1264.5, 1463.5, 1663.1, 1862.5],
        hvals=[-0.8, -0.6, -0.4, -0.2, 0.0],
        hpos=[1653.1, 1849.6, 2046.0, 2244.6, 2446.5],
        box=(673, 1860, 1600, 2444),
        exclude=[(673, 1240, 1570, 1675), (673, 1060, 1720, 1775), (990, 1375, 1975, 2240), (673, 1010, 2075, 2175)],
        half=150),
    # NASA CR-149372 fig. 8a (PDF p. 25, native 300 dpi JBIG2 halftone): theta 0..180 every 30; Cp -1.6..1.2 every 0.4
    "cr8a": dict(
        vvals=[0, 30, 60, 90, 120, 150, 180],
        vpos=[803.3, 1032.1, 1246.5, 1474.0, 1694.5, 1920.5, 2132.5],
        hvals=[round(-1.6 + 0.4 * j, 1) for j in range(8)],
        hpos=[2855.8, 2556.4, 2262.6, 1964.9, 1679.0, 1377.6, 1080.0, 789.1],
        box=(806, 2130, 792, 2853), exclude=[(1580, 2130, 875, 1275), (1330, 2150, 1698, 1745)], half=160),
    # R&M 3348 fig. 32 (PDF p. 70): xi_0 -5..2 every 1; C~_cf -0.5..3.0 every 0.5
    "r3348f32": dict(
        vvals=[float(k) for k in range(-5, 3)],
        vpos=[428.5, 599.8, 773.0, 945.0, 1117.9, 1290.9, 1463.8, 1636.9], vref=1035.0, vslope=0.005,
        hvals=[round(-0.5 + 0.5 * j, 1) for j in range(8)],
        hpos=[1117.0, 1005.0, 893.0, 779.0, 665.0, 549.6, 435.0, 317.1],
        box=(431, 1634, 319, 1115),
        exclude=[(1110, 1285, 615, 660), (1290, 1570, 728, 822), (1300, 1570, 875, 975)], half=150),
    # R&M 3348 fig. 31b (PDF p. 69): M_0 cos(phi) 0.4..1.2 every 0.1; C_cf sec^2(phi) -0.02..0.03 every 0.01
    "r3348f31b": dict(
        vvals=[round(0.4 + 0.1 * k, 1) for k in range(9)],
        vpos=[616.9, 788.5, 956.5, 1127.5, 1298.9, 1466.8, 1638.0, 1806.5, 1974.5],
        hvals=[round(-0.02 + 0.01 * j, 2) for j in range(6)],
        hpos=[2203.5, 2088.5, 1974.5, 1859.1, 1744.9, 1630.0],
        box=(619, 1972, 1632, 2201), exclude=[(620, 952, 1632, 1965)], half=150),
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
    rep = g.dump(out, extra=dict(page=os.path.basename(page), dpi=300, config=name))
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
