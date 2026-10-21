"""Polar ruler overlay for TN 3861 fig. 5(a).
Usage: python3 -I polar.py <in.png> <out.png> cx cy r0 s x0 y0 x1 y1 [scale]
r = r0 + s * dP/q (px); beta from the upward vertical, positive clockwise.
Draws rays every 5 deg (red, labelled every 10) and arcs every 0.1 in dP/q
(blue, labelled every 0.5), over the crop (x0, y0, x1, y1)."""
import math
import sys
from PIL import Image, ImageDraw

src, dst = sys.argv[1], sys.argv[2]
cx, cy, r0, s = map(float, sys.argv[3:7])
x0, y0, x1, y1 = map(int, sys.argv[7:11])
scale = float(sys.argv[11]) if len(sys.argv) > 11 else 1.0
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
d = ImageDraw.Draw(im)
for b in range(-180, 185, 5):
    t = math.radians(b)
    pa = (cx + 50 * math.sin(t) - x0, cy - 50 * math.cos(t) - y0)
    pb = (cx + 1300 * math.sin(t) - x0, cy - 1300 * math.cos(t) - y0)
    d.line([pa, pb], fill=(255, 0, 0) if b % 10 == 0 else (255, 160, 160), width=1)
    if b % 10 == 0:
        R = r0 + s * float(__import__("os").environ.get("LABR", "1.9"))
        d.text((cx + R * math.sin(t) - x0, cy - R * math.cos(t) - y0), f'{b}', fill=(220, 0, 0))
v = -0.4
while v <= 2.2001:
    R = r0 + s * v
    if R > 0:
        major = abs(v * 2 - round(v * 2)) < 1e-6
        d.ellipse([cx - R - x0, cy - R - y0, cx + R - x0, cy + R - y0],
                  outline=(0, 0, 255) if major else (160, 160, 255))
        if major:
            d.text((cx + 3 - x0, cy - R - y0 - 11), f'{v:.1f}', fill=(0, 0, 200))
    v += 0.1
if scale != 1:
    im = im.resize((int(im.size[0] * scale), int(im.size[1] * scale)), Image.LANCZOS)
im.save(dst)
print(dst, im.size)
