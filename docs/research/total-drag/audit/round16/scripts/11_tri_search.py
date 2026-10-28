# Search the whole plotting frame (and legend) for triangle-like marks.
# Gridlines are subtracted as in 09_degrid.py, then the image is correlated with an
# outline template of an upward triangle (base 17 px, height 14 px, line 2.5 px) and,
# separately, with circle and square outlines of similar size, so that triangle hits can
# be told from the other symbols. Peaks above a threshold are listed with their score.
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage, signal
src, gf = sys.argv[1], sys.argv[2]
D = 255 - np.asarray(Image.open(src).convert('L')).astype(float)
G = json.load(open(gf))
X0, Y0, X1, Y1 = 380, 720, 2040, 2300
W = D[Y0:Y1, X0:X1].copy()
paper = np.median(W)
yy, xx = np.mgrid[Y0:Y1, X0:X1]
# subtract gridlines with a simple fixed Gaussian profile fitted per line amplitude
def sub_line(off, amp, sig):
    return amp * np.exp(-0.5 * (off / sig) ** 2)
for l in G['vertical']:
    off = xx - (l['a'] + l['b'] * (yy - 1500))
    W -= sub_line(off, 95.0, 0.85)
for l in G['horizontal']:
    off = yy - (l['a'] + l['b'] * (xx - 1200))
    W -= sub_line(off, 95.0, 0.85)
W = np.clip(W - paper, 0, None)
def outline(kind, size=17, h=14, lw=1.25):
    n = 25
    ty, tx = np.mgrid[-n//2:n//2+1, -n//2:n//2+1].astype(float)
    if kind == 'tri':
        # apex (0,-2h/3), base y=+h/3, half width size/2
        ya, yb = -2*h/3, h/3
        # distance to three segments
        P = [(0, ya), (-size/2, yb), (size/2, yb)]
        d = np.full(tx.shape, 1e9)
        for (x1, y1), (x2, y2) in [(P[0], P[1]), (P[1], P[2]), (P[2], P[0])]:
            vx, vy = x2 - x1, y2 - y1
            t = np.clip(((tx - x1) * vx + (ty - y1) * vy) / (vx*vx + vy*vy), 0, 1)
            d = np.minimum(d, np.hypot(tx - (x1 + t*vx), ty - (y1 + t*vy)))
    elif kind == 'circle':
        d = np.abs(np.hypot(tx, ty) - size/2*0.85)
    else:
        a = size/2*0.8
        d = np.maximum(np.abs(tx), np.abs(ty)); d = np.abs(d - a)
    t = (d < lw).astype(float)
    return t - t.mean()
scores = {}
for k in ['tri', 'circle', 'square']:
    T = outline(k)
    scores[k] = signal.fftconvolve(W, T[::-1, ::-1], mode='same') / (np.abs(T).sum())
S = scores['tri']
mx = ndimage.maximum_filter(S, size=13)
pk = np.argwhere((S == mx) & (S > np.percentile(S, 99.9)))
rows = []
for (j, i) in pk:
    rows.append((S[j, i], i + X0, j + Y0, scores['circle'][j, i], scores['square'][j, i]))
rows.sort(reverse=True)
print('top triangle-template peaks (score, x, y, circle score, square score):')
for r in rows[:60]:
    print('%7.1f  x=%5d y=%5d   circ=%6.1f sq=%6.1f' % r)
