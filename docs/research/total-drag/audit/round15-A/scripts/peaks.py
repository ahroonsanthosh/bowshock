# usage: python3 -I peaks.py img x0 y0 x1 y1 axis(cols|rows) minprom
# prints local maxima of mean darkness profile along the given axis, with prominence
import sys
import numpy as np
from PIL import Image
a = sys.argv
im = np.asarray(Image.open(a[1]).convert('L')).astype(float)
x0, y0, x1, y1 = map(int, a[2:6])
ax = a[6]
mp = float(a[7])
sub = 255 - im[y0:y1, x0:x1]
prof = sub.mean(axis=0) if ax == 'cols' else sub.mean(axis=1)
off = x0 if ax == 'cols' else y0
# moving minimum baseline over 61 px
n = len(prof)
w = 30
base = np.array([prof[max(0, i-w):i+w+1].min() for i in range(n)])
pr = prof - base
cand = [i for i in range(1, n-1) if pr[i] > mp and prof[i] >= prof[i-1] and prof[i] >= prof[i+1]]
g = []
for p in cand:
    if g and p - g[-1][-1] < 12:
        g[-1].append(p)
    else:
        g.append([p])
for gg in g:
    i = max(gg, key=lambda k: prof[k])
    # centroid over +-6 px above baseline
    lo, hi = max(0, i-6), min(n, i+7)
    ww = np.clip(prof[lo:hi] - base[i], 0, None)
    c = (np.arange(lo, hi) * ww).sum() / ww.sum()
    print(f"{i+off}\tcentroid={c+off:.2f}\tprom={pr[i]:.1f}")
