"""Detect hollow symbols of one shape in a box of a 400 dpi page render (FFT template score map),
then refine each candidate with symfit.refine.

usage: python3 -I detect.py PAGE X0 Y0 X1 Y1 SHAPE SIZE THRESH OUT.csv OVERLAY.png [PREFIX]
Prints candidates sorted by x. The overlay marks every candidate with its id.
"""
import sys
import os
import csv
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import symfit  # noqa: E402


def kernels(shape, s, thick=2.2):
    R = int(s * 2.2) + 4
    ys, xs = np.mgrid[-R:R + 1, -R:R + 1].astype(np.float64)
    r = symfit.shape_dist(shape, xs, ys, s)
    band = thick / s
    outline = (np.abs(r - 1.0) <= band / 2).astype(np.float64)
    interior = (r <= 1.0 - band * 1.2).astype(np.float64)
    return outline / outline.sum(), interior / interior.sum(), R


def fftconv(a, k):
    H, W = a.shape
    kh, kw = k.shape
    sh = (H + kh, W + kw)
    fa = np.fft.rfft2(a, sh)
    fk = np.fft.rfft2(k[::-1, ::-1], sh)
    full = np.fft.irfft2(fa * fk, sh)
    cy, cx = kh // 2, kw // 2
    return full[kh - 1 - cy + cy: kh - 1 - cy + cy + H, kw - 1 - cx + cx: kw - 1 - cx + cx + W] if False else full[cy:cy + H, cx:cx + W]


def detect(page, box, shape, s, thresh, nms=None):
    _, d = symfit.load(page)
    x0, y0, x1, y1 = box
    sub = d[y0:y1, x0:x1].astype(np.float64)
    ko, ki, R = kernels(shape, s)
    # correlation: use flipped kernels in conv (kernels symmetric enough; do explicit correlation)
    so = corr(sub, ko)
    si = corr(sub, ki)
    score = so - si
    cands = []
    sc = score.copy()
    rad = int(max(6, s * 1.2)) if nms is None else nms
    while True:
        idx = np.argmax(sc)
        v = sc.flat[idx]
        if v < thresh:
            break
        yy, xx = divmod(idx, sc.shape[1])
        cands.append((xx + x0, yy + y0, float(v)))
        sc[max(0, yy - rad):yy + rad + 1, max(0, xx - rad):xx + rad + 1] = -9
    return cands


def corr(a, k):
    H, W = a.shape
    kh, kw = k.shape
    sh = (H + kh - 1, W + kw - 1)
    fa = np.fft.rfft2(a, sh)
    fk = np.fft.rfft2(k[::-1, ::-1], sh)
    full = np.fft.irfft2(fa * fk, sh)
    cy, cx = kh // 2, kw // 2
    return full[cy:cy + H, cx:cx + W]


def main():
    page = int(sys.argv[1])
    box = tuple(map(int, sys.argv[2:6]))
    shape = sys.argv[6]
    s = float(sys.argv[7])
    thresh = float(sys.argv[8])
    outp, ov = sys.argv[9], sys.argv[10]
    prefix = sys.argv[11] if len(sys.argv) > 11 else shape[0].upper()
    nms = int(sys.argv[12]) if len(sys.argv) > 12 else None
    shapes = shape.split(",")
    cands = detect(page, box, shapes[0], s, thresh, nms)
    rows = []
    for (x, y, v) in cands:
        best = None
        allsc = {}
        for shp in shapes:
            sc, xf, yf, sz, mo, mi = symfit.refine(page, shp, x, y, 1 if nms is not None and nms < 8 else 3)
            allsc[shp] = float(sc)
            if best is None or sc > best[0]:
                best = (sc, xf, yf, sz, mo, shp)
        sc, xf, yf, sz, mo, shp = best
        rows.append(dict(id="", shape=shp, x0=float(x), y0=float(y), xfit=float(xf), yfit=float(yf),
                         size=float(sz), score=float(sc), contrast=float(mo),
                         alt=";".join(f"{k}:{v:.2f}" for k, v in allsc.items())))
    rows.sort(key=lambda r: (r["xfit"], r["yfit"]))
    for i, r in enumerate(rows):
        r["id"] = f"{prefix}{i + 1:02d}"
    with open(outp, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["id", "shape", "x0", "y0", "xfit", "yfit", "size", "score", "contrast", "alt"])
        w.writeheader()
        for r in rows:
            w.writerow({k: (round(v, 2) if isinstance(v, float) else v) for k, v in r.items()})
    for r in rows:
        print(f"{r['id']:>6} {r['shape']:>8} fit=({r['xfit']:.1f},{r['yfit']:.1f}) s={r['size']:.2f} score={r['score']:.2f}  [{r['alt']}]")
    if rows:
        print("overlay box", symfit.overlay(page, rows, ov, scale=2))


if __name__ == "__main__":
    main()
