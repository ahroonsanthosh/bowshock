# Shared helper: subtract every gridline's own measured cross profile from a window of the
# native scan (same method as 09_degrid.py and 16_curve.py). Returns darkness (255 - grey)
# for the whole image with the window degridded, and the paper level.
import numpy as np
from PIL import Image
def degrid(img, G, X0, Y0, X1, Y1):
    D = 255 - np.asarray(Image.open(img).convert('L')).astype(float)
    paper = float(np.median(D[Y0:Y1, X0:X1]))
    HYs = [l['a'] for l in G['horizontal']]; VXs = [l['a'] for l in G['vertical']]
    vx = lambda l, y: l['a'] + l['b'] * (y - 1500)
    hy = lambda l, x: l['a'] + l['b'] * (x - 1200)
    def binp(offs, vals):
        offs = np.array(offs); vals = np.array(vals)
        bins = np.arange(-6, 6.01, 0.25); cen = 0.5 * (bins[1:] + bins[:-1])
        med = np.array([np.median(vals[(offs >= a) & (offs < b)]) if ((offs >= a) & (offs < b)).any() else 0 for a, b in zip(bins[:-1], bins[1:])])
        return cen, np.clip(med - paper, 0, None)
    W = D.copy(); yy, xx = np.mgrid[Y0:Y1, X0:X1]; sub = W[Y0:Y1, X0:X1]
    for l in G['vertical']:
        if not (X0 - 8 < l['a'] < X1 + 8): continue
        offs, vals = [], []
        for y in range(760, 2260):
            if min(abs(y - h) for h in HYs) < 6: continue
            xc = vx(l, y); xi = int(round(xc)); p = D[y, xi - 5: xi + 6]
            if p.max() < 60 or p[0] > 35 or p[-1] > 35: continue
            offs += list(np.arange(xi - 5, xi + 6) - xc); vals += list(p)
        cen, med = binp(offs, vals); sub -= np.interp(xx - vx(l, yy), cen, med, left=0, right=0)
    for l in G['horizontal']:
        if not (Y0 - 8 < l['a'] < Y1 + 8): continue
        offs, vals = [], []
        for x in range(415, 2000):
            if min(abs(x - v) for v in VXs) < 6: continue
            yc = hy(l, x); yi = int(round(yc)); p = D[yi - 5: yi + 6, x]
            if p.max() < 60 or p[0] > 35 or p[-1] > 35: continue
            offs += list(np.arange(yi - 5, yi + 6) - yc); vals += list(p)
        cen, med = binp(offs, vals); sub -= np.interp(yy - hy(l, xx), cen, med, left=0, right=0)
    W[Y0:Y1, X0:X1] = sub
    return W, paper
