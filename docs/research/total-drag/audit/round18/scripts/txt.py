"""Print raw pixels as text (# ink, . paper). Usage: txt.py img.png x0 y0 x1 y1"""
import sys
import numpy as np
from PIL import Image
a = np.array(Image.open(sys.argv[1]).convert('L')) < 128
x0, y0, x1, y1 = map(int, sys.argv[2:6])
print('      ' + ''.join(str((x//10) % 10) if x % 10 == 0 else ' ' for x in range(x0, x1)))
print('      ' + ''.join(str(x % 10) for x in range(x0, x1)))
for y in range(y0, y1):
    print('%5d ' % y + ''.join('#' if a[y, x] else '.' for x in range(x0, x1)))
