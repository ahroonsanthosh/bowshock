"""For each column along the bottom frame of the panel, report the top row of the ink run that
contains the frame line, to find marks resting on the axis. Usage: frametop.py img.png x0 x1"""
import sys
import numpy as np
from PIL import Image
a = np.array(Image.open(sys.argv[1]).convert('L')) < 128
x0, x1 = int(sys.argv[2]), int(sys.argv[3])
tops = []
for x in range(x0, x1):
    yc = int(round(1457.05 + 0.00864*(x-1850)))
    y = yc
    while a[y, x] and y > yc - 40: y -= 1
    tops.append((x, y+1, yc))
cur = None
for x, t, yc in tops:
    h = yc - t
    tag = 'thick' if h >= 5 else ''
    if tag and cur is None: cur = [x, x, h]
    elif tag: cur[1] = x; cur[2] = max(cur[2], h)
    elif cur is not None:
        print('ink rising above frame centre by >=5 px: x %d-%d, max %d px' % tuple(cur)); cur = None
hs = [yc - t for x, t, yc in tops]
print('median frame half-height above centre: %.1f px' % np.median(hs))
