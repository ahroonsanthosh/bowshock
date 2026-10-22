"""Check straightness of TN 3819 fig. 18 gridlines: binned residuals from a
straight-line fit along each line (exploratory; prints a table).

usage: python3 -I tn3819_gridcheck.py PAGE.png
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
import gridfit  # noqa: E402

Image.MAX_IMAGE_PIXELS = None

d = 255.0 - np.asarray(Image.open(sys.argv[1]).convert("L")).astype(float)
for p, y0 in [(-0.10, 3010.3), (-0.16, 2650.5), (-0.20, 2410.4), (-0.26, 2049.7), (-0.48, 725.7)]:
    smp = gridfit.locate_line(d, "h", y0, 807, 5327, strip=30, win=8)
    coef, keep, r = gridfit.robust_fit(smp, 1)
    s = np.array([q[0] for q in smp])
    bins = np.arange(800, 5400, 450)
    row = []
    for a, b in zip(bins[:-1], bins[1:]):
        m = keep & (s >= a) & (s < b)
        row.append("%+.2f" % (np.mean(r[m]) if m.any() else np.nan))
    print("H %.2f" % p, " ".join(row))
for m_, x0 in [(1.0, 779.7), (1.4, 1020.0), (2.0, 1377.6), (3.0, 1976.4), (8.0, 4963.4)]:
    smp = gridfit.locate_line(d, "v", x0 + 0.0, 615, 3608, strip=30, win=10)
    coef, keep, r = gridfit.robust_fit(smp, 1)
    s = np.array([q[0] for q in smp])
    bins = np.arange(600, 3700, 300)
    row = []
    for a, b in zip(bins[:-1], bins[1:]):
        mm = keep & (s >= a) & (s < b)
        row.append("%+.2f" % (np.mean(r[mm]) if mm.any() else np.nan))
    print("V %.1f" % m_, " ".join(row), " (x at y=600: %.1f)" % np.polyval(coef, 600))
