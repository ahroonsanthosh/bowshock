import sys
from PIL import Image
import numpy as np
im=np.array(Image.open('/tmp/scratch/f1-readers/B/p21_600-21.png'))<128
def runs(idx):
    out=[];s=None
    for i in idx:
        if s is None: s=p=i
        elif i==p+1: p=i
        else: out.append((s,p)); s=p=i
    if s is not None: out.append((s,p))
    return out
for name,(x0,x1,y0,y1) in {'P1':(1250,3950,1100,2300),'P2':(1250,3950,2650,3100),'P3':(1250,3950,3500,4800)}.items():
    sub=im[y0:y1,x0:x1]
    rows=sub.mean(1); cols=sub.mean(0)
    print(name,'rows',[(a+y0,b+y0,round(rows[a-0:b+1].max(),2)) for a,b in runs(np.where(rows>0.5)[0])])
    print(name,'cols',[(a+x0,b+x0,round(cols[a:b+1].max(),2)) for a,b in runs(np.where(cols>0.5)[0])])
