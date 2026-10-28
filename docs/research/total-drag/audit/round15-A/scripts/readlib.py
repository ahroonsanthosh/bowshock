# Shared helpers for reading faired curves off scanned NACA figures.
# Coordinates: image pixels (px, py) with py downward. "u" is the plot's horizontal
# quantity and "v" its vertical quantity, both in the plot's own printed units.
import json
import numpy as np
from PIL import Image


class Cal:
    """Calibration from calib.py output. Vertical grid line of value u passes through
    x = x0 + x1*u at y = ymid with slope b (dx/dy). Horizontal grid line of value v passes
    through y = y0 + y1*v at x = xmid with slope e (dy/dx)."""

    def __init__(self, path):
        c = json.load(open(path))
        self.c = c
        self.x0, self.x1 = c['x_fit']
        self.y0, self.y1 = c['y_fit']
        self.b = c['b_common']
        self.e = c['e_common']
        self.ymid = c['ymid']
        self.xmid = c['xmid']
        lv = np.array([l['loo_units'] for l in c['vlines']])
        lh = np.array([l['loo_units'] for l in c['hlines']])
        # 2-sigma calibration error taken as 2 x RMS of the leave-one-out residuals
        self.u_cal2s = float(2 * np.sqrt(np.mean(lv ** 2)))
        self.v_cal2s = float(2 * np.sqrt(np.mean(lh ** 2)))
        self.u_per_px = 1.0 / self.x1
        self.v_per_px = 1.0 / self.y1

    def to_data(self, px, py):
        u = (px - self.b * (py - self.ymid) - self.x0) / self.x1
        v = (py - self.e * (px - self.xmid) - self.y0) / self.y1
        return u, v

    def to_px(self, u, v):
        # solve px = x0 + x1*u + b*(py - ymid); py = y0 + y1*v + e*(px - xmid)
        X = self.x0 + self.x1 * u
        Y = self.y0 + self.y1 * v
        # px = X + b*(Y + e*(px - xmid) - ymid)  ->  px*(1 - b*e) = X + b*(Y - e*xmid - ymid)
        px = (X + self.b * (Y - self.e * self.xmid - self.ymid)) / (1 - self.b * self.e)
        py = Y + self.e * (px - self.xmid)
        return px, py

    def iso_u_x(self, u, py):
        """x pixel of the iso-u line at row py."""
        return self.x0 + self.x1 * u + self.b * (py - self.ymid)

    def iso_v_y(self, v, px):
        return self.y0 + self.y1 * v + self.e * (px - self.xmid)


def load_gray(path):
    return np.asarray(Image.open(path).convert('L')).astype(np.int16)


def runs_along_iso_u(gray, mask, cal, u, ylo, yhi, labels=None, T=110):
    """Sample the iso-u line from row ylo to yhi. Returns runs of mask pixels:
    list of dict(y0, y1, yc (darkness-weighted centroid, px), v (data), label set)."""
    out = []
    cur = None
    for py in range(int(ylo), int(yhi) + 1):
        px = int(round(cal.iso_u_x(u, py)))
        on = bool(mask[py, px])
        if on:
            w = max(T - int(gray[py, px]), 1)
            lab = int(labels[py, px]) if labels is not None else 0
            if cur is None:
                cur = {'y0': py, 'y1': py, 'sw': 0.0, 'swy': 0.0, 'labs': {}, 'pxs': []}
            cur['y1'] = py
            cur['sw'] += w
            cur['swy'] += w * py
            cur['labs'][lab] = cur['labs'].get(lab, 0) + 1
            cur['pxs'].append(px)
        else:
            if cur is not None:
                out.append(cur)
                cur = None
    if cur is not None:
        out.append(cur)
    for r in out:
        r['yc'] = r['swy'] / r['sw']
        r['xc'] = float(np.mean(r['pxs']))
        r['width'] = r['y1'] - r['y0'] + 1
        r['u'], r['v'] = cal.to_data(r['xc'], r['yc'])
    return out


def runs_along_iso_v(gray, mask, cal, v, xlo, xhi, labels=None, T=110):
    out = []
    cur = None
    for px in range(int(xlo), int(xhi) + 1):
        py = int(round(cal.iso_v_y(v, px)))
        on = bool(mask[py, px])
        if on:
            w = max(T - int(gray[py, px]), 1)
            lab = int(labels[py, px]) if labels is not None else 0
            if cur is None:
                cur = {'x0': px, 'x1': px, 'sw': 0.0, 'swx': 0.0, 'labs': {}, 'pys': []}
            cur['x1'] = px
            cur['sw'] += w
            cur['swx'] += w * px
            cur['labs'][lab] = cur['labs'].get(lab, 0) + 1
            cur['pys'].append(py)
        else:
            if cur is not None:
                out.append(cur)
                cur = None
    if cur is not None:
        out.append(cur)
    for r in out:
        r['xc'] = r['swx'] / r['sw']
        r['yc'] = float(np.mean(r['pys']))
        r['width'] = r['x1'] - r['x0'] + 1
        r['u'], r['v'] = cal.to_data(r['xc'], r['yc'])
    return out
