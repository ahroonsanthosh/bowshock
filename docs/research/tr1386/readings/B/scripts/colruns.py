"""List dark runs down a pixel column (averaged over +-W columns) between Y0 and Y1.

usage: python3 -I colruns.py PAGE X Y0 Y1 [W] [THRESH]
Prints each run: start, end, darkness-weighted centre, width, min grey.
"""
import sys
import numpy as np
from PIL import Image

WORK = "/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/tr1386/B/work"
page, x, y0, y1 = map(int, sys.argv[1:5])
w = int(sys.argv[5]) if len(sys.argv) > 5 else 1
th = float(sys.argv[6]) if len(sys.argv) > 6 else 150
g = np.asarray(Image.open(f"{WORK}/p400-{page:02d}.png").convert("L"), dtype=np.float32)
col = g[y0:y1, x - w:x + w + 1].mean(axis=1)
dark = col < th
i = 0
out = []
while i < len(col):
    if dark[i]:
        j = i
        while j < len(col) and dark[j]:
            j += 1
        wts = 255 - col[i:j]
        c = (np.arange(i, j) * wts).sum() / wts.sum() + y0
        out.append(f"{y0 + i}-{y0 + j - 1} c={c:.1f} w={j - i} min={int(col[i:j].min())}")
        i = j
    else:
        i += 1
print(f"x={x}: " + " | ".join(out))
