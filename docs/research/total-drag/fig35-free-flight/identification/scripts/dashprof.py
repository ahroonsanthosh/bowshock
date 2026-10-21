"""Waypoint-guided dash profile along a curve in the rectified image.
usage: dashprof.py rect.png name thr R "u1,v1 u2,v2 ..."
Writes name.npy: columns s, u, v, minint, isgrid ; prints run list (D=dark, g=gap, G=grid-crossing)
"""
import sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
name, thr, R = sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
P = np.array([[float(a) for a in w.split(',')] for w in sys.argv[5].split()])
H, W = im.shape
C, MARG = 160, 321
def samp(u, v):
    u0 = int(np.floor(u)); v0 = int(np.floor(v)); a = u-u0; b = v-v0
    return (im[v0,u0]*(1-a)*(1-b) + im[v0,u0+1]*a*(1-b) + im[v0+1,u0]*(1-a)*b + im[v0+1,u0+1]*a*b)
# Catmull-Rom through waypoints, then resample at 0.5 px arc length
pts = []
Q = np.vstack([P[0], P, P[-1]])
for i in range(1, len(Q)-2):
    p0, p1, p2, p3 = Q[i-1], Q[i], Q[i+1], Q[i+2]
    for t in np.linspace(0, 1, 60, endpoint=False):
        t2, t3 = t*t, t*t*t
        pts.append(0.5*((2*p1) + (-p0+p2)*t + (2*p0-5*p1+4*p2-p3)*t2 + (-p0+3*p1-3*p2+p3)*t3))
pts.append(P[-1]); pts = np.array(pts)
seg = np.hypot(*np.diff(pts, axis=0).T); s = np.concatenate([[0], np.cumsum(seg)])
S = np.arange(0, s[-1], 0.5)
U = np.interp(S, s, pts[:,0]); V = np.interp(S, s, pts[:,1])
dU = np.gradient(U); dV = np.gradient(V); nrm = np.hypot(dU, dV); nu, nv = -dV/nrm, dU/nrm
offs = np.arange(-R, R+0.01, 0.5)
rows = []
for k in range(len(S)):
    vals = [samp(U[k]+nu[k]*o, V[k]+nv[k]*o) for o in offs]
    j = int(np.argmin(vals))
    gu = abs(((U[k]+nu[k]*offs[j] - MARG) + 80) % 160 - 80) <= 5
    gv = abs(((V[k]+nv[k]*offs[j] - MARG) + 80) % 160 - 80) <= 5
    rows.append((S[k], U[k], V[k], vals[j], 1 if (gu or gv) else 0, offs[j]))
A = np.array(rows); np.save(name, A)
# runs
lab = np.where(A[:,4] == 1, 'G', np.where(A[:,3] < thr, 'D', 'g'))
runs = []; i = 0
while i < len(lab):
    j = i
    while j < len(lab) and lab[j] == lab[i]: j += 1
    runs.append((lab[i], A[i,0], (j-i)*0.5, A[i,1], A[i,2])); i = j
print(name, 'length', round(S[-1],1), 'px; mean |offset|', round(np.abs(A[:,5]).mean(),2), 'frac at edge', round((np.abs(A[:,5])>=R-0.01).mean(),3))
print(' '.join(f'{k}{L:.0f}' + (f'@{u:.0f}' if k != 'G' else '') for k, s0, L, u, v in runs))
