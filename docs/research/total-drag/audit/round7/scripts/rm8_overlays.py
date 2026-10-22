"""Write the review overlays for RM L52J21a fig. 8 (lower right panel).

usage: python3 -I rm8_overlays.py WORKDIR OUTDIR
WORKDIR holds rm8_p-28.png (PDF p. 28 at 600 dpi), rm8br_calib.json and rm8_sym.json.
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
JOBS = [
    ("rml52j21a_f8_lr_calibration.png", (2080, 3990, 3680, 5340), 0.5, "rm8cal", False),
    ("rml52j21a_f8_lr_cyl_M2.41.png", (3190, 4510, 3330, 4660), 4.0, "rm8sym", True),
    ("rml52j21a_f8_lr_con_M2.41.png", (3190, 4830, 3330, 4980), 4.0, "rm8sym", True),
    ("rml52j21a_f8_lr_cyl_M1.62.png", (2220, 4250, 2360, 4420), 4.0, "rm8sym", True),
    ("rml52j21a_f8_legend.png", (1780, 680, 2300, 940), 1.5, None, False),
]


def main():
    w, o = sys.argv[1:3]
    for name, box, s, title, full in JOBS:
        args = [sys.executable, "-I", "-B", os.path.join(HERE, "brl_overlay.py"), os.path.join(w, "rm8_p-28.png"),
                os.path.join(w, "rm8br_calib.json"), os.path.join(w, "rm8_sym.json") if full else "none",
                os.path.join(o, name)] + [str(v) for v in box] + [str(s)] + ([title] if title else [])
        subprocess.run(args, check=True)


if __name__ == "__main__":
    main()
