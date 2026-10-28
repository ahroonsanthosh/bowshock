"""Print ASCII pixel maps of chosen value rows of a table column.
usage: python3 -I rowmap.py IMG X0 X1 Y0 Y1 ROW [ROW ...]
Rows are counted by decimal points from the top of the box (1-based)."""
import sys
import numpy as np
from PIL import Image
from collections import deque
img = sys.argv[1]; X0, X1, Y0, Y1 = (int(v) for v in sys.argv[2:6]); want = [int(v) for v in sys.argv[6:]]
box = np.asarray(Image.open(img).convert("L"))[Y0:Y1, X0:X1] < 128
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
for r in want:
    d = keep[r - 1]
    a, b = max(0, d["y1"] - 17), d["y1"] + 3
    print(f"row {r}: native y {Y0+a}..{Y0+b}, x {X0+d['x0']}..")
    for line in box[a:b, d["x0"]:d["x0"] + 75]:
        print("".join("#" if v else "." for v in line))
    print()
