"""Remove thin lines (grid) from a page: keep only ink that survives a
binary opening with a k x k square; write a cleaned grey image.

Usage: python -I degrid.py IN.png OUT.png [k] [thr]
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

a = sys.argv[1:]
g = np.asarray(Image.open(a[0]).convert("L"), float)
k = int(a[2]) if len(a) > 2 else 3
thr = float(a[3]) if len(a) > 3 else 150
ink = g < thr
o = ndimage.binary_opening(ink, structure=np.ones((k, k)))
o = ndimage.binary_dilation(o, structure=np.ones((3, 3))) & (g < 200)
out = np.where(o, g, 255.0)
Image.fromarray(out.astype(np.uint8)).save(a[1])
print(a[1])
