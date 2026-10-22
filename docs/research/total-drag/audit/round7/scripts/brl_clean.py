"""Show a region of BRL 934 Graph I with the paper's rulings greyed out.

usage: python3 -I brl_clean.py PAGE.png CALIB.json OUT.png x0 y0 x1 y1 SCALE [vonly]

Ink (gray < 128) is drawn black, except ink within the ruling masks, which
is drawn light blue: +-6 px about each calibrated heavy vertical ruling,
+-5 px about each heavy horizontal ruling and +-4 px about the four fine
horizontal rulings between two heavy ones (at fifths of the local spacing).
With "vonly" only the heavy vertical rulings are masked.
What stays black is lettering, symbols, error bars and the faired curve,
which makes the symbols easier to tell apart by eye. Viewing aid only; no
measurement is taken from it.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
import localgrid  # noqa: E402

Image.MAX_IMAGE_PIXELS = None


def ruling_mask(g, x0, y0, x1, y1, vonly=False):
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(float)
    m = np.zeros(yy.shape, bool)
    for k in range(len(g.vvals)):
        if np.sum(~np.isnan(g.X[k])) < 2:
            continue
        xk = g.vline(k)(yy[:, 0])
        m |= np.abs(xx - xk[:, None]) <= 6
    if vonly:
        return m
    hl = []
    for j in range(len(g.hvals)):
        if np.sum(~np.isnan(g.X[:, j])) < 2:
            hl.append(None)
            continue
        hl.append(g.hline(j)(xx[0]))
    for j, yj in enumerate(hl):
        if yj is None:
            continue
        m |= np.abs(yy - yj[None, :]) <= 5
        if j + 1 < len(hl) and hl[j + 1] is not None:
            for i in range(1, 5):
                yf = yj + (hl[j + 1] - yj) * i / 5.0
                m |= np.abs(yy - yf[None, :]) <= 4
    return m


def main():
    page, calib, out = sys.argv[1:4]
    x0, y0, x1, y1 = (int(v) for v in sys.argv[4:8])
    s = float(sys.argv[8])
    g = localgrid.LocalGrid.load(calib)
    gray = np.asarray(Image.open(page).convert("L").crop((x0, y0, x1, y1))).astype(float)
    ink = gray < 128
    m = ruling_mask(g, x0, y0, x1, y1, vonly=len(sys.argv) > 9 and sys.argv[9] == "vonly")
    rgb = np.full(gray.shape + (3,), 255, np.uint8)
    rgb[ink & m] = (150, 190, 235)
    rgb[ink & ~m] = (0, 0, 0)
    im = Image.fromarray(rgb)
    if s != 1.0:
        im = im.resize((int(im.width * s), int(im.height * s)), Image.NEAREST)
    im.save(out)
    print(out, im.size)


if __name__ == "__main__":
    main()
