"""Print grey levels (0 black..9 white scale) of a region. Usage: dump.py page x0 y0 x1 y1"""
import sys
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(int)
x0, y0, x1, y1 = map(int, sys.argv[2:6])
print('     ' + ''.join(f'{x % 100:3d}' for x in range(x0, x1)))
for y in range(y0, y1):
    print(f'{y:5d}' + ''.join(f'{a[y, x] // 26:3d}' for x in range(x0, x1)))
