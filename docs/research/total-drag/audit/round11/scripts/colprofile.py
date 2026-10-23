"""Darkness profile down a short vertical strip (exploratory; round 11).

usage: python3 -I colprofile.py PAGE.png xc halfwidth y0 y1
Prints, per row, the mean darkness (255 - grey) over x = xc - halfwidth ..
xc + halfwidth, to find the top and bottom edges of stacked symbols.
"""
import sys

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None


def main():
    page = sys.argv[1]
    xc, hw, y0, y1 = (int(v) for v in sys.argv[2:6])
    d = 255.0 - np.asarray(Image.open(page).convert("L")).astype(float)
    for y in range(y0, y1):
        v = d[y, xc - hw:xc + hw + 1].mean()
        print("%5d %6.1f %s" % (y, v, "#" * int(v / 6)))


if __name__ == "__main__":
    main()
