"""R&M 3427 fig. 39: symbol centres (page pixels, 300 dpi) to x/h and Cp.
Usage: python3 -I fig39_calib.py <fit.csv> <out.csv>
Cp: least-squares line through the vertical axis's ticks (no grid). x/h:
piecewise linear between the ticks -2, -1 and the vertical axis (0).
Error per point: the tick fit's largest residual, the symbol fit's shift
(as an upper bound of centre placement), and the horizontal axis's tilt
(the drawn zero line falls 0.008 px per px to the left), combined in
quadrature, in Cp; in x/h the half tick-spacing mismatch."""
import csv
import sys
import numpy as np

CP_TICKS = [(-1.0, 537.5), (-0.8, 740.0), (-0.6, 940.5), (-0.4, 1145.0), (-0.2, 1347.3), (0.0, 1548.5)]
X_TICKS = [(-2.0, 2076.7), (-1.0, 2325.0), (0.0, 2575.7)]
AXIS_TILT = 0.008  # px of the drawn zero line per px leftward of the vertical axis

cp = np.array([c for c, _ in CP_TICKS])
yy = np.array([y for _, y in CP_TICKS])
b, a = np.polyfit(cp, yy, 1)  # y = a + b cp
resid = yy - (a + b * cp)
res_max = float(np.abs(resid).max()) / abs(b)
print(f'Cp scale {b:.2f} px per unit, zero at {a:.2f}; tick residuals (px) {np.round(resid, 2).tolist()}')

xv = np.array([v for v, _ in X_TICKS])
xp = np.array([p for _, p in X_TICKS])

rows = list(csv.DictReader(open(sys.argv[1])))
series = {'o': 'basic model (circles)', 'x': 'model with 1 x h splitter plate (crosses)', 's': 'backward-facing step (squares)'}
with open(sys.argv[2], 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['id', 'series', 'symbol', 'px_x', 'px_y', 'x_over_h', 'cp', 'cp_err', 'x_over_h_err'])
    for r in rows:
        x, y, shift = float(r['x']), float(r['y']), float(r['shift'])
        xh = float(np.interp(x, xp, xv))
        c = (y - a) / b
        tilt = AXIS_TILT * max(0.0, 2575.7 - x) / abs(b)
        place = max(shift, 0.5) / abs(b)
        err = (res_max ** 2 + place ** 2 + tilt ** 2) ** 0.5
        w.writerow([r['id'], series[r['id'][0]], r['kind'], r['x'], r['y'], f'{xh:.3f}', f'{c:.4f}', f'{err:.4f}', '0.01'])
