"""Suppress graph-paper grid lines in a region so plotted symbols stand out.
usage: python3 -I degrid.py in.png out.png x0 y0 x1 y1 [win]
For each pixel the grid darkness is estimated as the larger of the
column median (over rows y-win..y+win) and the row median (over
columns x-win..x+win); that estimate is subtracted from the darkness.
Long straight grid lines survive the median, short symbol strokes do
not, so the residual keeps symbols and curves and drops the grid.
The output is an image of the residual (white = nothing), same size
as the region, with the region origin written in the file name log.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = (int(v) for v in sys.argv[3:7])
win = int(sys.argv[7]) if len(sys.argv) > 7 else 30
g = 255.0 - np.asarray(Image.open(src).convert("L"), dtype=float)
pad = win + 2
G = g[y0 - pad:y1 + pad, x0 - pad:x1 + pad]
colmed = ndimage.median_filter(G, size=(2 * win + 1, 1))
rowmed = ndimage.median_filter(G, size=(1, 2 * win + 1))
bg = np.maximum(colmed, rowmed)
res = np.clip(G - bg, 0, 255)[pad:-pad, pad:-pad]
np.save(out.rsplit(".", 1)[0] + ".npy", res)
Image.fromarray((255 - np.clip(res * 1.5, 0, 255)).astype(np.uint8)).save(out)
print(out, res.shape)
