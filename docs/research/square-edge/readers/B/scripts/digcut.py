"""Cut the digits of a monospaced decimal column at fixed pitch and cluster them.

usage: python3 -I digcut.py out_prefix nclust page1.png:rows1.json:x0:x1 [page2...]
For each row (bands from tabglyph.py json, key "rows"), the leading decimal
point is found as the first compact blob in the strip x0..x1; the four digit
cells are cut at dot_x + pitch*k (k = 1..4) with the pitch estimated from
the data (median spacing of glyph centres in rows that split cleanly into
5 glyphs). Each digit cell is binarised, centred on its own ink and
resized to 20x14. All cells are clustered (k-means on the pixel vectors,
then each cluster is sorted by distance to its centre). Writes
out_prefix_cells.npz (images, page, row, k) and out_prefix_montage_<c>.png
(one image per cluster, members in order) and out_prefix_assign.csv.
"""
import csv
import json
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

pre = sys.argv[1]
K = int(sys.argv[2])
specs = sys.argv[3:]
cells, meta = [], []
raw = []
for pi, sp in enumerate(specs):
    path, js, x0, x1 = sp.split(":")
    x0, x1 = int(x0), int(x1)
    g = np.asarray(Image.open(path).convert("L"), dtype=float)
    rows = json.load(open(js))["rows"]
    # pitch estimate
    cents = []
    for r in rows:
        a, b = r["y"]
        sub = g[a - 2:b + 3, x0:x1] < 128
        sub[:, sub.mean(axis=0) > 0.9] = False
        lab, n = ndimage.label(sub, structure=np.ones((3, 3)))
        objs = ndimage.find_objects(lab)
        cx = sorted(((s[1].start + s[1].stop) / 2.0, s) for s in objs)
        if len(cx) == 5:
            cents.append(np.diff([c for c, _ in cx]))
    pitch = float(np.median(np.concatenate(cents)))
    print(path, "pitch %.2f px from %d rows" % (pitch, len(cents)))
    for ri, r in enumerate(rows):
        a, b = r["y"]
        sub = g[a - 2:b + 3, x0:x1] < 128
        sub[:, sub.mean(axis=0) > 0.9] = False
        lab, n = ndimage.label(sub, structure=np.ones((3, 3)))
        objs = ndimage.find_objects(lab)
        # decimal point: first blob whose height is under half the row height
        H = b - a + 5
        dots = [s for s in objs if (s[0].stop - s[0].start) < 0.5 * H and (s[1].stop - s[1].start) < 0.6 * pitch]
        if not dots:
            print("row", ri, "no dot")
            continue
        d = min(dots, key=lambda s: s[1].start)
        dx = (d[1].start + d[1].stop) / 2.0
        for k in range(1, 5):
            c0 = int(round(dx + k * pitch - pitch / 2.0))
            c1 = int(round(dx + k * pitch + pitch / 2.0))
            cell = g[a - 2:b + 3, x0 + c0:x0 + c1]
            raw.append(cell.copy())
            ink = cell < 128
            if ink.sum() == 0:
                img = np.zeros((20, 14))
            else:
                ys, xs = np.nonzero(ink)
                box = ink[ys.min():ys.max() + 1, xs.min():xs.max() + 1].astype(np.uint8) * 255
                img = np.asarray(Image.fromarray(box).resize((14, 20), Image.BILINEAR), dtype=float) / 255.0
            cells.append(img.ravel())
            meta.append((pi, ri, k, x0 + c0, a - 2, x0 + c1, b + 3))
X = np.array(cells)
# k-means with deterministic init (farthest point)
rng = np.random.default_rng(0)
C = [X[0]]
for _ in range(K - 1):
    d = np.min([((X - c) ** 2).sum(1) for c in C], axis=0)
    C.append(X[np.argmax(d)])
C = np.array(C)
for it in range(50):
    D = ((X[:, None, :] - C[None, :, :]) ** 2).sum(2)
    lab = D.argmin(1)
    newC = np.array([X[lab == k].mean(0) if (lab == k).any() else C[k] for k in range(K)])
    if np.allclose(newC, C):
        break
    C = newC
D = ((X[:, None, :] - C[None, :, :]) ** 2).sum(2)
lab = D.argmin(1)
np.savez(pre + "_cells.npz", X=X, meta=np.array(meta), lab=lab, C=C)
with open(pre + "_assign.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["idx", "page", "row", "digit", "cluster", "dist"])
    for i, (m, l) in enumerate(zip(meta, lab)):
        w.writerow([i, m[0], m[1] + 1, m[2], l, "%.2f" % D[i, l]])
for k in range(K):
    idx = np.nonzero(lab == k)[0]
    idx = idx[np.argsort(D[idx, k])]
    n = len(idx)
    cols = 20
    rows_n = (n + cols - 1) // cols
    S = 3
    tw, th = 22 * S, 26 * S
    im = Image.new("L", (cols * tw, max(1, rows_n) * (th + 12)), 255)
    dr = ImageDraw.Draw(im)
    for j, i in enumerate(idx):
        r_, c_ = divmod(j, cols)
        cell = raw[i]
        t = Image.fromarray(cell.astype(np.uint8)).resize((cell.shape[1] * S, cell.shape[0] * S), Image.NEAREST)
        im.paste(t, (c_ * tw, r_ * (th + 12)))
        m = meta[i]
        dr.text((c_ * tw, r_ * (th + 12) + th), "%d.%d.%d" % (m[0] + 1, m[1] + 1, m[2]), fill=0)
    im.save("%s_montage_%02d.png" % (pre, k))
    print("cluster", k, "size", n)
