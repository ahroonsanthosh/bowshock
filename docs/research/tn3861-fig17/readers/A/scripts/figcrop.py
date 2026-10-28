"""Upright crop of the figure by figure coordinates.
usage: python -I figcrop.py gray.png calib.json out.png Mlo Mhi CDlo CDhi scale [gridticks 0|1]
Prints the page-pixel box used. With gridticks=1, small marks are drawn on the crop
border at every 0.1 in M and 0.05 in CD (outside the image area, in a margin)."""
import sys, json
import numpy as np
from PIL import Image, ImageDraw
g = sys.argv[1]; cal = json.load(open(sys.argv[2])); out = sys.argv[3]
Mlo, Mhi, Clo, Chi, scale = map(float, sys.argv[4:9])
ticks = int(sys.argv[9]) if len(sys.argv) > 9 else 0
cM = np.array(cal['affine']['M']); cC = np.array(cal['affine']['CD'])
J = np.array([[cM[1], cM[2]], [cC[1], cC[2]]]); G = np.linalg.inv(J)
def page(M, CD):
    v = np.linalg.solve(J, np.array([M - cM[0], CD - cC[0]]))
    return v
corners = np.array([page(m, c) for m in (Mlo, Mhi) for c in (Clo, Chi)])
x0, y0 = np.floor(corners.min(0)).astype(int); x1, y1 = np.ceil(corners.max(0)).astype(int)
im = Image.open(g).convert('L').crop((x0, y0, x1, y1))
H = im.size[1]                      # unrotated crop height (page y extent)
im = im.transpose(Image.ROTATE_270)  # 90 deg clockwise: figure upright
W = im.size[0]
im = im.resize((int(im.size[0]*scale), int(im.size[1]*scale)), Image.NEAREST)
print('page box x %d..%d y %d..%d; crop upright size %s' % (x0, x1, y0, y1, im.size))
if ticks:
    m = 40
    can = Image.new('L', (im.size[0]+2*m, im.size[1]+2*m), 255)
    can.paste(im, (m, m)); d = ImageDraw.Draw(can)
    def up(px, py):  # page -> upright crop coords
        xc, yc = px - x0, py - y0
        u = (H - 1 - yc); v = xc
        return m + u*scale, m + v*scale
    Mt = np.arange(np.ceil(Mlo*10), np.floor(Mhi*10)+1)/10
    for M in Mt:
        u, v = up(*page(M, Clo)); u2, _ = up(*page(M, Chi))
        L = 12 if abs(M*2 - round(M*2)) < 1e-6 else 6
        d.line([(u2, m-L), (u2, m)], fill=0); d.line([(u, m+im.size[1]), (u, m+im.size[1]+L)], fill=0)
        if L == 12: d.text((u-8, m+im.size[1]+14), '%.1f' % M, fill=0)
    Ct = np.arange(np.ceil(Clo*20), np.floor(Chi*20)+1)/20
    for C in Ct:
        u, v = up(*page(Mlo, C)); _, v2 = up(*page(Mhi, C))
        L = 12 if abs(C*4 - round(C*4)) < 1e-6 else 6
        d.line([(m-L, v), (m, v)], fill=0); d.line([(m+im.size[0], v2), (m+im.size[0]+L, v2)], fill=0)
        if L == 12: d.text((2, v-14), '%.2f' % C, fill=0)
    im = can
im.save(out)
