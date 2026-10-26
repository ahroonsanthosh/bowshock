"""Crop with a coordinate ruler (native pixel coordinates) for locating symbols by eye.
Usage: python3 -I ruler.py IMG OUT u0 v0 u1 v1 scale [step]"""
import sys
from PIL import Image, ImageDraw
a = sys.argv[1:]
im = Image.open(a[0]).convert('RGB')
u0, v0, u1, v1 = (int(x) for x in a[2:6]); sc = float(a[6]); st = int(a[7]) if len(a) > 7 else 10
c = im.crop((u0, v0, u1, v1)).resize((int((u1 - u0) * sc), int((v1 - v0) * sc)), Image.NEAREST)
pad = 40
out = Image.new('RGB', (c.width + pad, c.height + pad), 'white')
out.paste(c, (pad, pad))
d = ImageDraw.Draw(out)
for u in range((u0 // st + 1) * st, u1, st):
    x = pad + (u - u0 + 0.5) * sc
    big = u % (st * 5) == 0
    d.line([(x, pad - (12 if big else 5)), (x, pad)], fill=(255, 0, 0))
    d.line([(x, pad), (x, out.height)], fill=(255, 180, 180) if big else (255, 230, 230))
    if big:
        d.text((x - 12, 2), str(u), fill=(200, 0, 0))
for v in range((v0 // st + 1) * st, v1, st):
    y = pad + (v - v0 + 0.5) * sc
    big = v % (st * 5) == 0
    d.line([(pad - (12 if big else 5), y), (pad, y)], fill=(0, 0, 255))
    if big:
        d.text((0, y - 5), str(v), fill=(0, 0, 200))
out.save(a[1]); print(a[1], out.size)
