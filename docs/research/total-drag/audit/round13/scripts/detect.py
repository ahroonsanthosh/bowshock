"""Candidate symbols over a plot, for review by eye (round 13).

usage: python3 -I detect.py PAGE.png CAL.json X0 Y0 X1 Y1 SHAPES_JSON SW THR OUT.json

For each glyph type in SHAPES_JSON ({type: [kind, size...]}), an outline
score is computed at every pixel of the box by FFT convolution: the mean ink
on the ideal outline minus half the mean ink inside it and half the mean ink
in a ring 3 to 5 px outside it (ink = grey < 128; pixels within 2 px of a
calibrated gridline are set to no ink first). Local maxima above THR,
suppressed within 8 px by any higher score of any type, are written out with
their best type, score and the runner-up type's score. The list is a
starting point only: every candidate is then checked by eye, typed, and
centred by symread.py.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
import calmap  # noqa: E402
import glyph  # noqa: E402

Image.MAX_IMAGE_PIXELS = None


def kernels(shape, sw):
    R = int(max(shape[1:]) + 8)
    yy, xx = np.mgrid[-R:R + 1, -R:R + 1].astype(float)
    d = glyph.sdist(shape, xx, yy)
    ring = np.abs(d) <= sw
    inner = d < -(sw + 1.5)
    outer = (d > sw + 2) & (d <= sw + 4)
    if shape[0].endswith("_f"):
        ring = d <= sw
        inner = np.zeros_like(ring)
    return [k.astype(float) / max(k.sum(), 1) for k in (ring, inner, outer)], R


def conv(img, k):
    H, W = img.shape
    kh, kw = k.shape
    F = np.fft.rfft2(img, s=(H + kh, W + kw))
    G = np.fft.rfft2(k[::-1, ::-1], s=(H + kh, W + kw))
    out = np.fft.irfft2(F * G, s=(H + kh, W + kw))
    return out[kh // 2:kh // 2 + H, kw // 2:kw // 2 + W]


def main():
    page, calp = sys.argv[1], sys.argv[2]
    x0, y0, x1, y1 = map(int, sys.argv[3:7])
    shapes = {k: tuple([v[0]] + [float(t) for t in v[1:]]) for k, v in json.loads(sys.argv[7]).items()}
    sw, thr = float(sys.argv[8]), float(sys.argv[9])
    g = np.array(Image.open(page).convert("L"), float)[y0:y1, x0:x1]
    ink = (g < 128).astype(float)
    cal = calmap.Cal(calp)
    for l in cal.V:
        l["a"] = l["a"] - x0 + l["b"] * y0
    for l in cal.H:
        l["a"] = l["a"] - y0 + l["b"] * x0
    ink[cal.mask(ink.shape, 2.0)] = 0.0
    maps = {}
    for t, sh in shapes.items():
        (kr, ki, ko), R = kernels(sh, sw)
        a, b, c = conv(ink, kr), conv(ink, ki), conv(ink, ko)
        maps[t] = a - 0.5 * b - 0.5 * c if ki.sum() > 0 else a - c
    names = list(maps)
    stack = np.stack([maps[t] for t in names])
    best = stack.max(0)
    arg = stack.argmax(0)
    cands = []
    H, W = best.shape
    ys, xs = np.nonzero(best > thr)
    order = np.argsort(-best[ys, xs])
    taken = np.zeros_like(best, bool)
    for i in order:
        y, x = ys[i], xs[i]
        if taken[y, x]:
            continue
        taken[max(0, y - 8):y + 9, max(0, x - 8):x + 9] = True
        sc = stack[:, y, x]
        o = np.argsort(-sc)
        cands.append({"x": int(x + x0), "y": int(y + y0), "type": names[o[0]], "score": round(float(sc[o[0]]), 3),
                      "runner_up": names[o[1]] if len(o) > 1 else "", "runner_score": round(float(sc[o[1]]), 3) if len(o) > 1 else None})
    cands.sort(key=lambda c: (c["x"], c["y"]))
    json.dump(cands, open(sys.argv[10], "w"), indent=0)
    print(len(cands), "candidates")


if __name__ == "__main__":
    main()
