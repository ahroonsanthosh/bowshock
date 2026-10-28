"""Enlarged view of a degridded residual with a pixel ruler.
usage: python3 -I resview.py degrid.npy ox oy out.png x0 y0 x1 y1 scale tick gain
"""
import sys
import numpy as np
from PIL import Image, ImageDraw
res = np.load(sys.argv[1]); ox, oy = int(sys.argv[2]), int(sys.argv[3])
out = sys.argv[4]
x0, y0, x1, y1 = (int(v) for v in sys.argv[5:9])
s = int(sys.argv[9]); tick = int(sys.argv[10]); gain = float(sys.argv[11])
r = res[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
im = Image.fromarray((255 - np.clip(r * gain, 0, 255)).astype(np.uint8)).resize(((x1 - x0) * s, (y1 - y0) * s), Image.NEAREST).convert('RGB')
pad = 40
big = Image.new('RGB', (im.width + pad, im.height + pad), (255, 255, 255))
big.paste(im, (pad, pad))
d = ImageDraw.Draw(big)
for x in range((x0 // tick + 1) * tick, x1, tick):
    px = pad + (x - x0) * s
    d.line([(px, pad - 10), (px, pad + im.height)], fill=(255, 190, 190))
    d.text((px + 2, 2), str(x), fill=(255, 0, 0))
for y in range((y0 // tick + 1) * tick, y1, tick):
    py = pad + (y - y0) * s
    d.line([(pad - 10, py), (pad + im.width, py)], fill=(190, 190, 255))
    d.text((2, py + 2), str(y), fill=(0, 0, 255))
big.save(out)
