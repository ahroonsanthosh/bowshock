"""Digitising aids for the W1 first readings (docs/research/total-drag/data/fins_at_base_w1.md).

Library and command line. A page image is a 300 dpi greyscale render of the PDF page (pdftoppm -r 300 -gray).

  python3 -I dig.py lines IMG X0 Y0 X1 Y1 [FRAC]
      grid lines inside the box: rows and columns whose dark fraction (grey < 160) exceeds FRAC (default 0.5),
      merged into lines (centre of each run of adjacent rows/columns), with their tilt (centre at the box's two
      halves).
  python3 -I dig.py blobs IMG X0 Y0 X1 Y1 [MINPX]
      connected dark components (grey < 150, 8-neighbour) inside the box after removing the grid rows and
      columns found there; prints each component's box, centre (bounding-box centre) and pixel count.
  python3 -I dig.py crop IMG X0 Y0 X1 Y1 SCALE OUT [GRIDSTEP]
      crop and enlarge, with a light pixel ruler every GRIDSTEP source pixels (default 20), labelled every 5th.
"""
import sys
import numpy as np
from PIL import Image, ImageDraw


def load(path):
    return np.array(Image.open(path).convert('L')).astype(int)


def runs(mask, offset):
    out, start = [], None
    for i, m in enumerate(list(mask) + [False]):
        if m and start is None:
            start = i
        elif not m and start is not None:
            out.append((offset + start, offset + i - 1))
            start = None
    return out


def lines(a, x0, y0, x1, y1, frac=0.5):
    w = a[y0:y1, x0:x1] < 160
    rows = runs(w.mean(axis=1) > frac, y0)
    cols = runs(w.mean(axis=0) > frac, x0)
    res = {'h': [], 'v': []}
    xm = (x0 + x1) // 2
    for r0, r1 in rows:
        # centre of the line in the left and right halves (tilt)
        band = a[max(r0 - 6, 0):r1 + 7]
        ys = np.arange(max(r0 - 6, 0), r1 + 7)
        def cen(xa, xb):
            d = (255 - band[:, xa:xb]).clip(0).sum(axis=1).astype(float)
            d -= np.median(d)
            d = d.clip(0)
            return float((d * ys).sum() / d.sum()) if d.sum() > 0 else float('nan')
        res['h'].append((0.5 * (r0 + r1), cen(x0, xm), cen(xm, x1)))
    ym = (y0 + y1) // 2
    for c0, c1 in cols:
        band = a[:, max(c0 - 6, 0):c1 + 7]
        xs = np.arange(max(c0 - 6, 0), c1 + 7)
        def cen(ya, yb):
            d = (255 - band[ya:yb, :]).clip(0).sum(axis=0).astype(float)
            d -= np.median(d)
            d = d.clip(0)
            return float((d * xs).sum() / d.sum()) if d.sum() > 0 else float('nan')
        res['v'].append((0.5 * (c0 + c1), cen(y0, ym), cen(ym, y1)))
    return res


def blobs(a, x0, y0, x1, y1, minpx=25, thr=150, gridfrac=0.5):
    w = a[y0:y1, x0:x1] < thr
    g = a[y0:y1, x0:x1] < 160
    gr = g.mean(axis=1) > gridfrac
    gc = g.mean(axis=0) > gridfrac
    # widen the grid rows/columns by one pixel each side
    gr = gr | np.roll(gr, 1) | np.roll(gr, -1)
    gc = gc | np.roll(gc, 1) | np.roll(gc, -1)
    w[gr, :] = False
    w[:, gc] = False
    lab = np.zeros(w.shape, int)
    n = 0
    out = []
    H, W = w.shape
    for i in range(H):
        for j in range(W):
            if w[i, j] and not lab[i, j]:
                n += 1
                st = [(i, j)]
                lab[i, j] = n
                pts = []
                while st:
                    p, q = st.pop()
                    pts.append((p, q))
                    for di in (-1, 0, 1):
                        for dj in (-1, 0, 1):
                            u, v = p + di, q + dj
                            if 0 <= u < H and 0 <= v < W and w[u, v] and not lab[u, v]:
                                lab[u, v] = n
                                st.append((u, v))
                if len(pts) >= minpx:
                    ys = np.array([p for p, _ in pts])
                    xs = np.array([q for _, q in pts])
                    out.append({'x0': x0 + xs.min(), 'x1': x0 + xs.max(), 'y0': y0 + ys.min(), 'y1': y0 + ys.max(),
                                'xc': x0 + 0.5 * (xs.min() + xs.max()), 'yc': y0 + 0.5 * (ys.min() + ys.max()),
                                'n': len(pts)})
    return out


def crop(path, x0, y0, x1, y1, scale, out, step=20):
    im = Image.open(path).convert('RGB').crop((x0, y0, x1, y1))
    im = im.resize((int((x1 - x0) * scale), int((y1 - y0) * scale)), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    for k, x in enumerate(range((x0 // step + 1) * step, x1, step)):
        X = (x - x0) * scale
        major = x % (5 * step) == 0
        d.line([(X, 0), (X, 8 if not major else 16)], fill=(255, 0, 0))
        if major:
            d.text((X + 2, 2), str(x), fill=(255, 0, 0))
    for y in range((y0 // step + 1) * step, y1, step):
        Y = (y - y0) * scale
        major = y % (5 * step) == 0
        d.line([(0, Y), (8 if not major else 16, Y)], fill=(255, 0, 0))
        if major:
            d.text((18, Y - 5), str(y), fill=(255, 0, 0))
    im.save(out)


if __name__ == '__main__':
    cmd = sys.argv[1]
    img = sys.argv[2]
    x0, y0, x1, y1 = map(int, sys.argv[3:7])
    if cmd == 'lines':
        frac = float(sys.argv[7]) if len(sys.argv) > 7 else 0.5
        r = lines(load(img), x0, y0, x1, y1, frac)
        print('horizontal (y centre, y left half, y right half):')
        for t in r['h']:
            print('  %.1f  %.1f  %.1f' % t)
        print('vertical (x centre, x upper half, x lower half):')
        for t in r['v']:
            print('  %.1f  %.1f  %.1f' % t)
    elif cmd == 'blobs':
        minpx = int(sys.argv[7]) if len(sys.argv) > 7 else 25
        for b in blobs(load(img), x0, y0, x1, y1, minpx):
            print('  x %d-%d y %d-%d  centre (%.1f, %.1f)  %d px' % (b['x0'], b['x1'], b['y0'], b['y1'], b['xc'], b['yc'], b['n']))
    elif cmd == 'crop':
        crop(img, x0, y0, x1, y1, float(sys.argv[7]), sys.argv[8], int(sys.argv[9]) if len(sys.argv) > 9 else 20)
