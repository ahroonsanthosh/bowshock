"""Stack chosen value rows of a table column into one zoomed image.
usage: python3 -I rowstrip.py IMG X0 X1 Y0 Y1 SCALE OUT ROW [ROW ...]"""
import sys, subprocess
import numpy as np
from PIL import Image, ImageDraw
from collections import deque
img = sys.argv[1]; X0, X1, Y0, Y1 = (int(v) for v in sys.argv[2:6]); scale = int(sys.argv[6]); out = sys.argv[7]
want = [int(v) for v in sys.argv[8:]]
full = Image.open(img).convert("L")
box = np.asarray(full)[Y0:Y1, X0:X1] < 128
H, W = box.shape
lab = np.zeros(box.shape, int); comps = []; n = 0
for y, x in zip(*np.nonzero(box)):
    if lab[y, x]: continue
    n += 1; q = deque([(y, x)]); lab[y, x] = n; pts = []
    while q:
        cy, cx = q.popleft(); pts.append((cy, cx))
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < H and 0 <= nx < W and box[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n; q.append((ny, nx))
    ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
    comps.append(dict(y0=min(ys), y1=max(ys), x0=min(xs), x1=max(xs), n=len(pts)))
dots = [c for c in comps if 3 <= c["x1"]-c["x0"]+1 <= 8 and 3 <= c["y1"]-c["y0"]+1 <= 8 and c["n"] >= 9
        and box[max(0, c["y1"]-16):c["y1"]+1, c["x1"]+3:c["x1"]+70].sum() > 40]
dots.sort(key=lambda c: (c["y1"], c["x0"]))
keep = []
for c in dots:
    if keep and abs(c["y1"] - keep[-1]["y1"]) < 8:
        if c["x0"] < keep[-1]["x0"]: keep[-1] = c
        continue
    keep.append(c)
tiles = []
for r in want:
    d = keep[r - 1]
    a, b = Y0 + max(0, d["y1"] - 18), Y0 + d["y1"] + 4
    x0 = X0 + d["x0"] - 2
    t = full.crop((x0, a, x0 + 72, b)).resize((72 * scale, (b - a) * scale), Image.NEAREST)
    lab_im = Image.new("L", (t.width + 60, t.height), 255); lab_im.paste(t, (60, 0))
    ImageDraw.Draw(lab_im).text((4, t.height // 2 - 5), f"r{r}", fill=0)
    tiles.append(lab_im)
Wd = max(t.width for t in tiles); Ht = sum(t.height + 4 for t in tiles)
sheet = Image.new("L", (Wd, Ht), 200); y = 0
for t in tiles:
    sheet.paste(t, (0, y)); y += t.height + 4
sheet.save(out); print(out, sheet.size)
