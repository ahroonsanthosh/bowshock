"""Write the review overlays for NACA TN 3861 figs. 15 and 16.

usage: python3 -I t3861_overlays.py WORKDIR OUTDIR
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
JOBS = [
    (15, "t61_p-31.png", "tn3861_f15_calibration.png", (1040, 520, 5380, 3440), 0.22, "f15cal", False),
    (15, "t61_p-31.png", "tn3861_f15_Mc1-3.5.png", (1480, 1520, 2800, 2240), 0.7, "f15", True),
    (15, "t61_p-31.png", "tn3861_f15_Mc3.5-9.png", (2780, 1420, 5360, 1760), 0.38, "f15", True),
    (16, "t61_p-32.png", "tn3861_f16_calibration.png", (1520, 620, 5280, 3700), 0.24, "f16cal", False),
    (16, "t61_p-32.png", "tn3861_f16_Mc1-3.5.png", (1950, 1580, 3300, 3540), 0.45, "f16", True),
    (16, "t61_p-32.png", "tn3861_f16_Mc3-7.png", (2900, 1460, 4860, 1960), 0.48, "f16", True),
]


def main():
    w, o = sys.argv[1:3]
    for fig, page, name, box, s, title, full in JOBS:
        args = [sys.executable, "-I", "-B", os.path.join(HERE, "t3861_overlay.py"), os.path.join(w, page),
                os.path.join(w, "t%d_calib.json" % fig),
                os.path.join(w, "t%d_sym.json" % fig) if full else "none",
                os.path.join(w, "t%d_tracks.json" % fig) if full else "none",
                os.path.join(o, name)] + [str(v) for v in box] + [str(s), title]
        subprocess.run(args, check=True)


if __name__ == "__main__":
    main()
