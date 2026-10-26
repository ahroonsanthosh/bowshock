"""Print darkness profiles to locate symbol outline edges.

usage: python3 -I prof.py PAGE v X Y0 Y1 [W]   (profile down column X, averaged over 2W+1 columns)
       python3 -I prof.py PAGE h Y X0 X1 [W]   (profile along row Y)
Prints position, mean grey level, and marks local darkness peaks.
"""
import sys
import numpy as np
from PIL import Image

WORK = "/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/tr1386/B/work"
page = int(sys.argv[1])
mode = sys.argv[2]
a, b0, b1 = int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
w = int(sys.argv[6]) if len(sys.argv) > 6 else 1
g = np.asarray(Image.open(f"{WORK}/p400-{page:02d}.png").convert("L"), dtype=np.float32)
if mode == "v":
    prof = g[b0:b1, a - w:a + w + 1].mean(axis=1)
else:
    prof = g[a - w:a + w + 1, b0:b1].mean(axis=0)
line = []
for i, v in enumerate(prof):
    pk = ""
    if 0 < i < len(prof) - 1 and v < prof[i - 1] and v <= prof[i + 1] and v < 170:
        pk = "  <-- dark peak"
    line.append(f"{b0 + i:5d} {int(v):4d} {'#' * int((255 - v) / 10)}{pk}")
print("\n".join(line))
