"""Ink blobs on a scanned plot panel, for placing symbols. Usage:
python3 -I blobs.py <image> <grid.json> [dark] [maxspan]
Grid lines (the x and y pixel positions in <grid.json>, as calib.py takes
them) are blanked over +-3 px first, then the connected dark pixels
(8-neighbour, darker than `dark`, default 128) are listed with their bounding
box, centre of the box, pixel count and span, smallest boxes dropped (under
12 px) and any spanning more than `maxspan` px (default 40; lettering and
the rest of the frame). A symbol crossed by a grid line can come out in two
parts: each is listed and the symbol is placed from both by eye. Prints
only; reads the image only."""
import json
import sys
import numpy as np
from PIL import Image

img = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
grid = json.load(open(sys.argv[2]))
dark = float(sys.argv[3]) if len(sys.argv) > 3 else 128
maxspan = int(sys.argv[4]) if len(sys.argv) > 4 else 40
ink = img < dark
for _, px in grid['x']:
    ink[:, max(0, int(round(px)) - 3):int(round(px)) + 4] = False
for _, py in grid['y']:
    ink[max(0, int(round(py)) - 3):int(round(py)) + 4, :] = False
H, W = ink.shape
seen = np.zeros_like(ink)
for y0 in range(H):
    for x0 in range(W):
        if not ink[y0, x0] or seen[y0, x0]:
            continue
        stack, pts = [(y0, x0)], []
        seen[y0, x0] = True
        while stack:
            y, x = stack.pop()
            pts.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    v, u = y + dy, x + dx
                    if 0 <= v < H and 0 <= u < W and ink[v, u] and not seen[v, u]:
                        seen[v, u] = True
                        stack.append((v, u))
        ys = [q[0] for q in pts]
        xs = [q[1] for q in pts]
        w, h = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
        if len(pts) < 12 or max(w, h) > maxspan:
            continue
        print(f"x {min(xs)}-{max(xs)} y {min(ys)}-{max(ys)} c ({(min(xs) + max(xs)) / 2:.1f}, "
              f"{(min(ys) + max(ys)) / 2:.1f}) n {len(pts)} w {w} h {h}")
