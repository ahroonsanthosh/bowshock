"""Page pixel -> data value from a gridcal.py calibration.

A point's abscissa is interpolated linearly between the two fitted vertical
lines that bracket it at its own row (extrapolated from the nearest two
outside them); the ordinate likewise between horizontal lines at its own
column. Local scales (value per px) are returned for the errors.
"""
import json

import numpy as np


class Cal:
    def __init__(self, path):
        c = json.load(open(path))
        self.c = c
        self.V = sorted(c["vlines"], key=lambda l: l["value"])
        self.H = sorted(c["hlines"], key=lambda l: l["value"])
        self.loo_x = c["loo_x_rms_px"]
        self.loo_y = c["loo_y_rms_px"]
        self.log_y = c.get("log_y", False)

    @staticmethod
    def _interp(lines, t, p):
        pos = np.array([l["a"] + l["b"] * t for l in lines])
        val = np.array([l["value"] for l in lines], float)
        o = np.argsort(pos)
        pos, val = pos[o], val[o]
        i = int(np.searchsorted(pos, p))
        i = min(max(i, 1), len(pos) - 1)
        s = (val[i] - val[i - 1]) / (pos[i] - pos[i - 1])
        return float(val[i - 1] + s * (p - pos[i - 1])), float(abs(s))

    def value(self, x, y):
        X, sx = self._interp(self.V, y, x)
        Y, sy = self._interp(self.H, x, y)
        return X, Y, sx, sy

    def mask(self, shape, rad=2.0, extra=()):
        """True where a pixel is near a calibrated line (to be left out of fits)."""
        h, w = shape
        m = np.zeros(shape, bool)
        ys = np.arange(h, dtype=float)
        xs = np.arange(w, dtype=float)
        for l in self.V:
            xl = l["a"] + l["b"] * ys
            for yy in range(h):
                lo, hi = int(np.floor(xl[yy] - rad)), int(np.ceil(xl[yy] + rad))
                m[yy, max(lo, 0):max(hi + 1, 0)] = True
        for l in self.H:
            yl = l["a"] + l["b"] * xs
            for xx in range(w):
                lo, hi = int(np.floor(yl[xx] - rad)), int(np.ceil(yl[xx] + rad))
                m[max(lo, 0):max(hi + 1, 0), xx] = True
        for kind, a, b, rr in extra:
            if kind == "v":  # extra vertical line x = a + b*y
                for yy in range(h):
                    xl = a + b * yy
                    m[yy, max(int(xl - rr), 0):int(xl + rr) + 1] = True
            else:
                for xx in range(w):
                    yl = a + b * xx
                    m[max(int(yl - rr), 0):int(yl + rr) + 1, xx] = True
        return m
