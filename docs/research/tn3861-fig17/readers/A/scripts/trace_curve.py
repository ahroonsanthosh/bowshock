"""Trace dark line centres along constant-M columns, to follow a curve or chord.
usage: python -I trace_curve.py gray.png calib.json Mlo Mhi dM CDlo CDhi
For each M, prints CD positions of darkness peaks between CDlo and CDhi (grid-line rows marked)."""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage
g = 255.0 - np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
cal = json.load(open(sys.argv[2]))
Mlo, Mhi, dM, Clo, Chi = map(float, sys.argv[3:8])
cM = np.array(cal['affine']['M']); cC = np.array(cal['affine']['CD'])
J = np.array([[cM[1], cM[2]], [cC[1], cC[2]]])
def page(M, CD):
    return np.linalg.solve(J, np.array([M - cM[0], CD - cC[0]]))
for M in np.arange(Mlo, Mhi + 1e-9, dM):
    CDs = np.arange(Clo, Chi, 0.0002)
    P = np.array([page(M, c) for c in CDs])
    v = ndimage.map_coordinates(g, [P[:, 1], P[:, 0]], order=1)
    pk = [i for i in range(1, len(v)-1) if v[i] >= v[i-1] and v[i] >= v[i+1] and v[i] > 90]
    # merge peaks closer than 0.002
    out = []
    for i in pk:
        if out and CDs[i] - out[-1][0] < 0.002:
            if v[i] > out[-1][1]:
                out[-1] = (CDs[i], v[i])
            continue
        out.append((CDs[i], v[i]))
    print('M=%.3f ' % M + '  '.join('%.4f(%d)' % (c, x) for c, x in out))
