"""Symbol centres for the W1 first readings: normalised cross-correlation of the dark mask with an outline
template (circle ring, square frame, diamond, triangle) over +-R px about a guessed centre; the best match's centre
is the symbol's. Templates are drawn at the symbol's measured size (outer width w px, line 2.5 px).
find(a, x, y, shape, w, R=12) -> (xc, yc, score)."""
import numpy as np
from PIL import Image, ImageDraw


def template(shape, w, lw=3):
    n = int(w + 8)
    im = Image.new('L', (n, n), 0)
    d = ImageDraw.Draw(im)
    c = n / 2
    r = w / 2
    if shape == 'circle':
        d.ellipse([c - r, c - r, c + r, c + r], outline=255, width=lw)
    elif shape == 'square':
        d.rectangle([c - r, c - r, c + r, c + r], outline=255, width=lw)
    elif shape == 'diamond':
        d.polygon([(c, c - r), (c + r, c), (c, c + r), (c - r, c)], outline=255)
        d.line([(c, c - r), (c + r, c), (c, c + r), (c - r, c), (c, c - r)], fill=255, width=lw)
    elif shape == 'triangle':
        h = r
        d.line([(c, c - h), (c + r, c + 0.8 * h), (c - r, c + 0.8 * h), (c, c - h)], fill=255, width=lw)
    t = np.array(im).astype(float) / 255
    return t - t.mean()


def find(a, x, y, shape, w, R=12, thr=150):
    t = template(shape, w)
    n = t.shape[0]
    h = n // 2
    best = (-1e9, x, y)
    dark = (a < thr).astype(float)
    for dy in range(-R, R + 1):
        for dx in range(-R, R + 1):
            xc, yc = int(round(x)) + dx, int(round(y)) + dy
            win = dark[yc - h:yc - h + n, xc - h:xc - h + n]
            if win.shape != t.shape:
                continue
            wv = win - win.mean()
            s = (wv * t).sum() / (np.sqrt((wv ** 2).sum() * (t ** 2).sum()) + 1e-9)
            if s > best[0]:
                best = (s, xc, yc)
    # sub-pixel: parabola through the score at +-1 px in each direction
    s0, xc, yc = best
    def sc(xx, yy):
        win = dark[yy - h:yy - h + n, xx - h:xx - h + n]
        wv = win - win.mean()
        return (wv * t).sum() / (np.sqrt((wv ** 2).sum() * (t ** 2).sum()) + 1e-9)
    sx1, sx2, sy1, sy2 = sc(xc - 1, yc), sc(xc + 1, yc), sc(xc, yc - 1), sc(xc, yc + 1)
    ddx = 0.5 * (sx1 - sx2) / (sx1 - 2 * s0 + sx2) if (sx1 - 2 * s0 + sx2) < 0 else 0.0
    ddy = 0.5 * (sy1 - sy2) / (sy1 - 2 * s0 + sy2) if (sy1 - 2 * s0 + sy2) < 0 else 0.0
    n_ = n - (n % 2)
    # the template centre is at n/2 in its own frame; window starts at xc - h
    off = n / 2 - h
    return xc + ddx + off - 0.5, yc + ddy + off - 0.5, s0


def scan(a, line_x_of_y, y0, y1, shape, w, thr=0.45, dxr=4, thrdark=150):
    """Template scores down a vertical station line (x = line_x_of_y(y)), best over +-dxr px across it;
    peaks above thr at least 0.8 w apart. Returns [(y, x, score)], refined by find()."""
    t = template(shape, w)
    n = t.shape[0]; h = n // 2
    dark = (a < thrdark).astype(float)
    tn = np.sqrt((t ** 2).sum())
    sc = []
    for y in range(y0, y1):
        xl = int(round(line_x_of_y(y)))
        best = (-1, xl)
        for dx in range(-dxr, dxr + 1):
            xc = xl + dx
            win = dark[y - h:y - h + n, xc - h:xc - h + n]
            if win.shape != t.shape:
                continue
            wv = win - win.mean()
            s = (wv * t).sum() / (np.sqrt((wv ** 2).sum()) * tn + 1e-9)
            if s > best[0]:
                best = (s, xc)
        sc.append((y, best[1], best[0]))
    peaks = []
    for i in range(1, len(sc) - 1):
        y, x, s = sc[i]
        if s >= thr and s >= sc[i - 1][2] and s >= sc[i + 1][2]:
            if peaks and y - peaks[-1][0] < 0.8 * w:
                if s > peaks[-1][2]:
                    peaks[-1] = (y, x, s)
                continue
            peaks.append((y, x, s))
    out = []
    for y, x, s in peaks:
        xf, yf, sf = find(a, x, y, shape, w, R=3, thr=thrdark)
        out.append((yf, xf, sf))
    return out
