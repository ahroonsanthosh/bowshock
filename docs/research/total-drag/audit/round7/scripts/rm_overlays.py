"""Write the review overlays for RM L52J21a figs. 31 to 33, panel (d).

usage: python3 -I rm_overlays.py WORKDIR OUTDIR
WORKDIR holds rm_p-58.png, rm_p-59.png, rm_p-60.png (600 dpi renders of PDF
pp. 58 to 60), rmNN_calib.json and rmNN_sym.json for NN = 31, 32, 33.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image  # noqa: E402
import rm_overlay  # noqa: E402

Image.MAX_IMAGE_PIXELS = None

JOBS = {
    31: dict(page="rm_p-58.png", M="1.62", panel=(2080, 3200, 3800, 4720), zoom=(3060, 3570, 3400, 3760),
             legend=(1680, 2850, 2350, 3150)),
    32: dict(page="rm_p-59.png", M="1.93", panel=(2420, 3040, 4060, 4700), zoom=(3440, 3520, 3790, 3700),
             legend=(2050, 2720, 2650, 2990)),
    33: dict(page="rm_p-60.png", M="2.41", panel=(2080, 3160, 3800, 4600), zoom=(3055, 3425, 3305, 3585),
             legend=(1650, 2720, 2350, 3020)),
}


def main():
    work, outdir = sys.argv[1:3]
    for fig, j in JOBS.items():
        page = os.path.join(work, j["page"])
        img = Image.open(page)
        sym = os.path.join(work, "rm%d_sym.json" % fig)
        cal = os.path.join(work, "rm%d_calib.json" % fig)
        base = os.path.join(outdir, "rml52j21a_f%dd" % fig)
        rm_overlay.draw(page, sym, cal, base + "_panel.png", j["panel"], 0.55,
                        "RM L52J21a fig. %d panel d, M %s; cyan squares = measured gridline intersections"
                        % (fig, j["M"]), page_img=img, labels=False)
        rm_overlay.draw(page, sym, cal, base + "_symbols.png", j["zoom"], 2.7,
                        "fig. %d d: fitted outlines; magenta = value, orange = outline centre" % fig,
                        page_img=img)
        x0, y0, x1, y1 = j["legend"]
        img.convert("L").crop((x0, y0, x1, y1)).resize(((x1 - x0) // 2, (y1 - y0) // 2)).save(
            base + "_legend.png", optimize=True)


if __name__ == "__main__":
    main()
