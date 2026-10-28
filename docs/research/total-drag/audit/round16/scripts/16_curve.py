# Read the faired curve through the Mach 2.41 measurements.
# 1. Gridlines are subtracted (each line's own measured cross profile, as in 09_degrid.py)
#    over the region of the curve.
# 2. The curve centre is traced on the result: by rows on the steep part near x/c 1.0, by
#    columns elsewhere, in a +-3.5 px window placed by rough anchors read by eye. Scan lines
#    inside a symbol box, on the dashed Prandtl-Meyer line, or within 2.5 px of a gridline
#    centre are not used.
# 3. At each x/c wanted, the curve is read from the traced ink on both sides of the target
#    column within +-W px (W = 10 px, or wider where symbols hide the curve), by a straight
#    line (one side, or both sides nearly flat) or a parabola (both sides, curved). The
#    error is the fit rms over sqrt(n), plus the half-width of any hidden gap scaled by the
#    local change in slope, plus 1 px for the ink centre (added later with the calibration).
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
C = __import__('13_calib')
img, gf, out = sys.argv[1], sys.argv[2], sys.argv[3]
C.load(gf)
G = json.load(open(gf))
D = 255 - np.asarray(Image.open(img).convert('L')).astype(float)
X0, Y0, X1, Y1 = 395, 1430, 1070, 1815
paper = float(np.median(D[Y0:Y1, X0:X1]))
HYs = [l['a'] for l in G['horizontal']]; VXs = [l['a'] for l in G['vertical']]
def vx(l, y): return l['a'] + l['b'] * (y - 1500)
def hy(l, x): return l['a'] + l['b'] * (x - 1200)
def bin_profile(offs, vals):
    offs = np.array(offs); vals = np.array(vals)
    bins = np.arange(-6, 6.01, 0.25); cen = 0.5 * (bins[1:] + bins[:-1])
    med = np.array([np.median(vals[(offs >= a) & (offs < b)]) if ((offs >= a) & (offs < b)).any() else 0 for a, b in zip(bins[:-1], bins[1:])])
    return cen, np.clip(med - paper, 0, None)
def profile_v(l):
    offs, vals = [], []
    for y in range(760, 2260):
        if min(abs(y - h) for h in HYs) < 6: continue
        xc = vx(l, y); xi = int(round(xc)); p = D[y, xi - 5: xi + 6]
        if p.max() < 60 or p[0] > 35 or p[-1] > 35: continue
        offs += list(np.arange(xi - 5, xi + 6) - xc); vals += list(p)
    return bin_profile(offs, vals)
def profile_h(l):
    offs, vals = [], []
    for x in range(415, 2000):
        if min(abs(x - v) for v in VXs) < 6: continue
        yc = hy(l, x); yi = int(round(yc)); p = D[yi - 5: yi + 6, x]
        if p.max() < 60 or p[0] > 35 or p[-1] > 35: continue
        offs += list(np.arange(yi - 5, yi + 6) - yc); vals += list(p)
    return bin_profile(offs, vals)
W = D.copy()
yy, xx = np.mgrid[Y0:Y1, X0:X1]
sub = W[Y0:Y1, X0:X1]
for l in G['vertical']:
    if X0 - 8 < l['a'] < X1 + 8:
        cen, med = profile_v(l); sub -= np.interp(xx - vx(l, yy), cen, med, left=0, right=0)
for l in G['horizontal']:
    if Y0 - 8 < l['a'] < Y1 + 8:
        cen, med = profile_h(l); sub -= np.interp(yy - hy(l, xx), cen, med, left=0, right=0)
W[Y0:Y1, X0:X1] = sub
def near_v(x, y, d): return any(abs(x - vx(l, y)) < d for l in G['vertical'])
def near_h(x, y, d): return any(abs(y - hy(l, x)) < d for l in G['horizontal'])
BOX = [(398, 1762, 422, 1786), (398, 1803, 421, 1831), (527, 1494, 549, 1524), (654, 1488, 676, 1528),
       (782, 1455, 805, 1489), (910, 1468, 933, 1502), (1038, 1476, 1060, 1505)]
def in_box(x, y): return any(a <= x <= c and b <= y <= d for a, b, c, d in BOX)
FLOOR = 40
def centroid(prof, lo):
    w = np.clip(prof - FLOOR, 0, None)
    if w.sum() < 30: return None
    return lo + (np.arange(len(prof)) * w).sum() / w.sum()
pts = []   # (x, y, part)
# Part A: rows, steep part. Anchors (y, x) read by eye from the raw scan.
ANC_A = [(1800, 409.8), (1786, 413.3), (1758, 418.3), (1700, 431.0), (1640, 447.0), (1600, 460.0),
         (1580, 468.6), (1566, 476.0), (1550, 486.5), (1532, 502.3)]
ay = np.array([a[0] for a in ANC_A])[::-1]; ax = np.array([a[1] for a in ANC_A])[::-1]
for y in range(1531, 1801):
    pred = float(np.interp(y, ay, ax))
    if in_box(pred, y) or 1558 <= y <= 1567 or near_h(pred, y, 2.5) or near_v(pred, y, 2.5): continue
    lo = int(np.floor(pred - 3.5)); hi = int(np.ceil(pred + 3.5))
    c = centroid(W[y, lo:hi + 1], lo)
    if c is None or abs(c - pred) > 3: continue
    pts.append((c, float(y), 'A'))
# Part B: columns. Anchors (x, y).
SEG = [
  [(500, 1528.0), (512, 1523.7), (527, 1515.0)],
  [(549, 1507.5), (560, 1505.5), (600, 1504.5), (640, 1507.0), (654, 1508.5)],
  [(676, 1509.0), (700, 1507.5), (740, 1498.0), (770, 1481.0), (782, 1477.0)],
  [(805, 1476.0), (840, 1481.5), (880, 1487.0), (910, 1490.5)],
  [(933, 1492.5), (960, 1494.5), (1000, 1496.0), (1041, 1495.5)],
]
for seg in SEG:
    sx = np.array([a[0] for a in seg], float); sy = np.array([a[1] for a in seg], float)
    for x in range(int(sx[0]), int(sx[-1]) + 1):
        pred = float(np.interp(x, sx, sy))
        if in_box(x, pred) or 936 <= x <= 960 or near_v(x, pred, 2.5): continue
        lo = int(np.floor(pred - 3.5)); hi = int(np.ceil(pred + 3.5))
        c = centroid(W[lo:hi + 1, x], lo)
        if c is None or abs(c - pred) > 3: continue
        pts.append((float(x), c, 'B' + ('g' if near_h(x, c, 2.5) else '')))
P = np.array([(p[0], p[1]) for p in pts])
kinds = [p[2] for p in pts]
with open(out.replace('.json', '_trace.csv'), 'w') as f:
    f.write('x_px,y_px,part\n')
    for (x, y), k in zip(P, kinds): f.write('%.2f,%.2f,%s\n' % (x, y, k))
def read_at(xc, half=10, gap_note=''):
    # target column at the curve's height: iterate once
    yguess = float(np.interp(C.x_to_px(xc, 1500), P[np.argsort(P[:, 0])][:, 0], P[np.argsort(P[:, 0])][:, 1]))
    xt = C.x_to_px(xc, yguess)
    sel = np.abs(P[:, 0] - xt) <= half
    xs, ys = P[sel, 0], P[sel, 1]
    left, right = (xs < xt).sum(), (xs > xt).sum()
    deg = 2 if (left >= 3 and right >= 3) else 1
    coef = np.polyfit(xs - xt, ys, deg)
    yv = float(np.polyval(coef, 0.0))
    r = ys - np.polyval(coef, xs - xt)
    rms = float(np.sqrt((r ** 2).mean()))
    gap = float(np.min(np.abs(xs - xt)))
    # gap term: second derivative times gap^2/2 (curvature over the hidden span), at least 0.2 px per 5 px of gap
    curv = abs(coef[0]) * 2 if deg == 2 else 0.0
    gap_err = max(0.5 * curv * gap ** 2, 0.2 * gap / 5.0)
    return dict(xc_target=xc, x_px=xt, y_px=yv, n=int(sel.sum()), left=int(left), right=int(right), deg=deg,
                rms=rms, gap_px=gap, fit_err_px=rms / np.sqrt(max(sel.sum() - deg - 1, 1)) + gap_err, note=gap_note)
def read_steep(xc, ylo, yhi):
    # steep part: x as a function of y, find where the curve meets the column of x/c
    sel = (P[:, 1] >= ylo) & (P[:, 1] <= yhi) & np.array([k == 'A' for k in kinds])
    xs, ys = P[sel, 0], P[sel, 1]
    coef = np.polyfit(ys - 1570, xs, 2)
    yv = 1570.0
    for _ in range(20):
        xt = C.x_to_px(xc, yv)
        # solve polyval(coef, y-1570) = xt
        a, b, c = coef; c = c - xt
        roots = np.roots([a, b, c]); roots = roots[np.isreal(roots)].real + 1570
        yv = float(roots[np.argmin(np.abs(roots - yv))])
    r = xs - np.polyval(coef, ys - 1570)
    rms = float(np.sqrt((r ** 2).mean()))
    slope = abs(2 * coef[0] * (yv - 1570) + coef[1])   # px of x per px of y
    gap = float(np.min(np.abs(ys - yv)))
    yerr = (rms / np.sqrt(max(sel.sum() - 3, 1))) / max(slope, 0.05) + 0.2 * gap / 5.0
    return dict(xc_target=xc, x_px=C.x_to_px(xc, yv), y_px=yv, n=int(sel.sum()), deg=2, rms=rms, gap_px=gap,
                fit_err_px=yerr, dxdy=slope, note='steep: x(y) parabola over rows %d-%d, solved for the column of x/c' % (ylo, yhi))
R = {}
R['0.9'] = read_steep(0.9, 1540, 1600)
R['0.8'] = read_at(0.8, half=22, gap_note='hidden by the two symbols at x/c 0.8 (columns 527-549); bridged from ink on both sides')
R['0.7'] = read_at(0.7)
R['0.6'] = read_at(0.6, half=24, gap_note='hidden by the two symbols at x/c 0.6 (columns 654-676); curve runs along gridline -0.16, read after gridline subtraction')
R['0.5'] = read_at(0.5)
R['0.4'] = read_at(0.4, half=24, gap_note='hidden by the two symbols at x/c 0.4 (columns 782-805); bridged across the peak')
R['0.3'] = read_at(0.3)
R['0.2'] = read_at(0.2, half=24, gap_note='hidden by the two symbols at x/c 0.2 (columns 910-933); right side partly lost to the dashed line (936-960)')
R['0.1'] = read_at(0.1, half=12, gap_note='dashed Prandtl-Meyer line crosses at columns 936-960, not used')
R['0.0'] = read_at(0.0, half=26, gap_note='curve ends inside the symbols at x/c 0; read by extending the ink of columns 1023-1037 to the column of x/c 0 (11 px)')
R['0.2_wide'] = read_at(0.2, half=52, gap_note='check only: parabola over columns 869-972 (dashed line columns 936-960 excluded)')
for k, v in R.items():
    print('x/c %s: x_px %.2f y_px %.2f  n %d (L%s R%s) deg %d rms %.2f gap %.1f px  fit err %.2f px  %s' % (
        k, v['x_px'], v['y_px'], v['n'], v.get('left', '-'), v.get('right', '-'), v['deg'], v['rms'], v['gap_px'], v['fit_err_px'], v['note']))
json.dump(R, open(out, 'w'), indent=1)
np.save(out.replace('.json', '_degrid.npy'), W[Y0:Y1, X0:X1])
