# Fit one straight stroke between two approximate endpoints; print the perpendicular-profile edge points and the fit.
import sys
sys.path.insert(0, sys.argv[1])
import numpy as np
import measure_lib as M
ink = M.load(sys.argv[2])
a = tuple(map(float, sys.argv[3].split(','))); b = tuple(map(float, sys.argv[4].split(',')))
pts = M.perp_samples(ink, a, b, half=3.5, step=0.5, trim=0.0)
m, u, rms, n = M.fit_line_xy(pts)
print('n %d rms %.2f angle %.1f point (%.2f, %.2f)' % (n, rms, np.degrees(np.arctan2(u[1], u[0])) % 180, m[0], m[1]))
print([(round(x, 1), round(y, 1)) for x, y in pts])
