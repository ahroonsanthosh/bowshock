"""Read the faired CA curves of NASA TN D-4014 figs. 5 and 6 at alpha = 0, and the symbol nearest
alpha 0, on 300 dpi page images, using the grid model of d4014_grid.py.

Calibration: horizontal grid lines (every 0.025 in CA on these panels) fitted as straight lines;
a pixel (x, y) maps to CA by linear interpolation between the two lines that bracket it at that x
(each line evaluated with its own fit when its fitted x-span covers x, else with the median slope).
The CA value of each line is assigned from the frame zero line and the 0.1 label spacing (checked on
zoom views against the printed labels). Alpha from the vertical lines (every 1 deg), likewise.

Curve: in each pixel column within +-ALPHA_WIN deg of alpha 0, columns where the only dark run within
+-20 px of the seed row (grid-line rows removed) is at most 4 px tall (so symbol columns drop out); RANSAC fit of a quadratic in alpha to the runs within
window, tolerance 1.2 px; CA at alpha 0 from the final least-squares fit on inliers.

Symbol: the connected dark component around the seed point nearest alpha 0 is not separable from the
curve, so the symbol is located from the column-run profile: its vertical edges are runs taller than
6 px; the bounding box is the extent of those runs; reported as the box centre and, for triangles,
also the centroid (one third of the height above the base).

Usage: python3 -I d4014_curve.py PAGE  (panels defined below)."""
import sys
import json
import numpy as np
from PIL import Image

PANELS = {
    # page: image, grid json, zero-line y at x_ref (frame bottom), px per unit CA (approx, for labels),
    # alpha-0 x at y_ref and px per deg (approx, for line labels), curves {name: seed CA}
    37: dict(img='img/d4014hi-37.png', grid='data/d4014/grid37.json', zero_y=1895.5, ppu=1126.0,
             x_ref=1195, a0x=846.9, a_y=1337, ppd=29.2,
             curves={'M1.80': 0.509, 'M2.30': 0.412, 'M2.96': 0.334}),
    # pages 25 and 28: horizontal lines measured in the band x 1840-1900 (row profiles, dark > 85%),
    # where they are level within 0.5 px over x 1500-1900; carried level to alpha 0 (x about 787 / 910).
    25: dict(img='img/d4014hi-25.png', grid='data/d4014/grid25.json', zero_y=1864.5, ppu=1400.0,
             x_ref=1870, a0x=786.35, a_y=1250, ppd=36.1, atol=0.1,
             hlines=[(0.0, 1864.5), (0.1, 1723.5), (0.15, 1654.0), (0.2, 1584.5), (0.25, 1513.5), (0.3, 1443.5),
                     (0.35, 1374.0), (0.4, 1304.5), (0.45, 1234.0), (0.5, 1165.0), (0.6, 1025.5)],
             curves={'M1.50': (0.346, 9), 'M1.80': (0.332, 9), 'M2.30': 0.290, 'M2.96': 0.240}),
    # page 28: horizontal lines observed near alpha 0 (fitted spans x 648 to 950); 1-deg lines synthetic
    28: dict(img='img/d4014hi-28.png', grid='data/d4014/grid28.json', zero_y=1925.86, ppu=1421.0,
             x_ref=910, a0x=910.3, a_y=1800, ppd=36.04, atol=0.1, vlines=(622.0, 36.04, 1800.0, -0.0069),
             curves={'M1.50': 0.535, 'M1.80': 0.470, 'M2.30': 0.380, 'M2.96': 0.305}),
    34: dict(img='img/d4014hi-34.png', grid='data/d4014/grid34.json', zero_y=1918.05, ppu=1151.0,
             x_ref=1285, a0x=938.25, a_y=1345, ppd=29.3,
             curves={'M1.80': 0.369, 'M2.30': 0.325, 'M2.96': 0.267}),
}
ALPHA_WIN = 3.0
import os
LOCAL_ONLY = os.environ.get('LOCAL_ONLY', '1') == '1'  # interpolate only between lines observed at x


def load(page):
    P = PANELS[page]
    a = np.array(Image.open(P['img']).convert('L')).astype(int)
    G = json.load(open(P['grid']))
    if 'hlines' in P:
        # panels whose horizontal lines are lost near alpha 0 in the 1-bit scan: lines measured at the
        # right-hand edge band and carried across level (tilt bound stated in the panel note)
        G['h'] = [{'slope': 0.0, 'icpt': y, 'n': 99, 'smin': 0, 'smax': 4000, 'maxres': 0.0} for _, y in P['hlines']]
    if 'vlines' in P:
        # dense grid paper: the 1-deg lines located by column profiles (dark > 80%) in y 1700-1900,
        # spacing from the frame (alpha -8) to alpha 20, lean measured between y 1075 and 1800
        x8, ppd, yref, lean = P['vlines']
        G['v'] = [{'slope': lean, 'icpt': x8 + ppd * (k + 8) - lean * yref, 'n': 99, 'smin': 0, 'smax': 4000,
                   'maxres': 0.0} for k in range(-8, 21)]
    return P, a, G


def line_y(L, x, slope_med):
    if L['smin'] - 30 <= x <= L['smax'] + 30:
        return L['slope'] * x + L['icpt']
    # carry the line from the nearest end of its fitted span with the median slope
    xe = L['smin'] if x < L['smin'] else L['smax']
    return L['slope'] * xe + L['icpt'] + slope_med * (x - xe)


class Calib:
    def __init__(self, P, G, a):
        self.P = P
        hs = [L for L in G['h'] if L['n'] >= 5]
        long_ = [L['slope'] for L in hs if L['smax'] - L['smin'] > 500]
        self.hslope = float(np.median(long_))
        xr = P['x_ref']
        # assign CA to lines: nearest multiple of 0.025 by position relative to the zero line
        self.h = []
        for L in hs:
            y = line_y(L, xr, self.hslope)
            ca = (P['zero_y'] - y) / P['ppu']
            k = round(ca / 0.025)
            if abs(ca - 0.025 * k) < 0.006:
                self.h.append((0.025 * k, L))
        # keep one line per CA value: the one with most bands
        best = {}
        for ca, L in self.h:
            key = round(ca, 3)
            if key not in best or L['n'] > best[key]['n']:
                best[key] = L
        self.h = sorted(best.items())
        vs = [L for L in G['v'] if L['n'] >= 8 and L['smax'] - L['smin'] > 300]
        self.vslope = float(np.median([L['slope'] for L in vs]))
        self.v = []
        for L in vs:
            x = L['slope'] * P['a_y'] + L['icpt']
            al = (x - P['a0x']) / P['ppd']
            k = round(al)
            if abs(al - k) < P.get('atol', 0.25):
                self.v.append((float(k), L))
        bestv = {}
        for al, L in self.v:
            if al not in bestv or L['n'] > bestv[al]['n']:
                bestv[al] = L
        self.v = sorted(bestv.items())

    def hy(self, L, x):
        return line_y(L, x, self.hslope)

    def vx(self, L, y):
        if L['smin'] - 30 <= y <= L['smax'] + 30:
            return L['slope'] * y + L['icpt']
        ye = L['smin'] if y < L['smin'] else L['smax']
        return L['slope'] * ye + L['icpt'] + self.vslope * (y - ye)

    def local(self, x):
        """Lines whose own fitted span covers x (observed there, not carried)."""
        return [(ca, L) for ca, L in self.h if (L['smin'] - 30 <= x <= L['smax'] + 30) or not LOCAL_ONLY]

    def ca(self, x, y):
        ys = [(ca, self.hy(L, x)) for ca, L in self.local(x)]
        for (c1, y1), (c2, y2) in zip(ys, ys[1:]):
            if y2 <= y <= y1:
                return c1 + (c2 - c1) * (y1 - y) / (y1 - y2)
        return None

    def alpha(self, x, y):
        xs = [(al, self.vx(L, y)) for al, L in self.v]
        for (a1, x1), (a2, x2) in zip(xs, xs[1:]):
            if x1 <= x <= x2:
                return a1 + (a2 - a1) * (x - x1) / (x2 - x1)
        return None

    def x_of_alpha(self, al, y):
        xs = [(a_, self.vx(L, y)) for a_, L in self.v]
        for (a1, x1), (a2, x2) in zip(xs, xs[1:]):
            if a1 <= al <= a2:
                return x1 + (x2 - x1) * (al - a1) / (a2 - a1)
        return None

    def y_of_ca(self, c, x):
        ys = [(ca, self.hy(L, x)) for ca, L in self.local(x)]
        for (c1, y1), (c2, y2) in zip(ys, ys[1:]):
            if c1 <= c <= c2:
                return y1 + (y2 - y1) * (c - c1) / (c2 - c1)
        return None

    def local_ppu(self, x, c):
        ys = [(ca, self.hy(L, x)) for ca, L in self.local(x)]
        for (c1, y1), (c2, y2) in zip(ys, ys[1:]):
            if c1 <= c <= c2:
                return (y1 - y2) / (c2 - c1)
        return None


def column_runs(a, x, ylo, yhi):
    col = a[ylo:yhi, x] < 128
    out = []
    y = 0
    while y < len(col):
        if col[y]:
            z = y
            while z + 1 < len(col) and col[z + 1]:
                z += 1
            out.append((ylo + y, ylo + z))
            y = z + 1
        else:
            y += 1
    return out


def read_curve(a, C, seed, rng, half=20):
    if isinstance(seed, tuple):
        seed, half = seed
    """Curve-only columns: within +-half px of the seed row (grid-line rows removed) the column has
    exactly one dark run, at most 4 px tall. Symbol columns (two edges, or a tall vertical edge) drop
    out; the RANSAC tolerance removes the rest."""
    y_seed = C.y_of_ca(seed, C.x_of_alpha(0.0, 1300) or 0)
    x_lo = int(C.x_of_alpha(-ALPHA_WIN, y_seed))
    x_hi = int(C.x_of_alpha(ALPHA_WIN, y_seed)) + 1
    pts = []
    for x in range(x_lo, x_hi):
        runs = []
        for y0, y1 in column_runs(a, x, int(y_seed - half), int(y_seed + half)):
            yc = 0.5 * (y0 + y1)
            if any(abs(yc - C.hy(L, x)) < 2.5 for _, L in C.h) and y1 - y0 + 1 <= 5:
                continue
            runs.append((y0, y1))
        if len(runs) != 1 or runs[0][1] - runs[0][0] + 1 > 4:
            continue
        yc = 0.5 * (runs[0][0] + runs[0][1])
        c = C.ca(x, yc)
        al = C.alpha(x, yc)
        if c is None or al is None:
            continue
        pts.append((al, c, x, yc))
    P = np.array(pts)
    tol = 1.2 / C.local_ppu(x_lo, seed)
    best = None
    for _ in range(3000):
        idx = rng.choice(len(P), 3, replace=False)
        if np.ptp(P[idx, 0]) < 1.0:
            continue
        cf = np.polyfit(P[idx, 0], P[idx, 1], 2)
        inl = np.abs(np.polyval(cf, P[:, 0]) - P[:, 1]) < tol
        if best is None or inl.sum() > best.sum():
            best = inl
    cf = np.polyfit(P[best, 0], P[best, 1], 2)
    res = P[best, 1] - np.polyval(cf, P[best, 0])
    return float(np.polyval(cf, 0.0)), float(res.std()), int(best.sum()), len(P), P[best]


if __name__ == '__main__':
    page = int(sys.argv[1])
    P, a, G = load(page)
    C = Calib(P, G, a)
    print('page', page, ': horizontal lines used (CA, y at x_ref, slope px/1000, n):')
    for ca, L in C.h:
        print('   %.3f  %8.2f  %+5.2f  %d' % (ca, C.hy(L, P['x_ref']), L['slope'] * 1000, L['n']))
    print('vertical lines used (alpha, x at a_y):', ', '.join('%g:%.1f' % (al, C.vx(L, P['a_y'])) for al, L in C.v))
    rng = np.random.default_rng(1)
    out = {}
    for name, seed in P['curves'].items():
        v, sd, n, ntot, inl = read_curve(a, C, seed, rng)
        x0 = C.x_of_alpha(0.0, C.y_of_ca(v, 1000))
        y0 = C.y_of_ca(v, x0)
        print('%s: curve CA(alpha 0) = %.4f  (inlier sd %.4f, %d of %d runs, alpha %.2f..%.2f); at x %.1f y %.1f, local %.1f px per 0.1'
              % (name, v, sd, n, ntot, inl[:, 0].min(), inl[:, 0].max(), x0, y0, 0.1 * C.local_ppu(x0, v)))
        out[name] = dict(ca=v, sd=sd, n=n, x=x0, y=y0)
    json.dump(out, open('data/d4014/curve%d.json' % page, 'w'), indent=1)
