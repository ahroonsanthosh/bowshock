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

    def seeded(orient, pos0, seeds, lo, hi):
        """Follow from several seeds along the line (lines broken by the
        draftsman near curves are picked up again); union of samples."""
        allp = {}
        for s in seeds:
            if orient == "v":
                band = d[int(s) - 30:int(s) + 30, int(pos0) - 12:int(pos0) + 13].mean(axis=0)
            else:
                band = d[int(pos0) - 12:int(pos0) + 13, int(s) - 30:int(s) + 30].mean(axis=1)
            p = int(pos0) - 12 + int(np.argmax(band))
            if band.max() < 40:
                continue
            for sc, v in rm_calib.follow(d, orient, float(p), int(s), lo, hi, cfg["exclude"]):
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
