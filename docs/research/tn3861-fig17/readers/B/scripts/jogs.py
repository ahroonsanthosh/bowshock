# Per-row position of vertical grid lines (residual from each line's straight fit), binned in 10-row bins, to find scan jogs.
import sys, json
sys.path.insert(0, sys.argv[1])
import numpy as np
import measure_lib as M
ink = M.load(sys.argv[2]); cal = json.load(open(sys.argv[3]))
bins = list(range(int(sys.argv[4]), int(sys.argv[5]), 10))
print('rows   ' + ' '.join('%6s' % L['value'] for L in cal['vertical'] if 'x_at_y1080' in L and 1.0 <= L['value'] <= 8.5))
for b0 in bins:
    row = []
    for L in cal['vertical']:
        if 'x_at_y1080' not in L or not (1.0 <= L['value'] <= 8.5): continue
        xp = L['x_at_y1080'] + L['slope_dx_per_dy'] * (b0 + 5 - 1080)
        s = M.vstroke(ink, xp, b0, b0 + 10, half=3)
        r = [c - (L['x_at_y1080'] + L['slope_dx_per_dy'] * (y - 1080)) for y, c in s]
        row.append('%6.2f' % np.median(r) if len(r) >= 5 and np.std(r) < 0.5 else '     .')
    print('%4d   ' % b0 + ' '.join(row))
