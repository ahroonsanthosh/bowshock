"""Draw tracked points (u, v from track.py outputs) on a crop of the rectified image.
usage: overlay.py rect.png out.png u0 v0 u1 v1 scale track1.tsv:color [track2.tsv:color ...]
color is r,g,b. Points are drawn 0 px offset (a small dot on the line centre)."""
import sys
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
u0, v0, u1, v1 = map(int, sys.argv[3:7])
scale = float(sys.argv[7])
im = Image.open(src).convert('RGB').crop((u0, v0, u1, v1))
im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
d = ImageDraw.Draw(im)
for spec in sys.argv[8:]:
    path, col = spec.split(':')
    c = tuple(int(x) for x in col.split(','))
    for line in open(path).read().splitlines()[1:]:
        f = line.split('\t')
        if len(f) < 4 or f[3] == '':
            continue
        u, v = float(f[0]), float(f[3])
        if u0 <= u <= u1 and v0 <= v <= v1:
            x, y = (u - u0) * scale, (v - v0) * scale
            d.ellipse((x - 1.5, y - 1.5, x + 1.5, y + 1.5), fill=c)
for k in range(0, 30):
    u = 320 + 160 * k
    if u0 <= u <= u1:
        d.text(((u - u0) * scale + 2, 2), f'M{1.0 + 0.1 * k:.1f}', fill=(200, 0, 0))
for j in range(0, 24):
    v = 320 + 160 * j
    if v0 <= v <= v1:
        d.text((2, (v - v0) * scale + 2), f'{-0.36 + 0.02 * j:.2f}', fill=(0, 0, 200))
im.save(out)
print(out, im.size)
