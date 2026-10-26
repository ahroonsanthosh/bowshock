# usage: python3 -I listruns_v.py img cal.json comp.npz v_start v_stop v_step [xlo xhi]
import sys
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
import numpy as np
from readlib import Cal, load_gray, runs_along_iso_v
a = sys.argv
g = load_gray(a[1]); cal = Cal(a[2]); z = np.load(a[3])
x0, y0, x1, y1 = z['box']; T = int(z['T'])
lab = np.zeros(g.shape, np.int32); lab[y0:y1, x0:x1] = z['lab']
mask = lab > 0
xlo = int(a[7]) if len(a) > 7 else x0
xhi = int(a[8]) if len(a) > 8 else x1 - 1
vs = np.arange(float(a[4]), float(a[5]) + 1e-9, float(a[6]))
for v in vs:
    rs = runs_along_iso_v(g, mask, cal, v, xlo, xhi, lab, T)
    s = '  '.join('[%.4f w%d c%s]' % (r['u'], r['width'], ','.join(str(k) for k in r['labs'])) for r in rs)
    print('%5.2f: %s' % (v, s))
