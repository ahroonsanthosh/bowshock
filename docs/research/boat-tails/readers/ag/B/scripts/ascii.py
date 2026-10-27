"""ASCII map of a small page region, one character per pixel.

Usage: python -I ascii.py PAGE.png x0 y0 x1 y1 [dark] [mid] [light]
'#' grey < dark (120), '+' < mid (170), '.' < light (215), ' ' else.
Each row is prefixed with its y; a header gives x every 5 columns.
"""
import sys

import numpy as np
from PIL import Image


def main():
    a = sys.argv[1:]
    img = np.asarray(Image.open(a[0]).convert("L"), float)
    x0, y0, x1, y1 = (int(v) for v in a[1:5])
    d = float(a[5]) if len(a) > 5 else 120
    m = float(a[6]) if len(a) > 6 else 170
    li = float(a[7]) if len(a) > 7 else 215
    hdr = "".join(("|" if (x % 5 == 0) else " ") for x in range(x0, x1))
    print("     " + hdr)
    lab = ""
    x = x0
    while x < x1:
        if x % 10 == 0:
            s = str(x % 1000)
            lab += s
            x += len(s)
        else:
            lab += " "
            x += 1
    print("     " + lab[:x1 - x0])
    for y in range(y0, y1):
        row = img[y, x0:x1]
        s = "".join("#" if v < d else ("+" if v < m else ("." if v < li else " ")) for v in row)
        print("%4d %s" % (y, s))


if __name__ == "__main__":
    main()
