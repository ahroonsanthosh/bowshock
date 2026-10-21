"""Column scans: dark runs in a band of columns around x(theta), excluding
grid-line rows. Usage: python3 -I colscan.py <image> <cal.json> <theta...>
cal.json: {"x0": px of axis value a0, "xa": a0, "x1": px of a1, "xb": a1,
           "y0": px of value v0, "v0": v0, "y1": px of v1, "v1": v1,
           "ylo": top px, "yhi": bottom px, "half": half-width of the band,
           "thr": dark threshold, "skip": [grid rows px]}"""
import json
import sys
import numpy as np
from PIL import Image

im = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
c = json.load(open(sys.argv[2]))
thr = c.get('thr', 150)
half = c.get('half', 2)
skip = c.get('skip', [])


def xpx(a):
    return c['x0'] + (a - c['xa']) * (c['x1'] - c['x0']) / (c['xb'] - c['xa'])


def val(y):
    return c['v0'] + (y - c['y0']) * (c['v1'] - c['v0']) / (c['y1'] - c['y0'])


for t in map(float, sys.argv[3:]):
    x = int(round(xpx(t)))
    band = im[c['ylo']:c['yhi'], x - half:x + half + 1].min(axis=1)
    dark = band < thr
    out = []
    y = 0
    while y < len(dark):
        if dark[y]:
            s = y
            while y < len(dark) and dark[y]:
                y += 1
            a, b = s + c['ylo'], y - 1 + c['ylo']
            mid = (a + b) / 2
            if not any(abs(mid - g) <= 4 for g in skip):
                out.append(f'{a}-{b}({val(mid):+.3f})')
        else:
            y += 1
    print(f'theta {t:g} x {x}: ' + ' '.join(out))
