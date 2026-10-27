"""Shared tools for reading plotted points from scanned figures.

Pixel coordinates: u = column, v = row, of the native scan image
(300 dpi) after any lossless 90-degree rotation done by rot.py.
"""
import json
import math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


def load_gray(path):
    return np.asarray(Image.open(path).convert('L')).astype(float)


# ---------------------------------------------------------------- grid lines

def _centroid(profile, centre_guess, halfwin):
    n = len(profile)
    lo = max(int(round(centre_guess)) - halfwin, 0)
    hi = min(int(round(centre_guess)) + halfwin + 1, n)
    seg = profile[lo:hi]
    base = np.percentile(profile, 50)
    w = (seg - base).clip(0, None)
    if w.sum() <= 0:
        return None, 0.0
    # keep only the main peak: zero weights far from the max
    k = int(np.argmax(w))
    peak = w[k]
    keep = np.zeros_like(w, dtype=bool)
    j = k
    while j >= 0 and w[j] > 0.15 * peak:
        keep[j] = True
        j -= 1
    j = k
    while j < len(w) and w[j] > 0.15 * peak:
        keep[j] = True
        j += 1
    w = np.where(keep, w, 0)
    pos = lo + (np.arange(len(w)) * w).sum() / w.sum()
    return pos, peak


def refine_line(img, orient, approx, span, nstrips=16, halfwin=5, exclude=()):
    """Fit a straight grid line.

    orient 'h': line v = a + b*u, approx = v guess, span = (u0, u1)
    orient 'v': line u = a + b*v, approx = u guess, span = (v0, v1)
    exclude: list of (s0, s1) ranges along the line to skip (symbols, text).
    Returns dict with a, b, rms, n, samples.
    """
    dark = 255.0 - img
    s0, s1 = span
    edges = np.linspace(s0, s1, nstrips + 1)
    samples = []
    for i in range(nstrips):
        a0, a1 = int(edges[i]), int(edges[i + 1])
        mid = 0.5 * (a0 + a1)
        if any(e0 <= mid <= e1 for e0, e1 in exclude):
            continue
        lo = int(round(approx)) - 3 * halfwin
        hi = int(round(approx)) + 3 * halfwin + 1
        if orient == 'h':
            prof = dark[lo:hi, a0:a1].mean(axis=1)
        else:
            prof = dark[a0:a1, lo:hi].mean(axis=0)
        pos, peak = _centroid(prof, approx - lo, halfwin)
        if pos is None or peak < 20:
            continue
        samples.append((mid, lo + pos))
    samples = np.array(samples)
    if len(samples) < 3:
        raise RuntimeError(f"line {orient} near {approx}: only {len(samples)} samples")
    # robust start: Theil-Sen slope, median intercept
    xs, ys = samples[:, 0], samples[:, 1]
    sl = []
    for i in range(len(xs)):
        for j in range(i + 1, len(xs)):
            if xs[j] != xs[i]:
                sl.append((ys[j] - ys[i]) / (xs[j] - xs[i]))
    b0 = float(np.median(sl))
    a0 = float(np.median(ys - b0 * xs))
    res = ys - (a0 + b0 * xs)
    keep = np.abs(res) < 1.2
    if keep.sum() < 3:
        keep = np.abs(res) <= np.sort(np.abs(res))[2]
    for _ in range(3):
        A = np.vstack([np.ones(keep.sum()), xs[keep]]).T
        coef, *_ = np.linalg.lstsq(A, ys[keep], rcond=None)
        res = ys - (coef[0] + coef[1] * xs)
        new = np.abs(res) < max(0.8, 2.5 * np.std(res[keep]))
        if (new == keep).all():
            break
        keep = new
    rms = float(np.sqrt(np.mean(res[keep] ** 2)))
    return {'a': float(coef[0]), 'b': float(coef[1]), 'rms': rms,
            'n': int(keep.sum()), 'nall': len(samples)}


def intersect(h, v):
    """h: v = ha + hb*u ; v: u = va + vb*v. Return (u, v)."""
    # u = va + vb*(ha + hb*u) -> u (1 - vb*hb) = va + vb*ha
    u = (v['a'] + v['b'] * h['a']) / (1 - v['b'] * h['b'])
    vv = h['a'] + h['b'] * u
    return u, vv


def fit_affine(uv, xy):
    uv = np.asarray(uv, float)
    xy = np.asarray(xy, float)
    A = np.hstack([np.ones((len(uv), 1)), uv])
    cx, *_ = np.linalg.lstsq(A, xy[:, 0], rcond=None)
    cy, *_ = np.linalg.lstsq(A, xy[:, 1], rcond=None)
    pred = np.vstack([A @ cx, A @ cy]).T
    return cx, cy, xy - pred


def apply_affine(cal, u, v):
    cx, cy = cal['cx'], cal['cy']
    return (cx[0] + cx[1] * u + cx[2] * v, cy[0] + cy[1] * u + cy[2] * v)


def apply_xform(cal, u, v):
    """Apply calibration; supports log axes via cal['xlog'], cal['ylog']."""
    x, y = apply_affine(cal, u, v)
    if cal.get('xlog'):
        x = 10 ** x
    if cal.get('ylog'):
        y = 10 ** y
    return x, y


def calibrate(img, panel):
    """panel: dict with
       hlines: [[v_approx, y_value_or_null, labelled_bool], ...]
       vlines: [[u_approx, x_value_or_null, labelled_bool], ...]
       uspan, vspan: spans along which to sample lines
       hexclude/vexclude: optional exclusion ranges
    """
    hl, vl = [], []
    for v0, val, lab in panel['hlines']:
        r = refine_line(img, 'h', v0, panel['uspan'], panel.get('nstrips', 16),
                        exclude=panel.get('hexclude', []))
        r.update(approx=v0, value=val, labelled=lab)
        hl.append(r)
    for u0, val, lab in panel['vlines']:
        r = refine_line(img, 'v', u0, panel['vspan'], panel.get('nstrips', 16),
                        exclude=panel.get('vexclude', []))
        r.update(approx=u0, value=val, labelled=lab)
        vl.append(r)
    xlog, ylog = panel.get('xlog', False), panel.get('ylog', False)
    uv, xy, tag = [], [], []
    for h in hl:
        if not h['labelled']:
            continue
        for v in vl:
            if not v['labelled']:
                continue
            u_, v_ = intersect(h, v)
            xv = math.log10(v['value']) if xlog else v['value']
            yv = math.log10(h['value']) if ylog else h['value']
            uv.append((u_, v_))
            xy.append((xv, yv))
            tag.append((v['value'], h['value']))
    cx, cy, res = fit_affine(uv, xy)
    cal = {'cx': cx.tolist(), 'cy': cy.tolist(), 'xlog': xlog, 'ylog': ylog,
           'hl': hl, 'vl': vl, 'n_int': len(uv),
           'res': res.tolist(), 'tags': tag, 'uv': [list(p) for p in uv]}
    # pixel scale: data per pixel along u and v
    cal['dxdu'] = cx[1]
    cal['dydv'] = cy[2]
    cal['rms_x'] = float(np.sqrt(np.mean(res[:, 0] ** 2)))
    cal['rms_y'] = float(np.sqrt(np.mean(res[:, 1] ** 2)))
    cal['max_x'] = float(np.abs(res[:, 0]).max())
    cal['max_y'] = float(np.abs(res[:, 1]).max())
    # check unlabelled lines too
    chk = []
    for h in hl:
        if h['labelled'] or h['value'] is None:
            continue
        # evaluate at panel centre u
        uc = 0.5 * (panel['uspan'][0] + panel['uspan'][1])
        vv = h['a'] + h['b'] * uc
        _, y = apply_xform(cal, uc, vv)
        chk.append(('h', h['value'], y - h['value']))
    for v in vl:
        if v['labelled'] or v['value'] is None:
            continue
        vc = 0.5 * (panel['vspan'][0] + panel['vspan'][1])
        uu = v['a'] + v['b'] * vc
        x, _ = apply_xform(cal, uu, vc)
        chk.append(('v', v['value'], x - v['value']))
    cal['check_unlabelled'] = chk
    return cal


def axis_fit_1d(lines, along, log=False):
    """1-D least-squares fit value = p0 + p1 * pixel for labelled lines,
    with each line evaluated at 'along' (u for horizontal lines, v for vertical)."""
    pts = [(l['a'] + l['b'] * along, l['value']) for l in lines if l['labelled']]
    p = np.array([q[0] for q in pts])
    val = np.array([math.log10(q[1]) if log else q[1] for q in pts])
    A = np.vstack([np.ones(len(p)), p]).T
    c, *_ = np.linalg.lstsq(A, val, rcond=None)
    res = val - A @ c
    return {'pix': p.tolist(), 'val': [q[1] for q in pts], 'c': c.tolist(), 'res': res.tolist()}


# ---------------------------------------------------------------- symbols

def outline(kind, size):
    """Return sample points (du, dv) on the symbol's stroke centreline.
    size: for circle the radius; square half side; diamond half diagonal;
    triangle (apex up) circumradius; 'tri_down' apex down."""
    pts = []
    if kind == 'circle':
        n = max(int(2 * math.pi * size * 2), 24)
        for k in range(n):
            t = 2 * math.pi * k / n
            pts.append((size * math.cos(t), size * math.sin(t)))
    elif kind in ('square', 'diamond', 'tri', 'tri_down', 'tri_left', 'tri_right', 'hex', 'oct', 'rtri', 'rtri_br', 'diamond_tall'):
        if kind == 'square':
            verts = [(-size, -size), (size, -size), (size, size), (-size, size)]
        elif kind == 'diamond':
            verts = [(0, -size), (size, 0), (0, size), (-size, 0)]
        elif kind == 'diamond_tall':
            # rhombus, half-width = size, half-height = 1.5 * size
            verts = [(0, -1.5 * size), (size, 0), (0, 1.5 * size), (-size, 0)]
        elif kind == 'tri':
            # apex up, centroid at origin
            verts = [(0, -size), (size * math.sin(math.pi / 3) , size * 0.5),
                     (-size * math.sin(math.pi / 3), size * 0.5)]
        elif kind == 'tri_down':
            verts = [(0, size), (size * math.sin(math.pi / 3), -size * 0.5),
                     (-size * math.sin(math.pi / 3), -size * 0.5)]
        elif kind == 'tri_right':
            verts = [(size, 0), (-size * 0.5, size * math.sin(math.pi / 3)),
                     (-size * 0.5, -size * math.sin(math.pi / 3))]
        elif kind == 'tri_left':
            verts = [(-size, 0), (size * 0.5, size * math.sin(math.pi / 3)),
                     (size * 0.5, -size * math.sin(math.pi / 3))]
        elif kind == 'hex':
            verts = [(size * math.cos(math.pi / 3 * k), size * math.sin(math.pi / 3 * k)) for k in range(6)]
        elif kind == 'oct':
            verts = [(size * math.cos(math.pi / 4 * k + math.pi / 8), size * math.sin(math.pi / 4 * k + math.pi / 8)) for k in range(8)]
        elif kind == 'rtri_br':
            # right triangle, right angle at bottom right (vertical side on the right)
            verts = [(size, -size), (size, size), (-size, size)]
        elif kind == 'rtri':
            # right triangle: right angle bottom-left, centred on bounding box
            verts = [(-size, size), (size, size), (-size, -size)]
        m = len(verts)
        for i in range(m):
            (x0, y0), (x1, y1) = verts[i], verts[(i + 1) % m]
            L = math.hypot(x1 - x0, y1 - y0)
            n = max(int(L * 2), 4)
            for k in range(n):
                t = k / n
                pts.append((x0 + t * (x1 - x0), y0 + t * (y1 - y0)))
    else:
        raise ValueError(kind)
    return np.array(pts)


def filled(kind, size, step=0.7):
    """Interior sample points for a filled symbol."""
    pts = []
    r = size
    g = np.arange(-r, r + 1e-9, step)
    for du in g:
        for dv in g:
            if kind == 'circle' and du * du + dv * dv <= (r - 0.5) ** 2:
                pts.append((du, dv))
            elif kind == 'square' and abs(du) <= r - 0.5 and abs(dv) <= r - 0.5:
                pts.append((du, dv))
            elif kind == 'diamond' and abs(du) + abs(dv) <= r - 0.7:
                pts.append((du, dv))
            elif kind == 'tri':
                # apex up triangle with circumradius r
                if dv <= r * 0.5 - 0.5 and dv >= -r + 0.8 and abs(du) <= (dv + r) / 1.5 * math.sin(math.pi / 3) - 0.5:
                    pts.append((du, dv))
    return np.array(pts)


def bilinear(arr, u, v):
    u0 = np.floor(u).astype(int)
    v0 = np.floor(v).astype(int)
    fu = u - u0
    fv = v - v0
    h, w = arr.shape
    u0 = np.clip(u0, 0, w - 2)
    v0 = np.clip(v0, 0, h - 2)
    return (arr[v0, u0] * (1 - fu) * (1 - fv) + arr[v0, u0 + 1] * fu * (1 - fv) +
            arr[v0 + 1, u0] * (1 - fu) * fv + arr[v0 + 1, u0 + 1] * fu * fv)


class SymbolFitter:
    """Template fitting on a window of the page. All public coordinates are
    full-page pixel coordinates (u column, v row)."""

    def __init__(self, img, thr=150, gridlines=(), gridmask_halfwidth=2.2, extra_masks=(), box=None, margin=60):
        H, W = img.shape
        if box is None:
            box = (0, 0, W, H)
        u0 = max(int(box[0]) - margin, 0)
        v0 = max(int(box[1]) - margin, 0)
        u1 = min(int(box[2]) + margin, W)
        v1 = min(int(box[3]) + margin, H)
        self.off = (u0, v0)
        sub = img[v0:v1, u0:u1]
        self.img = sub
        self.dark = sub < thr
        h, w = sub.shape
        vv, uu = np.mgrid[0:h, 0:w]
        mask = np.zeros_like(self.dark)
        for g in gridlines:
            if g['orient'] == 'h':
                d = np.abs((vv + v0) - (g['a'] + g['b'] * (uu + u0)))
            else:
                d = np.abs((uu + u0) - (g['a'] + g['b'] * (vv + v0)))
            mask |= d <= g.get('hw', gridmask_halfwidth)
        for (a0, b0, a1, b1) in extra_masks:
            mask[max(b0 - v0, 0):max(b1 - v0, 0), max(a0 - u0, 0):max(a1 - u0, 0)] = True
        self.mask = mask
        darkng = self.dark & ~mask
        self.dist = ndimage.distance_transform_edt(~darkng)
        self.maskf = mask.astype(float)
        # grey darkness, lightly smoothed, background removed
        g = ndimage.gaussian_filter(255.0 - sub, 0.8)
        bg = np.percentile(g, 30)
        self.gdark = np.clip((g - bg) / 200.0, 0, None)
        self.method = 'dist'

    def _score_many(self, pts, cus, cvs, sigma, fill=None):
        # cus, cvs: arrays of candidate centres in window coords
        U = cus[:, None] + pts[None, :, 0]
        V = cvs[:, None] + pts[None, :, 1]
        m = bilinear(self.maskf, U, V) < 0.5
        if self.method == 'gray':
            g = bilinear(self.gdark, U, V) * m
        else:
            d = bilinear(self.dist, U, V)
            g = np.exp(-(d / sigma) ** 2) * m
        cnt = m.sum(axis=1)
        s = np.where(cnt >= 0.3 * pts.shape[0], g.sum(axis=1) / np.maximum(cnt, 1), -1.0)
        if fill is not None and len(fill):
            U = cus[:, None] + fill[None, :, 0]
            V = cvs[:, None] + fill[None, :, 1]
            m = bilinear(self.maskf, U, V) < 0.5
            d = bilinear(self.dist, U, V)
            g = np.exp(-(d / sigma) ** 2) * m
            cnt = m.sum(axis=1)
            sf = np.where(cnt > 0, g.sum(axis=1) / np.maximum(cnt, 1), 0.0)
            s = np.where(s >= 0, 0.5 * s + 0.5 * sf, s)
        return s

    def fit(self, kind, size, cu0, cv0, radius=6.0, step=0.25, filled_sym=False, sigma=1.3):
        pts = outline(kind, size)
        fill = filled(kind, size) if filled_sym else None
        ou, ov = self.off
        grid = np.arange(-radius, radius + 1e-9, step)
        DU, DV = np.meshgrid(grid, grid)
        cus = (cu0 - ou) + DU.ravel()
        cvs = (cv0 - ov) + DV.ravel()
        s = self._score_many(pts, cus, cvs, sigma, fill)
        S = s.reshape(DU.shape)
        k = int(np.argmax(s))
        smax = float(s[k])
        cu, cv = cus[k] + ou, cvs[k] + ov
        good = S >= 0.97 * smax
        cols = np.where(good.any(axis=0))[0]
        rows = np.where(good.any(axis=1))[0]
        eu = max((cols.max() - cols.min()) * step / 2, step)
        ev = max((rows.max() - rows.min()) * step / 2, step)
        edge = (abs(cu - cu0) >= radius - 1e-6) or (abs(cv - cv0) >= radius - 1e-6)
        return {'u': float(cu), 'v': float(cv), 'score': smax, 'eu': float(eu), 'ev': float(ev), 'at_edge': bool(edge)}


def overlay(img, box, marks, out, scale=4, cal_lines=()):
    """Draw crosshairs at fitted centres on an enlarged crop for checking."""
    u0, v0, u1, v1 = box
    crop = Image.fromarray(img[v0:v1, u0:u1].astype(np.uint8)).convert('RGB')
    crop = crop.resize(((u1 - u0) * scale, (v1 - v0) * scale), Image.NEAREST)
    d = ImageDraw.Draw(crop)
    for m in marks:
        x = (m['u'] - u0 + 0.5) * scale
        y = (m['v'] - v0 + 0.5) * scale
        col = m.get('color', (255, 0, 0))
        r = m.get('r', 3) * scale
        d.line([(x - r, y), (x + r, y)], fill=col, width=1)
        d.line([(x, y - r), (x, y + r)], fill=col, width=1)
        if 'label' in m:
            d.text((x + r + 2, y - r), m['label'], fill=col)
        if 'shape' in m:
            pts = outline(m['shape'], m['size'])
            cols = {'circle': (230, 0, 0), 'square': (0, 170, 0), 'diamond': (0, 90, 255)}
            c2 = cols.get(m['shape'], (200, 0, 200))
            xy = [((m['u'] + p[0] - u0 + 0.5) * scale, (m['v'] + p[1] - v0 + 0.5) * scale) for p in pts]
            xy.append(xy[0])
            d.line(xy, fill=c2, width=1)
    crop.save(out)


def score_map(fitter, kind, size, box, sigma=1.3, filled_sym=False):
    """Integer-shift score map of a symbol template over box (u0, v0, u1, v1)."""
    ou, ov = fitter.off
    u0, v0, u1, v1 = box[0] - ou, box[1] - ov, box[2] - ou, box[3] - ov
    G = np.exp(-(fitter.dist / sigma) ** 2)
    M = (~fitter.mask).astype(float)
    GM = G * M
    pts = np.unique(np.round(outline(kind, size)).astype(int), axis=0)
    num = np.zeros((v1 - v0, u1 - u0))
    den = np.zeros((v1 - v0, u1 - u0))
    for du, dv in pts:
        num += GM[v0 + dv:v1 + dv, u0 + du:u1 + du]
        den += M[v0 + dv:v1 + dv, u0 + du:u1 + du]
    S = np.where(den > 0.3 * len(pts), num / np.maximum(den, 1), 0)
    if filled_sym:
        fp = np.unique(np.round(filled(kind, size)).astype(int), axis=0)
        num2 = np.zeros_like(num)
        den2 = np.zeros_like(num)
        for du, dv in fp:
            num2 += GM[v0 + dv:v1 + dv, u0 + du:u1 + du]
            den2 += M[v0 + dv:v1 + dv, u0 + du:u1 + du]
        S2 = np.where(den2 > 0, num2 / np.maximum(den2, 1), 0)
        S = 0.5 * S + 0.5 * S2
    return S


def peaks(S, box, thr=0.75, nbhd=9):
    mx = ndimage.maximum_filter(S, size=nbhd)
    vv, uu = np.where((S == mx) & (S >= thr))
    out = [(box[0] + u, box[1] + v, S[v, u]) for v, u in zip(vv, uu)]
    out.sort(key=lambda t: (t[0], t[1]))
    return out
