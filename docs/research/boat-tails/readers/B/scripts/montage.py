"""Tile images into one. Usage: python3 -I montage.py OUT ncols IMG..."""
import sys
from PIL import Image
out, nc = sys.argv[1], int(sys.argv[2])
ims = [Image.open(p) for p in sys.argv[3:]]
w = max(i.size[0] for i in ims); h = max(i.size[1] for i in ims)
nr = (len(ims) + nc - 1) // nc
m = Image.new('RGB', (nc * (w + 8), nr * (h + 8)), 'white')
for k, im in enumerate(ims):
    m.paste(im, ((k % nc) * (w + 8), (k // nc) * (h + 8)))
m.save(out); print(out, m.size)
