"""Character map of darkness around a fitted symbol, in figure orientation
(a = +M to the right, b = +CD up), 1 char per page pixel.
usage: python -I charmap.py gray.png fit.json id half [ref|centroid]"""
import sys, json
import numpy as np
from PIL import Image
g = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
f = {x['id']: x for x in json.load(open(sys.argv[2]))}[sys.argv[3]]
h = int(sys.argv[4]); kind = sys.argv[5] if len(sys.argv) > 5 else 'ref'
x0, y0 = f['ref_px'] if kind == 'ref' else f['centroid_px']
print('%s %s at page (%.1f, %.1f); columns a=%d..%d, a=0 marked by | in header' % (f['id'], kind, x0, y0, -h, h))
print('    ' + ''.join('|' if a == 0 else ('^' if a % 5 == 0 else ' ') for a in range(-h, h+1)))
for b in range(h, -h-1, -1):
    s = ''
    for a in range(-h, h+1):
        v = g[int(round(y0 - a)), int(round(x0 - b))]
        s += '#' if v < 90 else ('+' if v < 160 else ('.' if v < 215 else ' '))
    print('%+3d %s%s' % (b, s, '  <' if b == 0 else ''))
