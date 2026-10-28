"""Locate small marks (inked dots or faint pencil marks) inside symbols.
usage: python -I dots.py gray.png calib.json fit.json id:thr:radius[:refkind] ...
refkind = ref (outline reference point) or centroid. Prints the darkness-weighted
centre of pixels darker than thr (0-255 gray) within radius px of the reference,
excluding grid-line bands, and its offset from the reference in px and axis units."""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage
g = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
cal = json.load(open(sys.argv[2])); fits = {f['id']: f for f in json.load(open(sys.argv[3]))}
cM = np.array(cal['affine']['M']); cC = np.array(cal['affine']['CD'])
for spec in sys.argv[4:]:
    parts = spec.split(':'); sid, thr, rad = parts[0], float(parts[1]), float(parts[2])
    kind = parts[3] if len(parts) > 3 else 'ref'
    f = fits[sid]; x0, y0 = f['ref_px'] if kind == 'ref' else f['centroid_px']
    X0, Y0 = int(x0) - 15, int(y0) - 15
    sub = g[Y0:Y0+31, X0:X0+31]
    yy, xx = np.mgrid[Y0:Y0+31, X0:X0+31]
    gd = np.full(sub.shape, 1e9)
    for L in cal['lines']:
        d = np.abs(yy - (L['a'] + L['b']*xx)) if L['axis'] == 'M' else np.abs(xx - (L['a'] + L['b']*yy))
        gd = np.minimum(gd, d)
    m = (sub < thr) & (np.hypot(xx - x0, yy - y0) <= rad) & (gd > 2.5)
    lab, n = ndimage.label(m)
    print(sid, kind, 'ref px (%.1f, %.1f)' % (x0, y0), 'components:', n)
    for i in range(1, n+1):
        c = lab == i
        w = (255 - sub)[c]
        cx = (xx[c]*w).sum()/w.sum(); cy = (yy[c]*w).sum()/w.sum()
        dM = cM[1]*(cx-x0) + cM[2]*(cy-y0); dC = cC[1]*(cx-x0) + cC[2]*(cy-y0)
        print('   blob %d: %d px, min gray %d, centre (%.1f, %.1f), offset dM=%+.4f dCD=%+.4f (%.1f px, %.1f px)' % (
            i, c.sum(), sub[c].min(), cx, cy, dM, dC, dM/0.004084, dC/0.002038))
