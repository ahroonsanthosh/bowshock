import sys, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
raw=np.array(Image.open('nat-000.png').convert('L'))<128
dg=np.array(Image.open('degrid.png').convert('L'))<128
def tmpl(shape,size):
    t=np.linspace(0,2*np.pi,96,endpoint=False)
    h=size/2
    if shape=='circle': return np.c_[h*np.cos(t),h*np.sin(t)]
    if shape=='square':
        s=np.linspace(-h,h,24); z=np.full(24,h)
        return np.r_[np.c_[s,-z],np.c_[s,z],np.c_[-z,s],np.c_[z,s]]
    if shape=='diamond':
        s=np.linspace(0,1,24)
        P=[(0,-h),(h,0),(0,h),(-h,0),(0,-h)]
        pts=[]
        for (a,b),(c,d) in zip(P[:-1],P[1:]): pts.append(np.c_[a+(c-a)*s,b+(d-b)*s])
        return np.vstack(pts)
def score(img,shape,size,box):
    x0,y0,x1,y1=box
    dt=ndimage.distance_transform_edt(~img)
    dt=np.minimum(dt,6)
    T=tmpl(shape,size)
    ys,xs=np.mgrid[y0:y1,x0:x1]
    S=np.zeros(ys.shape)
    for dx,dy in T:
        S+=dt[np.clip(np.round(ys+dy).astype(int),0,dt.shape[0]-1),np.clip(np.round(xs+dx).astype(int),0,dt.shape[1]-1)]
    S/=len(T)
    # also fill penalty: interior should be mostly white (except solid)
    return S
def nms(S,box,thr,rad=8):
    x0,y0,x1,y1=box
    mn=ndimage.minimum_filter(S,size=2*rad+1)
    pk=np.argwhere((S==mn)&(S<thr))
    return sorted([(x0+c,y0+r,S[r,c]) for r,c in pk],key=lambda p:p[2])
if __name__=='__main__':
    shape=sys.argv[1]; size=float(sys.argv[2]); box=tuple(map(int,sys.argv[3:7])); thr=float(sys.argv[7]); src=sys.argv[8]
    img=raw if src=='raw' else dg
    S=score(img,shape,size,box)
    for p in sorted(nms(S,box,thr)): print(p[0],p[1],round(p[2],2))
