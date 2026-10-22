"""Convert symbol centres (pixels) to plot values on a plot with ticks but no
grid. Usage: python3 -I tickcal.py <axes.json> <fit.csv> <out.csv>
<axes.json>: {"x": {"ticks": [[value, px], ...], "at": y_px, "tilt": dxdy},
              "y": {"ticks": [[value, px], ...], "at": x_px, "tilt": dydx}}
"x" ticks are positions along the horizontal axis, measured at height
"at"; lines of constant x run with slope dx/dy = "tilt" (the vertical
axis's own slope). "y" ticks are positions along the vertical axis,
measured at "at"; lines of constant y run with slope dy/dx = "tilt" (the
horizontal axis's). A point (x, y) is moved along those lines to the tick
row or column, then valued by a least-squares straight line through the
ticks; the line's residuals are printed as the calibration's error.
<fit.csv> is symfit.py's output; <out.csv> adds x_value, y_value."""
import csv
import json
import sys
import numpy as np

axes = json.load(open(sys.argv[1]))
fits = {}
for k in ('x', 'y'):
    t = np.array(axes[k]['ticks'], float)
    a, b = np.polyfit(t[:, 1], t[:, 0], 1)
    res = t[:, 0] - (a * t[:, 1] + b)
    fits[k] = (a, b)
    print(k, 'per px', round(a, 6), 'residuals', np.round(res, 5).tolist(), 'rms px', round(float(np.sqrt(np.mean((res / a) ** 2))), 3))
rows = list(csv.DictReader(open(sys.argv[2])))
for r in rows:
    x, y = float(r['x']), float(r['y'])
    xe = x - axes['x']['tilt'] * (y - axes['x']['at'])
    ye = y - axes['y']['tilt'] * (x - axes['y']['at'])
    r['x_value'] = round(fits['x'][0] * xe + fits['x'][1], 5)
    r['y_value'] = round(fits['y'][0] * ye + fits['y'][1], 5)
with open(sys.argv[3], 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)
