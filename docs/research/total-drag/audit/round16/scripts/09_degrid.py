# Subtract the vertical and horizontal gridlines from a window of the native scan.
# Each gridline's cross profile (darkness against perpendicular offset, 0.25 px bins) is
# measured on that line's own clean crossings (same cleanliness test as 04_gridfit.py),
# then the profile is subtracted along the fitted line. Ink is not exactly additive, so
# the result is only a visual aid for seeing strokes hidden under gridlines; no value is
# read from it without a check on the raw scan.
# usage: 09_degrid.py in.jpg gridfit.json out.png x0 y0 x1 y1 scale
import sys, json
import numpy as np
from PIL import Image, ImageDraw
src, gf, dst = sys.argv[1], sys.argv[2], sys.argv[3]
x0, y0, x1, y1, s = map(int, sys.argv[4:9])
D = 255 - np.asarray(Image.open(src).convert('L')).astype(float)
G = json.load(open(gf))
paper = np.median(D[y0:y1, x0:x1])
def vx(l, y): return l['a'] + l['b'] * (y - 1500)
def hy(l, x): return l['a'] + l['b'] * (x - 1200)
HYs = [l['a'] for l in G['horizontal']]; VXs = [l['a'] for l in G['vertical']]
def profile_v(l):
    offs, vals = [], []
    for y in range(760, 2260):
        if min(abs(y - h) for h in HYs) < 6: continue
        xc = vx(l, y); xi = int(round(xc))
        p = D[y, xi - 5: xi + 6]
        if p.max() < 60 or p[0] > 35 or p[-1] > 35: continue
        for k in range(11):
            offs.append(xi - 5 + k - xc); vals.append(p[k])
    return bin_profile(offs, vals)
def profile_h(l):
    offs, vals = [], []
    for x in range(415, 2000):
        if min(abs(x - v) for v in VXs) < 6: continue
        yc = hy(l, x); yi = int(round(yc))
        p = D[yi - 5: yi + 6, x]
        if p.max() < 60 or p[0] > 35 or p[-1] > 35: continue
        for k in range(11):
            offs.append(yi - 5 + k - yc); vals.append(p[k])
    return bin_profile(offs, vals)
def bin_profile(offs, vals):
    offs = np.array(offs); vals = np.array(vals)
    bins = np.arange(-6, 6.01, 0.25)
    cen = 0.5 * (bins[1:] + bins[:-1])
    med = np.array([np.median(vals[(offs >= a) & (offs < b)]) if ((offs >= a) & (offs < b)).any() else 0
                    for a, b in zip(bins[:-1], bins[1:])])
    med = np.clip(med - paper, 0, None)
    return cen, med
W = D[y0:y1, x0:x1].copy()
yy, xx = np.mgrid[y0:y1, x0:x1]
for l in G['vertical']:
    if not (x0 - 8 < l['a'] < x1 + 8): continue
    cen, med = profile_v(l)
    off = xx - vx(l, yy)
    W -= np.interp(off, cen, med, left=0, right=0)
for l in G['horizontal']:
    if not (y0 - 8 < l['a'] < y1 + 8): continue
    cen, med = profile_h(l)
    off = yy - hy(l, xx)
    W -= np.interp(off, cen, med, left=0, right=0)
W = np.clip(W, paper, 255)
g = 255 - W
lo, hi = np.percentile(g, 0.5), np.percentile(g, 99.5)
g = np.clip((g - lo) / max(hi - lo, 1) * 255, 0, 255).astype(np.uint8)
im = Image.fromarray(g).resize(((x1 - x0) * s, (y1 - y0) * s), Image.BICUBIC).convert('RGB')
pad = 30
can = Image.new('RGB', (im.width + pad, im.height + pad), (255, 255, 255))
can.paste(im, (pad, pad))
d = ImageDraw.Draw(can)
for x in range(x0, x1 + 1):
    if x % 5 == 0:
        X = pad + (x - x0) * s + s // 2
        d.line([(X, pad - 8), (X, pad)], fill=(200, 0, 0))
        if x % 10 == 0: d.text((X - 10, 2), str(x), fill=(200, 0, 0))
for y in range(y0, y1 + 1):
    if y % 5 == 0:
        Y = pad + (y - y0) * s + s // 2
        d.line([(pad - 8, Y), (pad, Y)], fill=(0, 0, 200))
        if y % 10 == 0: d.text((0, Y - 12), str(y), fill=(0, 0, 200))
can.save(dst)
np.save(dst.replace('.png', '.npy'), 255 - W)
print(dst, can.size, 'paper darkness', paper)
