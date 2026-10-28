# Calibration from the fitted gridlines (readings/gridfit.json, made by 04_gridfit.py).
# Labelled lines: vertical x/c = 1.0, 0.8, ..., -1.4 (every second line from the left frame);
# horizontal P_B = -0.40, -0.36, ..., +0.08 (every second line from the top frame).
# Primary: least-squares straight line through all 13 labelled lines of the axis, each line
#   evaluated at the point's own row (x axis) or column (y axis), so rotation is followed.
# Check: linear interpolation between the two gridlines (labelled or not) that bracket the
#   point, values of unlabelled lines implied by the labelled ones.
import json, sys
import numpy as np
G = None
VXV = [round(1.0 - 0.1 * i, 2) for i in range(26)]      # 1.0 ... -1.5
HYV = [round(-0.40 + 0.02 * i, 2) for i in range(25)]   # -0.40 ... +0.08
def load(path):
    global G
    G = json.load(open(path))
def vline_x(i, y):
    l = G['vertical'][i]; return l['a'] + l['b'] * (y - 1500)
def hline_y(i, x):
    l = G['horizontal'][i]; return l['a'] + l['b'] * (x - 1200)
def x_lsq(px, py):
    idx = list(range(0, 26, 2))[:13]
    X = np.array([vline_x(i, py) for i in idx]); V = np.array([VXV[i] for i in idx])
    c1, c0 = np.polyfit(X, V, 1)
    res = V - (c0 + c1 * X)
    return c0 + c1 * px, float(np.sqrt((res ** 2).mean())), float(np.abs(res).max()), c1
def y_lsq(px, py):
    idx = list(range(0, 25, 2))
    Y = np.array([hline_y(i, px) for i in idx]); V = np.array([HYV[i] for i in idx])
    d1, d0 = np.polyfit(Y, V, 1)
    res = V - (d0 + d1 * Y)
    return d0 + d1 * py, float(np.sqrt((res ** 2).mean())), float(np.abs(res).max()), d1
def x_local(px, py):
    X = np.array([vline_x(i, py) for i in range(26)])
    j = int(np.searchsorted(X, px)) - 1
    j = min(max(j, 0), 24)
    return VXV[j] + (VXV[j + 1] - VXV[j]) * (px - X[j]) / (X[j + 1] - X[j])
def y_local(px, py):
    Y = np.array([hline_y(i, px) for i in range(25)])
    j = int(np.searchsorted(Y, py)) - 1
    j = min(max(j, 0), 23)
    return HYV[j] + (HYV[j + 1] - HYV[j]) * (py - Y[j]) / (Y[j + 1] - Y[j])
def to_data(px, py):
    xl, xrms, xmax, sx = x_lsq(px, py)
    yl, yrms, ymax, sy = y_lsq(px, py)
    xc, yc = x_local(px, py), y_local(px, py)
    return {'x': xl, 'y': yl, 'x_local': xc, 'y_local': yc,
            'x_cal_err': max(abs(xl - xc), xrms), 'y_cal_err': max(abs(yl - yc), yrms),
            'x_per_px': abs(sx), 'y_per_px': abs(sy), 'x_fit_rms': xrms, 'y_fit_rms': yrms,
            'x_fit_max': xmax, 'y_fit_max': ymax}
def x_to_px(xc, py):
    # pixel column of a given x/c at row py, by the local (bracketing) lines, iterated
    X = np.array([vline_x(i, py) for i in range(26)])
    return float(np.interp(-xc, [-v for v in VXV], X))
if __name__ == '__main__':
    load(sys.argv[1])
    print('x axis LSQ fit through 13 labelled vertical lines, at several rows:')
    for py in (1000, 1500, 1800, 2200):
        xl, rms, mx, s = x_lsq(1000, py)
        X = [vline_x(i, py) for i in range(0, 26, 2)]
        V = [VXV[i] for i in range(0, 26, 2)]
        c1, c0 = np.polyfit(X, V, 1)
        print('  row %d: x/c = %.6f %+.8f*px  rms %.5f  max %.5f  (%.3f px per 0.1)' % (py, c0, c1, rms, mx, 0.1 / abs(c1)))
        print('     residuals (x/c units):', ' '.join('%+.4f' % (v - (c0 + c1 * x)) for x, v in zip(X, V)))
    print('y axis LSQ fit through 13 labelled horizontal lines, at several columns:')
    for px in (409, 700, 1048, 1500, 2000):
        Y = [hline_y(i, px) for i in range(0, 25, 2)]
        V = [HYV[i] for i in range(0, 25, 2)]
        d1, d0 = np.polyfit(Y, V, 1)
        res = [v - (d0 + d1 * y) for y, v in zip(Y, V)]
        print('  col %d: P_B = %.6f %+.8f*px  rms %.5f  max %.5f  (%.3f px per 0.02)' % (px, d0, d1, float(np.sqrt(np.mean(np.square(res)))), max(abs(r) for r in res), 0.02 / abs(d1)))
        print('     residuals (P_B units):', ' '.join('%+.5f' % r for r in res))
    # unlabelled lines against the labelled fit
    print('unlabelled vertical lines against the LSQ line (x/c units), row 1500:')
    print('  ', ' '.join('%+.4f' % (x_lsq(vline_x(i, 1500), 1500)[0] - VXV[i]) for i in range(1, 26, 2)))
    print('unlabelled horizontal lines against the LSQ line (P_B units), col 700:')
    print('  ', ' '.join('%+.5f' % (y_lsq(700, hline_y(i, 700))[0] - HYV[i]) for i in range(1, 25, 2)))
