"""Summary sheet of digit clusters: for each cluster, its members closest to and
farthest from the centre, drawn from the original page pixels.
usage: python3 -I clsum.py cells.npz out.png nfirst nlast page1.png page2.png ...
"""
import sys
import numpy as np
from PIL import Image, ImageDraw

d = np.load(sys.argv[1])
X, meta, lab, C = d["X"], d["meta"], d["lab"], d["C"]
out = sys.argv[2]
nf, nl = int(sys.argv[3]), int(sys.argv[4])
pages = [np.asarray(Image.open(p).convert("L")) for p in sys.argv[5:]]
K = C.shape[0]
S = 3
tw, th = 18 * S, 22 * S
im = Image.new("L", ((nf + nl + 2) * tw + 60, K * (th + 6)), 255)
dr = ImageDraw.Draw(im)
for k in range(K):
    idx = np.nonzero(lab == k)[0]
    dist = ((X[idx] - C[k]) ** 2).sum(1)
    idx = idx[np.argsort(dist)]
    pick = list(idx[:nf]) + [None] + list(idx[-nl:] if len(idx) > nf else [])
    dr.text((2, k * (th + 6) + th // 2), "c%d n%d" % (k, len(idx)), fill=0)
    for j, i in enumerate(pick):
        if i is None:
            continue
        p, r, dg, x0, y0, x1, y1 = meta[i]
        cell = pages[p][y0:y1, x0:x1]
        t = Image.fromarray(cell).resize((cell.shape[1] * S, cell.shape[0] * S), Image.NEAREST)
        im.paste(t, (60 + j * tw, k * (th + 6)))
im.save(out)
