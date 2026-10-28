# ruler.py page.png out.png x0 y0 x1 y1 scale : nearest-neighbour zoom with a labelled pixel ruler (every 10 px) in a margin
import sys
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert('RGB')
x0, y0, x1, y1, s = map(int, sys.argv[3:8])
c = im.crop((x0, y0, x1, y1)).resize(((x1 - x0) * s, (y1 - y0) * s), Image.Resampling.NEAREST)
m = 40
out = Image.new('RGB', (c.size[0] + m, c.size[1] + m), (255, 255, 255))
out.paste(c, (m, m))
d = ImageDraw.Draw(out)
for xx in range(x0 + (-x0) % 5, x1, 5):
    X = m + (xx - x0) * s + s // 2
    big = xx % 10 == 0
    d.line([(X, m - (12 if big else 5)), (X, m)], fill=(0, 0, 255))
    if big: d.text((X - 12, 2), str(xx), fill=(0, 0, 255))
for yy in range(y0 + (-y0) % 5, y1, 5):
    Y = m + (yy - y0) * s + s // 2
    big = yy % 10 == 0
    d.line([(m - (12 if big else 5), Y), (m, Y)], fill=(0, 0, 255))
    if big: d.text((0, Y - 5), str(yy), fill=(0, 0, 255))
out.save(sys.argv[2]); print(out.size)
