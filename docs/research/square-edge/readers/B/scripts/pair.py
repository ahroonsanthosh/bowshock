"""Side-by-side enlarged view: original page region and degridded residual.
usage: python3 -I pair.py page.png degrid.npy ox oy out.png x0 y0 x1 y1 scale tick
(ox, oy) is the native origin of the degridded array. Rulers in native px.
"""
import sys
import numpy as np
from PIL import Image, ImageDraw

page, npy = sys.argv[1], sys.argv[2]
ox, oy = int(sys.argv[3]), int(sys.argv[4])
out = sys.argv[5]
x0, y0, x1, y1 = (int(v) for v in sys.argv[6:10])
s = float(sys.argv[10])
tick = int(sys.argv[11])
a = Image.open(page).convert("RGB").crop((x0, y0, x1, y1))
res = np.load(npy)[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
b = Image.fromarray((255 - np.clip(res * 1.5, 0, 255)).astype(np.uint8)).convert("RGB")
W, H = int((x1 - x0) * s), int((y1 - y0) * s)
a = a.resize((W, H), Image.NEAREST if s >= 6 else Image.LANCZOS)
b = b.resize((W, H), Image.NEAREST if s >= 6 else Image.LANCZOS)
pad = 40
img = Image.new("RGB", (2 * W + 3 * pad, H + pad), (255, 255, 255))
img.paste(a, (pad, pad))
img.paste(b, (2 * pad + W, pad))
d = ImageDraw.Draw(img)
for base in (pad, 2 * pad + W):
    for x in range((x0 // tick + 1) * tick, x1, tick):
        px = base + (x - x0) * s
        d.line([(px, pad - 12), (px, pad + (H if base > pad else 0))], fill=(255, 150, 150))
        d.text((px + 2, 2), str(x), fill=(255, 0, 0))
    for y in range((y0 // tick + 1) * tick, y1, tick):
        py = pad + (y - y0) * s
        d.line([(base - 12, py), (base + (W if base > pad else 0), py)], fill=(150, 150, 255))
        d.text((base - pad + 1, py + 2), str(y), fill=(0, 0, 255))
img.save(out)
print(out, img.size)
