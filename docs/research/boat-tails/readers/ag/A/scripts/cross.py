# usage: python3 -I cross.py <png> v|h <c> <a> <b> [dark=200] [hw=1]
# lists stroke crossings (runs darker than <dark>) along a vertical line x=c (rows a..b) or horizontal y=c,
# each with its darkness-weighted centre, width and min grey
import sys
import numpy as np
from PIL import Image
g = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
d, c, a, b = sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
dk = float(sys.argv[6]) if len(sys.argv) > 6 else 200; hw = int(sys.argv[7]) if len(sys.argv) > 7 else 1
prof = np.array([g[t, c - hw:c + hw + 1].mean() if d == 'v' else g[c - hw:c + hw + 1, t].mean() for t in range(a, b + 1)])
runs = []; cur = []
for i, v in enumerate(prof):
    if v < dk: cur.append(i)
    elif cur: runs.append(cur); cur = []
if cur: runs.append(cur)
out = []
for r in runs:
    w = 255 - prof[r]; cen = a + (np.array(r) * w).sum() / w.sum()
    out.append(f"{cen:.1f}(w{len(r)},min{prof[r].min():.0f})")
print(f"{d}={c}: " + "  ".join(out))
