"""Rectify the figure 35 grid: output pixel (u,v) with C px per grid cell.
u = (M-1.0)/0.1*C + MARG, v = (PB+0.36)/0.02*C + MARG  (v grows downward: PB=-0.36 at top)
"""
import sys, json
import numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
C = int(sys.argv[3]) if len(sys.argv) > 3 else 160
MARG = 2*C
img = Image.open(src).convert('L')
im = np.asarray(img).astype(float)
dark = im < 170
def peaks(a, thr):
    out=[]; i=0
    while i < len(a):
        if a[i] >= thr:
            j=i
            while j < len(a) and a[j] >= thr: j+=1
            seg=a[i:j].astype(float)
            out.append(i + (seg*np.arange(len(seg))).sum()/seg.sum()); i=j
        else: i+=1
    return out
V = []  # (y, [25 xs])
for yc in range(800, 3500, 50):
    p = [1000+q for q in peaks(dark[yc-40:yc+40, 1000:4900].sum(axis=0), 0.8*80)]
    if len(p) == 25: V.append((yc, p))
Hh = []
for xc in range(1150, 4850, 50):
    p = [650+q for q in peaks(dark[650:3600, xc-40:xc+40].sum(axis=1), 0.8*80)]
    if len(p) == 19: Hh.append((xc, p))
V = np.array([[y]+p for y,p in V]); Hh = np.array([[x]+p for x,p in Hh])
# fit quadratic in y for each vertical line, quadratic in x for each horizontal line
vfit = [np.polyfit(V[:,0], V[:,1+k], 2) for k in range(25)]
hfit = [np.polyfit(Hh[:,0], Hh[:,1+j], 2) for j in range(19)]
resv = max(np.abs(np.polyval(vfit[k], V[:,0]) - V[:,1+k]).max() for k in range(25))
resh = max(np.abs(np.polyval(hfit[j], Hh[:,0]) - Hh[:,1+j]).max() for j in range(19))
print('bands', len(V), len(Hh), 'max resid px', round(resv,2), round(resh,2))
# intersections
X = np.zeros((19,25)); Y = np.zeros((19,25))
for j in range(19):
    for k in range(25):
        x, y = np.polyval(vfit[k], 2000.0), np.polyval(hfit[j], 2000.0)
        for _ in range(20):
            x = np.polyval(vfit[k], y); y = np.polyval(hfit[j], x)
        X[j,k], Y[j,k] = x, y
# extend grid by MARG cells (2 cells) each side linearly
def ext(A):
    A = np.pad(A, 2, mode='reflect', reflect_type='odd')
    return A
Xe, Ye = ext(X), ext(Y)
nj, nk = Xe.shape
Wout, Hout = (nk-1)*C, (nj-1)*C
u = np.arange(Wout)/C; v = np.arange(Hout)/C
uu, vv = np.meshgrid(u, v)
k0 = np.clip(np.floor(uu).astype(int), 0, nk-2); j0 = np.clip(np.floor(vv).astype(int), 0, nj-2)
fu = uu-k0; fv = vv-j0
def bil(A):
    return (A[j0,k0]*(1-fu)*(1-fv) + A[j0,k0+1]*fu*(1-fv) + A[j0+1,k0]*(1-fu)*fv + A[j0+1,k0+1]*fu*fv)
sx, sy = bil(Xe), bil(Ye)
x0 = np.clip(np.floor(sx).astype(int), 0, im.shape[1]-2); y0 = np.clip(np.floor(sy).astype(int), 0, im.shape[0]-2)
ax = sx-x0; ay = sy-y0
outim = (im[y0,x0]*(1-ax)*(1-ay) + im[y0,x0+1]*ax*(1-ay) + im[y0+1,x0]*(1-ax)*ay + im[y0+1,x0+1]*ax*ay)
Image.fromarray(np.clip(outim,0,255).astype(np.uint8)).save(out)
np.save(out.replace('.png','_map.npy'), np.stack([sx, sy]))
print(out, Wout, Hout, 'C', C, 'origin (M=1.0,PB=-0.36) at', MARG, MARG)
