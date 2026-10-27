# usage: python3 -I tiles.py <png> <out.png> <scale> <step> "x0 y0 x1 y1" ...   crops with pixel grid, side by side
import sys
from PIL import Image, ImageDraw
src, out, sc, step = sys.argv[1], sys.argv[2], float(sys.argv[3]), int(sys.argv[4])
g = Image.open(src).convert('RGB'); ims = []
for r in sys.argv[5:]:
    x0, y0, x1, y1 = map(int, r.split())
    im = g.crop((x0, y0, x1, y1)).resize((int((x1 - x0) * sc), int((y1 - y0) * sc)), Image.LANCZOS); d = ImageDraw.Draw(im)
    for gx in range((x0 // step + 1) * step, x1, step):
        X = (gx - x0) * sc; d.line([(X, 0), (X, 6)], fill=(255, 0, 0)); d.line([(X, im.size[1] - 6), (X, im.size[1])], fill=(255, 0, 0))
        if gx % (2 * step) == 0: d.text((X + 1, 7), str(gx), fill=(255, 0, 0))
    for gy in range((y0 // step + 1) * step, y1, step):
        Y = (gy - y0) * sc; d.line([(0, Y), (6, Y)], fill=(0, 0, 255)); d.line([(im.size[0] - 6, Y), (im.size[0], Y)], fill=(0, 0, 255))
        if gy % (2 * step) == 0: d.text((8, Y - 5), str(gy), fill=(0, 0, 255))
    ims.append(im)
W = sum(i.size[0] for i in ims) + 8 * len(ims); H = max(i.size[1] for i in ims)
o = Image.new('RGB', (W, H), (150, 150, 150)); x = 0
for i in ims: o.paste(i, (x, 0)); x += i.size[0] + 8
o.save(out); print(out, o.size)
