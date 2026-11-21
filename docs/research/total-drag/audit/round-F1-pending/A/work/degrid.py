from PIL import Image
import numpy as np
im=np.array(Image.open('nat-000.png').convert('L'))<128
H,W=im.shape
out=im.copy()
def bands(prof,thr,lo,hi):
    idx=[i for i in range(lo,hi) if prof[i]>thr]
    return idx
# panels: (x0,y0,x1,y1)
P=[(655,570,1980,1135),(655,1355,1980,1525),(655,1785,1980,2345)]
for x0,y0,x1,y1 in P:
    sub=im[y0:y1,x0:x1]
    cs=sub.sum(0); rs=sub.sum(1)
    cols=[x0+i for i in range(len(cs)) if cs[i]>0.4*sub.shape[0]]
    rows=[y0+i for i in range(len(rs)) if rs[i]>0.4*sub.shape[1]]
    # widen by 1
    cols=sorted(set(c+d for c in cols for d in (-1,0,1)))
    rows=sorted(set(r+d for r in rows for d in (-1,0,1)))
    for r in rows:
        # bridge: black if pixel within 3 above (outside band) and 3 below both black
        for x in range(x0-5,x1+5):
            up=im[r-4:r-1,x].any() if r-4>=0 else False
            dn=im[r+2:r+5,x].any()
            out[r,x]= up and dn and not (r-4 in rows)
    for c in cols:
        for y in range(y0-5,y1+5):
            l=im[y,c-4:c-1].any(); rr=im[y,c+2:c+5].any()
            out[y,c]= l and rr
Image.fromarray(((~out)*255).astype(np.uint8)).save('degrid.png')
