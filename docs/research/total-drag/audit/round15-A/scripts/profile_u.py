# usage: python3 -I profile_u.py img cal.json u v_lo v_hi   -> gray along iso-u between v_lo and v_hi
import sys
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
import numpy as np
from readlib import Cal, load_gray
a = sys.argv
g = load_gray(a[1]); cal = Cal(a[2]); u = float(a[3]); vlo, vhi = float(a[4]), float(a[5])
_, ya = cal.to_px(u, vlo); _, yb = cal.to_px(u, vhi)
y0, y1 = int(min(ya, yb)), int(max(ya, yb))
out = []
for y in range(y0, y1 + 1):
    x = int(round(cal.iso_u_x(u, y)))
    out.append('%d:%.3f:%d' % (y, cal.to_data(x, y)[1], g[y, x]))
print(u, ' '.join(out))
