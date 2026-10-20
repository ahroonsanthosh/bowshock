"""Round 6 reading toolkit: render, grid detection, calibration, column scans,
symbol centroids, overlays. numpy and PIL only.

Conventions
- Images are float arrays, 0 = black, 1 = white, at the render dpi (600 by
  default; the NTRS scans are 300 ppi, so 1 scan pixel = 2 render pixels).
- A "box" is (x0, y0, x1, y1) in render pixels of the full page.
- Gridlines are found as long dark runs; each line is fitted as
  position = a + b * (other coordinate) so a skewed scan is followed.
- Calibration is local: a point's value is interpolated between the two
  gridlines that bracket it, each evaluated at the point's other coordinate.
  The labelled values of at least two lines fix the scale; the residual of
  a straight-line fit of all line positions to their values is reported as
  the calibration error.
"""
import os
import subprocess

import numpy as np
from PIL import Image, ImageDraw

WORK = os.environ.get("R6WORK", "")


def render(pdf, page, out_dir, dpi=600, rotate=0):
    """Render one page to an 8-bit grey PNG (cached); rotate: 90 or 270 gives
    a copy turned so that a landscape figure on a portrait page reads upright
    (90 = counter-clockwise)."""
    if rotate:
        base = render(pdf, page, out_dir, dpi)
        out = base.replace('.png', f'_r{rotate}.png')
        if not os.path.exists(out):
            im = Image.open(base)
            im.transpose(Image.ROTATE_90 if rotate == 90 else Image.ROTATE_270).save(out)
        return out
    os.makedirs(out_dir, exist_ok=True)
    stem = os.path.join(out_dir, f"p{page:03d}_{dpi}")
    png = stem + ".png"
    if not os.path.exists(png):
        subprocess.run(["nice", "-n", "10", "pdftoppm", "-gray", "-r", str(dpi), "-f", str(page),
                        "-l", str(page), "-singlefile", "-png", pdf, stem], check=True)
    return png


def load(png, box=None):
    im = Image.open(png).convert("L")
    if box is not None:
        im = im.crop(box)
    return np.asarray(im, dtype=np.float32) / 255.0


def save_view(a, path, scale=0.5, marks=(), lines=()):
    """Save a grey array as RGB PNG with optional marks.
    marks: (x, y, colour, radius) in array pixels; lines: ((x0,y0,x1,y1), colour)."""
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).convert("RGB")
    d = ImageDraw.Draw(im)
    for (x0, y0, x1, y1), c in lines:
        d.line((x0, y0, x1, y1), fill=c, width=2)
    for m in marks:
        x, y, c, r = m
        d.ellipse((x - r, y - r, x + r, y + r), outline=c, width=2)
        d.line((x - r - 3, y, x + r + 3, y), fill=c, width=1)
        d.line((x, y - r - 3, x, y + r + 3), fill=c, width=1)
    if scale != 1:
        im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS)
    im.save(path)
    return path


def dark(a, thr=0.55):
    return a < thr


# ---------------------------------------------------------------- gridlines

def _peaks(profile, frac, min_sep):
    """Contiguous runs where profile >= frac * len; returns weighted centres."""
    on = profile >= frac
    out = []
    i = 0
    n = len(profile)
    while i < n:
        if on[i]:
            j = i
            while j < n and on[j]:
                j += 1
            w = profile[i:j]
            c = float(np.sum(np.arange(i, j) * w) / np.sum(w))
            out.append((c, j - i))
            i = j
        else:
            i += 1
    merged = []
    for c, w in out:
        if merged and c - merged[-1][0] < min_sep:
            pc, pw = merged[-1]
            merged[-1] = ((pc * pw + c * w) / (pw + w), pw + w)
        else:
            merged.append((c, w))
    return merged


def long_runs(m, axis, L=40):
    """Pixels of m that belong to runs of at least L px along the line
    direction (axis 'v': vertical runs, 'h': horizontal runs)."""
    a = m if axis == "v" else m.T
    H, W = a.shape
    b = np.zeros((H + 2, W), dtype=np.int8)
    b[1:-1] = a
    d = np.diff(b, axis=0)
    sr, sc = np.nonzero(d == 1)
    er, ec = np.nonzero(d == -1)
    o1 = np.lexsort((sr, sc))
    o2 = np.lexsort((er, ec))
    sr, sc, er = sr[o1], sc[o1], er[o2]
    keep = (er - sr) >= L
    acc = np.zeros((H + 1, W), dtype=np.int32)
    np.add.at(acc, (sr[keep], sc[keep]), 1)
    np.add.at(acc, (er[keep], sc[keep]), -1)
    out = np.cumsum(acc, axis=0)[:H] > 0
    return out if axis == "v" else out.T


def find_skew(m, axis, bmax=0.03, nb=121, sub=3):
    """Skew b (px per px) that makes lines of this axis most peaked:
    vertical lines x = c + b*y ('v'), horizontal y = c + b*x ('h')."""
    ys, xs = np.nonzero(m[::sub, ::sub])
    ys = ys * sub
    xs = xs * sub
    if axis == "v":
        p, t, L = xs, ys, m.shape[1]
    else:
        p, t, L = ys, xs, m.shape[0]
    best = (0.0, -1.0)
    for b in np.linspace(-bmax, bmax, nb):
        q = np.round(p - b * t).astype(int)
        q = q[(q >= 0) & (q < L)]
        h = np.bincount(q, minlength=L).astype(float)
        sc = float(np.sum(h ** 2))
        if sc > best[1]:
            best = (float(b), sc)
    return best[0]


def find_lines(m, axis, frac=0.5, min_sep=8, skew=None):
    """axis='v': vertical lines (columns), 'h': horizontal (rows).
    frac: fraction of the box's extent the line must cover (as dark pixels).
    skew: line slope (found by find_skew if None). Returns [(c, width)] with c
    the line position at t = 0 (top for 'v', left for 'h')."""
    if skew is None:
        skew = find_skew(m, axis)
    ys, xs = np.nonzero(m)
    if axis == "v":
        p, t, L, E = xs, ys, m.shape[1], m.shape[0]
    else:
        p, t, L, E = ys, xs, m.shape[0], m.shape[1]
    q = np.round(p - skew * t).astype(int)
    q = q[(q >= 0) & (q < L)]
    prof = np.bincount(q, minlength=L).astype(float) / E
    return _peaks(prof, frac, min_sep)


def fit_line(m, axis, c0, half=6, nslab=8, frac=0.5, skew=0.0, quad=False):
    """Fit position = a + b*t (+ c*t^2 if quad) for a line with position c0 at
    t = 0 and slope skew (axis 'v': x(t=y); 'h': y(t=x)). Uses nslab slabs;
    in each, the weighted centre of the dark profile within +-half of the
    predicted position. Returns (a, b, rms_px, thickness_px[, c])."""
    H, W = m.shape
    L = H if axis == "v" else W
    edges = np.linspace(0, L, nslab + 1).astype(int)
    ts, cs, ws = [], [], []
    for k in range(nslab):
        s0, s1 = edges[k], edges[k + 1]
        tm = 0.5 * (s0 + s1)
        cp = c0 + skew * tm
        lo = max(0, int(round(cp - half)))
        hi = min((W if axis == "v" else H), int(round(cp + half)) + 1)
        if hi - lo < 3:
            continue
        # deskew the slab: sample the profile along the predicted slope
        tt = np.arange(s0, s1)
        offs = np.arange(lo, hi) - cp
        prof = np.zeros(len(offs))
        for j, o in enumerate(offs):
            pp = np.round(c0 + skew * tt + o).astype(int)
            ok = (pp >= 0) & (pp < (W if axis == "v" else H))
            if axis == "v":
                prof[j] = m[tt[ok], pp[ok]].mean() if ok.any() else 0
            else:
                prof[j] = m[pp[ok], tt[ok]].mean() if ok.any() else 0
        if prof.max() < frac:
            continue
        sel = prof >= 0.5 * prof.max()
        c = float(np.sum((cp + offs[sel]) * prof[sel]) / np.sum(prof[sel]))
        ts.append(tm)
        cs.append(c)
        ws.append(float(np.sum(prof >= 0.5)))
    ts = np.array(ts)
    cs = np.array(cs)
    if len(ts) < 2:
        return (c0, skew, float("nan"), float("nan"))
    deg = 2 if (quad and len(ts) >= 4) else 1
    coef = np.polyfit(ts, cs, deg)
    res = cs - np.polyval(coef, ts)
    rms = float(np.sqrt(np.mean(res ** 2)))
    if deg == 2:
        return (float(coef[2]), float(coef[1]), rms, float(np.median(ws)), float(coef[0]))
    return (float(coef[1]), float(coef[0]), rms, float(np.median(ws)))


class Axis:
    """Local calibration along one axis from fitted gridlines.

    lines: list of (a, b) with position = a + b*t, t the other coordinate,
           sorted by position. vals: data value of each line (log10 if log).
    """

    def __init__(self, lines, vals, log=False, name=""):
        order = np.argsort([a for a, b in lines])
        self.lines = [lines[i] for i in order]
        self.vals = np.array([vals[i] for i in order], dtype=float)
        self.log = log
        self.name = name

    def pos(self, t):
        return np.array([a + b * t for a, b in self.lines])

    def value(self, p, t):
        """Data value of position p (pixels along this axis) at other coord t."""
        ps = self.pos(t)
        v = self.vals
        if ps[0] > ps[-1]:
            ps = ps[::-1]
            v = v[::-1]
        if p <= ps[0]:
            i = 0
        elif p >= ps[-1]:
            i = len(ps) - 2
        else:
            i = int(np.searchsorted(ps, p) - 1)
        f = (p - ps[i]) / (ps[i + 1] - ps[i])
        val = v[i] + f * (v[i + 1] - v[i])
        return 10 ** val if self.log else val

    def pixel(self, val, t):
        """Inverse: position of data value val at other coordinate t."""
        x = np.log10(val) if self.log else val
        ps = self.pos(t)
        v = self.vals
        if v[0] > v[-1]:
            v = v[::-1]
            ps = ps[::-1]
        i = int(np.clip(np.searchsorted(v, x) - 1, 0, len(v) - 2))
        f = (x - v[i]) / (v[i + 1] - v[i])
        return ps[i] + f * (ps[i + 1] - ps[i])

    def per_px(self, t=0.0):
        """Mean data units per pixel (log10 units if log)."""
        ps = self.pos(t)
        return abs((self.vals[-1] - self.vals[0]) / (ps[-1] - ps[0]))

    def linfit_resid(self, t=0.0):
        """RMS and max residual (data units, log10 if log) of a straight-line fit
        of all line positions to their values at coordinate t."""
        ps = self.pos(t)
        A = np.vstack([np.ones_like(ps), ps]).T
        coef, *_ = np.linalg.lstsq(A, self.vals, rcond=None)
        r = self.vals - A @ coef
        return float(np.sqrt(np.mean(r ** 2))), float(np.max(np.abs(r)))


def grid_from_box(m, frac_v=0.5, frac_h=0.5, min_sep=8, half=6, nslab=8, longruns=False, skews=(None, None)):
    """Detect and fit all vertical and horizontal gridlines in mask m (box crop)."""
    lv = long_runs(m, "v", 40) if longruns else m
    lh = long_runs(m, "h", 40) if longruns else m
    bv = find_skew(lv, "v") if skews[0] is None else skews[0]
    bh = find_skew(lh, "h") if skews[1] is None else skews[1]
    vs = find_lines(lv, "v", frac_v, min_sep, skew=bv)
    hs = find_lines(lh, "h", frac_h, min_sep, skew=bh)
    vf = [fit_line(m, "v", c, half=half, nslab=nslab, frac=frac_v * 0.6, skew=bv) for c, w in vs]
    hf = [fit_line(m, "h", c, half=half, nslab=nslab, frac=frac_h * 0.6, skew=bh) for c, w in hs]
    return dedupe(vf, m.shape[0]), dedupe(hf, m.shape[1])


def dedupe(lines, L, tol=6.0):
    """Drop fitted lines that coincide (within tol px at mid-extent) with a
    better-fitting one (a thick line can be found twice)."""
    mid = L / 2.0
    keep = []
    for ln in sorted(lines, key=lambda q: (q[2] if np.isfinite(q[2]) else 1e9)):
        p = ln[0] + ln[1] * mid
        if all(abs(p - (k[0] + k[1] * mid)) > tol for k in keep):
            keep.append(ln)
    return sorted(keep, key=lambda q: q[0])


def remove_lines(m, vf, hf, thick=None, slack=1.5):
    """Remove gridline pixels: near each fitted line, the dark run crossing the
    line is cleared only if it is no longer than the line's thickness + 3 px
    (so curves and symbols crossing or touching the line survive)."""
    out = m.copy()
    H, W = m.shape

    def clear(get, put, n, c, t):
        lo = max(int(np.floor(c - t / 2 - slack)), 0)
        hi = min(int(np.ceil(c + t / 2 + slack)), n - 1)
        if lo >= hi:
            return
        seg = get(lo, hi + 1)
        idx = np.nonzero(seg)[0]
        if len(idx) == 0:
            return
        l, r = lo + idx.min(), lo + idx.max()
        # the run must be contiguous to count as the line
        lim = int(3 * t + 4)
        k = 0
        while l > 0 and get(l - 1, l)[0] and k < lim:
            l -= 1
            k += 1
        k = 0
        while r < n - 1 and get(r + 1, r + 2)[0] and k < lim:
            r += 1
            k += 1
        if (r - l + 1) <= t + 3:
            put(l, r + 1)

    for L in vf:
        a, b, th = L[0], L[1], L[3]
        t = th if thick is None else thick
        if not np.isfinite(t):
            t = 4
        for y in range(H):
            c = a + b * y + (L[4] * y * y if len(L) > 4 else 0.0)
            clear(lambda i, j: m[y, i:j], lambda i, j: out.__setitem__((y, slice(i, j)), False), W, c, t)
    for L in hf:
        a, b, th = L[0], L[1], L[3]
        t = th if thick is None else thick
        if not np.isfinite(t):
            t = 4
        for x in range(W):
            c = a + b * x + (L[4] * x * x if len(L) > 4 else 0.0)
            clear(lambda i, j: m[i:j, x], lambda i, j: out.__setitem__((slice(i, j), x), False), H, c, t)
    return out


# ---------------------------------------------------------------- curves

def runs_1d(col):
    """Runs of True in a 1-D bool array: list of (start, end_inclusive)."""
    d = np.diff(np.concatenate([[0], col.astype(np.int8), [0]]))
    s = np.where(d == 1)[0]
    e = np.where(d == -1)[0] - 1
    return list(zip(s, e))


def column_runs(m, x, y0=0, y1=None):
    col = m[y0:y1, x]
    return [(s + y0, e + y0) for s, e in runs_1d(col)]


def track(m, x_start, y_start, x_end, max_jump=6, max_run=40, win=3, predict=True, nhist=16,
          gap_slack=0.15, avoid=None):
    """Follow a curve from (x_start, y_start) to x_end column by column.
    At each column pick the run whose centre is nearest the predicted y
    (linear fit of the last nhist points); columns with no run within
    max_jump + gap_slack * (columns since the last hit) are skipped (gaps at
    dashes, gridline crossings, symbols). Runs longer than max_run (vertical
    lines, symbols, crossings) are not used. avoid: optional callable
    (x, y) -> bool marking pixels not to use. Returns [(x, y_centre, run_len)]."""
    step = 1 if x_end >= x_start else -1
    pts = []
    yp = float(y_start)
    hist = []
    last_hit = x_start
    for x in range(x_start, x_end + step, step):
        if x < 0 or x >= m.shape[1]:
            break
        jump = max_jump + gap_slack * abs(x - last_hit)
        lo = int(max(0, yp - jump - max_run))
        hi = int(min(m.shape[0], yp + jump + max_run))
        rs = column_runs(m, x, lo, hi)
        best = None
        for s, e in rs:
            ln = e - s + 1
            c = 0.5 * (s + e)
            dist = 0.0 if s <= yp <= e else min(abs(s - yp), abs(e - yp))
            if dist > jump or ln > max_run:
                continue
            if avoid is not None and avoid(x, c):
                continue
            key = abs(c - yp)
            if best is None or key < best[0]:
                best = (key, c, ln)
        if best is not None:
            pts.append((x, best[1], best[2]))
            hist.append((x, best[1]))
            hist = hist[-nhist:]
            last_hit = x
        if predict and len(hist) >= 4:
            hx = np.array([h[0] for h in hist], dtype=float)
            hy = np.array([h[1] for h in hist], dtype=float)
            if hx.max() - hx.min() >= 3:
                k = np.polyfit(hx, hy, 1)
                yp = float(np.polyval(k, x + step))
            else:
                yp = hist[-1][1]
        elif hist:
            yp = hist[-1][1]
    return pts


def track_both(m, x_seed, y_seed, x_lo, x_hi, **kw):
    """Track from a seed towards both ends and merge (sorted by x)."""
    left = track(m, x_seed, y_seed, x_lo, **kw)
    right = track(m, x_seed, y_seed, x_hi, **kw)
    pts = {p[0]: p for p in left}
    for p in right:
        pts[p[0]] = p
    return [pts[k] for k in sorted(pts)]


def smooth_at(pts, xq, half=6):
    """Value of the tracked curve at pixel column xq: local linear fit over
    +-half pixels. Returns (y, scatter_px, n)."""
    xs = np.array([p[0] for p in pts], dtype=float)
    ys = np.array([p[1] for p in pts], dtype=float)
    sel = np.abs(xs - xq) <= half
    if sel.sum() < 3:
        sel = np.argsort(np.abs(xs - xq))[:5]
        if np.min(np.abs(xs - xq)) > 4 * half:
            return float("nan"), float("nan"), 0
    k = np.polyfit(xs[sel], ys[sel], 1)
    r = ys[sel] - np.polyval(k, xs[sel])
    return float(np.polyval(k, xq)), float(np.sqrt(np.mean(r ** 2))), int(np.sum(sel) if isinstance(sel, np.ndarray) and sel.dtype == bool else len(sel))


# ---------------------------------------------------------------- symbols

def components(m, min_px=10):
    """4-connected components of a (small) bool array. Returns list of dicts
    with bbox (x0,y0,x1,y1), n, centroid (mean of pixels)."""
    H, W = m.shape
    lab = np.zeros((H, W), dtype=np.int32)
    out = []
    cur = 0
    ys, xs = np.nonzero(m)
    for y0, x0 in zip(ys, xs):
        if lab[y0, x0]:
            continue
        cur += 1
        stack = [(y0, x0)]
        lab[y0, x0] = cur
        pix = []
        while stack:
            y, x = stack.pop()
            pix.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = cur
                    stack.append((yy, xx))
        if len(pix) >= min_px:
            py = np.array([p[0] for p in pix])
            px = np.array([p[1] for p in pix])
            out.append(dict(id=cur, n=len(pix), bbox=(int(px.min()), int(py.min()), int(px.max()), int(py.max())),
                            cx=float(px.mean()), cy=float(py.mean())))
    return out, lab


def ring_template(r, t, shape="circle"):
    """Outline template (bool) of a symbol of half-size r and stroke t."""
    R = int(np.ceil(r + t + 1))
    yy, xx = np.mgrid[-R:R + 1, -R:R + 1].astype(float)
    if shape == "circle":
        d = np.sqrt(xx ** 2 + yy ** 2)
        return np.abs(d - r) <= t / 2
    if shape == "square":
        d = np.maximum(np.abs(xx), np.abs(yy))
        return np.abs(d - r) <= t / 2
    if shape == "diamond":
        d = (np.abs(xx) + np.abs(yy)) / np.sqrt(2)
        return np.abs(d - r / np.sqrt(2) * 1.0) <= t / 2
    raise ValueError(shape)


def correlate(m, tpl):
    """Normalised count of template pixels that are dark, at every position
    (template centred). FFT based."""
    H, W = m.shape
    th, tw = tpl.shape
    F = np.fft.rfft2(m.astype(np.float32), s=(H + th, W + tw))
    T = np.fft.rfft2(tpl[::-1, ::-1].astype(np.float32), s=(H + th, W + tw))
    c = np.fft.irfft2(F * T, s=(H + th, W + tw))
    c = c[th // 2:th // 2 + H, tw // 2:tw // 2 + W]
    return c / tpl.sum()


def local_max(score, thr, rad):
    """Peaks of score above thr, at least rad apart (greedy)."""
    ys, xs = np.nonzero(score >= thr)
    vals = score[ys, xs]
    order = np.argsort(-vals)
    picked = []
    for i in order:
        y, x = ys[i], xs[i]
        if all((y - py) ** 2 + (x - px) ** 2 > rad ** 2 for py, px, _ in picked):
            picked.append((y, x, float(vals[i])))
    return picked


def bbox_centre(m, x, y, r, pad=3):
    """Bounding box of dark pixels of the symbol around (x, y): the extent of
    dark pixels in a window of half-size r+pad whose row/column profiles
    belong to the symbol (rows/columns touching the outline). Returns
    (cx, cy, w, h, (x0,y0,x1,y1))."""
    R = int(r + pad)
    y0 = max(0, int(y) - R)
    x0 = max(0, int(x) - R)
    sub = m[y0:int(y) + R + 1, x0:int(x) + R + 1]
    if not sub.any():
        return float("nan"), float("nan"), 0, 0, None
    rows = np.nonzero(sub.any(axis=1))[0]
    cols = np.nonzero(sub.any(axis=0))[0]
    bx0, bx1 = cols.min() + x0, cols.max() + x0
    by0, by1 = rows.min() + y0, rows.max() + y0
    return 0.5 * (bx0 + bx1), 0.5 * (by0 + by1), bx1 - bx0 + 1, by1 - by0 + 1, (bx0, by0, bx1, by1)
