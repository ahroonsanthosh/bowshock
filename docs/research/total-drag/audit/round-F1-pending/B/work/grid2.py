from PIL import Image
import numpy as np
im=np.array(Image.open('/tmp/scratch/f1-readers/B/p21_600-21.png').convert('L'))<128
def peaks(prof,thr,off):
    idx=np.where(prof>thr)[0]
    groups=[];cur=[]
    for i in idx:
        if cur and i>cur[-1]+2: groups.append(cur);cur=[]
        cur.append(i)
    if cur: groups.append(cur)
    return [round(off+np.average(np.array(g),weights=prof[np.array(g)]),1) for g in groups]
for name,(x0,x1,y0,y1) in {'P1':(1250,3950,1100,2300),'P2':(1250,3950,2650,3100),'P3':(1250,3950,3500,4800)}.items():
    print(name)
    for xs in range(x0+100,x1-100,600):
        prof=im[y0:y1,xs:xs+300].mean(1)
        print(' H at x',xs,peaks(prof,0.5,y0))
    for ys in range(y0+50,y1-50,300):
        prof=im[ys:ys+150,x0:x1].mean(0)
        print(' V at y',ys,peaks(prof,0.5,x0))
