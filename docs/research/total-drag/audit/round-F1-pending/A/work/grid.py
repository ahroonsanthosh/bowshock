import sys
from PIL import Image
import numpy as np
im=np.array(Image.open('nat-000.png').convert('L'))<128
x0,y0,x1,y1=map(int,sys.argv[1:5])
sub=im[y0:y1,x0:x1]
cs=sub.sum(0); rs=sub.sum(1)
def peaks(a,thr,off):
    out=[];i=0
    while i<len(a):
        if a[i]>thr:
            j=i
            while j<len(a) and a[j]>thr: j+=1
            seg=a[i:j]; w=np.arange(i,j)
            out.append((round(off+(w*seg).sum()/seg.sum(),1),j-i,int(seg.max())))
            i=j
        else: i+=1
    return out
f=float(sys.argv[5]) if len(sys.argv)>5 else 0.5
print('cols',peaks(cs,f*sub.shape[0],x0))
print('rows',peaks(rs,f*sub.shape[1],y0))
