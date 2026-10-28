# usage: python3 -I listruns_u.py img cal.json comp.npz u_start u_stop u_step ylo yhi
import sys
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
import numpy as np
from readlib import Cal, load_gray, runs_along_iso_u
a = sys.argv
g = load_gray(a[1]); cal = Cal(a[2]); z = np.load(a[3])
x0, y0, x1, y1 = z['box']; T = int(z['T'])
lab = np.zeros(g.shape, np.int32); lab[y0:y1, x0:x1] = z['lab']
mask = lab > 0
us = np.arange(float(a[4]), float(a[5]) + 1e-9, float(a[6]))
for u in us:
    rs = runs_along_iso_u(g, mask, cal, u, int(a[7]), int(a[8]), lab, T)
    s = '  '.join('[%.4f w%d c%s]' % (r['v'], r['width'], ','.join(str(k) for k in r['labs'])) for r in rs)
    print('%.3f: %s' % (u, s))
