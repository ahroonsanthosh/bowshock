"""Contrast-stretched high zoom of a small region (nearest-neighbour, with a 5 px tick grid).

usage: python3 -I zoom.py PAGE CX CY HALF OUT [SCALE]
"""
import sys
import numpy as np
from PIL import Image, ImageDraw

WORK = "/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/tr1386/B/work"

page = int(sys.argv[1])
cx, cy, half = int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
out = sys.argv[5]
scale = int(sys.argv[6]) if len(sys.argv) > 6 else 8
g = np.asarray(Image.open(f"{WORK}/p400-{page:02d}.png").convert("L"), dtype=np.float32)
p = g[cy - half:cy + half + 1, cx - half:cx + half + 1]
lo, hi = np.percentile(p, 1), np.percentile(p, 99)
p = np.clip((p - lo) / max(hi - lo, 1) * 255, 0, 255).astype(np.uint8)
im = Image.fromarray(p).resize((p.shape[1] * scale, p.shape[0] * scale), Image.NEAREST).convert("RGB")
d = ImageDraw.Draw(im)
for k in range(0, 2 * half + 1, 5):
    v = (cx - half + k)
    col = (255, 0, 0) if v % 10 == 0 else (255, 180, 180)
    d.line([(k * scale + scale // 2, 0), (k * scale + scale // 2, 6)], fill=col)
    if v % 10 == 0:
        d.text((k * scale + 2, 8), str(v), fill=(255, 0, 0))
    v = (cy - half + k)
    col = (0, 0, 255) if v % 10 == 0 else (180, 180, 255)
    d.line([(0, k * scale + scale // 2), (6, k * scale + scale // 2)], fill=col)
    if v % 10 == 0:
        d.text((8, k * scale + 2), str(v), fill=(0, 0, 255))
im.save(out)
print(out, im.size)
