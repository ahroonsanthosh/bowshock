"""Print raw grey values of a small region (native pixels).
usage: python3 -I pix.py in.png x0 y0 x1 y1
"""
import sys
import numpy as np
from PIL import Image
g = np.asarray(Image.open(sys.argv[1]).convert('L'), dtype=int)
x0, y0, x1, y1 = (int(v) for v in sys.argv[2:6])
print('     ' + ''.join('%4d' % (x % 10000) for x in range(x0, x1)))
for y in range(y0, y1):
    print('%4d ' % y + ''.join('%4d' % g[y, x] for x in range(x0, x1)))
