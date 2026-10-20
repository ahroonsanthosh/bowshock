"""Second, independent-method reading of the curves of NACA TN 3819 fig. 18 (PDF p. 49, 300 dpi grey).

1. Grid model: every horizontal gridline (P_B = -0.02 k) and vertical gridline (M = 1 + 0.2 j) is
   located in several bands and fitted as a straight line, so shear and tilt are corrected locally.
2. Mapping pixel -> (M, P_B) by interpolation between the two neighbouring lines of each family.
3. Curve tracing: dark thin runs (< 170, at most 5 px tall) away from gridlines, tracked column by
   column from seeds by continuity (prediction from the last points, tolerance 3 px). Columns where
   no candidate lies within tolerance (symbols, crossings) are gaps.
4. Each traced curve is evaluated at a Mach number by a local quadratic fit over +-0.12 in M,
   using tracked points only; the residual scatter of the fit is reported.
Outputs the values and a check against the vacuum curve -2/(1.4 M^2)."""
import sys
import numpy as np
from PIL import Image

IMG = sys.argv[1]
a = np.array(Image.open(IMG).convert('L')).astype(int)
H, W = a.shape


def peaks(profile, lo, thr):
    out = []
    i = 0
    while i < len(profile):
        if profile[i] > thr:
            j = i
            while j + 1 < len(profile) and profile[j + 1] > thr:
                j += 1
            seg = profile[i:j + 1]
            c = i + (np.arange(len(seg)) * seg).sum() / seg.sum()
            out.append(lo + c)
            i = j + 1
        else:
            i += 1
    return out


# --- horizontal gridlines: expected y = 1804.6 - 60.16 k, k = 0..24 ; bands in x
hlines = {}
for k in range(0, 25):
    y0 = 1804.6 - 60.16 * k
    pts = []
    for xb in range(420, 2800, 60):
        lo, hi = int(y0 - 8), int(y0 + 8)
        if lo < 0:
            continue
        prof = (a[lo:hi, xb:xb + 40] < 200).mean(axis=1)
        pk = [p for p in peaks(prof, lo, 0.6)]
        if len(pk) == 1:
            pts.append((xb + 20, pk[0]))
    if len(pts) >= 5:
        xs, ys = np.array(pts).T
        A = np.vstack([xs, np.ones_like(xs)]).T
        sl, ic = np.linalg.lstsq(A, ys, rcond=None)[0]
        res = ys - (sl * xs + ic)
        good = np.abs(res) < 1.5
        sl, ic = np.linalg.lstsq(A[good], ys[good], rcond=None)[0]
        hlines[k] = (sl, ic, int(good.sum()), float(np.abs(ys[good] - (sl * xs[good] + ic)).max()))
# --- vertical gridlines: expected x = 397 + 59.68 j (M = 1 + 0.2 j), j = 0..38
vlines = {}
for j in range(0, 39):
    x0 = 397 + 59.68 * j
    pts = []
    for yb in range(380, 1790, 50):
        lo, hi = int(x0 - 10), int(x0 + 10)
        prof = (a[yb:yb + 30, lo:hi] < 200).mean(axis=0)
        pk = peaks(prof, lo, 0.6)
        if len(pk) == 1:
            pts.append((yb + 15, pk[0]))
    if len(pts) >= 5:
        ys, xs = np.array(pts).T
        A = np.vstack([ys, np.ones_like(ys)]).T
        sl, ic = np.linalg.lstsq(A, xs, rcond=None)[0]
        res = xs - (sl * ys + ic)
        good = np.abs(res) < 1.5
        sl, ic = np.linalg.lstsq(A[good], xs[good], rcond=None)[0]
        vlines[j] = (sl, ic, int(good.sum()), float(np.abs(xs[good] - (sl * ys[good] + ic)).max()))


def hy(k, x):
    sl, ic = hlines[k][:2]
    return sl * x + ic


def vx(j, y):
    sl, ic = vlines[j][:2]
    return sl * y + ic


def to_MP(x, y):
    js = sorted(vlines)
    xs = [vx(j, y) for j in js]
    for n in range(len(js) - 1):
        if xs[n] <= x <= xs[n + 1]:
            M = 1 + 0.2 * js[n] + 0.2 * (js[n + 1] - js[n]) * (x - xs[n]) / (xs[n + 1] - xs[n])
            break
    else:
        return None
    ks = sorted(hlines)
    ys = [hy(k, x) for k in ks]  # decreasing with k
    for n in range(len(ks) - 1):
        if ys[n + 1] <= y <= ys[n]:
            P = -0.02 * ks[n] - 0.02 * (ks[n + 1] - ks[n]) * (ys[n] - y) / (ys[n] - ys[n + 1])
            return M, P
    return None


def x_of_M(M, y):
    j = int((M - 1) / 0.2)
    f = (M - 1 - 0.2 * j) / 0.2
    return vx(j, y) + f * (vx(j + 1, y) - vx(j, y))


def y_of_P(P, x):
    k = int(-P / 0.02)
    f = (-P - 0.02 * k) / 0.02
    return hy(k, x) + f * (hy(k + 1, x) - hy(k, x))


def runs(x):
    col = a[:, x] < 170
    out = []
    y = 300
    while y < 1800:
        if col[y]:
            z = y
            while z + 1 < 1800 and col[z + 1]:
                z += 1
            if z - y + 1 <= 5:
                yc = 0.5 * (y + z)
                ongrid = any(abs(yc - hy(k, x)) < 2.5 for k in hlines)
                if not ongrid:
                    out.append(yc)
            y = z + 1
        else:
            y += 1
    return out


def trace(seed_M, seed_P, M_end, step=2):
    """Track a curve from (seed_M, seed_P) towards M_end. Returns list of (M, P, x, y)."""
    y_guess = None
    x = int(round(x_of_M(seed_M, 1300)))
    y = y_of_P(seed_P, x)
    x = int(round(x_of_M(seed_M, y)))
    y = y_of_P(seed_P, x)
    hist = [(x, y)]
    pts = []
    direction = 1 if M_end > seed_M else -1
    while True:
        x += direction * step
        mp = to_MP(x, hist[-1][1])
        if mp is None or (direction > 0 and mp[0] > M_end) or (direction < 0 and mp[0] < M_end):
            break
        # predict y from the last few tracked points
        if len(hist) >= 4:
            xs, ys = np.array(hist[-6:]).T
            c = np.polyfit(xs, ys, 1)
            yp = np.polyval(c, x)
        else:
            yp = hist[-1][1]
        cands = [r for r in runs(x) if abs(r - yp) <= 3.0]
        if len(cands) == 1:
            yy = cands[0]
            hist.append((x, yy))
            m = to_MP(x, yy)
            if m:
                pts.append((m[0], m[1], x, yy))
        else:
            # gap (none, or ambiguous): carry the prediction, do not record
            hist.append((x, yp))
    return pts


def local_value(pts, M0, half=0.12):
    sel = [(m, p) for m, p, _, _ in pts if abs(m - M0) <= half]
    if len(sel) < 8:
        return None
    ms, ps = np.array(sel).T
    c = np.polyfit(ms - M0, ps, 2)
    res = ps - np.polyval(c, ms - M0)
    return float(c[-1]), float(np.std(res)), len(sel), float(ms.min()), float(ms.max())


if __name__ == '__main__':
    print('horizontal gridlines fitted:', len(hlines), ' max residual px:', max(v[3] for v in hlines.values()))
    print('  tilt (px over 2000 px of x): k=0 %.2f, k=6 %.2f, k=12 %.2f' % tuple(hlines[k][0] * 2000 for k in (0, 6, 12)))
    print('vertical gridlines fitted:', len(vlines), ' max residual px:', max(v[3] for v in vlines.values()))
    print('  lean (px over 1400 px of y): j=0 %.2f, j=10 %.2f, j=20 %.2f' % tuple(vlines[j][0] * 1400 for j in (0, 10, 20) if j in vlines))
    # vacuum curve check: trace dashed curve? use points near expected
    print('vacuum-curve check (nearest thin dark run to -2/(1.4 M^2)):')
    for M in (3.5, 4.0, 4.5, 5.0, 6.0):
        P = -2 / (1.4 * M * M)
        best = None
        for dx in range(-6, 7, 2):
            x = int(round(x_of_M(M, 1500))) + dx
            yexp = y_of_P(P, x)
            for r in runs(x):
                if abs(r - yexp) < 6:
                    mp = to_MP(x, r)
                    if mp:
                        d = mp[1] - (-2 / (1.4 * mp[0] ** 2))
                        if best is None or abs(d) < abs(best):
                            best = d
        print('  M=%.1f residual P_B (read - exact) = %s' % (M, 'none found' if best is None else '%+.4f' % best))
    # seeds: two curves at M 1.45 (more and less negative), traced both ways
    import json
    curves = {}
    for name, sM, sP in (('upper', 1.45, -0.1795), ('lower', 1.45, -0.1765)):
        fw = trace(sM, sP, 3.7)
        bw = trace(sM, sP, 1.02)
        curves[name] = sorted(bw + fw)
        print('%s: %d tracked columns, M %.3f to %.3f' % (name, len(curves[name]), curves[name][0][0], curves[name][-1][0]))
    targets = [1.50, 1.503, 1.63, 1.935, 1.939, 2.00, 2.009, 2.414, 2.418, 2.50, 2.681, 3.00, 3.243, 3.497]
    print('M      upper(P, sd, n, Mrange)                lower(...)')
    rows = []
    for M0 in targets:
        u = local_value(curves['upper'], M0)
        l = local_value(curves['lower'], M0)
        fmt = lambda v: 'n/a' if v is None else '%.4f sd %.4f n %d [%.2f,%.2f]' % v
        print('%.3f  %-40s %s' % (M0, fmt(u), fmt(l)))
        rows.append((M0, u, l))
    json.dump({'curves': {k: [(m, p) for m, p, _, _ in v] for k, v in curves.items()}, 'rows': rows},
              open(sys.argv[2], 'w'))
