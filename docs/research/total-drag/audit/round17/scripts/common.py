"""Shared helpers: load page and calibration, grid mask, pixel <-> plot units.

Imported by the other scripts with sys.path set to this scripts folder
explicitly (scripts are run with python3 -I, so the folder is added by hand).
"""
import json
import numpy as np


def load(page_npy, cal_json, panel):
    ink = np.load(page_npy)
    cal = [c for c in json.load(open(cal_json)) if c['panel'] == panel][0]
    return ink, cal


def to_plot(cal, X, Y):
    cx = cal['fit_x']['coef']
    cy = cal['fit_y']['coef']
    X = np.asarray(X, float)
    Y = np.asarray(Y, float)
    return cx[0] + cx[1] * X + cx[2] * Y, cy[0] + cy[1] * X + cy[2] * Y


def to_px(cal, xv, av):
    """Invert the affine map: plot units -> pixel."""
    cx = cal['fit_x']['coef']
    cy = cal['fit_y']['coef']
    A = np.array([[cx[1], cx[2]], [cy[1], cy[2]]])
    b = np.array([xv - cx[0], av - cy[0]])
    X, Y = np.linalg.solve(A, b)
    return X, Y


def row_for_alpha(cal, alpha, X):
    cy = cal['fit_y']['coef']
    return (alpha - cy[0] - cy[1] * X) / cy[2]


def zero_line_row(cal, X):
    """Row of the fitted alpha = 0 line (bottom frame) at column X."""
    h = [h for h in cal['hlines'] if h and h['j'] == 0][0]
    return h['a'] + h['b'] * X


def line_thickness(ink, line, vertical, n=200):
    """Median run width across a fitted line."""
    ws = []
    lo, hi = line['span']
    for t in np.linspace(lo, hi, n):
        t = int(t)
        c = line['a'] + line['b'] * t
        ci = int(round(c))
        if vertical:
            seg = ink[t, ci - 6:ci + 7]
        else:
            seg = ink[ci - 6:ci + 7, t]
        if seg[6] == 0:
            continue
        a = 6
        while a > 0 and seg[a - 1]:
            a -= 1
        b = 6
        while b < 12 and seg[b + 1]:
            b += 1
        if b - a + 1 <= 7:
            ws.append(b - a + 1)
    return float(np.median(ws)) if ws else 3.0


def grid_mask(ink, cal, pad=1.0, frame_extra=0.5):
    """Boolean mask of pixels belonging to the grid lines of this panel."""
    H, W = ink.shape
    m = np.zeros_like(ink, dtype=bool)
    fr = cal['frame_nominal']
    x0 = int(fr['xl']) - 12
    x1 = int(fr['xr']) + 12
    y0 = int(fr['yt']) - 12
    y1 = int(fr['yb']) + 12
    yy, xx = np.mgrid[y0:y1, x0:x1]
    info = []
    for v in cal['vlines']:
        if not v:
            continue
        w = line_thickness(ink, v, True)
        hw = w / 2.0 + pad + (frame_extra if v['k'] in (0, 8) else 0)
        c = v['a'] + v['b'] * yy
        sel = np.abs(xx - c) <= hw
        # inner lines of a panel with a legend box exist only below the box
        if v['k'] not in (0, 8):
            sel &= yy >= v['span'][0] - 3
        m[y0:y1, x0:x1] |= sel
        info.append(('v', v['k'], w))
    for h in cal['hlines']:
        if not h:
            continue
        w = line_thickness(ink, h, False)
        hw = w / 2.0 + pad + (frame_extra if h['j'] in (0, 8) else 0)
        c = h['a'] + h['b'] * xx
        sel = np.abs(yy - c) <= hw
        m[y0:y1, x0:x1] |= sel
        info.append(('h', h['j'], w))
    return m, info
