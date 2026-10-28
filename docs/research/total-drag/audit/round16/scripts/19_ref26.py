# Calibration check only: the two measured curves of reference 26 (short-dash long-dash),
# M = 1.50 (curve A) and M = 2.00 (curve B), at x/c 0, 0.2, 0.4, 0.6, 0.8, 1.0.
# Traced on the gridline-subtracted scan in a +-3 px window placed by rough anchors, then
# read at the column of each x/c by a straight line (or parabola) through the ink within
# +-H px. Steep crossings are read in x(y) form. Dash gaps are bridged and reported.
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
C = __import__('13_calib'); DG = __import__('degrid_lib')
img, gf, out = sys.argv[1], sys.argv[2], sys.argv[3]
C.load(gf); G = json.load(open(gf))
W, paper = DG.degrid(img, G, 395, 960, 1075, 1520)
def vx(l, y): return l['a'] + l['b'] * (y - 1500)
def hy(l, x): return l['a'] + l['b'] * (x - 1200)
def near_v(x, y, d): return any(abs(x - vx(l, y)) < d for l in G['vertical'])
def near_h(x, y, d): return any(abs(y - hy(l, x)) < d for l in G['horizontal'])
def cen(prof, lo, floor=40):
    w = np.clip(prof - floor, 0, None)
    if w.sum() < 30: return None
    return lo + (np.arange(len(prof)) * w).sum() / w.sum()
def trace_cols(anchors, x0, x1):
    ax = np.array([a[0] for a in anchors], float); ay = np.array([a[1] for a in anchors], float)
    pts = []
    for x in range(x0, x1 + 1):
        p = float(np.interp(x, ax, ay))
        if near_v(x, p, 2.5) or near_h(x, p, 2.0): continue
        lo, hi = int(np.floor(p - 4)), int(np.ceil(p + 4))
        c = cen(W[lo:hi + 1, x], lo)
        if c is not None and abs(c - p) < 3.5: pts.append((x, c))
    return np.array(pts)
def trace_rows(anchors, y0, y1):
    ay = np.array([a[1] for a in anchors], float); ax = np.array([a[0] for a in anchors], float)
    o = np.argsort(ay); ay, ax = ay[o], ax[o]
    pts = []
    for y in range(y0, y1 + 1):
        p = float(np.interp(y, ay, ax))
        if near_v(p, y, 2.5) or near_h(p, y, 2.0): continue
        lo, hi = int(np.floor(p - 3)), int(np.ceil(p + 3))
        c = cen(W[y, lo:hi + 1], lo)
        if c is not None and abs(c - p) < 2.5: pts.append((c, y))
    return np.array(pts)
def read_cols(name, xc, anchors, H, deg=None):
    yg = float(np.interp(C.x_to_px(xc, 1300), [a[0] for a in anchors], [a[1] for a in anchors]))
    xt = C.x_to_px(xc, yg)
    P = trace_cols(anchors, max(int(xt - H), 411), int(xt + H))
    if len(P) < 3:
        print('too few points', name, xc, len(P)); return None
    L, Rn = (P[:, 0] < xt).sum(), (P[:, 0] > xt).sum()
    d = deg if deg is not None else (2 if (L >= 4 and Rn >= 4) else 1)
    co = np.polyfit(P[:, 0] - xt, P[:, 1], d); yv = float(np.polyval(co, 0))
    rms = float(np.sqrt(np.mean((P[:, 1] - np.polyval(co, P[:, 0] - xt)) ** 2)))
    gap = float(np.min(np.abs(P[:, 0] - xt)))
    err = rms / np.sqrt(max(len(P) - d - 1, 1)) + 0.2 * gap / 5
    if os.environ.get('SHOWPTS'): print(name, xc, ' '.join('%d:%.2f' % (a, b) for a, b in P))
    return dict(curve=name, xc_target=xc, x_px=xt, y_px=yv, n=len(P), left=int(L), right=int(Rn), deg=d, rms=rms, gap_px=gap, fit_err_px=err)
def read_rows(name, xc, anchors, y0, y1):
    P = trace_rows(anchors, y0, y1)
    co = np.polyfit(P[:, 1] - 1200, P[:, 0], 1)
    yv = 1200.0
    for _ in range(10):
        xt = C.x_to_px(xc, yv); yv = 1200 + (xt - co[1]) / co[0]
    rms = float(np.sqrt(np.mean((P[:, 0] - np.polyval(co, P[:, 1] - 1200)) ** 2)))
    gap = float(np.min(np.abs(P[:, 1] - yv)))
    err = rms / np.sqrt(max(len(P) - 2, 1)) / abs(co[0]) + 0.2 * gap / 5
    return dict(curve=name, xc_target=xc, x_px=C.x_to_px(xc, yv), y_px=yv, n=len(P), deg=1, rms=rms, gap_px=gap, fit_err_px=err, form='x(y)')
A = [(409, 1444.0), (430, 1439.0), (450, 1433.5), (500, 1415), (537, 1395), (580, 1366), (620, 1348), (665, 1336), (720, 1326),
     (793, 1320.5), (830, 1312), (860, 1293), (890, 1255), (921, 1192), (950, 1110), (980, 1040), (1000, 1015),
     (1020, 1001), (1030, 994), (1040, 989), (1048, 986.3), (1060, 984.5), (1075, 983)]
Bc = [(409, 1496.0), (430, 1494.5), (450, 1492), (500, 1485), (537, 1477), (580, 1466), (620, 1455), (665, 1440), (700, 1425),
      (740, 1400), (793, 1360), (830, 1347), (860, 1346), (900, 1347), (921, 1349), (960, 1358), (1000, 1366),
      (1048, 1379), (1075, 1386)]
R = []
r1 = read_cols('A_M1.50', 1.0, A, 20, deg=1)
# columns 413-417 sit within 2.5 px of gridline -0.18 and are noisy after its subtraction;
# a second fit uses columns 418-429 only. Reported: the mean, error half the difference + fit.
Ponly = trace_cols(A, 418, 429); co = np.polyfit(Ponly[:, 0] - r1['x_px'], Ponly[:, 1], 1)
y2 = float(np.polyval(co, 0)); r1['y_alt_cols418_429'] = y2
r1['fit_err_px'] = abs(r1['y_px'] - y2) / 2 + r1['fit_err_px']; r1['y_px'] = (r1['y_px'] + y2) / 2
r1['form'] = 'mean of fits over columns 413-429 and 418-429, extended to the frame'
R.append(r1)
for xc in (0.8, 0.6, 0.4):
    R.append(read_cols('A_M1.50', xc, A, 20))
R.append(read_cols('A_M1.50', 0.0, A, 15))
R.append(read_rows('A_M1.50', 0.2, A, 1165, 1222))
R.append(read_cols('B_M2.00', 1.0, Bc, 20, deg=1))
for xc in (0.8, 0.6, 0.2, 0.0):
    R.append(read_cols('B_M2.00', xc, Bc, 20))
# B at x/c 0.4: B crosses the solid M = 1.93 calculated curve between columns 781 and 814;
# read from B's own ink left of the merge (columns 758-780, the fainter of the two lines)
# and right of it (815-836, the lower, flattening branch), parabola across the merge.
PL = trace_cols([(758, 1378.5), (770, 1370.5), (780, 1364.0)], 758, 780)
PR = trace_cols([(815, 1348.0), (825, 1346.5), (836, 1346.0)], 815, 836)
P = np.vstack([PL, PR]); xt = C.x_to_px(0.4, 1356)
co = np.polyfit(P[:, 0] - xt, P[:, 1], 2); yv = float(np.polyval(co, 0))
rms = float(np.sqrt(np.mean((P[:, 1] - np.polyval(co, P[:, 0] - xt)) ** 2)))
R.append(dict(curve='B_M2.00', xc_target=0.4, x_px=xt, y_px=yv, n=len(P), deg=2, rms=rms, gap_px=13.0,
              fit_err_px=rms / np.sqrt(len(P) - 3) + 1.5, form='bridged across the crossing with the M 1.93 curve, columns 781-814'))
R = [r for r in R if r is not None]
for r in R:
    print('%s x/c %.1f: x_px %.2f y_px %.2f n %d gap %.1f rms %.2f err %.2f px %s' % (r['curve'], r['xc_target'], r['x_px'], r['y_px'], r['n'], r['gap_px'], r['rms'], r['fit_err_px'], r.get('form', '')))
json.dump(R, open(out, 'w'), indent=1)
