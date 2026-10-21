"""Deskew a page from one long horizontal grid line.
Usage: python3 -I deskew.py <in.png> <out.png> <y_guess> <xl0> <xl1> <xr0> <xr1> [halfwin]
Finds the line's darkest row (row-mean darkness) within y_guess +- halfwin in the
left window [xl0, xl1] and the right window [xr0, xr1], then rotates the image so
the line is horizontal (bicubic, white fill). Prints the angle."""
import math
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
yg, xl0, xl1, xr0, xr1 = map(int, sys.argv[3:8])
hw = int(sys.argv[8]) if len(sys.argv) > 8 else 25
im = Image.open(src).convert('L')
a = np.asarray(im).astype(float)


def liney(x0, x1):
    rows = a[yg - hw:yg + hw, x0:x1].mean(axis=1)
    k = np.argmin(rows)
    # sub-pixel: darkness-weighted centroid around the minimum
    lo, hi = max(k - 3, 0), min(k + 4, len(rows))
    w = 255 - rows[lo:hi]
    return yg - hw + (np.arange(lo, hi) * w).sum() / w.sum()


yl, yr = liney(xl0, xl1), liney(xr0, xr1)
xlc, xrc = (xl0 + xl1) / 2, (xr0 + xr1) / 2
ang = math.degrees(math.atan2(yr - yl, xrc - xlc))
out = im.rotate(ang, resample=Image.BICUBIC, fillcolor=255)
out.save(dst)
print(f'{src}: line y {yl:.1f} at x {xlc:.0f}, {yr:.1f} at x {xrc:.0f}; rotated {ang:+.3f} deg')
