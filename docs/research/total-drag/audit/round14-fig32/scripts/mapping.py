"""Pixel to data mapping for TN 3819 fig. 32.
Primary: each gridline's position is taken locally (straight-line fit to that line's own
samples within +-60 px along the line of the query point, widened to +-120 px if fewer than
15 samples), then the value is interpolated linearly between the two lines that bracket the
point (x/c from vertical lines, P_B from horizontal lines).
Check: a global least-squares plane value = c0 + c1*px + c2*py through the samples of the 13
labelled lines on each axis.
Pixel convention: pixel index i is the pixel centre."""
import json
import numpy as np

class Mapper:
    def __init__(self, calib_path):
        cal = json.load(open(calib_path))
        self.V = cal['vertical']
        self.H = cal['horizontal']
        for f in self.V + self.H:
            f['S'] = np.array(f['samples'])
        self._glob()

    @staticmethod
    def local(f, t, half=60):
        S = f['S']
        for h in (half, 2 * half, 4 * half, 1e9):
            m = np.abs(S[:, 0] - t) <= h
            if m.sum() >= 15:
                break
        u, v = S[m, 0], S[m, 1]
        A = np.c_[np.ones_like(u), u - t]
        coef, *_ = np.linalg.lstsq(A, v, rcond=None)
        r = v - A @ coef
        s = np.sqrt((r ** 2).sum() / max(1, len(u) - 2))
        cov = s ** 2 * np.linalg.inv(A.T @ A)
        return float(coef[0]), float(np.sqrt(cov[0, 0])), float(s), int(m.sum()), float(h)

    def _bracket(self, lines, q, t):
        pos = [(self.local(f, t)[0], f) for f in lines]
        pos.sort(key=lambda z: z[0])
        for (p0, f0), (p1, f1) in zip(pos[:-1], pos[1:]):
            if p0 <= q <= p1:
                return p0, f0, p1, f1
        # outside the frame: use the two outermost lines on that side (extrapolation, flagged)
        if q < pos[0][0]:
            return pos[0][0], pos[0][1], pos[1][0], pos[1][1]
        return pos[-2][0], pos[-2][1], pos[-1][0], pos[-1][1]

    def to_data(self, px, py):
        p0, f0, p1, f1 = self._bracket(self.V, px, py)
        fr = (px - p0) / (p1 - p0)
        xc = f0['value'] + fr * (f1['value'] - f0['value'])
        sx = abs(f1['value'] - f0['value']) / (p1 - p0)   # data per px
        l0, l1 = self.local(f0, py), self.local(f1, py)
        cal_x_px = float(np.sqrt(((1 - fr) * l0[1]) ** 2 + (fr * l1[1]) ** 2 + ((1 - fr) * l0[2]) ** 2 / 4 + (fr * l1[2]) ** 2 / 4))
        q0, g0, q1, g1 = self._bracket(self.H, py, px)
        gr = (py - q0) / (q1 - q0)
        yv = g0['value'] + gr * (g1['value'] - g0['value'])
        sy = abs(g1['value'] - g0['value']) / (q1 - q0)
        m0, m1 = self.local(g0, px), self.local(g1, px)
        cal_y_px = float(np.sqrt(((1 - gr) * m0[1]) ** 2 + (gr * m1[1]) ** 2 + ((1 - gr) * m0[2]) ** 2 / 4 + (gr * m1[2]) ** 2 / 4))
        inside = (0 <= fr <= 1) and (0 <= gr <= 1)
        return dict(x_c=xc, y=yv, sx=sx, sy=sy, cal_x_px=cal_x_px, cal_y_px=cal_y_px,
                    x_lines=(f0['value'], f1['value']), y_lines=(g0['value'], g1['value']), inside=inside,
                    gx=self.glob_x(px, py), gy=self.glob_y(px, py))

    def _glob(self):
        labx = [round(1.0 - 0.2 * k, 2) for k in range(13)]
        laby = [round(-0.40 + 0.04 * k, 2) for k in range(13)]
        rows = []
        for f in self.V:
            if any(abs(f['value'] - v) < 1e-6 for v in labx):
                S = f['S'][::10]
                for t, p in S:
                    rows.append((p, t, f['value']))
        R = np.array(rows)
        A = np.c_[np.ones(len(R)), R[:, 0], R[:, 1]]
        self.cx, *_ = np.linalg.lstsq(A, R[:, 2], rcond=None)
        self.res_x = {}
        for f in self.V:
            if any(abs(f['value'] - v) < 1e-6 for v in labx):
                S = f['S']
                pred = self.cx[0] + self.cx[1] * S[:, 1] + self.cx[2] * S[:, 0]
                self.res_x[f['value']] = float(np.mean(pred - f['value']) / abs(self.cx[1]))  # in px
        rows = []
        for f in self.H:
            if any(abs(f['value'] - v) < 1e-6 for v in laby):
                S = f['S'][::10]
                for t, p in S:
                    rows.append((t, p, f['value']))
        R = np.array(rows)
        A = np.c_[np.ones(len(R)), R[:, 0], R[:, 1]]
        self.cy, *_ = np.linalg.lstsq(A, R[:, 2], rcond=None)
        self.res_y = {}
        for f in self.H:
            if any(abs(f['value'] - v) < 1e-6 for v in laby):
                S = f['S']
                pred = self.cy[0] + self.cy[1] * S[:, 0] + self.cy[2] * S[:, 1]
                self.res_y[f['value']] = float(np.mean(pred - f['value']) / abs(self.cy[2]))

    def glob_x(self, px, py):
        return float(self.cx[0] + self.cx[1] * px + self.cx[2] * py)

    def glob_y(self, px, py):
        return float(self.cy[0] + self.cy[1] * px + self.cy[2] * py)

if __name__ == '__main__':
    import sys
    m = Mapper(sys.argv[1])
    print('global x/c plane: c0 %.6f c1 %.8f c2 %.8f  (x/c per px %.6f)' % (m.cx[0], m.cx[1], m.cx[2], m.cx[1]))
    print('labelled vertical lines, mean offset of the line from the plane, px:')
    print('  ' + ', '.join(f'{k:+.1f}: {v:+.2f}' for k, v in sorted(m.res_x.items(), reverse=True)))
    print('global P_B plane: c0 %.6f c1 %.8f c2 %.8f  (P_B per px %.7f)' % (m.cy[0], m.cy[1], m.cy[2], m.cy[2]))
    print('labelled horizontal lines, mean offset from the plane, px:')
    print('  ' + ', '.join(f'{k:+.2f}: {v:+.2f}' for k, v in sorted(m.res_y.items())))
    for (px, py) in [(537.4, 1515.9), (1048.1, 1495.0), (409.2, 1822.7)]:
        print((px, py), m.to_data(px, py))
