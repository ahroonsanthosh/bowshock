"""Find long vertical and horizontal rules in a page image (dark run sums).
usage: python3 -I lines.py IN [FRAC]"""
import sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert("L")) < 128
frac = float(sys.argv[2]) if len(sys.argv) > 2 else 0.3
H, W = im.shape
col = im.sum(axis=0); row = im.sum(axis=1)
def groups(idx):
    out=[]; 
    for i in idx:
        if out and i-out[-1][-1] <= 2: out[-1].append(i)
        else: out.append([i])
    return [(g[0], g[-1], ) for g in out]
print("size", W, H)
print("vertical rules (x0,x1):", groups(np.where(col > frac*H)[0]))
print("horizontal rules (y0,y1):", groups(np.where(row > frac*W)[0]))
