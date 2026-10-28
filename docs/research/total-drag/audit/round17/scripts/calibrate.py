"""Per-panel grid calibration.

usage: python3 -I calibrate.py PAGE.npy PANELS.json OUT.json

PANELS.json: list of {"panel": "...", "xl": left frame x, "xr": right frame x,
"yt": top frame y, "yb": bottom frame y} in native pixels (approximate).
Each panel has 9 vertical lines (x value 0, -0.1, ..., -0.8 from left to
right) and 9 horizontal lines (alpha 0, 2, ..., 16 deg from bottom to top).
Labelled lines: x 0, -.2, -.4, -.6, -.8 and alpha 0..14. The top line
(alpha 16) and the odd tenths are unlabelled; they are used only as checks.

For every line: sample its centre along its length where the ink run across
it is a clean 1 to 7 px run, fit centre = a + b * (position along line) with
trimming of outliers, report the fitted tilt and the scatter.
Then intersections, then a least-squares affine map pixel -> value for each
axis using the labelled lines only, with per-line residuals and a
leave-one-line-out check, and the unlabelled lines as an extra check.
"""
import sys
import json
import numpy as np

ink = np.load(sys.argv[1])
panels = json.load(open(sys.argv[2]))
out_path = sys.argv[3]

XVALS = [-0.1 * k for k in range(9)]
YVALS = [2.0 * j for j in range(9)]
XLAB = [0, 2, 4, 6, 8]
YLAB = [0, 1, 2, 3, 4, 5, 6, 7]


def runs(v):
    d = np.diff(np.concatenate(([0], v.astype(np.int8), [0])))
    return list(zip(np.where(d == 1)[0], np.where(d == -1)[0]))


def fit_line(samples):
    """samples: list of (t, c). Fit c = a + b t with trimming. Return a, b, sd, n, kept."""
    s = np.array(samples, float)
    keep = np.ones(len(s), bool)
    for _ in range(6):
        A = np.vstack([np.ones(keep.sum()), s[keep, 0]]).T
        coef, *_ = np.linalg.lstsq(A, s[keep, 1], rcond=None)
        res = s[:, 1] - (coef[0] + coef[1] * s[:, 0])
        sd = np.std(res[keep])
        new = np.abs(res) < max(1.0, 2.0 * sd)
        if (new == keep).all():
            break
        keep = new
    return float(coef[0]), float(coef[1]), float(np.std(res[keep])), int(keep.sum()), keep


def sample_vertical(xc, y0, y1, avoid_rows, win=8):
    out = []
    for y in range(int(y0), int(y1)):
        if any(abs(y - r) <= 7 for r in avoid_rows):
            continue
        lo = int(round(xc)) - win
        seg = ink[y, lo:lo + 2 * win + 1]
        rr = [(a, b) for a, b in runs(seg)]
        if len(rr) != 1:
            continue
        a, b = rr[0]
        if not (1 <= b - a <= 7):
            continue
        out.append((y, lo + (a + b - 1) / 2.0))
    return out


def sample_horizontal(yc, x0, x1, avoid_cols, win=8):
    out = []
    for x in range(int(x0), int(x1)):
        if any(abs(x - c) <= 7 for c in avoid_cols):
            continue
        lo = int(round(yc)) - win
        seg = ink[lo:lo + 2 * win + 1, x]
        rr = runs(seg)
        if len(rr) != 1:
            continue
        a, b = rr[0]
        if not (1 <= b - a <= 7):
            continue
        out.append((x, lo + (a + b - 1) / 2.0))
    return out


def refine_centre(profile_center, along0, along1, vertical, others):
    """Find the line centre near a nominal value using a 1D ink profile."""
    return profile_center


result = []
for P in panels:
    xl, xr, yt, yb = P['xl'], P['xr'], P['yt'], P['yb']
    xs_nom = [xl + (xr - xl) * k / 8.0 for k in range(9)]
    ys_nom = [yb - (yb - yt) * j / 8.0 for j in range(9)]
    # refine nominal centres from column/row ink profiles inside the panel
    def refine(nom, vertical):
        best, bestv = nom, -1
        for d in range(-10, 11):
            c = int(round(nom + d))
            if vertical:
                v = ink[int(yt) + 10:int(yb) - 10, c].sum()
            else:
                v = ink[c, int(xl) + 10:int(xr) - 10].sum()
            if v > bestv:
                best, bestv = c, v
        return best
    xs_nom = [refine(x, True) for x in xs_nom]
    ys_nom = [refine(y, False) for y in ys_nom]
    vlines, hlines = [], []
    skip_h = P.get('skip_h', [])
    vy0 = P.get('inner_v_y0', yt + 3)
    win = P.get('win', 8)
    for k, xc in enumerate(xs_nom):
        y0s = yt + 3 if k in (0, 8) else vy0
        smp = sample_vertical(xc, y0s, yb - 2, ys_nom, win)
        if len(smp) < 40:
            vlines.append(None)
            continue
        a, b, sd, n, keep = fit_line(smp)
        span = (min(s[0] for s in smp), max(s[0] for s in smp))
        vlines.append({'k': k, 'value': XVALS[k], 'a': a, 'b': b, 'sd_px': sd, 'n': n,
                       'span': span, 'labelled': k in XLAB})
    for j, yc in enumerate(ys_nom):
        if j in skip_h:
            hlines.append(None)
            continue
        smp = sample_horizontal(yc, xl + 3, xr - 2, xs_nom, win)
        if len(smp) < 40:
            hlines.append(None)
            continue
        a, b, sd, n, keep = fit_line(smp)
        span = (min(s[0] for s in smp), max(s[0] for s in smp))
        hlines.append({'j': j, 'value': YVALS[j], 'a': a, 'b': b, 'sd_px': sd, 'n': n,
                       'span': span, 'labelled': j in YLAB})

    def inter(v, h):
        # x = av + bv*y ; y = ah + bh*x
        x = (v['a'] + v['b'] * h['a']) / (1 - v['b'] * h['b'])
        y = h['a'] + h['b'] * x
        return x, y

    V = [v for v in vlines if v]
    H = [h for h in hlines if h]

    def fit_axis(lines, cross, axis):
        pts = []
        for L in lines:
            for C in cross:
                x, y = inter(L, C) if axis == 'x' else inter(C, L)
                pts.append((x, y, L['value'], L['k'] if axis == 'x' else L['j']))
        A = np.array([[1, p[0], p[1]] for p in pts])
        z = np.array([p[2] for p in pts])
        coef, *_ = np.linalg.lstsq(A, z, rcond=None)
        return coef, pts

    out = {'panel': P['panel'], 'frame_nominal': P, 'vlines': vlines, 'hlines': hlines}
    for axis, lines, cross, lab in (('x', V, H, XLAB), ('y', H, V, YLAB)):
        key = 'k' if axis == 'x' else 'j'
        labl = [L for L in lines if L[key] in lab]
        coef, pts = fit_axis(labl, cross, axis)
        # per-line residuals (value units), and LOO
        per = []
        for L in lines:
            pp = [inter(L, C) if axis == 'x' else inter(C, L) for C in cross]
            pred = [coef[0] + coef[1] * x + coef[2] * y for x, y in pp]
            r = float(np.mean(pred) - L['value'])
            loo = None
            if L[key] in lab:
                others = [M for M in labl if M is not L]
                c2, _ = fit_axis(others, cross, axis)
                pred2 = [c2[0] + c2[1] * x + c2[2] * y for x, y in pp]
                loo = float(np.mean(pred2) - L['value'])
            per.append({'line': L[key], 'value': L['value'], 'labelled': L[key] in lab,
                        'resid': r, 'loo': loo, 'resid_spread': float(np.std(np.array(pred) - L['value']))})
        out['fit_' + axis] = {'coef': [float(c) for c in coef], 'per_line': per,
                              'n_lines': len(labl), 'n_points': len(pts)}
    # scales
    cx, cy = out['fit_x']['coef'], out['fit_y']['coef']
    out['scale'] = {'x_units_per_px_along_x': cx[1], 'x_units_per_px_along_y': cx[2],
                    'alpha_deg_per_px_along_y': cy[2], 'alpha_deg_per_px_along_x': cy[1]}
    result.append(out)
    print('==', P['panel'])
    print('  vertical lines: ', ' '.join(f"k{v['k']}:a={v['a']:.1f},b={v['b']*1000:.2f}e-3,sd={v['sd_px']:.2f},n={v['n']}" if v else 'missing' for v in vlines))
    print('  horizontal lines:', ' '.join(f"j{h['j']}:a={h['a']:.1f},b={h['b']*1000:.2f}e-3,sd={h['sd_px']:.2f},n={h['n']}" if h else 'missing' for h in hlines))
    for axis in ('x', 'y'):
        f = out['fit_' + axis]
        print(f"  fit {axis}: coef={['%.6g' % c for c in f['coef']]} lines={f['n_lines']}")
        for p in f['per_line']:
            print(f"     line {p['line']} val {p['value']:+.2f} lab={p['labelled']} resid={p['resid']:+.5f} loo={p['loo'] if p['loo'] is None else round(p['loo'], 5)}")

json.dump(result, open(out_path, 'w'), indent=1)
