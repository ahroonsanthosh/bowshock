"""Ruler crop with a piecewise-linear calibration between the figure's own
grid lines (for figures whose grid spacing is uneven on the scan).
Usage: python3 -I w34_pwruler.py <image> <cal.json> <out.png> <a_lo> <a_hi>
       <v_lo> <v_hi> <da> <dv> [scale]
cal.json: {"xgrid": [[px, value], ...], "ygrid": [[px, value], ...]} in
increasing px. Ruler lines every da along the abscissa and every dv along
the ordinate, each placed by interpolating between the two grid lines
around it (extrapolating from the end pair outside the grid)."""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw


def to_px(grid, v):
    px = [g[0] for g in grid]
    val = [g[1] for g in grid]
    # values may run either way along px
    order = np.argsort(val)
    vs = np.array(val, float)[order]
    ps = np.array(px, float)[order]
    if v <= vs[0]:
        i = 0
    elif v >= vs[-1]:
        i = len(vs) - 2
    else:
        i = int(np.searchsorted(vs, v)) - 1
    return ps[i] + (v - vs[i]) * (ps[i + 1] - ps[i]) / (vs[i + 1] - vs[i])


def main():
    im = Image.open(sys.argv[1]).convert('RGB')
    c = json.load(open(sys.argv[2]))
    out = sys.argv[3]
    alo, ahi, vlo, vhi, da, dv = map(float, sys.argv[4:10])
    scale = float(sys.argv[10]) if len(sys.argv) > 10 else 1.0
    x0, x1 = sorted([to_px(c['xgrid'], alo), to_px(c['xgrid'], ahi)])
    y0, y1 = sorted([to_px(c['ygrid'], vlo), to_px(c['ygrid'], vhi)])
    box = (int(x0), int(y0), int(x1) + 1, int(y1) + 1)
    crop = im.crop(box)
    if scale != 1.0:
        crop = crop.resize((int(crop.width * scale), int(crop.height * scale)), Image.LANCZOS)
    d = ImageDraw.Draw(crop)
    k = 0
    a = alo
    while a <= ahi + 1e-9:
        x = (to_px(c['xgrid'], a) - box[0]) * scale
        d.line([(x, 0), (x, crop.height)], fill=(255, 0, 0) if k % 2 == 0 else (255, 150, 150))
        d.text((x + 2, 2), f'{a:g}', fill=(200, 0, 0))
        a += da
        k += 1
    k = 0
    v = vlo
    while v <= vhi + 1e-9:
        y = (to_px(c['ygrid'], v) - box[1]) * scale
        d.line([(0, y), (crop.width, y)], fill=(0, 0, 255) if k % 2 == 0 else (150, 150, 255))
        d.text((2, y + 1), f'{v:.2f}', fill=(0, 0, 200))
        v += dv
        k += 1
    crop.save(out)
    print(out, crop.size)


if __name__ == '__main__':
    main()
