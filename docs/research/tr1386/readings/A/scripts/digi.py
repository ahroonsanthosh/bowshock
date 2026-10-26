"""Small digitizing helpers: synthetic symbol templates, normalized
cross-correlation, local refinement of a symbol centre, grid-line profiles,
and overlays for visual checking. Works on the 600 dpi grayscale renders.
"""
import numpy as np
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None

_cache = {}


def load(path):
    if path not in _cache:
        im = Image.open(path).convert("L")
        a = np.asarray(im, dtype=np.float32)
        _cache[path] = 1.0 - a / 255.0  # darkness 0..1
    return _cache[path]


def _grid(size):
    r = (size - 1) / 2.0
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    return x - r, y - r


def tmpl(shape, size, thick, pad=6):
    """Outline template. size = outer extent in px (diameter, side,
    or tip-to-tip for diamond/triangle)."""
    n = int(size + 2 * pad) | 1
    x, y = _grid(n)
    h = size / 2.0
    if shape == "circle":
        d = np.abs(np.hypot(x, y) - (h - thick / 2.0))
    elif shape == "square":
        d = np.abs(np.maximum(np.abs(x), np.abs(y)) - (h - thick / 2.0))
    elif shape == "diamond":
        d = np.abs((np.abs(x) + np.abs(y)) / np.sqrt(2) - (h - thick / 2.0) / np.sqrt(2))
    elif shape == "triangle":  # point up; centroid of the outline box centre
        # three half planes of an equilateral triangle with circumradius R
        R = h
        k = []
        for ang in (90, 210, 330):
            a = np.deg2rad(ang)
            nx, ny = np.cos(a), -np.sin(a)
            k.append(x * nx + y * ny)
        f = np.max(np.stack(k), axis=0)  # distance-like
        d = np.abs(f - (R / 2.0 - thick / 2.0))
    else:
        raise ValueError(shape)
    t = np.clip(1.0 - (d - thick / 2.0), 0, 1)
    return t.astype(np.float32)


def ncc(region, t):
    """Normalized cross-correlation map, same size as region (valid centre)."""
    from numpy.fft import rfft2, irfft2
    th, tw = t.shape
    H, W = region.shape
    fh, fw = H + th, W + tw
    tz = t - t.mean()
    tn = np.sqrt((tz ** 2).sum())
    F = rfft2(region, (fh, fw))
    T = rfft2(tz[::-1, ::-1], (fh, fw))
    num = irfft2(F * T, (fh, fw))
    ones = np.ones_like(t)
    O = rfft2(ones, (fh, fw))
    s1 = irfft2(rfft2(region, (fh, fw)) * O, (fh, fw))
    s2 = irfft2(rfft2(region ** 2, (fh, fw)) * O, (fh, fw))
    n = th * tw
    var = np.maximum(s2 - s1 ** 2 / n, 1e-6)
    out = num / (np.sqrt(var) * tn)
    oy, ox = th // 2, tw // 2
    return out[oy:oy + H, ox:ox + W]


def refine(page, x, y, t, win=12):
    """Best NCC position of template t within +-win px of (x, y).
    Returns (x, y, score)."""
    th, tw = t.shape
    x0, y0 = int(round(x)) - win - tw, int(round(y)) - win - th
    reg = page[y0:y0 + 2 * (win + th) + 1, x0:x0 + 2 * (win + tw) + 1]
    m = ncc(reg, t)
    cy, cx = win + th, win + tw
    sub = m[cy - win:cy + win + 1, cx - win:cx + win + 1]
    iy, ix = np.unravel_index(np.argmax(sub), sub.shape)
    s = sub[iy, ix]
    # parabolic sub-pixel
    def par(a, b, c):
        den = a - 2 * b + c
        return 0.0 if abs(den) < 1e-9 else 0.5 * (a - c) / den
    dx = par(sub[iy, ix - 1], s, sub[iy, ix + 1]) if 0 < ix < sub.shape[1] - 1 else 0.0
    dy = par(sub[iy - 1, ix], s, sub[iy + 1, ix]) if 0 < iy < sub.shape[0] - 1 else 0.0
    return x0 + cx - win + ix + dx, y0 + cy - win + iy + dy, float(s)


def peaks(m, thr, mind):
    """Local maxima above thr, at least mind px apart."""
    out = []
    mm = m.copy()
    while True:
        i = np.argmax(mm)
        v = mm.flat[i]
        if v < thr:
            break
        y, x = np.unravel_index(i, mm.shape)
        out.append((x, y, float(v)))
        mm[max(0, y - mind):y + mind + 1, max(0, x - mind):x + mind + 1] = -1
    return out


def overlay(path, out, box, pts, scale=1.0, r=16):
    """pts: list of (x, y, label, color). box in page px."""
    im = Image.open(path).convert("RGB").crop(box)
    if scale != 1.0:
        im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    for (x, y, lab, col) in pts:
        px, py = (x - box[0]) * scale, (y - box[1]) * scale
        d.line([(px - 3, py), (px + 3, py)], fill=col)
        d.line([(px, py - 3), (px, py + 3)], fill=col)
        d.ellipse([px - r * scale, py - r * scale, px + r * scale, py + r * scale], outline=col)
        d.text((px + r * scale + 2, py - 6), str(lab), fill=col)
    im.save(out)
    return out


def row_profile(page, x0, x1, y0, y1):
    return page[y0:y1, x0:x1].mean(axis=1)


def col_profile(page, x0, x1, y0, y1):
    return page[y0:y1, x0:x1].mean(axis=0)


def line_centre(profile, offset, approx, win=8):
    """Darkness-weighted centre of a line near approx in a 1-D profile."""
    i0 = int(approx - offset - win)
    seg = profile[i0:i0 + 2 * win + 1]
    w = np.clip(seg - np.median(profile), 0, None)
    if w.sum() <= 0:
        return float(approx)
    return float(offset + i0 + (w * np.arange(len(seg))).sum() / w.sum())


def tmpl_poly(verts, thick, pad=6):
    """Outline template of a polygon given vertices (x, y) relative to the
    template centre (stroke centre lines)."""
    import numpy as _np
    v = _np.array(verts, dtype=_np.float32)
    ext = int(_np.ceil(_np.abs(v).max() + thick + pad))
    n = 2 * ext + 1
    x, y = _grid(n)
    d = _np.full(x.shape, 1e9, dtype=_np.float32)
    for i in range(len(v)):
        a, b = v[i], v[(i + 1) % len(v)]
        ab = b - a
        t = ((x - a[0]) * ab[0] + (y - a[1]) * ab[1]) / float((ab ** 2).sum())
        t = _np.clip(t, 0, 1)
        px, py = a[0] + t * ab[0], a[1] + t * ab[1]
        d = _np.minimum(d, _np.hypot(x - px, y - py))
    return _np.clip(1.0 - (d - thick / 2.0), 0, 1).astype(_np.float32)
