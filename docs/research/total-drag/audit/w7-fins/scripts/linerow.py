"""Row of the darkest horizontal line in a window, at several columns, to
measure a page's tilt. Usage: python3 -I linerow.py <image> y0 y1 x0 x1 step"""
import sys
import numpy as np
from PIL import Image

a = 255 - np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
y0, y1, x0, x1, step = map(int, sys.argv[2:7])
for x in range(x0, x1, step):
    p = a[y0:y1, x:x + 20].mean(1)
    i = int(np.argmax(p))
    print(x, y0 + i, round(float(p[i]), 1))
