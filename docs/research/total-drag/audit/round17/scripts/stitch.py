"""Stitch the native CCITT strips of a PDF page into one 1-bit image.

usage: python3 -I stitch.py OUT.png STRIP1.png STRIP2.png ...
Strips are stacked top to bottom in the order given. Output: ink = 1 as
a numpy .npy next to the png, and a png with black ink on white.
"""
import sys
import numpy as np
from PIL import Image

out = sys.argv[1]
strips = sys.argv[2:]
arrs = []
for s in strips:
    im = Image.open(s).convert('1')
    a = np.array(im, dtype=np.uint8)[::-1]  # 1 = white; strips are stored flipped top to bottom
    arrs.append(a)
full = np.vstack(arrs)
# decide ink polarity: ink is the minority
frac_white = full.mean()
ink = (full == 0) if frac_white > 0.5 else (full == 1)
ink = ink.astype(np.uint8)
np.save(out.replace('.png', '.npy'), ink)
Image.fromarray(((1 - ink) * 255).astype(np.uint8)).save(out)
print(out, ink.shape, 'ink fraction', ink.mean())
