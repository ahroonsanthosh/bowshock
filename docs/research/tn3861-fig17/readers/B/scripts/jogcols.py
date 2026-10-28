# Mean per-column y residual of horizontal grid lines (relative to each line's straight fit); prints steps and a coarse profile.
import sys, json
sys.path.insert(0, sys.argv[1])
import numpy as np
import measure_lib as M
ink = M.load(sys.argv[2]); cal = json.load(open(sys.argv[3]))
x0, x1 = int(sys.argv[4]), int(sys.argv[5])
lines = [L for L in cal['horizontal'] if 'y_at_x1588' in L and 0.0 < L['value'] <= 1.5]
out = []
for x in range(x0, x1):
    r = []
    for L in lines:
        yp = L['y_at_x1588'] + L['slope_dy_per_dx'] * (x - 1588)
        s = M.hstroke(ink, yp, x, x + 1, half=3)
        if s and abs(s[0][1] - yp) < 1.6:
            r.append(s[0][1] - yp)
    out.append((x, np.median(r) if len(r) >= 3 else np.nan))
med = np.array([o[1] for o in out])
for i in range(3, len(out) - 3):
    a = np.nanmedian(med[i - 3:i]); b = np.nanmedian(med[i:i + 3])
    if abs(b - a) > 0.4:
        print('step near col', out[i][0], 'from %.2f to %.2f' % (a, b))
for i in range(0, len(out), 50):
    print(out[i][0], '%.2f' % np.nanmedian(med[i:i + 50]))
