"""Grid lines of a scanned plot: rows and columns whose dark-pixel fraction
inside a box exceeds a threshold, merged into runs, with each run's centre.
Usage: python3 -I lines.py <image> x0 y0 x1 y1 [frac] [dark]
Coordinates are pixels of <image>. Prints horizontal (y) and vertical (x)
line centres. Reads the image only; writes nothing."""
import sys
import numpy as np
from PIL import Image

im = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
x0, y0, x1, y1 = map(int, sys.argv[2:6])
frac = float(sys.argv[6]) if len(sys.argv) > 6 else 0.5
dark = float(sys.argv[7]) if len(sys.argv) > 7 else 140
box = im[y0:y1, x0:x1] < dark


def runs(profile, offset):
    idx = np.where(profile > frac)[0]
    out = []
    if len(idx) == 0:
        return out
    start = prev = idx[0]
    for i in idx[1:]:
        if i != prev + 1:
            out.append((start + offset, prev + offset))
            start = i
        prev = i
    out.append((start + offset, prev + offset))
    return out


for name, prof, off in (('horizontal (y)', box.mean(axis=1), y0), ('vertical (x)', box.mean(axis=0), x0)):
    print(name, [round((a + b) / 2, 1) for a, b in runs(prof, off)])
