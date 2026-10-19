"""NACA TR 1109 (Chapman, Wimbrow and Kester 1952; NTRS 19930090968) fig. 29, PDF p. 19 at 300 dpi: summary of
faired curves of base pressure p_b/p_inf on blunt-trailing-edge wings of the thickness group, (a) turbulent
against c/[h Re^(1/5)], (b) laminar against c/[h Re^(1/2)], at M 1.5, 2.0 and 3.1. FIRST READING (second pending).
Calibration: grid lines from row and column darkness profiles (grey < 180, dark > 70% over 30 px bands) at three
bands each, fitted as straight lines (tables HA, VA, HB, VB below; residuals printed). Curves: dark runs (grey <
150, at most 7 px) in the column 8 px to the right of each abscissa (clear of the vertical grid line), grid-line
rows excluded (within 2.5 px); assignment to the Mach numbers from the printed labels (see the zoom
img/tr1109/f29a_zoom.png, f29b_zoom.png). P_B = (p_b/p_inf - 1) 2 / (1.4 M^2)."""
import numpy as np
from PIL import Image
a = np.array(Image.open('img/tr1109/p19.png').convert('L')).astype(int)
def lines(img, lo, hi, bands, axis, thr=180):
    out = {}
    for b in bands:
        if axis == 'h':
            prof = (img[lo:hi, b:b + 30] < thr).mean(axis=1)
        else:
            prof = (img[b:b + 30, lo:hi] < thr).mean(axis=0)
        idx = [lo + i for i, v in enumerate(prof) if v > 0.7]
        g = []
        for r in idx:
            if g and r - g[-1][-1] <= 1:
                g[-1].append(r)
            else:
                g.append([r])
        out[b] = [float(np.mean(q)) for q in g]
    return out
def fit(pairs):
    s, c = np.array(pairs).T
    return np.polyfit(s, c, 1)
def panel(name, ylo, yhi, yvals, xlo, xhi, xvals, xlabel):
    hb = lines(a, ylo, yhi, (450, 900, 1200), 'h')
    vb = lines(a, xlo, xhi, (ylo + 60, (ylo + yhi) // 2, yhi - 90), 'v')
    # horizontal: match by nearest expected position, using the 1.0 and 0 frame lines found in every band
    H = {}
    for b, ys in hb.items():
        top, bot = min(ys), max(ys)
        for v in yvals:
            exp = bot - (bot - top) * v / 1.0
            near = [y for y in ys if abs(y - exp) < 6]
            if near:
                H.setdefault(v, []).append((b + 15, min(near, key=lambda y: abs(y - exp))))
    V = {}
    for b, xs in vb.items():
        left, right = min(xs), max(xs)
        for u in xvals:
            exp = left + (right - left) * (u - xvals[0]) / (xvals[-1] - xvals[0])
            near = [x for x in xs if abs(x - exp) < 6]
            if near:
                V.setdefault(u, []).append((b + 15, min(near, key=lambda x: abs(x - exp))))
    Hf = {v: fit(p) for v, p in H.items() if len(p) >= 2}
    Vf = {u: fit(p) for u, p in V.items() if len(p) >= 2}
    print('%s: horizontal lines %s; vertical lines %s' % (name, sorted(Hf), sorted(Vf)))
    def val_y(x, y):
        ks = sorted(Hf)
        for k1, k2 in zip(ks, ks[1:]):
            y1, y2 = np.polyval(Hf[k1], x), np.polyval(Hf[k2], x)
            if y2 <= y <= y1:
                return k1 + (k2 - k1) * (y1 - y) / (y1 - y2)
    def x_of(u, y):
        ks = sorted(Vf)
        for k1, k2 in zip(ks, ks[1:]):
            if k1 <= u <= k2:
                x1, x2 = np.polyval(Vf[k1], y), np.polyval(Vf[k2], y)
                return x1 + (x2 - x1) * (u - k1) / (k2 - k1)
    return Hf, Vf, val_y, x_of
def runs(x, ylo, yhi, Hf):
    col = a[ylo:yhi, x] < 150
    grid = [np.polyval(f, x) for f in Hf.values()]
    out = []
    y = 0
    while y < len(col):
        if col[y]:
            z = y
            while z + 1 < len(col) and col[z + 1]:
                z += 1
            yc = ylo + 0.5 * (y + z)
            if z - y + 1 <= 7 and min(abs(yc - g) for g in grid) > 2.5:
                out.append(yc)
            y = z + 1
        else:
            y += 1
    return out
for name, ylo, yhi, xs_read, xvals, lab in (
        ('(a) turbulent', 740, 1300, (0.5, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5), [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0], 'c/[h Re^(1/5)]'),
        ('(b) laminar', 1400, 1960, (0.01, 0.015, 0.02, 0.03, 0.04, 0.06, 0.08, 0.10, 0.12, 0.14, 0.16, 0.18), [0.0, 0.02, 0.04, 0.06, 0.08, 0.10, 0.12, 0.14, 0.16, 0.18, 0.20], 'c/[h Re^(1/2)]')):
    Hf, Vf, val_y, x_of = panel(name, ylo, yhi, [0.0, 0.2, 0.4, 0.6, 0.8, 1.0], 320, 1320, xvals, lab)
    print('  %s   p_b/p_inf of the dark runs (curves; labels and leaders excluded by eye in the assignment)' % lab)
    for u in xs_read:
        ymid = 0.5 * (ylo + yhi)
        x = int(round(x_of(u, ymid))) + 8
        r = runs(x, int(np.polyval(Hf[1.0], x)) + 4, int(np.polyval(Hf[0.0], x)) - 3, Hf)
        print('  %5.3f: %s' % (u, '  '.join('%.3f' % val_y(x, y) for y in r)))
