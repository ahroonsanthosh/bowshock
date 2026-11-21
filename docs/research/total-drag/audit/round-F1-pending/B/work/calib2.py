import json
from PIL import Image
import numpy as np
im=np.array(Image.open('/tmp/scratch/f1-readers/B/p21_600-21.png').convert('L'))<128
panels={'P1':dict(vx0=1319,vx1=3942,hy0=1155,hy1=2253,nx=33,ny=15,ytop=0.28),
        'P2':dict(vx0=1325,vx1=3946,hy0=2723,hy1=3037,nx=33,ny=5,ytop=0.04),
        'P3':dict(vx0=1328,vx1=3948,hy0=3584,hy1=4678,nx=33,ny=15,ytop=0.28)}
def locate(prof,guess,off,w=14):
    lo=int(guess-off-w);hi=int(guess-off+w)
    seg=prof[lo:hi]
    if seg.max()<0.6: return None
    m=seg>=0.6*seg.max()
    idx=np.arange(lo,hi)[m]
    # take contiguous group around max
    k=lo+int(seg.argmax()); grp=[k]
    i=k-1
    while i>=lo and prof[i]>=0.6*seg.max(): grp.insert(0,i); i-=1
    i=k+1
    while i<hi and prof[i]>=0.6*seg.max(): grp.append(i); i+=1
    g=np.array(grp); return off+float(np.average(g,weights=prof[g]))+0.5
cal={}
for name,p in panels.items():
    gx=np.linspace(p['vx0'],p['vx1'],p['nx']); gy=np.linspace(p['hy0'],p['hy1'],p['ny'])
    vf=[];hf=[]
    for i,xg in enumerate(gx):
        pts=[]
        for j in range(p['ny']-1):
            for t in (0.3,0.7):
                ys=int(gy[j]+t*(gy[j+1]-gy[j]))
                x0=int(xg-40); prof=im[ys-6:ys+6,x0:int(xg+40)].mean(0)
                r=locate(prof,xg,x0)
                if r is not None: pts.append((ys,r))
        pts=np.array(pts); b,a=np.polyfit(pts[:,0],pts[:,1],1)
        res=pts[:,1]-(a+b*pts[:,0]); keep=np.abs(res)<3*max(res.std(),0.7)
        b,a=np.polyfit(pts[keep,0],pts[keep,1],1); res=pts[keep,1]-(a+b*pts[keep,0])
        vf.append([a,b,float(res.std()),int(keep.sum())])
    for j,yg in enumerate(gy):
        pts=[]
        for i in range(p['nx']-1):
            for t in (0.3,0.7):
                xs=int(gx[i]+t*(gx[i+1]-gx[i]))
                y0=int(yg-40); prof=im[y0:int(yg+40),xs-6:xs+6].mean(1)
                r=locate(prof,yg,y0)
                if r is not None: pts.append((xs,r))
        pts=np.array(pts); b,a=np.polyfit(pts[:,0],pts[:,1],1)
        res=pts[:,1]-(a+b*pts[:,0]); keep=np.abs(res)<3*max(res.std(),0.7)
        b,a=np.polyfit(pts[keep,0],pts[keep,1],1); res=pts[keep,1]-(a+b*pts[keep,0])
        hf.append([a,b,float(res.std()),int(keep.sum())])
    cal[name]=dict(v=vf,h=hf,ytop=p['ytop'])
    ym=(p['hy0']+p['hy1'])/2; xm=(p['vx0']+p['vx1'])/2
    vx=np.array([v[0]+v[1]*ym for v in vf]); hy=np.array([h[0]+h[1]*xm for h in hf])
    print(name,'vres max %.2f'%max(v[2] for v in vf),'hres max %.2f'%max(h[2] for h in hf))
    print(' vx',np.round(vx,1).tolist()); print(' dvx',np.round(np.diff(vx),1).tolist())
    print(' hy',np.round(hy,1).tolist()); print(' dhy',np.round(np.diff(hy),1).tolist())
    print(' slopes v',np.round([v[1] for v in vf],4).tolist()[:5],' h',np.round([h[1] for h in hf],4).tolist()[:5])
json.dump(cal,open('/tmp/scratch/f1-readers/B/work/cal.json','w'),indent=1)
