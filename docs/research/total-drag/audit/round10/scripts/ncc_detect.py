"""Find candidate symbols on a figure by normalised cross-correlation with
the figure's own legend glyphs (exploratory; every candidate is then checked
by eye).

usage: python3 -I ncc_detect.py PAGE.png OUT.json BOX TEMPLATES THRESH [BLUR]
  BOX        x0,y0,x1,y1 (page px) searched
  TEMPLATES  name:x:y:half;name:x:y:half;...  legend glyph centres (page px)
             and half size of the square cut around each
  THRESH     minimum correlation of a reported peak

The page (ink = gray < 128) is box-blurred by BLUR px (default 1; 2 for
halftone scans); for every template the
zero-mean normalised correlation is computed with FFTs over the box, and
local maxima above THRESH (no stronger peak of any template within 10 px) are
listed with the template name and score. The legend area itself should be
left out of BOX.
"""
import json
import sys

import numpy as np
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None


def ncc_map(img, t):
    th, tw = t.shape
    t0 = t - t.mean()
    tn = np.sqrt((t0 * t0).sum())
    H, W = img.shape
    sh = (H + th, W + tw)
    F = np.fft.rfft2(img, sh)
    num = np.fft.irfft2(F * np.conj(np.fft.rfft2(t0, sh)), sh)[:H - th + 1, :W - tw + 1]
    c1 = np.cumsum(np.cumsum(np.pad(img, ((1, 0), (1, 0))), 0), 1)
    c2 = np.cumsum(np.cumsum(np.pad(img * img, ((1, 0), (1, 0))), 0), 1)

    def boxsum(c):
        return c[th:, tw:] - c[:-th, tw:] - c[th:, :-tw] + c[:-th, :-tw]
    n = th * tw
    s1, s2 = boxsum(c1), boxsum(c2)
    var = s2 - s1 * s1 / n
    den = np.sqrt(np.maximum(var, 1e-9)) * tn
    return num / den


def main():
    page, out, box, temps, thr = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], float(sys.argv[5])
    blur = int(sys.argv[6]) if len(sys.argv) > 6 else 1
    x0, y0, x1, y1 = (int(v) for v in box.split(","))
    im = Image.open(page).convert("L")
    ink = (np.asarray(im) < 128).astype(np.uint8) * 255
    I = np.asarray(Image.fromarray(ink).filter(ImageFilter.BoxBlur(blur))).astype(float) / 255.0
    region = I[y0:y1, x0:x1]
    maps = {}
    for spec in temps.split(";"):
        name, tx, ty, h = spec.split(":")
        tx, ty, h = int(tx), int(ty), int(h)
        t = I[ty - h:ty + h + 1, tx - h:tx + h + 1]
        m = ncc_map(region, t)
        full = np.full(region.shape, -1.0)
        full[h:h + m.shape[0], h:h + m.shape[1]] = m
        maps[name] = full
    names = list(maps)
    stack = np.stack([maps[n] for n in names])
    best = stack.max(axis=0)
    arg = stack.argmax(axis=0)
    cands = []
    ys, xs = np.nonzero(best > thr)
    order = np.argsort(-best[ys, xs])
    taken = np.zeros(best.shape, bool)
    for i in order:
        y, x = ys[i], xs[i]
        if taken[y, x]:
            continue
        taken[max(0, y - 10):y + 11, max(0, x - 10):x + 11] = True
        scores = {n: round(float(maps[n][y, x]), 3) for n in names}
        cands.append(dict(x=int(x + x0), y=int(y + y0), best=names[arg[y, x]], score=round(float(best[y, x]), 3),
                          scores=scores))
    cands.sort(key=lambda c: (c["x"], c["y"]))
    json.dump(cands, open(out, "w"), indent=1)
    for c in cands:
        print(c["x"], c["y"], c["best"], c["score"], " ".join("%s=%.2f" % kv for kv in c["scores"].items()))
    print(len(cands), "candidates")


if __name__ == "__main__":
    main()
