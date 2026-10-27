"""Find the small rotation that makes a plot's grid axis-aligned, and
write the rotated (bilevel) image.

Usage: python -I deskew.py IN.png OUT.png x0 y0 x1 y1 [amin amax step]
The score is the sum of the variances of the row and column ink
profiles inside the region (sharp grid lines give peaky profiles).
Positive angles rotate counterclockwise (PIL convention).  The
rotation is about the image centre; the output keeps the input size.
"""
import sys

import numpy as np
from PIL import Image


def score(im, box):
    a = np.asarray(im.crop(box)) < 128
    return a.mean(axis=1).var() + a.mean(axis=0).var()


def main():
    a = sys.argv[1:]
    im = Image.open(a[0]).convert("L")
    box = tuple(int(v) for v in a[2:6])
    amin = float(a[6]) if len(a) > 6 else -3.0
    amax = float(a[7]) if len(a) > 7 else 3.0
    st = float(a[8]) if len(a) > 8 else 0.1
    best = None
    for ang in np.arange(amin, amax + 1e-9, st):
        r = im.rotate(ang, resample=Image.BILINEAR, fillcolor=255)
        s = score(r, box)
        if best is None or s > best[0]:
            best = (s, ang)
    # refine
    s0, a0 = best
    for ang in np.arange(a0 - st, a0 + st + 1e-9, st / 10):
        r = im.rotate(ang, resample=Image.BILINEAR, fillcolor=255)
        s = score(r, box)
        if s > best[0]:
            best = (s, ang)
    r = im.rotate(best[1], resample=Image.BILINEAR, fillcolor=255)
    r.save(a[1])
    print("angle %.3f deg (score %.5f)" % (best[1], best[0]))


if __name__ == "__main__":
    main()
