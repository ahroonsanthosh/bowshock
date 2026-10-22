"""Grid calibration for the W1 first readings: each grid line is located locally (darkness-weighted centre in a
+-7 px window, at several sample points along it, the median of the samples' fits kept), the intersections of the
fitted lines are formed, and an affine map pixel -> data is fitted to them by least squares. The residuals of the
fit at the intersections are printed (the calibration's own error).

Used as a module: cal = Cal(img, hlines, vlines) with hlines = [(y_guess, value), ...] for horizontal lines and
vlines = [(x_guess, value), ...] for vertical ones, and the sample spans xs (for horizontal lines) and ys (for
vertical lines). cal.data(x, y) -> (u, v); cal.pix(u, v) -> (x, y).

overlay(cal, img, box, scale, out, uticks, vticks): a zoomed crop with data-unit ticks drawn as short red marks
at the crop's edges and a light dotted grid, for reading symbols by eye."""
import numpy as np
from PIL import Image, ImageDraw


def _centre(profile, coords):
    d = profile.max() - profile
    d = d - np.median(d)
    d = d.clip(0)
    return float((d * coords).sum() / d.sum()) if d.sum() > 0 else float('nan')


class Cal:
    def __init__(self, img, hlines, vlines, xs, ys, half=7, seg=30, htilt=0.0, vtilt=0.0, xref=0.0, yref=0.0):
        a = np.array(Image.open(img).convert('L')).astype(float)
        self.h, self.v = [], []
        for yg, val in hlines:
            pts = []
            for x in xs:
                yc = int(round(yg + htilt * (x - xref)))
                win = a[yc - half:yc + half + 1, int(x) - seg:int(x) + seg]
                prof = np.median(win, axis=1)
                pts.append((x, _centre(prof, np.arange(yc - half, yc + half + 1))))
            pts = [(x, y) for x, y in pts if np.isfinite(y)]
            X = np.array([p[0] for p in pts]); Y = np.array([p[1] for p in pts])
            k, c = np.polyfit(X, Y, 1)
            res = Y - (k * X + c)
            # drop samples spoilt by curves or symbols crossing the line, refit
            keep = np.abs(res) < max(1.5, 2.5 * np.median(np.abs(res)))
            k, c = np.polyfit(X[keep], Y[keep], 1)
            self.h.append((val, k, c))
        for xg, val in vlines:
            pts = []
            for y in ys:
                xc = int(round(xg + vtilt * (y - yref)))
                win = a[int(y) - seg:int(y) + seg, xc - half:xc + half + 1]
                prof = np.median(win, axis=0)
                pts.append((y, _centre(prof, np.arange(xc - half, xc + half + 1))))
            pts = [(y, x) for y, x in pts if np.isfinite(x)]
            Y = np.array([p[0] for p in pts]); X = np.array([p[1] for p in pts])
            k, c = np.polyfit(Y, X, 1)
            res = X - (k * Y + c)
            keep = np.abs(res) < max(1.5, 2.5 * np.median(np.abs(res)))
            k, c = np.polyfit(Y[keep], X[keep], 1)
            self.v.append((val, k, c))
        # intersections: y = kh x + ch, x = kv y + cv
        P, U, V = [], [], []
        for vh, kh, ch in self.h:
            for vv, kv, cv in self.v:
                y = (kh * cv + ch) / (1 - kh * kv)
                x = kv * y + cv
                P.append((x, y)); U.append(vv); V.append(vh)
        P = np.array(P); U = np.array(U); V = np.array(V)
        A = np.column_stack([P[:, 0], P[:, 1], np.ones(len(P))])
        self.cu, *_ = np.linalg.lstsq(A, U, rcond=None)
        self.cv, *_ = np.linalg.lstsq(A, V, rcond=None)
        self.res_u = U - A @ self.cu
        self.res_v = V - A @ self.cv
        M = np.array([[self.cu[0], self.cu[1]], [self.cv[0], self.cv[1]]])
        self.Minv = np.linalg.inv(M)

    def data(self, x, y):
        return (self.cu[0] * x + self.cu[1] * y + self.cu[2], self.cv[0] * x + self.cv[1] * y + self.cv[2])

    def local(self, x, y):
        """Data by linear interpolation between the bracketing fitted lines (extrapolated from the end pair),
        each line evaluated at the point: removes the paper's non-affine distortion."""
        hs = sorted(((k * x + c, val) for val, k, c in self.h))
        vs = sorted(((k * y + c, val) for val, k, c in self.v))
        def interp(lines, p):
            i = 0
            while i + 2 < len(lines) and p > lines[i + 1][0]:
                i += 1
            (p1, v1), (p2, v2) = lines[i], lines[i + 1]
            return v1 + (v2 - v1) * (p - p1) / (p2 - p1)
        return interp(vs, x), interp(hs, y)

    def pix(self, u, v):
        r = self.Minv @ np.array([u - self.cu[2], v - self.cv[2]])
        return float(r[0]), float(r[1])

    def report(self, name=''):
        print('%s calibration: %d intersections, residual max |du| %.5f, max |dv| %.5f (rms %.5f, %.5f)' % (
            name, len(self.res_u), np.abs(self.res_u).max(), np.abs(self.res_v).max(),
            np.sqrt((self.res_u ** 2).mean()), np.sqrt((self.res_v ** 2).mean())))
        du = np.hypot(self.cu[0], self.cu[1]); dv = np.hypot(self.cv[0], self.cv[1])
        print('   data per pixel: u %.6f, v %.6f' % (du, dv))


def overlay(cal, img, box, scale, out, uticks, vticks, marks=()):
    x0, y0, x1, y1 = box
    im = Image.open(img).convert('RGB').crop(box)
    im = im.resize((int((x1 - x0) * scale), int((y1 - y0) * scale)), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    W, H = im.size
    for u, major in uticks:
        for yy in (y0, y1):
            x, y = cal.pix(u, cal.data(x0, yy)[1])
        xa, _ = cal.pix(u, cal.data(x0, y0)[1]); xb, _ = cal.pix(u, cal.data(x0, y1)[1])
        Xa, Xb = (xa - x0) * scale, (xb - x0) * scale
        L = 18 if major else 9
        d.line([(Xa, 0), (Xa, L)], fill=(255, 0, 0), width=2 if major else 1)
        d.line([(Xb, H - 1), (Xb, H - 1 - L)], fill=(255, 0, 0), width=2 if major else 1)
        if major:
            d.text((Xa + 3, L), ('%g' % u), fill=(255, 0, 0))
    for v, major in vticks:
        _, ya = cal.pix(cal.data(x0, y0)[0], v); _, yb = cal.pix(cal.data(x1, y0)[0], v)
        Ya, Yb = (ya - y0) * scale, (yb - y0) * scale
        L = 18 if major else 9
        d.line([(0, Ya), (L, Ya)], fill=(0, 0, 255), width=2 if major else 1)
        d.line([(W - 1, Yb), (W - 1 - L, Yb)], fill=(0, 0, 255), width=2 if major else 1)
        if major:
            d.text((L + 3, Ya - 6), ('%g' % v), fill=(0, 0, 255))
        # dotted line across
        for X in range(0, W, 6):
            Y = Ya + (Yb - Ya) * X / W
            d.point((X, Y), fill=(0, 160, 255))
    for (u, v, label) in marks:
        x, y = cal.pix(u, v)
        X, Y = (x - x0) * scale, (y - y0) * scale
        d.line([(X - 6, Y), (X + 6, Y)], fill=(0, 200, 0)); d.line([(X, Y - 6), (X, Y + 6)], fill=(0, 200, 0))
        d.text((X + 5, Y + 3), label, fill=(0, 150, 0))
    im.save(out)
