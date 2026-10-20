"""Remove thin horizontal and vertical grid lines from a graph-paper scan, keeping thick marks
(curves, symbols). A dark pixel is dropped when its run across the line is thin (<= thin px)
while its run along the line is long (>= long px), in either direction.
usage: degrid.py in.png out.png x0 y0 x1 y1 [thin] [long] [thr]"""
import sys
import numpy as np
from PIL import Image

src = np.asarray(Image.open(sys.argv[1]).convert("L"))
x0, y0, x1, y1 = (int(v) for v in sys.argv[3:7])
thin = int(sys.argv[7]) if len(sys.argv) > 7 else 7
long_ = int(sys.argv[8]) if len(sys.argv) > 8 else 30
thr = int(sys.argv[9]) if len(sys.argv) > 9 else 128
a = src[y0:y1, x0:x1] < thr


def runlen(mask, axis):
    """Length of the dark run through each pixel along axis."""
    m = mask if axis == 1 else mask.T
    out = np.zeros(m.shape, dtype=np.int32)
    for i in range(m.shape[0]):
        row = m[i]
        j = 0
        n = len(row)
        while j < n:
            if row[j]:
                k = j
                while k + 1 < n and row[k + 1]:
                    k += 1
                out[i, j:k + 1] = k - j + 1
                j = k + 1
            else:
                j += 1
    return out if axis == 1 else out.T


h = runlen(a, 1)
v = runlen(a, 0)
keep = a & ~((v <= thin) & (h >= long_)) & ~((h <= thin) & (v >= long_))
# second pass: drop isolated specks
img = np.where(keep, 0, 255).astype(np.uint8)
Image.fromarray(img).save(sys.argv[2])
print("kept", int(keep.sum()), "of", int(a.sum()))
