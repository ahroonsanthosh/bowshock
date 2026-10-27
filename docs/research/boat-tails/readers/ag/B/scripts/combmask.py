"""Fade a regular grid so that symbol strokes stand out.

Usage: python -I combmask.py IN.png OUT.png x0 y0 x1 y1 zoom XP0 XSP YP0 YSP [w]
Grid columns at XP0 + k*XSP and rows at YP0 + k*YSP (minor spacing, px)
are faded: ink pixels within w px (default 1.6) of a grid line are drawn
light orange instead of black.  The crop [x0:x1, y0:y1] is enlarged
by zoom; page coordinates are marked every 10 px (labels every 10).
"""
import sys

import numpy as np
from PIL import Image, ImageDraw


def main():
    a = sys.argv[1:]
    g = np.asarray(Image.open(a[0]).convert("L"), float)
    x0, y0, x1, y1, z = (int(v) for v in a[2:7])
    xp0, xsp, yp0, ysp = (float(v) for v in a[7:11])
    w = float(a[11]) if len(a) > 11 else 1.6
    sub = g[y0:y1, x0:x1]
    xs = np.arange(x0, x1)
    ys = np.arange(y0, y1)
    dx = np.abs(((xs - xp0 + xsp / 2) % xsp) - xsp / 2)
    dy = np.abs(((ys - yp0 + ysp / 2) % ysp) - ysp / 2)
    onx = dx <= w
    ony = dy <= w
    mask = onx[None, :] | ony[:, None]
    rgb = np.stack([sub] * 3, axis=-1)
    ink = sub < 160
    fade = mask & ink
    rgb[fade] = [255, 200, 150]
    im = Image.fromarray(rgb.astype(np.uint8)).resize(((x1 - x0) * z, (y1 - y0) * z), Image.NEAREST)
    M = 34
    out = Image.new("RGB", (im.size[0] + M, im.size[1] + M), (255, 255, 255))
    out.paste(im, (M, M))
    d = ImageDraw.Draw(out)
    for x in range((x0 // 10 + 1) * 10, x1, 10):
        px = M + (x - x0 + 0.5) * z
        d.line([(px, M - 6), (px, M)], fill=(0, 0, 200))
        d.text((px - 10, 2 + 11 * ((x // 10) % 2)), str(x), fill=(0, 0, 200))
        d.line([(px, M), (px, out.size[1])], fill=(170, 210, 255))
    for y in range((y0 // 10 + 1) * 10, y1, 10):
        py = M + (y - y0 + 0.5) * z
        d.text((1, py - 5), str(y), fill=(200, 0, 0))
        d.line([(M, py), (out.size[0], py)], fill=(255, 190, 190))
    out.save(a[1])
    print(a[1], out.size)


if __name__ == "__main__":
    main()
