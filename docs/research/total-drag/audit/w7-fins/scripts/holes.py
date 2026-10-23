"""Candidate open-symbol centres on a noisy scan: the enclosed white
regions (symbol interiors) found by flood fill after a 3x3 blur, with
their area, bounding box and centroid. A helper for placing rough
centres; every candidate is checked by eye and given its kind by hand.
Usage: python3 -I holes.py <image> x0 y0 x1 y1 <out.csv> [amin amax thresh]"""
import sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

x0, y0, x1, y1 = map(int, sys.argv[2:6])
amin = int(sys.argv[7]) if len(sys.argv) > 7 else 20
amax = int(sys.argv[8]) if len(sys.argv) > 8 else 900
thr = int(sys.argv[9]) if len(sys.argv) > 9 else 150
im = Image.open(sys.argv[1]).convert('L').crop((x0, y0, x1, y1)).filter(ImageFilter.BoxBlur(1))
white = np.asarray(im) > thr
H, W = white.shape
seen = np.zeros_like(white)
out = []
for sy in range(H):
    for sx in range(W):
        if not white[sy, sx] or seen[sy, sx]:
            continue
        q = deque([(sy, sx)])
        seen[sy, sx] = True
        pts = []
        edge = False
        while q:
            y, x = q.popleft()
            pts.append((y, x))
            if len(pts) > amax:
                edge = True
            if y == 0 or x == 0 or y == H - 1 or x == W - 1:
                edge = True
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and white[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        if edge or len(pts) < amin:
            continue
        a = np.array(pts)
        h = a[:, 0].max() - a[:, 0].min() + 1
        w = a[:, 1].max() - a[:, 1].min() + 1
        out.append((x0 + a[:, 1].mean(), y0 + a[:, 0].mean(), len(pts), w, h))
with open(sys.argv[6], 'w') as f:
    f.write('x,y,area,w,h\n')
    for r in out:
        f.write(f'{r[0]:.1f},{r[1]:.1f},{r[2]},{r[3]},{r[4]}\n')
print(len(out))
