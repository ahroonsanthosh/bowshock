# Fit every gridline along its length.
# Vertical lines: x = a + b*(y - 1500); horizontal lines: y = a + b*(x - 1200).
# For each scanline crossing a gridline, take the darkness-weighted centroid within +-5 px
# of the rough position, keep only scanlines where the window edges are light (a clean
# crossing, no curve or text), then fit a straight line with 3-sigma clipping.
import sys, json
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
out = sys.argv[2]
dark = 255 - im
VX = [409.35, 473.0, 537.42, 600.74, 665.35, 728.69, 793.35, 856.67, 920.99, 984.51, 1048.04,
      1112.39, 1175.59, 1240.28, 1303.56, 1367.67, 1431.57, 1495.61, 1559.38, 1622.28, 1686.43,
      1750.01, 1814.03, 1877.68, 1942.02, 2005.46]
HY = [750.06, 813.41, 876.99, 940.34, 1002.87, 1066.51, 1130.28, 1193.41, 1256.84, 1320.91,
      1383.8, 1447.01, 1510.9, 1574.1, 1637.77, 1701.5, 1765.45, 1828.87, 1892.03, 1955.46,
      2018.06, 2080.94, 2144.45, 2208.44, 2271.64]
HW = 5
def centroid(profile):
    bg = min(profile[0], profile[-1], profile[1], profile[-2])
    w = np.clip(profile - bg, 0, None)
    if w.sum() <= 0: return None
    return (np.arange(len(profile)) * w).sum() / w.sum()
def fit(ts, cs):
    ts = np.array(ts); cs = np.array(cs)
    keep = np.ones(len(ts), bool)
    for _ in range(6):
        A = np.vstack([np.ones(keep.sum()), ts[keep]]).T
        coef, *_ = np.linalg.lstsq(A, cs[keep], rcond=None)
        r = cs - (coef[0] + coef[1] * ts)
        s = r[keep].std()
        nk = np.abs(r) < max(3 * s, 0.3)
        if (nk == keep).all(): break
        keep = nk
    return coef, r[keep].std(), int(keep.sum()), len(ts)
res = {'vertical': [], 'horizontal': []}
y_lo, y_hi = int(HY[0]) + 3, int(HY[-1]) - 3
x_lo, x_hi = int(VX[0]) + 3, int(VX[-1]) - 3
for x0 in VX:
    ts, cs = [], []
    xi = int(round(x0))
    for y in range(y_lo, y_hi):
        # skip rows near horizontal gridlines
        if min(abs(y - h) for h in HY) < 6: continue
        p = dark[y, xi - HW: xi + HW + 1]
        if p.max() < 60 or p[0] > 35 or p[-1] > 35: continue
        c = centroid(p)
        if c is None: continue
        ts.append(y - 1500); cs.append(xi - HW + c)
    coef, s, n, N = fit(ts, cs)
    res['vertical'].append({'rough': x0, 'a': coef[0], 'b': coef[1], 'rms': s, 'n_used': n, 'n_rows': N})
for y0 in HY:
    ts, cs = [], []
    yi = int(round(y0))
    for x in range(x_lo, x_hi):
        if min(abs(x - v) for v in VX) < 6: continue
        p = dark[yi - HW: yi + HW + 1, x]
        if p.max() < 60 or p[0] > 35 or p[-1] > 35: continue
        c = centroid(p)
        if c is None: continue
        ts.append(x - 1200); cs.append(yi - HW + c)
    coef, s, n, N = fit(ts, cs)
    res['horizontal'].append({'rough': y0, 'a': coef[0], 'b': coef[1], 'rms': s, 'n_used': n, 'n_rows': N})
json.dump(res, open(out, 'w'), indent=1)
for k in res:
    print(k)
    for r in res[k]:
        print('  rough %8.2f  a %8.3f  slope %+.5f  rms %.3f  used %d of %d' % (r['rough'], r['a'], r['b'], r['rms'], r['n_used'], r['n_rows']))
