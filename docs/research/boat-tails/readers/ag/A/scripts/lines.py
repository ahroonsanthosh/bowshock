# usage: python3 -I lines.py <png> <x0> <y0> <x1> <y1> <axis v|h> [thresh_frac=0.5] [dark=128]
# finds long straight lines (gridlines/axes) in a region: for 'v' it scans columns, for 'h' rows.
# prints each run of columns/rows whose dark-pixel fraction exceeds thresh, with darkness-weighted centre.
import sys
import numpy as np
from PIL import Image
f = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); ax = sys.argv[6]
th = float(sys.argv[7]) if len(sys.argv) > 7 else 0.5
dk = int(sys.argv[8]) if len(sys.argv) > 8 else 128
g = np.asarray(Image.open(f).convert('L'), dtype=float)[y0:y1, x0:x1]
dark = (255 - g) / 255.0
mask = g < dk
if ax == 'v':
    frac = mask.mean(axis=0); w = dark.sum(axis=0); off = x0
else:
    frac = mask.mean(axis=1); w = dark.sum(axis=1); off = y0
idx = np.where(frac > th)[0]
runs = []
for i in idx:
    if runs and i == runs[-1][-1] + 1: runs[-1].append(i)
    else: runs.append([i])
for r in runs:
    lo, hi = r[0] - 2, r[-1] + 3
    lo = max(lo, 0); hi = min(hi, len(w))
    ww = w[lo:hi] - np.median(w)
    ww[ww < 0] = 0
    c = (np.arange(lo, hi) * ww).sum() / ww.sum()
    print(f"{ax} run {r[0]+off}-{r[-1]+off} centre {c+off:.2f} maxfrac {frac[r].max():.2f}")
