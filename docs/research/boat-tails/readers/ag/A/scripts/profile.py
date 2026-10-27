# usage: python3 -I profile.py <png> <x> <y0> <y1> [v|h] [halfwidth=1]
# prints the grey level along a vertical (v: column x, rows y0..y1) or horizontal (h: row x, cols y0..y1) line,
# averaged over +-halfwidth px across the line
import sys
import numpy as np
from PIL import Image
g = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
c, a, b = int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]); d = sys.argv[5] if len(sys.argv) > 5 else 'v'
hw = int(sys.argv[6]) if len(sys.argv) > 6 else 1
for t in range(a, b + 1):
    v = g[t, c - hw:c + hw + 1].mean() if d == 'v' else g[c - hw:c + hw + 1, t].mean()
    print(t, int(v), '#' * int((255 - v) / 8))
