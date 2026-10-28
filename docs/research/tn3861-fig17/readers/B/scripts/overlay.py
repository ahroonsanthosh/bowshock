# Mark each read centre (page-image pixels) with a thin red cross and its symbol number, for visual checking.
# usage: overlay.py page_gray.png readout_detail.json out.png x0 y0 x1 y1 scale
import sys, json
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert('RGB'); det = json.load(open(sys.argv[2]))
x0, y0, x1, y1, s = map(int, sys.argv[4:9])
c = im.crop((x0, y0, x1, y1)).resize(((x1 - x0) * s, (y1 - y0) * s), Image.Resampling.LANCZOS)
d = ImageDraw.Draw(c)
for p in det:
    u, v = (p['u_page'] - x0 + 0.5) * s, (p['v_page'] - y0 + 0.5) * s
    if 0 <= u < c.size[0] and 0 <= v < c.size[1]:
        r = 2 * s
        d.line([(u - r, v), (u + r, v)], fill=(255, 0, 0), width=1); d.line([(u, v - r), (u, v + r)], fill=(255, 0, 0), width=1)
        d.text((u + 3, v + 3), str(p['id']), fill=(220, 0, 0))
c.save(sys.argv[3]); print(c.size)
