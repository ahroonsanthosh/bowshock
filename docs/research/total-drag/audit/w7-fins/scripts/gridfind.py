"""Grid-line candidates on a scanned plot: column peaks of mean ink in a
horizontal band, and row peaks in a vertical band. Usage:
python3 -I gridfind.py <image> <band_y0> <band_y1> <x0> <x1> <band_x0> <band_x1> <y0> <y1> [thresh]"""
import sys
import numpy as np
from PIL import Image

a = 255 - np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
by0, by1, x0, x1, bx0, bx1, y0, y1 = map(int, sys.argv[2:10])
t = float(sys.argv[10]) if len(sys.argv) > 10 else 120
c = a[by0:by1, x0:x1].mean(0)
print('v', [x0 + i for i in range(1, len(c) - 1) if c[i] >= c[i - 1] and c[i] >= c[i + 1] and c[i] > t])
r = a[y0:y1, bx0:bx1].mean(1)
print('h', [y0 + i for i in range(1, len(r) - 1) if r[i] >= r[i - 1] and r[i] >= r[i + 1] and r[i] > t])
