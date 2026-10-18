import sys
from PIL import Image
import numpy as np
im = np.array(Image.open(sys.argv[1]).convert('L')) < 140
xa,xb,ya,yb = map(int, sys.argv[2:6])
sub = im[ya:yb, xa:xb]
rows = sub.mean(axis=1)
cols = sub.mean(axis=0)
thr_r = float(sys.argv[6]); thr_c=float(sys.argv[7])
def peaks(v, off, thr):
    out=[]; i=0
    while i < len(v):
        if v[i] > thr:
            j=i
            while j+1 < len(v) and v[j+1] > thr: j+=1
            seg = v[i:j+1]; c = i + (np.arange(len(seg))*seg).sum()/seg.sum()
            out.append((round(off+c,1), round(float(seg.max()),2)))
            i=j+1
        else: i+=1
    return out
print('rows', peaks(rows, ya, thr_r))
print('cols', peaks(cols, xa, thr_c))
