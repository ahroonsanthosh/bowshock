import sys
from PIL import Image, ImageDraw
sys.path.insert(0, sys.argv[1])
Image.MAX_IMAGE_PIXELS = None
page = Image.open(sys.argv[2]).convert("RGB")
out = sys.argv[3]; half = int(sys.argv[4]); sc = int(sys.argv[5]); ncol = int(sys.argv[6])
items = []
for s in sys.argv[7:]:
    name, x, y = s.split(":")
    items.append((name, float(x), float(y)))
tiles = []
for name, x, y in items:
    c = page.transform((2 * half * sc, 2 * half * sc), Image.AFFINE, (1.0 / sc, 0, x - half, 0, 1.0 / sc, y - half), resample=Image.BICUBIC)
    d = ImageDraw.Draw(c)
    T0 = 2 * half * sc
    for k in range(-half, half + 1, 5):
        p = (k + half) * sc
        L = 10 if k % 10 == 0 else 5
        d.line([(p, 0), (p, L)], fill=(255, 0, 0)); d.line([(0, p), (L, p)], fill=(255, 0, 0))
        d.line([(p, T0 - L), (p, T0)], fill=(255, 0, 0)); d.line([(T0 - L, p), (T0, p)], fill=(255, 0, 0))
        if k % 10 == 0:
            d.text((p + 2, 10), str(int(x + k)), fill=(255, 0, 0)); d.text((12, p - 5), str(int(y + k)), fill=(255, 0, 0))
            for q in range(0, T0, 6):
                d.point((p, q), fill=(255, 160, 160)); d.point((q, p), fill=(255, 160, 160))
    d.text((2 * half * sc - 70, 2 * half * sc - 14), name, fill=(0, 0, 255))
    cx = cy = half * sc
    d.line([(cx - 6, cy), (cx + 6, cy)], fill=(0, 200, 0)); d.line([(cx, cy - 6), (cx, cy + 6)], fill=(0, 200, 0))
    tiles.append(c)
T = 2 * half * sc
nrow = (len(tiles) + ncol - 1) // ncol
S = Image.new("RGB", (ncol * (T + 6), nrow * (T + 6)), "white")
for i, t in enumerate(tiles):
    S.paste(t, ((i % ncol) * (T + 6), (i // ncol) * (T + 6)))
S.save(out); print(S.size)
