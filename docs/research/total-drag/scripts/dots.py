"""Find small compact dark blobs (centre dots of plotted circles).
args: png x0 x1 y0 y1 thr minpix maxpix maxdim"""
import sys
import numpy as np
from PIL import Image
im=np.array(Image.open(sys.argv[1]).convert('L'))
x0,x1,y0,y1,thr,mn,mx,md=map(int,sys.argv[2:10])
b=im[y0:y1,x0:x1]<thr
H,W=b.shape; seen=np.zeros_like(b); out=[]
for i in range(H):
    for j in range(W):
        if b[i,j] and not seen[i,j]:
            st=[(i,j)]; seen[i,j]=True; pts=[]
            while st:
                p,q=st.pop(); pts.append((p,q))
                for dp in (-1,0,1):
                    for dq in (-1,0,1):
                        r,s=p+dp,q+dq
                        if 0<=r<H and 0<=s<W and b[r,s] and not seen[r,s]:
                            seen[r,s]=True; st.append((r,s))
            if mn<=len(pts)<=mx:
                ys=np.array([p for p,_ in pts]); xs=np.array([q for _,q in pts])
                if np.ptp(ys)+1<=md and np.ptp(xs)+1<=md:
                    w=255-im[ys+y0,xs+x0].astype(float)
                    out.append(((w*xs).sum()/w.sum()+x0,(w*ys).sum()/w.sum()+y0,len(pts),np.ptp(ys)+1,np.ptp(xs)+1))
for o in sorted(out): print('x %.1f y %.1f n %d h %d w %d'%o)
