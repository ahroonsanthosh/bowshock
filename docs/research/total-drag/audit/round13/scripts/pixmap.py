"""Print a pixel map of a page region (# dark, + mid, . light), with column
digits and row numbers, for reading glyph extents by eye.

usage: python3 -I pixmap.py PAGE.png X0 Y0 X1 Y1 [DARK MID]
"""
import sys

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
g = np.array(Image.open(sys.argv[1]).convert("L"), float)
x0, y0, x1, y1 = map(int, sys.argv[2:6])
dark = float(sys.argv[6]) if len(sys.argv) > 6 else 110
mid = float(sys.argv[7]) if len(sys.argv) > 7 else 160
print("      " + "".join(str((x0 + i) // 10 % 10) for i in range(x1 - x0)))
print("      " + "".join(str((x0 + i) % 10) for i in range(x1 - x0)))
for j in range(y0, y1):
    print("%5d " % j + "".join("#" if v < dark else ("+" if v < mid else ".") for v in g[j, x0:x1]))
