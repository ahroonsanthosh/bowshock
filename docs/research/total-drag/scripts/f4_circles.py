"""Ring-template search for the circle symbols (M = 1.50) of TN D-4014 fig. 4. Score at (x, y, r): fraction of
ring pixels (radius r +- 1) that are dark, over ring pixels not in grid-paper columns (columns dark over more
than 55% of the panel height). Reports the best non-overlapping maxima in a window, converted to CA,c with
the calibration of f4_ruler.py. Usage: PAGE PANEL PY0 PY1 X0 Y0 X1 Y1 [N]"""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, 'scripts')
import f4_ruler as fr
page = int(sys.argv[1]); panel = sys.argv[2]
PY0, PY1, X0, Y0, X1, Y1 = map(int, sys.argv[3:9]); N = int(sys.argv[9]) if len(sys.argv) > 9 else 6
a = np.array(Image.open('img/d4014hi-%d.png' % page).convert('L')).astype(int)
dark = a < 128
gridc = dark[PY0:PY1, :].mean(axis=0) > 0.55
res = []
for r in (10, 11, 12, 13, 14):
    t = np.arange(0, 2 * np.pi, 2 * np.pi / 160)
    for x in range(X0, X1):
        for y in range(Y0, Y1):
            hits = 0; tot = 0
            for dr in (-1, 0, 1):
                xs = np.round(x + (r + dr) * np.cos(t)).astype(int)
                ys = np.round(y + (r + dr) * np.sin(t)).astype(int)
                ok = ~gridc[xs]
                tot += ok.sum(); hits += (dark[ys, xs] & ok).sum()
            # interior should be mostly light (a ring, not a blob)
            xi = np.round(x + (r - 4) * np.cos(t[::4])).astype(int); yi = np.round(y + (r - 4) * np.sin(t[::4])).astype(int)
            okc = ~gridc[xi]
            inner = (dark[yi, xi] & okc).sum() / max(okc.sum(), 1)
            res.append((hits / max(tot, 1) - 0.5 * inner, x, y, r))
res.sort(reverse=True)
picked = []
for s, x, y, r in res:
    if all((x - px) ** 2 + (y - py) ** 2 > 18 ** 2 for _, px, py, _ in picked):
        picked.append((s, x, y, r))
    if len(picked) >= N:
        break
for s, x, y, r in sorted(picked, key=lambda q: q[1]):
    print('circle x %4d y %4d r %d score %.2f  CA,c = %.4f' % (x, y, r, s, fr.ca_of(page, panel, x, y)))
