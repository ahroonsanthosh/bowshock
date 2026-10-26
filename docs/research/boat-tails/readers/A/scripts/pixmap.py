"""Print a character map of a small region: '#' dark (<T1), '+' mid (<T2), '.' light.
usage: python3 -I pixmap.py IMG ROT X0 X1 Y0 Y1 [T1] [T2]"""
import sys
from PIL import Image
import numpy as np
im = Image.open(sys.argv[1]).convert('L')
rot = int(sys.argv[2])
if rot:
    im = im.rotate(rot, expand=True, fillcolor=255)
g = np.asarray(im).astype(int)
x0, x1, y0, y1 = map(int, sys.argv[3:7])
t1 = int(sys.argv[7]) if len(sys.argv) > 7 else 120
t2 = int(sys.argv[8]) if len(sys.argv) > 8 else 180
print('     ' + ''.join(str((x // 10) % 10) if x % 10 == 0 else ' ' for x in range(x0, x1)))
for y in range(y0, y1):
    print('%4d ' % y + ''.join('#' if v < t1 else ('+' if v < t2 else '.') for v in g[y, x0:x1]))
