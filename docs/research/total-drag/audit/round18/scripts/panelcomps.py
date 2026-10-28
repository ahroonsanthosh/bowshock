"""Generic: find grid lines in a panel window by projection, mask them, list ink components
with length along the major axis. Usage: panelcomps.py img.png x0 y0 x1 y1 out.png scale [minlen]"""
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
a = np.array(Image.open(sys.argv[1]).convert('L')) < 128
x0, y0, x1, y1 = map(int, sys.argv[2:6]); outp = sys.argv[6]; sc = int(sys.argv[7])
minlen = float(sys.argv[8]) if len(sys.argv) > 8 else 6
sub = a[y0:y1, x0:x1].copy()
H, W = sub.shape
mask = np.zeros_like(sub)
yy, xx = np.mgrid[0:H, 0:W]
col = sub.sum(0); row = sub.sum(1)
def groups(idx):
    g = []
    for i in idx:
        if g and i - g[-1][-1] <= 1: g[-1].append(i)
        else: g.append([i])
    return g
for g in groups(np.where(col > 0.6*H)[0]):
    xc = np.mean(g)
    pts = []
    for y in range(H):
        w0 = int(round(xc)) - 5; seg = sub[y, max(w0,0):w0+11]; idx = np.where(seg)[0]
        if len(idx) and idx[0] > 0 and idx[-1] < 10 and idx[-1]-idx[0]+1 == len(idx) and len(idx) <= 5: pts.append((w0+idx.mean(), y))
    p = np.array(pts); c = np.polyfit(p[:,1], p[:,0], 1)
    mask |= np.abs(xx - np.polyval(c, yy)) <= 2.6
for g in groups(np.where(row > 0.6*W)[0]):
    yc = np.mean(g)
    pts = []
    for x in range(W):
        w0 = int(round(yc)) - 5; seg = sub[max(w0,0):w0+11, x]; idx = np.where(seg)[0]
        if len(idx) and idx[0] > 0 and idx[-1] < 10 and idx[-1]-idx[0]+1 == len(idx) and len(idx) <= 5: pts.append((x, w0+idx.mean()))
    p = np.array(pts); c = np.polyfit(p[:,0], p[:,1], 1)
    mask |= np.abs(yy - np.polyval(c, xx)) <= 2.6
ink = sub & ~mask
lab, n = ndi.label(ink, structure=np.ones((3,3)))
out = []
for i in range(1, n+1):
    ys, xs = np.where(lab == i)
    if len(xs) < 8: continue
    P = np.c_[xs - xs.mean(), ys - ys.mean()]
    w, v = np.linalg.eigh(np.cov(P.T))
    t = P @ v[:,1]; L = t.max()-t.min()+1
    if L < minlen: continue
    # does an end touch the grid mask?
    dil = ndi.binary_dilation(lab == i, iterations=2)
    touch = bool((dil & mask).any())
    out.append((xs.mean()+x0, ys.mean()+y0, L, xs.min()+x0, ys.min()+y0, xs.max()+x0, ys.max()+y0, touch, i))
out.sort(key=lambda r: (round(r[0]/25), r[1]))
for k, r in enumerate(out):
    print('%3d c=(%.0f,%.0f) L=%5.1f bbox=(%d,%d)-(%d,%d) %s' % (k+1, r[0], r[1], r[2], r[3], r[4], r[5], r[6], 'GRID' if r[7] else ''))
v = np.full((H, W, 3), 255, np.uint8); v[sub] = (190,190,255); v[ink] = (0,0,0)
im = Image.fromarray(v).resize((W*sc, H*sc), Image.NEAREST); dr = ImageDraw.Draw(im)
for k, r in enumerate(out):
    dr.text(((r[5]-x0)*sc+2, (r[1]-y0)*sc-5), str(k+1), fill=(255,0,0))
im.save(outp)
