# usage: python3 -I frame.py <png> <xL_lo> <xL_hi> <xR_lo> <xR_hi> <yT_lo> <yT_hi> <yB_lo> <yB_hi> <xa> <xb> <ya> <yb>
# finds the plot frame (outermost thick lines) by profiles: left/right frame x at rows ya and yb (search windows
# xL, xR), top/bottom frame y at columns xa and xb (windows yT, yB); reports the thickest dark run in each window
import sys
import numpy as np
from PIL import Image
g = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
xL0, xL1, xR0, xR1, yT0, yT1, yB0, yB1, xa, xb, ya, yb = map(int, sys.argv[2:14])
def run(prof, off):
    d = prof < 128; best = None; i = 0
    while i < len(d):
        if d[i]:
            j = i
            while j < len(d) and d[j]: j += 1
            w = 255 - prof[i:j]; c = off + i + (np.arange(j - i) * w).sum() / w.sum()
            if best is None or j - i > best[1]: best = (c, j - i)
            i = j
        else: i += 1
    return best
for y in (ya, yb):
    print(f"row {y}: left {run(g[y-1:y+2, xL0:xL1].mean(0), xL0)} right {run(g[y-1:y+2, xR0:xR1].mean(0), xR0)}")
for x in (xa, xb):
    print(f"col {x}: top {run(g[yT0:yT1, x-1:x+2].mean(1), yT0)} bottom {run(g[yB0:yB1, x-1:x+2].mean(1), yB0)}")
