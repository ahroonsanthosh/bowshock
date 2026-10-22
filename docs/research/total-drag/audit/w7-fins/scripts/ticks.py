"""Tick marks on a plot axis without grid lines. Usage:
python3 -I ticks.py <image> v|h <axis_px> <from> <to> <side> [len] [dark]
For a vertical axis (v) at x = <axis_px>, finds the rows from <from> to
<to> where a short horizontal tick leaves the axis on <side> (+1 right,
-1 left): dark pixels at 3 to <len> px from the axis line in most of those
columns. For a horizontal axis (h) at y = <axis_px>, the columns where a
tick leaves it (+1 down, -1 up). Prints each tick's centre (darkness
weighted). Reads the image only."""
import sys
import numpy as np
from PIL import Image

img = 255 - np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
kind, axis, lo, hi, side = sys.argv[2], int(round(float(sys.argv[3]))), int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
length = int(sys.argv[7]) if len(sys.argv) > 7 else 10
dark = float(sys.argv[8]) if len(sys.argv) > 8 else 100
offs = range(3, length + 1) if side > 0 else range(-length, -2)
if kind == 'v':
    band = np.stack([img[lo:hi, axis + d] for d in offs], axis=1)  # rows x offsets
else:
    band = np.stack([img[axis + d, lo:hi] for d in offs], axis=1)  # columns x offsets
hit = (band > dark).mean(axis=1) >= 0.6
w = band.mean(axis=1) * hit
idx = np.where(hit)[0]
runs = []
for i in idx:
    if runs and i == runs[-1][-1] + 1:
        runs[-1].append(i)
    else:
        runs.append([i])
for r in runs:
    r = np.array(r)
    c = (w[r] * r).sum() / w[r].sum() + lo
    print(round(float(c), 2), 'width', len(r))
