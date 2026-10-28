# Mean per-row x residual of vertical grid lines (relative to each line's straight fit), per single row; prints rows where it steps.
import sys, json
sys.path.insert(0, sys.argv[1])
import numpy as np
import measure_lib as M
ink = M.load(sys.argv[2]); cal = json.load(open(sys.argv[3]))
y0, y1 = int(sys.argv[4]), int(sys.argv[5])
lines = [L for L in cal['vertical'] if 'x_at_y1080' in L and 0.5 <= L['value'] <= 8.5]
prev = None
out = []
for y in range(y0, y1):
    r = []
    for L in lines:
        xp = L['x_at_y1080'] + L['slope_dx_per_dy'] * (y - 1080)
        s = M.vstroke(ink, xp, y, y + 1, half=3)
        if s and abs(s[0][1] - xp) < 1.6:
            r.append(s[0][1] - xp)
    med = np.median(r) if len(r) >= 5 else np.nan
    out.append((y, med, len(r)))
med = np.array([o[1] for o in out])
for i in range(3, len(out) - 3):
    a = np.nanmedian(med[i - 3:i]); b = np.nanmedian(med[i:i + 3])
    if abs(b - a) > 0.4:
        print('step near row', out[i][0], 'from %.2f to %.2f' % (a, b))
# coarse summary every 25 rows
for i in range(0, len(out), 25):
    print(out[i][0], '%.2f' % np.nanmedian(med[i:i + 25]))
