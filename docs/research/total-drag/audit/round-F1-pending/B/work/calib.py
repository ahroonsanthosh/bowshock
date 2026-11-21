import json
from PIL import Image
import numpy as np
im=np.array(Image.open('/tmp/scratch/f1-readers/B/p21_600-21.png').convert('L'))<128
def peaks(prof,thr,off,minsep=40):
    idx=np.where(prof>thr)[0]
    groups=[];cur=[]
    for i in idx:
        if cur and i>cur[-1]+2: groups.append(cur);cur=[]
        cur.append(i)
    if cur: groups.append(cur)
    g=[np.array(g) for g in groups]
    return [off+float(np.average(a,weights=prof[a])) for a in g]
panels={'P1':dict(x=(1300,3960),y=(1140,2270),nx=33,ny=15,y0=0.28,dy=-0.02),
        'P2':dict(x=(1300,3965),y=(2705,3050),nx=33,ny=5,y0=0.04,dy=-0.02),
        'P3':dict(x=(1305,3965),y=(3565,4695),nx=33,ny=15,y0=0.28,dy=-0.02)}
cal={}
for name,p in panels.items():
    x0,x1=p['x'];y0,y1=p['y']
    # vertical lines: sample bands in y
    V=[]  # list of (y, [xs])
    for ys in np.linspace(y0+15,y1-45,12):
        ys=int(ys); prof=im[ys:ys+30,x0:x1].mean(0)
        pk=peaks(prof,0.8,x0)
        if len(pk)==p['nx']: V.append((ys+15,pk))
    H=[]
    for xs in np.linspace(x0+30,x1-70,14):
        xs=int(xs); prof=im[y0:y1,xs:xs+40].mean(1)
        pk=peaks(prof,0.8,y0)
        if len(pk)==p['ny']: H.append((xs+20,pk))
    print(name,'V bands ok',len(V),'H bands ok',len(H))
    # fit each vertical line x = a + b*y
    vf=[]
    for i in range(p['nx']):
        ys=np.array([v[0] for v in V]); xs=np.array([v[1][i] for v in V])
        b,a=np.polyfit(ys,xs,1); r=xs-(a+b*ys); vf.append((a,b,float(r.std())))
    hf=[]
    for j in range(p['ny']):
        xs=np.array([h[0] for h in H]); ys=np.array([h[1][j] for h in H])
        b,a=np.polyfit(xs,ys,1); r=ys-(a+b*xs); hf.append((a,b,float(r.std())))
    cal[name]=dict(v=vf,h=hf,y0=p['y0'],dy=p['dy'])
    print(' vline resid max',max(v[2] for v in vf),' hline resid max',max(h[2] for h in hf))
    sp=np.diff([v[0]+v[1]*((y0+y1)/2) for v in vf]); print(' v spacing',sp.mean().round(2),sp.std().round(2),sp.min().round(1),sp.max().round(1))
    sp=np.diff([h[0]+h[1]*((x0+x1)/2) for h in hf]); print(' h spacing',sp.mean().round(2),sp.std().round(2),sp.min().round(1),sp.max().round(1))
json.dump(cal,open('/tmp/scratch/f1-readers/B/work/cal.json','w'))
