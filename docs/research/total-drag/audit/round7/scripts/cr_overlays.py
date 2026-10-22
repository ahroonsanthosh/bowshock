"""Write the review overlays for NASA CR-149372 fig. 8b.

usage: python3 -I cr_overlays.py WORKDIR OUTDIR
WORKDIR holds cr_p-26.png, cr_calib.json, cr_tri.json, cr_tracks.json, cr_readings.json.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image  # noqa: E402
import cr_overlay  # noqa: E402

Image.MAX_IMAGE_PIXELS = None


def main():
    w, o = sys.argv[1:3]
    page = os.path.join(w, "cr_p-26.png")
    cal, tri, trk, rd = (os.path.join(w, n) for n in ("cr_calib.json", "cr_tri.json", "cr_tracks.json",
                                                       "cr_readings.json"))
    jobs = [
        ("cr149372_f8b_calibration.png", (1560, 1700, 4420, 6000), 0.3, "none",
         "CR-149372 fig. 8b: cyan = measured gridline intersections; tracks M1.2 red, M1.1 blue, M1.0 orange"),
        ("cr149372_f8b_theta0-25.png", (1600, 2030, 2060, 2560), 1.7, rd,
         "fig. 8b theta 0 to 25: triangles green, M1.2 track red, readings black"),
        ("cr149372_f8b_theta20-70.png", (1900, 2350, 2780, 4500), 0.45, rd,
         "fig. 8b theta 20 to 70: three faired lines; M1.2 red through the triangles"),
        ("cr149372_f8b_theta65-112.png", (2640, 4250, 3420, 5340), 0.85, rd,
         "fig. 8b theta 65 to 112: M1.2 red; hollow = not used"),
    ]
    for name, box, s, r, title in jobs:
        cr_overlay.draw(page, cal, tri, trk, r, os.path.join(o, name), list(box), s, title)
    Image.open(page).convert("L").crop((3000, 1950, 4300, 2650)).resize((650, 350)).save(
        os.path.join(o, "cr149372_f8b_legend.png"), optimize=True)


if __name__ == "__main__":
    main()
