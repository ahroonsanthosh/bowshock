# Local straight-line fits of each horizontal grid line over a column window, and of each vertical line over a row window.
import sys, json
sys.path.insert(0, sys.argv[1])
import numpy as np
import measure_lib as M
ink = M.load(sys.argv[2]); cal = json.load(open(sys.argv[3]))
x0, x1 = int(sys.argv[4]), int(sys.argv[5])
for L in cal['horizontal']:
    if 'y_at_x1588' not in L: continue
    s = []
    for x in range(x0, x1):
        yp = L['y_at_x1588'] + L['slope_dy_per_dx'] * (x - 1588)
        r = M.hstroke(ink, yp, x, x + 1, half=3)
        if r and abs(r[0][1] - yp) < 2.5: s += r
    if len(s) > 30:
        a, b, rms, n = M.robust_line(s)
        print('CD %.2f: local slope %.5f, y at x=%d: %.2f, global fit there %.2f, n %d rms %.2f' % (L['value'], b, (x0 + x1) // 2, a + b * (x0 + x1) / 2, L['y_at_x1588'] + L['slope_dy_per_dx'] * ((x0 + x1) / 2 - 1588), n, rms))
