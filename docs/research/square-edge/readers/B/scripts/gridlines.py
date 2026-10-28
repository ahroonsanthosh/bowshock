"""Find grid-line positions in a plot area by darkness profiles.
usage: python3 -I gridlines.py in.png x0 y0 x1 y1 axis [minsep]
axis = v (vertical lines: profile along x) or h (horizontal lines: profile along y).
Prints each local maximum of the mean darkness, with a sub-pixel centre
from a 3-point parabola, and its darkness.
"""
import sys
import numpy as np
from PIL import Image

src = sys.argv[1]
x0, y0, x1, y1 = (int(v) for v in sys.argv[2:6])
axis = sys.argv[6]
minsep = int(sys.argv[7]) if len(sys.argv) > 7 else 8
g = np.asarray(Image.open(src).convert("L"), dtype=float)[y0:y1, x0:x1]
d = 255.0 - g
# median along the line direction is robust to symbols and curves crossing
prof = np.median(d, axis=0) if axis == "v" else np.median(d, axis=1)
off = x0 if axis == "v" else y0
base = np.percentile(prof, 20)
peaks = []
for i in range(1, len(prof) - 1):
    if prof[i] >= prof[i - 1] and prof[i] > prof[i + 1] and prof[i] - base > 8:
        a, b, c = prof[i - 1], prof[i], prof[i + 1]
        den = a - 2 * b + c
        frac = 0.5 * (a - c) / den if den != 0 else 0.0
        peaks.append((i + frac + off, b - base))
# suppress peaks closer than minsep, keep the darker
keep = []
for p in peaks:
    if keep and p[0] - keep[-1][0] < minsep:
        if p[1] > keep[-1][1]:
            keep[-1] = p
        continue
    keep.append(p)
for p, s in keep:
    print("%9.2f %6.1f" % (p, s))
