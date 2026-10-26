"""Contact sheet of zoomed crops with pixel rulers.

usage: python3 -I sheet.py IMG ROT HALF SCALE NCOL OUT cx,cy [cx,cy ...]
"""
import sys
from PIL import Image, ImageDraw
img, rot, half, sc, ncol, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
pts = [tuple(int(float(v)) for v in a.split(',')) for a in sys.argv[7:]]
im = Image.open(img).convert('RGB')
if rot:
    im = im.rotate(rot, expand=True, fillcolor=(255, 255, 255))
M = 34
tw = 2 * half * sc + 2 * M
tiles = []
for (cx, cy) in pts:
    x0, y0 = cx - half, cy - half
    c = im.crop((x0, y0, cx + half, cy + half)).resize((2 * half * sc, 2 * half * sc), Image.NEAREST)
    t = Image.new('RGB', (tw, tw), (255, 255, 255))
    t.paste(c, (M, M))
    d = ImageDraw.Draw(t)
    for v in range((x0 // 5 + 1) * 5, cx + half, 5):
        X = M + (v - x0) * sc
        L = 10 if v % 10 == 0 else 4
        d.line([(X, M - L), (X, M)], fill=(0, 0, 255))
        d.line([(X, M + c.height), (X, M + c.height + L)], fill=(0, 0, 255))
        if v % 20 == 0:
            d.text((X - 10, 2), str(v), fill=(0, 0, 255))
    for v in range((y0 // 5 + 1) * 5, cy + half, 5):
        Y = M + (v - y0) * sc
        L = 10 if v % 10 == 0 else 4
        d.line([(M - L, Y), (M, Y)], fill=(200, 0, 0))
        d.line([(M + c.width, Y), (M + c.width + L, Y)], fill=(200, 0, 0))
        if v % 20 == 0:
            d.text((0, Y - 12), str(v), fill=(200, 0, 0))
    tiles.append(t)
nrow = (len(tiles) + ncol - 1) // ncol
S = Image.new('RGB', (ncol * tw, nrow * tw), (255, 255, 255))
for k, t in enumerate(tiles):
    r, cc = divmod(k, ncol)
    S.paste(t, (cc * tw, r * tw))
S.save(out)
print(S.size)
