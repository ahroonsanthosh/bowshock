"""Make a contrast-stretched zoom strip with a 10 px labelled grid.

usage: python3 -I strip.py PAGE X0 Y0 X1 Y1 OUT [SCALE]
"""
import sys
import numpy as np
from PIL import Image, ImageDraw

WORK = "/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/tr1386/B/work"
page = int(sys.argv[1])
x0, y0, x1, y1 = map(int, sys.argv[2:6])
out = sys.argv[6]
sc = int(sys.argv[7]) if len(sys.argv) > 7 else 4
g = np.asarray(Image.open(f"{WORK}/p400-{page:02d}.png").convert("L"), dtype=np.float32)[y0:y1, x0:x1]
lo, hi = np.percentile(g, 1), np.percentile(g, 99.5)
g = np.clip((g - lo) / max(hi - lo, 1) * 255, 0, 255).astype(np.uint8)
im = Image.fromarray(g).resize((g.shape[1] * sc, g.shape[0] * sc), Image.LANCZOS).convert("RGB")
d = ImageDraw.Draw(im)
for x in range((x0 // 10 + 1) * 10, x1, 10):
    px = (x - x0) * sc
    d.line([(px, 0), (px, im.height)], fill=(255, 150, 150) if x % 50 else (255, 0, 0))
    if x % 20 == 0:
        d.text((px + 1, 1), str(x), fill=(255, 0, 0))
for y in range((y0 // 10 + 1) * 10, y1, 10):
    py = (y - y0) * sc
    d.line([(0, py), (im.width, py)], fill=(150, 150, 255) if y % 50 else (0, 0, 255))
    d.text((1, py + 1), str(y), fill=(0, 0, 255))
im.save(out)
print(out, im.size)
