"""List ink runs along rows (exploratory; for picking nodes on steep curves).

usage: python3 -I rowpeaks.py PAGE.png X0 X1 BLUR Y [Y ...]
For each row Y (the ink, gray < 128, box-blurred BLUR px, averaged over
Y-1..Y+1) prints the darkness-weighted centroid x, peak (0..255) and width
(pixels above half the peak) of each run above 60 in X0..X1.
"""
import sys

import numpy as np
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None


def main():
    page = sys.argv[1]
    x0, x1, blur = int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
    ink = (np.asarray(Image.open(page).convert("L")) < 128).astype(np.uint8) * 255
    d = np.asarray(Image.fromarray(ink).filter(ImageFilter.BoxBlur(blur))).astype(float)
    for ys in sys.argv[5:]:
        y = int(ys)
        p = d[y - 1:y + 2, x0:x1].mean(axis=0)
        runs = []
        i = 0
        while i < len(p):
            if p[i] > 60:
                j = i
                while j < len(p) and p[j] > 60:
                    j += 1
                seg = p[i:j]
                c = (np.arange(i, j) * seg).sum() / seg.sum() + x0
                pk = seg.max()
                runs.append("%.1f(%d,w%d)" % (c, pk, int((seg > pk / 2).sum())))
                i = j
            else:
                i += 1
        print("y=%d:" % y, " ".join(runs))


if __name__ == "__main__":
    main()
