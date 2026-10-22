"""Write the review overlays for BRL Report 934 Graph I.

usage: python3 -I brl_overlays.py WORKDIR OUTDIR
WORKDIR holds brl_r.png (page 24 rendered at 600 dpi, rotated clockwise),
brl_calib.json and brl_sym.json.
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
JOBS = [
    ("brl934_g1_calibration.png", (1150, 1100, 4800, 3850), 0.25, "cal", False),
    ("brl934_g1_overview.png", (1200, 1300, 4400, 3000), 0.32, "sym", True),
    ("brl934_g1_M0.95-1.2.png", (1270, 1350, 1720, 1860), 1.6, "sym", True),
    ("brl934_g1_M1.2-1.6.png", (1820, 1800, 2420, 2260), 1.3, "sym", True),
    ("brl934_g1_M1.75-2.1.png", (2860, 2500, 3440, 2940), 1.3, "sym", True),
    ("brl934_g1_M2.4-2.5.png", (4040, 3030, 4240, 3170), 3.0, "sym", True),
    ("brl934_g1_legend.png", (2760, 1720, 3200, 2120), 1.5, None, False),
]


def main():
    w, o = sys.argv[1:3]
    for name, box, s, title, full in JOBS:
        args = [sys.executable, "-I", "-B", os.path.join(HERE, "brl_overlay.py"), os.path.join(w, "brl_r.png"),
                os.path.join(w, "brl_calib.json"), os.path.join(w, "brl_sym.json") if full else "none",
                os.path.join(o, name)] + [str(v) for v in box] + [str(s)] + ([title] if title else [])
        subprocess.run(args, check=True)


if __name__ == "__main__":
    main()
