"""Crop with value rulers on both axes. args: src out  xv0 xv1 xstep  yv0 yv1 ystep  xpx0 xv_at_xpx0 pxperx  ypx0 yv_at_ypx0 pxpery  scale  [labelevery_x labelevery_y]"""
import sys
from PIL import Image, ImageDraw
a=sys.argv
src,out=a[1],a[2]
xv0,xv1,xs,yv0,yv1,ys=map(float,a[3:9]); xp0,xvp,ppx,yp0,yvp,ppy=map(float,a[9:15]); sc=float(a[15])
lx=int(a[16]) if len(a)>16 else 5; ly=int(a[17]) if len(a)>17 else 5
X=lambda v: xp0+(v-xvp)*ppx; Y=lambda v: yp0-(v-yvp)*ppy
x0,x1=int(X(xv0)),int(X(xv1)); y0,y1=int(Y(yv1)),int(Y(yv0))
im=Image.open(src).convert('RGB').crop((x0,y0,x1,y1)); im=im.resize((int(im.width*sc),int(im.height*sc)),Image.LANCZOS)
d=ImageDraw.Draw(im)
n=int(round((yv1-yv0)/ys))
for k in range(n+1):
    v=yv0+k*ys; y=(Y(v)-y0)*sc; maj=(k%ly==0)
    d.line([(0,y),(im.width,y)],fill=(255,0,0) if maj else (255,190,190),width=1)
    if maj: d.text((2,y-11),f"{v:.3f}",fill=(220,0,0))
n=int(round((xv1-xv0)/xs))
for k in range(n+1):
    v=xv0+k*xs; x=(X(v)-x0)*sc; maj=(k%lx==0)
    d.line([(x,0),(x,im.height)],fill=(0,0,255) if maj else (190,190,255),width=1)
    if maj: d.text((x+2,2),f"{v:.2f}",fill=(0,0,220))
im.save(out)
