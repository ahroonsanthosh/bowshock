"""Piecewise-linear grid calibration with skew correction.

A grid is described by labelled lines, each measured in two bands:
  vlines: list of (value, x_at_band_a, x_at_band_b), bands at y = ya, yb
  hlines: list of (value, y_at_band_c, y_at_band_d), bands at x = xc, xd
For a point (px, py), each line's position is interpolated (linearly) to the
point's other coordinate, and the value is then interpolated piecewise
linearly between the two bracketing lines (extrapolated from the end pair).
"""
import numpy as np


class Grid:
    def __init__(self, vlines, ya, yb, hlines, xc, xd, log_y=False):
        self.v = sorted(vlines, key=lambda t: t[1]); self.ya, self.yb = ya, yb
        self.h = sorted(hlines, key=lambda t: t[1]); self.xc, self.xd = xc, xd
        self.log_y = log_y

    @staticmethod
    def _interp(lines, s_a, s_b, other, p, log=False):
        t = (other - s_a) / (s_b - s_a)
        pos = np.array([la + t * (lb - la) for _, la, lb in lines])
        val = np.array([v for v, _, _ in lines], dtype=float)
        if log:
            val = np.log10(val)
        i = np.searchsorted(pos, p)
        i = min(max(i, 1), len(pos) - 1)
        out = val[i - 1] + (p - pos[i - 1]) * (val[i] - val[i - 1]) / (pos[i] - pos[i - 1])
        return 10 ** out if log else out

    def value(self, px, py):
        x = self._interp(self.v, self.ya, self.yb, py, px)
        y = self._interp(self.h, self.xc, self.xd, px, py, self.log_y)
        return x, y

    def residuals(self):
        """Linear-fit residuals of each axis's lines (in pixels), as a check
        that the labelled ticks are evenly spaced (a misidentified line shows)."""
        out = []
        for lines in (self.v, self.h):
            val = np.array([v for v, _, _ in lines], float)
            pos = np.array([(a + b) / 2 for _, a, b in lines])
            c = np.polyfit(val, pos, 1)
            out.append((c, pos - np.polyval(c, val)))
        return out
