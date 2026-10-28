"""Shared helpers for reading scanned NACA figures (reader A).

Grid lines, axis calibration by least squares through labelled ticks, a
local refinement on the printed minor grid, and symbol centring from the
symbol's own strokes. Imported by the per-figure scripts in this folder.
"""
import numpy as np
from PIL import Image


def load_grey(path):
    return np.asarray(Image.open(path).convert("L")).astype(float)


# ---------------------------------------------------------------- lines
def detect_lines(g, axis, x0, y0, x1, y1, minsep=8, k=9, use_median=True):
    """Sub-pixel centres of grid lines crossing the box.
    axis 'v': vertical lines, positions along x. 'h': horizontal, along y."""
    dark = 255.0 - g[y0:y1, x0:x1]
    if axis == "v":
        prof = np.median(dark, axis=0) if use_median else dark.mean(axis=0)
        off = x0
    else:
        prof = np.median(dark, axis=1) if use_median else dark.mean(axis=1)
        off = y0
    base = np.array([np.median(prof[max(0, i - k):i + k + 1]) for i in range(len(prof))])
    hp = prof - base
    thr = max(3.0, np.percentile(hp, 90) * 0.5)
    peaks = []
    for i in range(1, len(hp) - 1):
        if hp[i] >= hp[i - 1] and hp[i] > hp[i + 1] and hp[i] > thr:
            if peaks and i - peaks[-1] < minsep:
                if hp[i] > hp[peaks[-1]]:
                    peaks[-1] = i
                continue
            peaks.append(i)
    out = []
    for i in peaks:
        a, b, c = hp[i - 1], hp[i], hp[i + 1]
        den = a - 2 * b + c
        dd = 0.5 * (a - c) / den if den != 0 else 0.0
        out.append(off + i + dd)
    return np.array(out)


def detect_lines_s(g, axis, x0, y0, x1, y1, minsep=8, k=9):
    """Like detect_lines but also returns each line's high-passed darkness
    (used to keep only the heavy, labelled grid lines)."""
    dark = 255.0 - g[y0:y1, x0:x1]
    prof = np.median(dark, axis=0) if axis == "v" else np.median(dark, axis=1)
    off = x0 if axis == "v" else y0
    base = np.array([np.median(prof[max(0, i - k):i + k + 1]) for i in range(len(prof))])
    hp = prof - base
    thr = max(3.0, np.percentile(hp, 90) * 0.5)
    peaks = []
    for i in range(1, len(hp) - 1):
        if hp[i] >= hp[i - 1] and hp[i] > hp[i + 1] and hp[i] > thr:
            if peaks and i - peaks[-1] < minsep:
                if hp[i] > hp[peaks[-1]]:
                    peaks[-1] = i
                continue
            peaks.append(i)
    out = []
    for i in peaks:
        a, b, c = hp[i - 1], hp[i], hp[i + 1]
        den = a - 2 * b + c
        dd = 0.5 * (a - c) / den if den != 0 else 0.0
        out.append((off + i + dd, b))
    return np.array(out)


def index_lines(pos, spacing, start_index=0):
    """Give consecutive grid indices to detected lines, allowing gaps."""
    idx = [start_index]
    for i in range(1, len(pos)):
        idx.append(idx[-1] + max(1, int(round((pos[i] - pos[i - 1]) / spacing))))
    return np.array(idx)


# ---------------------------------------------------------- calibration
def fit_affine(samples):
    """samples: list of (value, px, py). Least squares value = a + b px + c py.
    Returns coefficients and per-sample residuals (value units)."""
    A = np.array([[1.0, s[1], s[2]] for s in samples])
    v = np.array([s[0] for s in samples])
    coef, *_ = np.linalg.lstsq(A, v, rcond=None)
    res = A @ coef - v
    return coef, res


def fit_linear(samples):
    """samples: list of (value, pos). value = a + b pos."""
    A = np.array([[1.0, s[1]] for s in samples])
    v = np.array([s[0] for s in samples])
    coef, *_ = np.linalg.lstsq(A, v, rcond=None)
    return coef, A @ coef - v


def local_value(g, axis, cx, cy, gfun, step, half=48, band=28, minsep=8, exclude=8):
    """Refine a coordinate on the printed minor grid near (cx, cy).

    axis 'x': uses vertical lines found in the rows cy-band..cy+band, but
    skipping rows within `exclude` px of cy (the symbol itself);
    axis 'y': horizontal lines in columns cx-band..cx+band likewise.
    Each line gets the grid value nearest to the global fit gfun(px, py);
    a straight line through (position, value) of the lines within `half`
    px gives the value at the symbol. Returns value, rms residual of the
    local fit (value units), number of lines, and the two bracketing lines.
    """
    cx_i, cy_i = int(round(cx)), int(round(cy))
    if axis == "x":
        parts = [detect_lines(g, "v", cx_i - half, cy_i - band, cx_i + half, cy_i - exclude, minsep),
                 detect_lines(g, "v", cx_i - half, cy_i + exclude, cx_i + half, cy_i + band, minsep)]
    else:
        parts = [detect_lines(g, "h", cx_i - band, cy_i - half, cx_i - exclude, cy_i + half, minsep),
                 detect_lines(g, "h", cx_i + exclude, cy_i - half, cx_i + band, cy_i + half, minsep)]
    pos = []
    for p in parts:
        pos.extend(list(p))
    pos = np.array(sorted(pos))
    # merge detections of the same line from the two half-bands
    merged = []
    for p in pos:
        if merged and p - merged[-1][-1] < minsep * 0.6:
            merged[-1].append(p)
        else:
            merged.append([p])
    lines = np.array([np.mean(m) for m in merged])
    if len(lines) < 2:
        return None
    vals = []
    for p in lines:
        v = gfun(p, cy) if axis == "x" else gfun(cx, p)
        vals.append(round(v / step) * step)
    vals = np.array(vals)
    # drop lines whose rounded value repeats (double detections)
    keep = np.ones(len(lines), bool)
    for i in range(1, len(lines)):
        if abs(vals[i] - vals[i - 1]) < step * 0.5:
            keep[i] = False
    lines, vals = lines[keep], vals[keep]
    c = cx if axis == "x" else cy
    samples = list(zip(vals, lines))
    coef, res = fit_linear(samples)
    value = coef[0] + coef[1] * c
    below = lines[lines <= c]
    above = lines[lines > c]
    br = (below[-1] if len(below) else None, above[0] if len(above) else None)
    return dict(value=value, rms=float(np.sqrt(np.mean(res ** 2))), n=len(lines),
                maxres=float(np.max(np.abs(res))), bracket=br, slope=coef[1])


# ---------------------------------------------------------------- symbols
def symfit(g, typ, cx, cy, size, search=5.0, masks=(), sizes=None):
    """Centre of a symbol from its strokes; see symfit.py for the method."""
    R = int(search + size + 12)
    x0, y0 = int(cx) - R, int(cy) - R
    sub = g[y0:y0 + 2 * R + 1, x0:x0 + 2 * R + 1]
    pad = 20
    big = g[max(0, y0 - pad):y0 + 2 * R + 1 + pad, max(0, x0 - pad):x0 + 2 * R + 1 + pad]
    bg = np.percentile(big, 80)
    d = np.clip(bg - sub, 0, None)
    H, W = d.shape
    valid = np.ones_like(d, bool)
    for (mx0, my0, mx1, my1) in masks:
        valid[max(0, int(my0) - y0):max(0, int(my1) - y0 + 1), max(0, int(mx0) - x0):max(0, int(mx1) - x0 + 1)] = False

    def sample(px, py):
        px = np.clip(px, 0, W - 1.001); py = np.clip(py, 0, H - 1.001)
        ix = px.astype(int); iy = py.astype(int); fx = px - ix; fy = py - iy
        v = (d[iy, ix] * (1 - fx) * (1 - fy) + d[iy, ix + 1] * fx * (1 - fy)
             + d[iy + 1, ix] * (1 - fx) * fy + d[iy + 1, ix + 1] * fx * fy)
        ok = valid[iy, ix] & valid[np.minimum(iy + 1, H - 1), np.minimum(ix + 1, W - 1)]
        return v, ok

    def outline_pts(kind, s, inset):
        n = 120
        t = np.linspace(0, 1, n, endpoint=False)
        if kind == "ring":
            r = s / 2 - 0.8 + inset
            a = 2 * np.pi * t
            return r * np.cos(a), r * np.sin(a)
        if kind == "square":
            h = s / 2 - 0.8 + inset
            u = (t * 4) % 1 * 2 - 1; side = (t * 4).astype(int)
            xs = np.where(side == 0, u * h, np.where(side == 1, h, np.where(side == 2, -u * h, -h)))
            ys = np.where(side == 0, -h, np.where(side == 1, u * h, np.where(side == 2, h, -u * h)))
            return xs, ys
        if kind == "diamond":
            h = s / 2 - 1.1 + inset * 1.41
            u = (t * 4) % 1; side = (t * 4).astype(int)
            corners = [(0, -h), (h, 0), (0, h), (-h, 0), (0, -h)]
            xs = np.empty(n); ys = np.empty(n)
            for kk in range(4):
                m = side == kk
                xs[m] = corners[kk][0] + (corners[kk + 1][0] - corners[kk][0]) * u[m]
                ys[m] = corners[kk][1] + (corners[kk + 1][1] - corners[kk][1]) * u[m]
            return xs, ys
        if kind in ("rtri", "rtri_dn", "ltri"):  # right triangle: top edge, right edge, hypotenuse (fig. 16 run 3)
            w = s - 1.6 + 2 * inset; h = w * 25.0 / 29.0
            if kind == "rtri":
                pts = [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, -h / 2)]
            elif kind == "ltri":  # mirror image: top edge, left edge, hypotenuse (fig. 16(b) run 3)
                pts = [(-w / 2, -h / 2), (w / 2, -h / 2), (-w / 2, h / 2), (-w / 2, -h / 2)]
            else:  # the same triangle with its right angle at the lower right (point-down variant)
                pts = [(w / 2, -h / 2), (w / 2, h / 2), (-w / 2, -h / 2), (w / 2, -h / 2)]
            u = (t * 3) % 1; side = (t * 3).astype(int)
            xs = np.empty(n); ys = np.empty(n)
            for kk in range(3):
                m = side == kk
                xs[m] = pts[kk][0] + (pts[kk + 1][0] - pts[kk][0]) * u[m]
                ys[m] = pts[kk][1] + (pts[kk + 1][1] - pts[kk][1]) * u[m]
            return xs, ys
        if kind == "dtri":  # apex down
            h = s / 2 - 0.8 + inset
            pts = [(0, h), (-h * 0.95, -h * 0.75), (h * 0.95, -h * 0.75), (0, h)]
            u = (t * 3) % 1; side = (t * 3).astype(int)
            xs = np.empty(n); ys = np.empty(n)
            for kk in range(3):
                m = side == kk
                xs[m] = pts[kk][0] + (pts[kk + 1][0] - pts[kk][0]) * u[m]
                ys[m] = pts[kk][1] + (pts[kk + 1][1] - pts[kk][1]) * u[m]
            return xs, ys
        if kind == "triangle":  # apex up
            h = s / 2 - 0.8 + inset
            pts = [(0, -h), (h * 0.95, h * 0.75), (-h * 0.95, h * 0.75), (0, -h)]
            u = (t * 3) % 1; side = (t * 3).astype(int)
            xs = np.empty(n); ys = np.empty(n)
            for kk in range(3):
                m = side == kk
                xs[m] = pts[kk][0] + (pts[kk + 1][0] - pts[kk][0]) * u[m]
                ys[m] = pts[kk][1] + (pts[kk + 1][1] - pts[kk][1]) * u[m]
            return xs, ys
        raise ValueError(kind)

    def area_pts(kind, s, grow):
        step = 0.7
        r = s / 2 + grow
        xs, ys = np.meshgrid(np.arange(-r, r + 1e-9, step), np.arange(-r, r + 1e-9, step))
        xs = xs.ravel(); ys = ys.ravel()
        m = (xs ** 2 + ys ** 2 <= r * r) if kind == "disc" else np.ones_like(xs, bool)
        return xs[m], ys[m]

    def score(px, py, s):
        if typ in ("ring", "square", "diamond", "triangle", "rtri", "rtri_dn", "dtri", "ltri"):
            on = [outline_pts(typ, s, dd) for dd in (-0.5, 0.0, 0.5)]
            offx = np.concatenate([o[0] for o in on]); offy = np.concatenate([o[1] for o in on])
            out = [outline_pts(typ, s, dd) for dd in (2.5, 3.0)]
            inn = [outline_pts(typ, s, dd) for dd in (-2.5,)] if s > 9 else []
            gx = np.concatenate([o[0] for o in out + inn]); gy = np.concatenate([o[1] for o in out + inn])
        else:
            kind = "disc" if typ == "disc" else "sq"
            offx, offy = area_pts(kind, s, -0.6)
            ax, ay = area_pts(kind, s, 3.0)
            if kind == "disc":
                m = ax ** 2 + ay ** 2 > (s / 2 + 1.0) ** 2
            else:
                m = (np.abs(ax) > s / 2 + 1.0) | (np.abs(ay) > s / 2 + 1.0)
            gx, gy = ax[m], ay[m]
        v1, ok1 = sample(px + offx, py + offy)
        v2, ok2 = sample(px + gx, py + gy)
        if ok1.sum() < 0.5 * len(v1) or ok2.sum() < 0.3 * len(v2):
            return -1e9
        return v1[ok1].mean() - v2[ok2].mean()

    ccx, ccy = cx - x0, cy - y0
    sz = sizes if sizes is not None else np.arange(size - 2, size + 2.01, 0.5)
    offs = np.arange(-search, search + 1e-9, 0.25)
    DX, DY = np.meshgrid(offs, offs)
    DX = DX.ravel(); DY = DY.ravel()
    allsc = []
    for s in sz:
        if typ in ("ring", "square", "diamond", "triangle", "rtri", "rtri_dn", "dtri", "ltri"):
            on = [outline_pts(typ, s, dd) for dd in (-0.5, 0.0, 0.5)]
            offx = np.concatenate([o[0] for o in on]); offy = np.concatenate([o[1] for o in on])
            out = [outline_pts(typ, s, dd) for dd in (2.5, 3.0)]
            inn = [outline_pts(typ, s, dd) for dd in (-2.5,)] if s > 9 else []
            gx = np.concatenate([o[0] for o in out + inn]); gy = np.concatenate([o[1] for o in out + inn])
        else:
            kind = "disc" if typ == "disc" else "sq"
            offx, offy = area_pts(kind, s, -0.6)
            ax, ay = area_pts(kind, s, 3.0)
            if kind == "disc":
                m = ax ** 2 + ay ** 2 > (s / 2 + 1.0) ** 2
            else:
                m = (np.abs(ax) > s / 2 + 1.0) | (np.abs(ay) > s / 2 + 1.0)
            gx, gy = ax[m], ay[m]
        PX = (ccx + DX)[:, None]; PY = (ccy + DY)[:, None]
        v1, ok1 = sample(PX + offx[None, :], PY + offy[None, :])
        v2, ok2 = sample(PX + gx[None, :], PY + gy[None, :])
        n1 = ok1.sum(axis=1); n2 = ok2.sum(axis=1)
        m1 = (v1 * ok1).sum(axis=1) / np.maximum(n1, 1)
        m2 = (v2 * ok2).sum(axis=1) / np.maximum(n2, 1)
        sc = m1 - m2
        sc[(n1 < 0.5 * v1.shape[1]) | (n2 < 0.3 * v2.shape[1])] = -1e9
        allsc.append(sc)
    allsc = np.array(allsc)
    k = np.unravel_index(np.argmax(allsc), allsc.shape)
    sc = allsc[k]; bs = sz[k[0]]; bx = DX[k[1]]; by = DY[k[1]]
    near = allsc[k[0]] >= sc - 0.1 * abs(sc)
    ex = (DX[near].max() - DX[near].min()) / 2 + 0.25
    ey = (DY[near].max() - DY[near].min()) / 2 + 0.25
    edge = abs(bx) >= search - 0.01 or abs(by) >= search - 0.01
    return dict(x=cx + bx, y=cy + by, size=bs, score=sc, ex=ex, ey=ey, edge=edge)
