# Extreme points of labelled components in plot units.
# usage: python3 -I compext.py cal.json comp.npz id [id ...]
import sys
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
import numpy as np
from readlib import Cal
cal = Cal(sys.argv[1]); z = np.load(sys.argv[2])
x0, y0, x1, y1 = z['box']; lab = z['lab']
for cid in map(int, sys.argv[3:]):
    ys, xs = np.nonzero(lab == cid)
    if len(xs) == 0:
        print(cid, 'empty'); continue
    X = xs + x0; Y = ys + y0
    u, v = cal.to_data(X.astype(float), Y.astype(float))
    def pt(i):
        return '(%.4f, %.3f)' % (u[i], v[i])
    print('comp %d n=%d  minCp %s  maxCp %s  minAlpha %s  maxAlpha %s  centroid (%.4f, %.3f)' % (
        cid, len(xs), pt(np.argmin(u)), pt(np.argmax(u)), pt(np.argmin(v)), pt(np.argmax(v)), u.mean(), v.mean()))
