"""Write the review overlays for NACA TN 3819 fig. 18.

usage: python3 -I tn3819_overlays.py PAGE.png CALIB.json TRACKS.json READINGS.json OUTDIR
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image  # noqa: E402
import overlay  # noqa: E402

Image.MAX_IMAGE_PIXELS = None


def main():
    page, calib, tracks, readings, outdir = sys.argv[1:6]
    img = Image.open(page)
    jobs = [
        ("tn3819_f18_overview.png", "-", (0, 0, 6200, 4525), 0.16, None, None,
         "TN 3819 fig. 18, whole page at 600 dpi, reduced"),
        ("tn3819_f18_calibration.png", tracks, (740, 2260, 2140, 3140), 0.7, None, calib,
         "TN 3819 fig. 18: cyan squares = measured gridline intersections; U red, L blue, F green"),
        ("tn3819_f18_M1.0-1.6.png", tracks, (780, 2440, 1170, 2620), 2.4, readings, None,
         "TN 3819 fig. 18, M 1.0 to 1.6: U = Chapman red, L = basic blue; hollow = not fitted; magenta = readings"),
        ("tn3819_f18_M1.6-3.1.png", tracks, (1150, 2560, 2060, 3070), 1.1, readings, None,
         "TN 3819 fig. 18, M 1.6 to 3.1: U red, L blue; hollow = not fitted; magenta = readings"),
        ("tn3819_f18_freeflight.png", tracks, (780, 2340, 975, 2530), 4.0, readings, None,
         "TN 3819 fig. 18, free-flight curve F green; magenta = readings"),
        ("tn3819_f18_leaders.png", tracks, (1500, 2780, 1660, 2900), 5.0, None, None,
         "TN 3819 fig. 18, leader tips: Chapman arrow (left) ends on U red, basic arrow (right) on L blue"),
    ]
    for name, tr, box, s, rd, cal, title in jobs:
        overlay.draw(page, tr, os.path.join(outdir, name), box, s, rd, cal, title, page_img=img)


if __name__ == "__main__":
    main()
